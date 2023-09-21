import * as psyoptionsAmerican from '@mithraic-labs/psy-american';
import { BN } from 'bn.js';
import { PublicKey } from '@solana/web3.js';
import { Convergence } from '../../Convergence';

import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { CvgWallet } from '../../utils/Wallets';
import { InstructionUniquenessTracker } from '../../utils/classes';
import { PsyoptionsAmericanInstrument } from './types';
import { createAmericanProgram } from './instrument';
import { TransactionBuilder } from '@/utils/TransactionBuilder';

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
  const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();

  const ataTxs = ataTxBuilderArray.map((b) =>
    b.toTransaction(lastValidBlockHeight)
  );
  const mintTxs = mintTxBuilderArray.map((b) =>
    b.toTransaction(lastValidBlockHeight)
  );

  const [ataSignedTxs, mintSignedTxs] = await convergence
    .rpc()
    .signTransactionMatrix([ataTxs, mintTxs], [convergence.identity()]);

  if (ataSignedTxs.length > 0) {
    await Promise.all(
      ataSignedTxs.map((signedTx) =>
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
      )
    );
  }
  if (mintSignedTxs.length > 0) {
    await Promise.all(
      mintSignedTxs.map((signedTx) =>
        convergence
          .rpc()
          .serializeAndSendTransaction(signedTx, lastValidBlockHeight)
      )
    );
  }
};
