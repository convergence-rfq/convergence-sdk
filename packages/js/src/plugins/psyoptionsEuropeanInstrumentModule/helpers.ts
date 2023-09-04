import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Mint } from '../tokenModule';
import {
  ATAExistence,
  getOrCreateATA,
  getOrCreateATAInx,
} from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { PsyoptionsEuropeanInstrument } from './instrument';
import { InstructionUniquenessTracker } from './classes';
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

  // const underlyingPoolKey = Pda.find(europeanProgram.programId, [
  //   underlyingMint.address.toBuffer(),
  //   Buffer.from('underlyingPool', 'utf-8'),
  // ]);
  // // TODO: Use retry method
  // const underlyingPoolAccount = await convergence.connection.getAccountInfo(
  //   underlyingPoolKey
  // );
  // if (underlyingPoolAccount && initializeIxs.length === 3) {
  //   initializeIxs = initializeIxs.slice(1);
  // }
  // const stablePoolKey = Pda.find(europeanProgram.programId, [
  //   stableMint.address.toBuffer(),
  //   Buffer.from('stablePool', 'utf-8'),
  // ]);
  // // TODO: Use retry method
  // const stablePoolAccount = await convergence.connection.getAccountInfo(
  //   stablePoolKey
  // );
  // if (stablePoolAccount && initializeIxs.length === 2) {
  //   initializeIxs = initializeIxs.slice(1);
  // } else if (stablePoolAccount && initializeIxs.length === 3) {
  //   initializeIxs.splice(1, 1);
  // }

  initializeIxs.forEach((ix) => {
    if (ixTracker.checkedAdd(ix)) tx.add(ix);
  });

  // const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

  if (tx.instructions.length > 0) {
    const latestBlockHash = await convergence.rpc().getLatestBlockhash();
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
    const latestBlockHash = await convergence.rpc().getLatestBlockhash();
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
  return psyoptionsEuropean.createProgram(
    convergence.rpc().getDefaultFeePayer() as Keypair,
    convergence.connection.rpcEndpoint,
    new PublicKey(psyoptionsEuropean.programId)
  );
};

export const mintEuropeanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
) => {
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
  const txBuilderArray: TransactionBuilder[] = [];
  for (const [index, leg] of rfq.legs.entries()) {
    const instructions: anchor.web3.TransactionInstruction[] = [];
    if (leg instanceof PsyoptionsEuropeanInstrument) {
      const { receiver } = legs[index];

      if (receiver !== callerSide) {
        const { amount } = legs[index];

        const euroMeta = await leg.getOptionMeta();
        const { stableMint } = euroMeta;
        const { underlyingMint } = euroMeta;
        const stableMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
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

        const {
          ataPubKey: optionDestination,
          instruction: optionDestinationAtaIx,
        } = await getOrCreateATAInx(
          convergence,
          leg.optionType == psyoptionsEuropean.OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller
        );

        if (optionDestinationAtaIx) {
          instructions.push(optionDestinationAtaIx);
        }
        const {
          ataPubKey: writerDestination,
          instruction: writerDestinationAtaInx,
        } = await getOrCreateATAInx(
          convergence,
          leg.optionType == psyoptionsEuropean.OptionType.PUT
            ? euroMeta.putWriterMint
            : euroMeta.callWriterMint,
          caller
        );
        if (writerDestinationAtaInx) {
          instructions.push(writerDestinationAtaInx);
        }
        const { instruction: ix } = psyoptionsEuropean.instructions.mintOptions(
          europeanProgram,
          leg.optionMetaPubKey,
          euroMeta as psyoptionsEuropean.EuroMeta,
          minterCollateralKey,
          optionDestination,
          writerDestination,
          addDecimals(amount, PsyoptionsEuropeanInstrument.decimals),
          leg.optionType
        );

        ix.keys[0] = {
          pubkey: caller,
          isSigner: true,
          isWritable: false,
        };

        instructions.push(ix);
      }
    }
    if (instructions.length > 0) {
      const txBuilder = TransactionBuilder.make().setFeePayer(
        convergence.rpc().getDefaultFeePayer()
      );
      instructions.forEach((ins) => {
        txBuilder.add({
          instruction: ins,
          signers: [convergence.identity()],
        });
      });
      txBuilderArray.push(txBuilder);
    }
  }
  if (txBuilderArray.length > 0) {
    const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
    const signedTxs = await convergence
      .identity()
      .signAllTransactions(
        txBuilderArray.map((b) => b.toTransaction(lastValidBlockHeight))
      );
    await Promise.all(
      signedTxs.map((signedTx) =>
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
      )
    );
  }
};

export const getOrCreateEuropeanOptionATAs = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
): Promise<ATAExistence> => {
  let flag = false;
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerSide = callerIsTaker ? 'taker' : 'maker';
  const { legs } = convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  for (const [index, leg] of rfq.legs.entries()) {
    if (leg instanceof PsyoptionsEuropeanInstrument) {
      const { receiver } = legs[index];
      if (receiver !== callerSide) {
        flag = true;
        const euroMeta = await leg.getOptionMeta();
        const { optionType } = leg;
        await getOrCreateATA(
          convergence,
          optionType === psyoptionsEuropean.OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller
        );
      }
    }
  }
  if (flag === true) {
    return ATAExistence.EXISTS;
  }
  return ATAExistence.NOTEXISTS;
};
