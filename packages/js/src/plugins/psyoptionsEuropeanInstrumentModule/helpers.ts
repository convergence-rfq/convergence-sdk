import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { BN } from 'bn.js';
import { Program } from '@project-serum/anchor';
import { EuroMeta } from '@convergence-rfq/psyoptions-european-instrument';
import { Mint } from '../tokenModule';
import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { InstructionUniquenessTracker } from '../../utils/classes';
import { CvgWallet } from '../../utils/Wallets';
import { CreateOptionInstrumentsResult } from '../instrumentModule';
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

  const inititalizeTxBuilder = TransactionBuilder.make().setFeePayer(
    convergence.rpc().getDefaultFeePayer()
  );

  initializeIxs.forEach((ix) => {
    if (ixTracker.checkedAdd(ix))
      inititalizeTxBuilder.add({
        instruction: ix,
        signers: [convergence.identity()],
      });
  });

  if (inititalizeTxBuilder.getInstructions().length > 0) {
    await inititalizeTxBuilder.sendAndConfirm(convergence);
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
    const createTxBuilder = TransactionBuilder.make().setFeePayer(
      convergence.rpc().getDefaultFeePayer()
    );
    createTxBuilder.add({
      instruction: createIx,
      signers: [convergence.identity()],
    });
    await createTxBuilder.sendAndConfirm(convergence);
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
    const { stableMint, underlyingMint } = euroMeta;
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

export const getPsyEuropeanMarketTxBuilder = async (
  cvg: Convergence,
  underlyingMint: PublicKey,
  underlyingMintDecimals: number,
  stableMint: PublicKey,
  stableMintDecimals: number,
  strike: number,
  oracleAddress: PublicKey,
  expiresIn: number,
  ixTracker: InstructionUniquenessTracker,
  europeanProgram: Program<psyoptionsEuropean.EuroPrimitive>
): Promise<CreateOptionInstrumentsResult> => {
  const optionMarketTxBuilder = TransactionBuilder.make().setFeePayer(
    cvg.rpc().getDefaultFeePayer()
  );
  const instructions: TransactionInstruction[] = [];

  let quoteAmountPerContract = new BN(strike);
  let underlyingAmountPerContract = new BN('1');
  const expirationTimestamp = new BN(expiresIn);
  const oracleProviderId = 0; // Switchboard = 1, Pyth = 0
  quoteAmountPerContract = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, stableMintDecimals)
  );
  underlyingAmountPerContract = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMintDecimals)
  );

  // Initialize all accounts for European program
  const { instructions: initializeIxs } =
    await psyoptionsEuropean.instructions.initializeAllAccountsInstructions(
      europeanProgram,
      underlyingMint,
      stableMint,
      oracleAddress,
      expirationTimestamp,
      stableMintDecimals,
      oracleProviderId
    );

  initializeIxs.forEach((ix) => {
    if (ixTracker.checkedAdd(ix)) {
      instructions.push(ix);
    }
  });

  // Retrieve the euro meta account and a creation instruction (may or may not be required)
  const { instruction: createIx, euroMetaKey } =
    await psyoptionsEuropean.instructions.createEuroMetaInstruction(
      europeanProgram,
      underlyingMint,
      underlyingMintDecimals,
      stableMint,
      stableMintDecimals,
      expirationTimestamp,
      underlyingAmountPerContract,
      quoteAmountPerContract,
      stableMintDecimals,
      oracleAddress,
      oracleProviderId
    );

  const euroMetaKeyAccount = await cvg.rpc().getAccount(euroMetaKey);
  if (!euroMetaKeyAccount.exists) {
    if (ixTracker.checkedAdd(createIx)) {
      instructions.push(createIx);
    }
  }

  if (instructions.length > 0) {
    instructions.forEach((ix) => {
      optionMarketTxBuilder.add({ instruction: ix, signers: [cvg.identity()] });
    });
  }
  if (optionMarketTxBuilder.getInstructionCount() > 0) {
    return optionMarketTxBuilder;
  }
  return null;
};

export type GetEuropeanOptionMetaResult = {
  euroMeta: EuroMeta;
  euroMetaKey: PublicKey;
};

export const getEuropeanOptionMeta = async (
  europeanProgram: Program<psyoptionsEuropean.EuroPrimitive>,
  underlyingMint: Mint,
  stableMint: Mint,
  expiresIn: number,
  underlyingAmountPerContract: number,
  quoteAmountPerContract: number,
  oracleAddress: PublicKey,
  oracleProviderId: number
): Promise<GetEuropeanOptionMetaResult> => {
  const expirationTimestamp = new BN(Date.now() / 1_000 + expiresIn);
  const quoteAmountPerContractBN = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, stableMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMint.decimals)
  );
  const { euroMeta, euroMetaKey } =
    await psyoptionsEuropean.instructions.createEuroMetaInstruction(
      europeanProgram,
      underlyingMint.address,
      underlyingMint.decimals,
      stableMint.address,
      stableMint.decimals,
      expirationTimestamp,
      underlyingAmountPerContractBN,
      quoteAmountPerContractBN,
      stableMint.decimals,
      oracleAddress,
      oracleProviderId
    );

  return { euroMeta, euroMetaKey };
};
