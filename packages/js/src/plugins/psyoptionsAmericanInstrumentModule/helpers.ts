import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { BN } from 'bn.js';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { Mint } from '../tokenModule/models';
import { CvgWallet } from '../../utils/Wallets';
import { InstructionUniquenessTracker } from '../../utils/classes';
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
