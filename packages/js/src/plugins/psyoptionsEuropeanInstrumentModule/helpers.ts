import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Mint } from '../tokenModule';
import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { InstructionUniquenessTracker } from '../../utils/classes';
import { CvgWallet } from '../../utils/Wallets';
import { PsyoptionsEuropeanInstrument } from './instrument';
import { toBigNumber } from '@/types/BigNumber';

export const initializeNewEuropeanOption = async (
  convergence: Convergence,
  ixTracker: InstructionUniquenessTracker,
  oracle: PublicKey,
  europeanProgram: anchor.Program<psyoptionsEuropean.EuroPrimitive>,
  underlyingMint: Mint,
  stableMint: Mint,
  strikePrice: number,
  underlyingAmountPerContract: number,
  expiration: number,
  oracleProviderId = 1
) => {
  const expirationTimestamp = new BN(Date.now() / 1_000 + expiration);

  const { instructions: initializeIxs } =
    await psyoptionsEuropean.instructions.initializeAllAccountsInstructions(
      europeanProgram,
      underlyingMint.address,
      stableMint.address,
      oracle,
      expirationTimestamp,
      stableMint.decimals,
      oracleProviderId
    );

  const tx = new Transaction();

  initializeIxs.forEach((ix) => {
    if (ixTracker.checkedAdd(ix)) tx.add(ix);
  });
  const latestBlockHash = await convergence.rpc().getLatestBlockhash();
  if (tx.instructions.length > 0) {
    tx.recentBlockhash = latestBlockHash.blockhash;
    tx.feePayer = convergence.rpc().getDefaultFeePayer().publicKey;
    await convergence.identity().signTransaction(tx);
    await convergence.rpc().serializeAndSendTransaction(tx, latestBlockHash);
  }

  const strikePriceSize = addDecimals(strikePrice, stableMint.decimals);
  const underlyingAmountPerContractSize = addDecimals(
    underlyingAmountPerContract,
    underlyingMint.decimals
  );

  const {
    instruction: createIx,
    euroMeta,
    euroMetaKey,
    expirationData,
  } = await psyoptionsEuropean.instructions.createEuroMetaInstruction(
    europeanProgram,
    underlyingMint.address,
    underlyingMint.decimals,
    stableMint.address,
    stableMint.decimals,
    expirationTimestamp,
    toBigNumber(underlyingAmountPerContractSize),
    toBigNumber(strikePriceSize),
    stableMint.decimals,
    oracle,
    oracleProviderId
  );

  if (ixTracker.checkedAdd(createIx)) {
    const createTx = new Transaction().add(createIx);
    createTx.recentBlockhash = latestBlockHash.blockhash;
    createTx.feePayer = convergence.rpc().getDefaultFeePayer().publicKey;
    const signedTx = await convergence.identity().signTransaction(createTx);
    await convergence
      .rpc()
      .serializeAndSendTransaction(signedTx, latestBlockHash);
  }

  return {
    euroMeta,
    euroMetaKey,
    expirationData,
  };
};

export const createEuropeanProgram = async (convergence: Convergence) => {
  const cvgWallet = new CvgWallet(convergence);
  return psyoptionsEuropean.createProgramFromProvider(
    new anchor.AnchorProvider(
      convergence.connection,
      cvgWallet,
      anchor.AnchorProvider.defaultOptions()
    ),
    new PublicKey(psyoptionsEuropean.programId)
  );
};

// create European Option ATAs and mint options
export const prepareEuropeanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
) => {
  const ixTracker = new InstructionUniquenessTracker([]);
  const europeanProgram = await createEuropeanProgram(convergence);
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerSide = caller.equals(rfq.taker) ? 'taker' : 'maker';

  const { legs } = convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  const mintTxBuilderArray: TransactionBuilder[] = [];
  const ataTxBuilderArray: TransactionBuilder[] = [];
  for (const [index, leg] of rfq.legs.entries()) {
    const { receiver, amount } = legs[index];
    if (
      !(leg instanceof PsyoptionsEuropeanInstrument) ||
      receiver === callerSide
    ) {
      continue;
    }
    const euroMeta = await leg.getOptionMeta();
    const { stableMint } = euroMeta;
    const { underlyingMint } = euroMeta;
    const stableMintToken = convergence.tokens().pdas().associatedTokenAccount({
      mint: stableMint,
      owner: caller,
    });
    const underlyingMintToken = convergence
      .tokens()
      .pdas()
      .associatedTokenAccount({
        mint: underlyingMint,
        owner: caller,
      });
    const minterCollateralKey =
      leg.optionType == psyoptionsEuropean.OptionType.PUT
        ? stableMintToken
        : underlyingMintToken;

    const optionDestination = await getOrCreateATAtxBuilder(
      convergence,
      leg.optionType == psyoptionsEuropean.OptionType.PUT
        ? euroMeta.putOptionMint
        : euroMeta.callOptionMint,
      caller
    );

    if (
      optionDestination.txBuilder &&
      ixTracker.checkedAdd(optionDestination.txBuilder)
    ) {
      ataTxBuilderArray.push(optionDestination.txBuilder);
    }
    const writerDestination = await getOrCreateATAtxBuilder(
      convergence,
      leg.optionType == psyoptionsEuropean.OptionType.PUT
        ? euroMeta.putWriterMint
        : euroMeta.callWriterMint,
      caller
    );
    if (
      writerDestination.txBuilder &&
      ixTracker.checkedAdd(writerDestination.txBuilder)
    ) {
      ataTxBuilderArray.push(writerDestination.txBuilder);
    }
    const { instruction: ix } = psyoptionsEuropean.instructions.mintOptions(
      europeanProgram,
      leg.optionMetaPubKey,
      euroMeta as psyoptionsEuropean.EuroMeta,
      minterCollateralKey,
      optionDestination.ataPubKey,
      writerDestination.ataPubKey,
      addDecimals(amount, PsyoptionsEuropeanInstrument.decimals),
      leg.optionType
    );

    ix.keys[0] = {
      pubkey: caller,
      isSigner: true,
      isWritable: false,
    };

    const mintTxBuilder = TransactionBuilder.make().setFeePayer(
      convergence.rpc().getDefaultFeePayer()
    );
    mintTxBuilder.add({
      instruction: ix,
      signers: [convergence.identity()],
    });
    mintTxBuilderArray.push(mintTxBuilder);
  }

  let signedTxs: Transaction[] = [];
  const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
  if (ataTxBuilderArray.length > 0 || mintTxBuilderArray.length > 0) {
    const mergedTxBuilderArray = ataTxBuilderArray.concat(mintTxBuilderArray);
    signedTxs = await convergence
      .identity()
      .signAllTransactions(
        mergedTxBuilderArray.map((b) => b.toTransaction(lastValidBlockHeight))
      );
  }

  const ataSignedTx = signedTxs.slice(0, ataTxBuilderArray.length);
  const mintSignedTx = signedTxs.slice(ataTxBuilderArray.length);

  if (ataSignedTx.length > 0) {
    await Promise.all(
      ataSignedTx.map((signedTx) =>
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
      )
    );
  }
  if (mintSignedTx.length > 0) {
    await Promise.all(
      mintSignedTx.map((signedTx) =>
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
      )
    );
  }
};
