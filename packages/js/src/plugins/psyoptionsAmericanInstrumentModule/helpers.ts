import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { BN } from 'bn.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { Mint } from '../tokenModule/models';
import { CvgWallet } from '../../utils/Wallets';
import { InstructionUniquenessTracker } from '../../utils/classes';
import { CreateOptionInstrumentsResult } from '../instrumentModule';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';
import { TransactionBuilder } from '@/utils/TransactionBuilder';

export const initializeNewAmericanOption = async (
  convergence: Convergence,
  underlyingMint: Mint,
  quoteMint: Mint,
  quoteAmountPerContract: number,
  underlyingAmountPerContract: number,
  expiration: number
) => {
  const expirationUnixTimestamp = new BN(Date.now() / 1_000 + expiration);

  const quoteAmountPerContractBN = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, quoteMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMint.decimals)
  );

  const cvgWallet = new CvgWallet(convergence);
  const americanProgram = createAmericanProgram(convergence, cvgWallet);

  const { optionMarketKey, optionMintKey, writerMintKey } =
    await psyoptionsAmerican.instructions.initializeMarket(americanProgram, {
      expirationUnixTimestamp,
      quoteAmountPerContract: quoteAmountPerContractBN,
      quoteMint: quoteMint.address,
      underlyingAmountPerContract: underlyingAmountPerContractBN,
      underlyingMint: underlyingMint.address,
    });

  const optionMarket = (await psyoptionsAmerican.getOptionByKey(
    americanProgram,
    optionMarketKey
  )) as psyoptionsAmerican.OptionMarketWithKey;

  const optionMint = await convergence
    .tokens()
    .findMintByAddress({ address: optionMintKey });

  return {
    optionMarketKey,
    optionMarket,
    optionMintKey,
    writerMintKey,
    optionMint,
  };
};
//create American Options ATAs and mint Options
export const prepareAmericanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
) => {
  const ixTracker = new InstructionUniquenessTracker([]);
  const cvgWallet = new CvgWallet(convergence);
  const americanProgram = createAmericanProgram(convergence, cvgWallet);
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

  const ataTxBuilderArray: TransactionBuilder[] = [];
  const mintTxBuilderArray: TransactionBuilder[] = [];
  for (const [index, leg] of rfq.legs.entries()) {
    const { receiver, amount } = legs[index];
    if (
      !(leg instanceof PsyoptionsAmericanInstrument) ||
      receiver === callerSide
    ) {
      continue;
    }

    const optionMarket = await leg.getOptionMeta();
    const optionToken = await getOrCreateATAtxBuilder(
      convergence,
      optionMarket.optionMint,
      caller
    );
    if (optionToken.txBuilder && ixTracker.checkedAdd(optionToken.txBuilder)) {
      ataTxBuilderArray.push(optionToken.txBuilder);
    }
    const writerToken = await getOrCreateATAtxBuilder(
      convergence,
      optionMarket!.writerTokenMint,
      caller
    );
    if (writerToken.txBuilder && ixTracker.checkedAdd(writerToken.txBuilder)) {
      ataTxBuilderArray.push(writerToken.txBuilder);
    }
    const underlyingToken = await getOrCreateATAtxBuilder(
      convergence,
      optionMarket!.underlyingAssetMint,
      caller
    );
    if (
      underlyingToken.txBuilder &&
      ixTracker.checkedAdd(underlyingToken.txBuilder)
    ) {
      ataTxBuilderArray.push(underlyingToken.txBuilder);
    }
    const ixWithSigners =
      await psyoptionsAmerican.instructions.mintOptionInstruction(
        americanProgram,
        optionToken.ataPubKey,
        writerToken.ataPubKey,
        underlyingToken.ataPubKey,
        new BN(amount!),
        optionMarket as psyoptionsAmerican.OptionMarketWithKey
      );
    ixWithSigners.ix.keys[0] = {
      pubkey: caller,
      isSigner: true,
      isWritable: false,
    };
    const mintTxBuilder = TransactionBuilder.make().setFeePayer(
      convergence.rpc().getDefaultFeePayer()
    );
    mintTxBuilder.add({
      instruction: ixWithSigners.ix,
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

export const getPsyAmericanMarketTxBuilder = async (
  cvg: Convergence,
  underlyingMint: PublicKey,
  underlyingMintDecimals: number,
  stableMint: PublicKey,
  stableMintDecimals: number,
  strike: number,
  expiresIn: number,
  ixTracker: InstructionUniquenessTracker
): Promise<CreateOptionInstrumentsResult> => {
  const cvgWallet = new CvgWallet(cvg);
  const americanProgram = createAmericanProgram(cvg, cvgWallet);

  const optionMarketTxBuilder = TransactionBuilder.make().setFeePayer(
    cvg.identity()
  );

  let quoteAmountPerContract = new BN(strike);
  let underlyingAmountPerContract = new BN('1');

  // Initialize the options meta the long way
  const expirationUnixTimestamp = new BN(expiresIn);
  quoteAmountPerContract = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, stableMintDecimals)
  );
  underlyingAmountPerContract = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMintDecimals)
  );

  let optionMarket: psyoptionsAmerican.OptionMarketWithKey | null = null;
  const [optionMarketKey, bump] =
    await psyoptionsAmerican.deriveOptionKeyFromParams({
      expirationUnixTimestamp,
      programId: americanProgram.programId,
      quoteAmountPerContract,
      quoteMint: stableMint,
      underlyingAmountPerContract,
      underlyingMint,
    });
  optionMarket = await psyoptionsAmerican.getOptionByKey(
    americanProgram,
    optionMarketKey
  );

  // If there is no existing market, derive the optionMarket from inputs
  if (optionMarket == null) {
    const optionMarketIx =
      await psyoptionsAmerican.instructions.initializeOptionInstruction(
        americanProgram,
        {
          /** The option market expiration timestamp in seconds */
          expirationUnixTimestamp,
          quoteAmountPerContract,
          quoteMint: stableMint,
          underlyingAmountPerContract,
          underlyingMint,
        }
      );
    const feeOwner = psyoptionsAmerican.FEE_OWNER_KEY;
    const { ataPubKey: mintFeePubkey, txBuilder: mintFeeTxBuilder } =
      await getOrCreateATAtxBuilder(cvg, underlyingMint, feeOwner);
    if (mintFeeTxBuilder && ixTracker.checkedAdd(mintFeeTxBuilder)) {
      optionMarketTxBuilder.add(mintFeeTxBuilder);
    }
    const { ataPubKey: exerciseFeePubkey, txBuilder: exerciseFeeTxBuilder } =
      await getOrCreateATAtxBuilder(cvg, stableMint, feeOwner);
    if (exerciseFeeTxBuilder && ixTracker.checkedAdd(exerciseFeeTxBuilder)) {
      optionMarketTxBuilder.add(exerciseFeeTxBuilder);
    }
    optionMarket = {
      optionMint: optionMarketIx.optionMintKey,
      writerTokenMint: optionMarketIx.writerMintKey,
      underlyingAssetMint: underlyingMint,
      quoteAssetMint: stableMint,
      underlyingAmountPerContract,
      quoteAmountPerContract,
      expirationUnixTimestamp,
      underlyingAssetPool: optionMarketIx.underlyingAssetPoolKey,
      quoteAssetPool: optionMarketIx.quoteAssetPoolKey,
      mintFeeAccount: mintFeePubkey,
      exerciseFeeAccount: exerciseFeePubkey,
      expired: false,
      bumpSeed: bump,
      key: optionMarketKey,
    };

    if (ixTracker.checkedAdd(optionMarketIx.tx)) {
      optionMarketTxBuilder.add({
        instruction: optionMarketIx.tx,
        signers: [cvg.identity()],
      });
    }
  }

  if (optionMarketTxBuilder.getInstructionCount() > 0) {
    return optionMarketTxBuilder;
  }
  return null;
};

