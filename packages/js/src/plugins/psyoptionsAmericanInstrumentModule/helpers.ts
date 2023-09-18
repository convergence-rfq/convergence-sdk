import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { BN } from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import { ATAExistence, getOrCreateATA } from '../../utils/ata';
import { Mint } from '../tokenModule/models';
import { CvgWallet } from '../../utils/Wallets';
import {
  InstructionWithSigners,
  TransactionBuilder,
} from '../../utils/TransactionBuilder';
import { CreateOptionInstrumentsResult } from '../instrumentModule';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';
import { InstructionUniquenessTracker } from '@/utils';

export const mintAmericanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey,
  americanProgram: any
) => {
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerSide = caller.equals(rfq.taker) ? 'taker' : 'maker';
  const instructionWithSigners: InstructionWithSigners[] = [];
  const { legs } = await convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  for (const [index, leg] of rfq.legs.entries()) {
    if (leg instanceof PsyoptionsAmericanInstrument) {
      const { receiver } = legs[index];
      if (receiver !== callerSide) {
        const { amount } = legs[index];

        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          leg.optionMetaPubKey
        );
        if (optionMarket) {
          const optionToken = await getOrCreateATA(
            convergence,
            optionMarket.optionMint,
            caller
          );

          const writerToken = await getOrCreateATA(
            convergence,
            optionMarket!.writerTokenMint,
            caller
          );

          const underlyingToken = await getOrCreateATA(
            convergence,
            optionMarket!.underlyingAssetMint,
            caller
          );

          const ixWithSigners =
            await psyoptionsAmerican.instructions.mintOptionV2Instruction(
              americanProgram,
              optionToken,
              writerToken,
              underlyingToken,
              new BN(amount!),
              optionMarket as psyoptionsAmerican.OptionMarketWithKey
            );
          ixWithSigners.ix.keys[0] = {
            pubkey: caller,
            isSigner: true,
            isWritable: false,
          };
          instructionWithSigners.push({
            instruction: ixWithSigners.ix,
            signers: ixWithSigners.signers,
          });
        }
      }
    }
  }
  if (instructionWithSigners.length > 0) {
    const payer = convergence.rpc().getDefaultFeePayer();
    const txBuilder = TransactionBuilder.make().setFeePayer(payer);

    txBuilder.add(...instructionWithSigners);
    const sig = await txBuilder.sendAndConfirm(convergence);
    return sig;
  }
  return null;
};

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

  const americanProgram = createAmericanProgram(
    convergence,
    new CvgWallet(convergence)
  );

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

// used in UI
export const getOrCreateAmericanOptionATAs = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey,
  americanProgram: any
): Promise<ATAExistence> => {
  let flag = false;
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerSide = caller.equals(rfq.taker) ? 'taker' : 'maker';
  const { legs } = await convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  for (const [index, leg] of rfq.legs.entries()) {
    if (leg instanceof PsyoptionsAmericanInstrument) {
      const { receiver } = legs[index];
      if (receiver !== callerSide) {
        flag = true;

        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          leg.optionMetaPubKey
        );
        if (optionMarket) {
          await getOrCreateATA(convergence, optionMarket.optionMint, caller);
        }
      }
    }
  }
  if (flag === true) {
    return ATAExistence.EXISTS;
  }
  return ATAExistence.NOTEXISTS;
};

export const createPsyAmericanMarket = async (
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
    const mintFeeAccount = await getOrCreateATA(cvg, underlyingMint, feeOwner);
    const exerciseFeeAccount = await getOrCreateATA(cvg, stableMint, feeOwner);

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
      mintFeeAccount,
      exerciseFeeAccount,
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
