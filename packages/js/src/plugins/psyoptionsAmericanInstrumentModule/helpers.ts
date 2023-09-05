import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import { BN } from 'bn.js';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import {
  ATAExistence,
  getOrCreateATA,
  getOrCreateATAInx,
} from '../../utils/ata';
import { Mint } from '../tokenModule/models';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';

export const mintAmericanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
) => {
  const americanProgram = createAmericanProgram(convergence);
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
    const instructions: TransactionInstruction[] = [];
    if (leg instanceof PsyoptionsAmericanInstrument) {
      const { receiver, amount } = legs[index];
      if (receiver !== callerSide) {
        const optionMarket = await leg.getOptionMeta();
        if (optionMarket) {
          const optionToken = await getOrCreateATAInx(
            convergence,
            optionMarket.optionMint,
            caller
          );
          if (optionToken.instruction) {
            instructions.push(optionToken.instruction);
          }
          const writerToken = await getOrCreateATAInx(
            convergence,
            optionMarket!.writerTokenMint,
            caller
          );
          if (writerToken.instruction) {
            instructions.push(writerToken.instruction);
          }
          const underlyingToken = await getOrCreateATAInx(
            convergence,
            optionMarket!.underlyingAssetMint,
            caller
          );
          if (underlyingToken.instruction) {
            instructions.push(underlyingToken.instruction);
          }
          const ixWithSigners =
            await psyoptionsAmerican.instructions.mintOptionV2Instruction(
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
          instructions.push(ixWithSigners.ix);
        }
      }
    }
    if (instructions.length > 0) {
      const txBuilder = TransactionBuilder.make().setFeePayer(
        convergence.rpc().getDefaultFeePayer()
      );
      instructions.forEach((ins) => {
        txBuilder.add({
          instruction: ins,
          signers: [convergence.rpc().getDefaultFeePayer()],
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
    signedTxs.map(
      async (signedTx) =>
        await convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
    );
  }
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

  const americanProgram = createAmericanProgram(convergence);

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
