import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { InstructionUniquenessTracker } from '../../utils/classes';
import {
  PsyoptionsEuropeanInstrument,
  createEuropeanProgram,
} from './instrument';

export type PrepareEuropeanOptionsResult = {
  ataTxs: Transaction[];
  mintTxs: Transaction[];
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

    const { tokenBalance } = await convergence.tokens().getTokenBalance({
      mintAddress:
        leg.optionType == psyoptionsEuropean.OptionType.PUT
          ? euroMeta.putOptionMint
          : euroMeta.callOptionMint,
      owner: caller,
      mintDecimals: PsyoptionsEuropeanInstrument.decimals,
    });

    const tokensToMint = amount - tokenBalance;

    const { instruction: ix } = psyoptionsEuropean.instructions.mintOptions(
      europeanProgram,
      leg.optionMetaPubKey,
      euroMeta as psyoptionsEuropean.EuroMeta,
      minterCollateralKey,
      optionDestination.ataPubKey,
      writerDestination.ataPubKey,
      addDecimals(tokensToMint, PsyoptionsEuropeanInstrument.decimals),
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

  const lastValidBlockHeight = await convergence.rpc().getLatestBlockhash();
  const ataTxs = ataTxBuilderArray.map((b) =>
    b.toTransaction(lastValidBlockHeight)
  );
  const mintTxs = mintTxBuilderArray.map((b) =>
    b.toTransaction(lastValidBlockHeight)
  );

  return {
    ataTxs,
    mintTxs,
  };
};
