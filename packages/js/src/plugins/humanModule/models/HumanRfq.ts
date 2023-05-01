import { PublicKey } from '@solana/web3.js';

import { Rfq } from '../../../plugins/rfqModule';
import { assert } from '../../../utils';

export type HumanRfq = {
  readonly model: 'humanRfq';
  readonly address: PublicKey;
};

/** @group Model Helpers */
export const isHumanRfq = (value: any): value is HumanRfq =>
  typeof value === 'object' && value.model === 'humanRfq';

/** @group Model Helpers */
export function assertHumanRfq(value: any): asserts value is HumanRfq {
  assert(isHumanRfq(value), `Expected humanRfq model`);
}

/** @group Model Helpers */
export const toHumanRfq = (rfq: Rfq): HumanRfq => ({
  model: 'humanRfq',
  address: rfq.address,
});
