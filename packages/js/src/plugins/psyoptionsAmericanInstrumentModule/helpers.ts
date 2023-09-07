import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { BN } from 'bn.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import { ATAExistence, getOrCreateATA } from '../../utils/ata';
import { Mint } from '../tokenModule/models';
import { CvgWallet } from '../../utils/Wallets';
import {
  InstructionWithSigners,
  TransactionBuilder,
} from '../../utils/TransactionBuilder';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';
import { OptionType, OptionStrategyData } from '@/utils';

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

interface CreatePsyAmericanInstrumentsResult {
  optionMarketTxArray: Transaction[];
  psyAmericanInstrumentArray: PsyoptionsAmericanInstrument[];
}

export const createPsyAmericanInstruments = async (
  strategyData: OptionStrategyData[],
  quoteMint: Mint,
  underlyingMint: Mint,
  cvg: Convergence
): Promise<CreatePsyAmericanInstrumentsResult> => {
  const optionMarketTxArray: Transaction[] = [];
  const psyAmericanInstrumentArray: PsyoptionsAmericanInstrument[] = [];
  const cvgWallet = new CvgWallet(cvg);
  const americanProgram = createAmericanProgram(cvg, cvgWallet);

  for (const leg of strategyData) {
    const transaction = new Transaction();
    let quoteAmountPerContract = new BN(leg.strike);
    let underlyingAmountPerContract = new BN('1');
    const amount = leg.size;
    const direction = leg.direction ? 'long' : 'short';
    const optionType =
      leg.instrument.toLowerCase() === 'call'
        ? OptionType.CALL
        : OptionType.PUT;
    const expiresIn = new Date(leg.expiry).getTime() / 1000;
    // Initialize the options meta the long way
    const expiration = new BN(expiresIn);
    quoteAmountPerContract = new BN(
      Number(quoteAmountPerContract) * Math.pow(10, quoteMint.decimals)
    );
    underlyingAmountPerContract = new BN(
      Number(underlyingAmountPerContract) *
        Math.pow(10, underlyingMint.decimals)
    );

    let optionMarket: psyoptionsAmerican.OptionMarketWithKey | null = null;
    const [optionMarketKey, bump] =
      await psyoptionsAmerican.deriveOptionKeyFromParams({
        expirationUnixTimestamp: expiration,
        programId: americanProgram.programId,
        quoteAmountPerContract,
        quoteMint: quoteMint.address,
        underlyingAmountPerContract,
        underlyingMint: underlyingMint.address,
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
            expirationUnixTimestamp: expiration,
            quoteAmountPerContract,
            quoteMint: quoteMint.address,
            underlyingAmountPerContract,
            underlyingMint: underlyingMint.address,
          }
        );
      const feeOwner = psyoptionsAmerican.FEE_OWNER_KEY;
      const mintFeeAccount = cvg.tokens().pdas().associatedTokenAccount({
        mint: underlyingMint.address,
        owner: feeOwner,
      });
      const exerciseFeeAccount = cvg.tokens().pdas().associatedTokenAccount({
        mint: quoteMint.address,
        owner: feeOwner,
      });
      optionMarket = {
        optionMint: optionMarketIx.optionMintKey,
        writerTokenMint: optionMarketIx.writerMintKey,
        underlyingAssetMint: underlyingMint.address,
        quoteAssetMint: quoteMint.address,
        underlyingAmountPerContract,
        quoteAmountPerContract,
        expirationUnixTimestamp: expiration,
        underlyingAssetPool: optionMarketIx.underlyingAssetPoolKey,
        quoteAssetPool: optionMarketIx.quoteAssetPoolKey,
        mintFeeAccount,
        exerciseFeeAccount,
        expired: false,
        bumpSeed: bump,
        key: optionMarketKey,
      };
      //TODO : ADD this after we get the prs merged
      // if (ixTracker.checkedAdd(optionMarketIx.tx)) {
      transaction.add(optionMarketIx.tx);
      // }
      const latestBlockHash = await cvg.connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockHash.blockhash;
      transaction.feePayer = cvg.identity().publicKey;

      optionMarketTxArray.push(transaction);
      const psyAmericanInstrument: PsyoptionsAmericanInstrument =
        await PsyoptionsAmericanInstrument.create(
          cvg,
          underlyingMint,
          quoteMint,
          optionType,
          optionMarket,
          optionMarketKey,
          amount,
          direction
        );
      psyAmericanInstrumentArray.push(psyAmericanInstrument);
    }
  }

  return {
    optionMarketTxArray,
    psyAmericanInstrumentArray,
  };
};
