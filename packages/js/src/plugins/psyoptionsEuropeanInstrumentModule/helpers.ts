import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import { PublicKey } from '@solana/web3.js';
import { getOrCreateATAtxBuilder } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { InstructionUniquenessTracker } from '../../utils/classes';
import {
  PsyoptionsEuropeanInstrument,
  createEuropeanProgram,
} from './instrument';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

export type PrepareEuropeanOptionsResult = {
  ataTxBuilders: TransactionBuilder[];
  mintTxBuilders: TransactionBuilder[];
};
// create European Option ATAs and mint options
export const prepareEuropeanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
) => {
  const ixTracker = new InstructionUniquenessTracker([]);
  const europeanProgram = await createEuropeanProgram(convergence, caller);
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerSide = caller.equals(rfq.taker) ? 'taker' : 'maker';

  const { legs: legExchangeResult } = convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  const mintTxBuilderArray: TransactionBuilder[] = [];
  const ataTxBuilderArray: TransactionBuilder[] = [];
  for (const [index, leg] of rfq.legs.entries()) {
    const { receiver, amount } = legExchangeResult[index];
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

    const optionToken = await getOrCreateATAtxBuilder(
      convergence,
      leg.optionType == psyoptionsEuropean.OptionType.PUT
        ? euroMeta.putOptionMint
        : euroMeta.callOptionMint,
      caller
    );

    if (
      optionToken.txBuilder &&
      ixTracker.checkedAdd(optionToken.txBuilder, 'TransactionBuilder')
    ) {
      ataTxBuilderArray.push(optionToken.txBuilder);
    }
    const writerToken = await getOrCreateATAtxBuilder(
      convergence,
      leg.optionType == psyoptionsEuropean.OptionType.PUT
        ? euroMeta.putWriterMint
        : euroMeta.callWriterMint,
      caller
    );
    if (
      writerToken.txBuilder &&
      ixTracker.checkedAdd(writerToken.txBuilder, 'TransactionBuilder')
    ) {
      ataTxBuilderArray.push(writerToken.txBuilder);
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
    if (tokensToMint! <= 0) continue;
    const { instruction: ix } = psyoptionsEuropean.instructions.mintOptions(
      europeanProgram,
      leg.optionMetaPubKey,
      euroMeta as psyoptionsEuropean.EuroMeta,
      minterCollateralKey,
      optionToken.ataPubKey,
      writerToken.ataPubKey,
      addDecimals(tokensToMint, PsyoptionsEuropeanInstrument.decimals),
      leg.optionType
    );

    ix.keys[0] = {
      pubkey: caller,
      isSigner: true,
      isWritable: false,
    };

    const mintTxBuilder = TransactionBuilder.make()
      .setFeePayer(convergence.rpc().getDefaultFeePayer())
      .add({
        instruction: ix,
        signers: [convergence.identity()],
      });

    await addComputeBudgetIxsIfNeeded(mintTxBuilder, convergence);
    mintTxBuilderArray.push(mintTxBuilder);
  }

  return {
    ataTxBuilders: ataTxBuilderArray,
    mintTxBuilders: mintTxBuilderArray,
  };
};
