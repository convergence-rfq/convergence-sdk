import { bignum } from '@convergence-rfq/beet';

export type HumanOrderType = 'sell' | 'buy' | 'two-way';
export type HumanSide = 'bid' | 'ask';
export type HumanVenue = 'psyoptions-american' | 'psyoptions-european';

export const u64ToNumber = (u64: bignum): number => {
  return Number(u64.toString());
};
