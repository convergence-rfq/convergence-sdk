import { PublicKey } from '@solana/web3.js';
import { Side } from '@convergence-rfq/rfq';
import { Instrument } from '../../instrumentModule/models/Instrument';
import { InstrumentClient } from '../../instrumentModule/InstrumentClient';
import { assert } from '@/utils';
import { Convergence } from '@/Convergence';
import { BigNumber, toBigNumber } from '@/types';

/**
 * This model captures all the relevant information about a Psyoptions European
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class PsyoptionsEuropeanInstrument implements Instrument {
  readonly model = 'psyoptionsEuropeanInstrument';

  constructor(
    readonly convergence: Convergence,
    readonly mint: PublicKey,
    readonly legInfo: {
      amount: BigNumber;
      side: Side;
      baseAssetIndex: number;
    } | null,
    readonly decimals = 0
  ) {
    this.convergence = convergence;
    this.legInfo = legInfo;
    this.decimals = decimals;
  }

  static createForLeg(
    convergence: Convergence,
    { mint = PublicKey.default, amount = 0, side = Side.Bid } = {},
    decimals = 0
  ): InstrumentClient {
    const baseAssetIndex = 0;
    const instrument = new PsyoptionsEuropeanInstrument(
      convergence,
      mint,
      {
        amount: toBigNumber(amount),
        side,
        baseAssetIndex,
      },
      decimals
    );

    return new InstrumentClient(convergence, instrument, {
      amount: toBigNumber(amount),
      side,
      baseAssetIndex,
    });
  }

  async getValidationAccounts() {
    return [{ pubkey: PublicKey.default, isSigner: false, isWritable: false }];
  }

  //static createForQuote(
  //  context: Context,
  //  mint = context.assetToken
  //): InstrumentController {
  //  const instrument = new SpotInstrument(context, mint);
  //  mint.assertRegistered();
  //  return new InstrumentController(instrument, null, mint.decimals);
  //}

  //static async addInstrument(context: Context) {
  //  await context.addInstrument(
  //    getSpotInstrumentProgram().programId,
  //    true,
  //    1,
  //    7,
  //    3,
  //    3,
  //    4
  //  );
  //  await context.riskEngine.setInstrumentType(
  //    getSpotInstrumentProgram().programId,
  //    InstrumentType.Spot
  //  );
  //}

  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.toBytes());
  }

  getProgramId(): PublicKey {
    return this.convergence.programs().getPsyoptionsEuropeanInstrument()
      .address;
  }

  //calculateLegSize(instrument: PsyoptionsEuropeanInstrument): number {
  //  return instrument.data.length;
  //}

  //createInstrument(
  //  mint: PublicKey,
  //  decimals: number,
  //  side: Side,
  //  amount: number
  //): PsyoptionsEuropeanInstrument {
  //  return {
  //    model: 'psyoptionsEuropeanInstrument',
  //    mint,
  //    side,
  //    amount: toBigNumber(amount),
  //    decimals,
  //    data: mint.toBuffer(),
  //  };
  //}
}

/** @group Model Helpers */
export const isPsyoptionsEuropeanInstrument = (
  value: any
): value is PsyoptionsEuropeanInstrument =>
  typeof value === 'object' && value.model === 'psyoptionsEuropeanInstrument';

/** @group Model Helpers */
export function assertPsyoptionsEuropeanInstrument(
  value: any
): asserts value is PsyoptionsEuropeanInstrument {
  assert(
    isPsyoptionsEuropeanInstrument(value),
    `Expected PsyoptionsEuropeanInstrument model`
  );
}
