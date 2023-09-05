import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import { BN } from 'bn.js';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import {
  ATAExistence,
  getOrCreateATA,
  getOrCreateATAtxBuilder,
} from '../../utils/ata';
import { Mint } from '../tokenModule/models';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { CvgWallet } from '../../utils/Wallets';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';

export const mintAmericanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
) => {
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
    const mintInstructions: TransactionInstruction[] = [];
    if (leg instanceof PsyoptionsAmericanInstrument) {
      const { receiver, amount } = legs[index];
      if (receiver !== callerSide) {
        const optionMarket = await leg.getOptionMeta();
        if (optionMarket) {
          const optionToken = await getOrCreateATAtxBuilder(
            convergence,
            optionMarket.optionMint,
            caller
          );
          if (optionToken.txBuilder) {
            ataTxBuilderArray.push(optionToken.txBuilder);
          }
          const writerToken = await getOrCreateATAtxBuilder(
            convergence,
            optionMarket!.writerTokenMint,
            caller
          );
          if (writerToken.txBuilder) {
            ataTxBuilderArray.push(writerToken.txBuilder);
          }
          const underlyingToken = await getOrCreateATAtxBuilder(
            convergence,
            optionMarket!.underlyingAssetMint,
            caller
          );
          if (underlyingToken.txBuilder) {
            ataTxBuilderArray.push(underlyingToken.txBuilder);
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
          mintInstructions.push(ixWithSigners.ix);
        }
      }
    }
    if (mintInstructions.length > 0) {
      const txBuilder = TransactionBuilder.make().setFeePayer(
        convergence.rpc().getDefaultFeePayer()
      );
      mintInstructions.forEach((ins) => {
        txBuilder.add({
          instruction: ins,
          signers: [convergence.identity()],
        });
      });
      mintTxBuilderArray.push(txBuilder);
    }
  }
  let signedTxs: Transaction[] = [];
  if (ataTxBuilderArray.length > 0 || mintTxBuilderArray.length > 0) {
    const mergedTxBuilderArray = ataTxBuilderArray.concat(mintTxBuilderArray);
    const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
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
      ataSignedTx.map(async (signedTx) => {
        const lastValidBlockHeight = await convergence
          .rpc()
          .getLatestBlockhash();
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight);
      })
    );
  }
  if (mintSignedTx.length > 0) {
    await Promise.all(
      mintSignedTx.map(async (signedTx) => {
        const lastValidBlockHeight = await convergence
          .rpc()
          .getLatestBlockhash();
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight);
      })
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