export type GetAmericanOptionMetaResult = {
  americanMeta: psyoptionsAmerican.OptionMarketWithKey;
  americanMetaKey: PublicKey;
};
export const getAmericanOptionMeta = async (
  cvg: Convergence,
  americanProgram: any,
  underlyingMint: Mint,
  stableMint: Mint,
  expiresIn: number,
  underlyingAmountPerContract: number,
  quoteAmountPerContract: number
): Promise<GetAmericanOptionMetaResult> => {
  const expirationUnixTimestamp = new BN(Date.now() / 1_000 + expiresIn);
  const quoteAmountPerContractBN = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, stableMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMint.decimals)
  );
  const optionMarketIx =
    await psyoptionsAmerican.instructions.initializeOptionInstruction(
      americanProgram,
      {
        /** The option market expiration timestamp in seconds */
        expirationUnixTimestamp,
        quoteAmountPerContract: quoteAmountPerContractBN,
        quoteMint: stableMint.address,
        underlyingAmountPerContract: underlyingAmountPerContractBN,
        underlyingMint: underlyingMint.address,
      }
    );
  const feeOwner = psyoptionsAmerican.FEE_OWNER_KEY;
  const mintFeeAccount = cvg.tokens().pdas().associatedTokenAccount({
    mint: underlyingMint.address,
    owner: feeOwner,
  });
  const exerciseFeeAccount = cvg.tokens().pdas().associatedTokenAccount({
    mint: stableMint.address,
    owner: feeOwner,
  });
  const [americanMetaKey, bump] =
    await psyoptionsAmerican.deriveOptionKeyFromParams({
      expirationUnixTimestamp,
      programId: americanProgram.programId,
      quoteAmountPerContract: quoteAmountPerContractBN,
      quoteMint: stableMint.address,
      underlyingAmountPerContract: underlyingAmountPerContractBN,
      underlyingMint: underlyingMint.address,
    });
  const americanMeta: psyoptionsAmerican.OptionMarketWithKey = {
    optionMint: optionMarketIx.optionMintKey,
    writerTokenMint: optionMarketIx.writerMintKey,
    underlyingAssetMint: underlyingMint.address,
    quoteAssetMint: stableMint.address,
    underlyingAmountPerContract: underlyingAmountPerContractBN,
    quoteAmountPerContract: quoteAmountPerContractBN,
    expirationUnixTimestamp,
    underlyingAssetPool: optionMarketIx.underlyingAssetPoolKey,
    quoteAssetPool: optionMarketIx.quoteAssetPoolKey,
    mintFeeAccount,
    exerciseFeeAccount,
    expired: false,
    bumpSeed: bump,
    key: americanMetaKey,
  };

  return { americanMeta, americanMetaKey };
};
