import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import { BN } from 'bn.js';
import { LegSide, QuoteSide } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import { ATAExistence, getOrCreateATA } from '../../utils/helpers';
import { Mint } from '../tokenModule/models';
import { CvgWallet } from '../../utils/CvgWallet';
import {
  InstructionWithSigners,
  TransactionBuilder,
} from '../../utils/TransactionBuilder';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';

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
  const confirmedSide =
    response.confirmed?.side === QuoteSide.Ask ? 'short' : 'long';

  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerIsMaker = caller.toBase58() === response.maker.toBase58();
  const instructionWithSigners: InstructionWithSigners[] = [];
  for (const leg of rfq.legs) {
    if (leg instanceof PsyoptionsAmericanInstrument) {
      if (
        (leg.getSide() === confirmedSide && callerIsTaker) ||
        (leg.getSide() !== confirmedSide && callerIsMaker)
      ) {
        const amount = leg.getAmount();

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
  expirationTimestamp: number
) => {
  const expirationUnixTimestamp = new BN(
    Date.now() / 1_000 + expirationTimestamp
  );

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
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });
  const confirmedSide =
    response.confirmed?.side === QuoteSide.Ask ? 'short' : 'long';
  let flag = false;
  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerIsMaker = caller.toBase58() === response.maker.toBase58();
  for (const leg of rfq.legs) {
    if (leg instanceof PsyoptionsAmericanInstrument) {
      if (
        (leg.getSide() === confirmedSide && callerIsTaker) ||
        (leg.getSide() !== confirmedSide && callerIsMaker)
      ) {
        flag = true;

        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          leg.optionMetaPubKey
        );
        if (optionMarket) {
          await getOrCreateATA(convergence, optionMarket.optionMint, caller);

          await getOrCreateATA(
            convergence,
            optionMarket!.writerTokenMint,
            caller
          );

          await getOrCreateATA(
            convergence,
            optionMarket!.underlyingAssetMint,
            caller
          );
        }
      }
    }
  }
  if (flag === true) {
    return ATAExistence.EXISTS;
  }
  return ATAExistence.NOTEXISTS;
};
