import BigNumber from 'bignumber.js';
import BN from 'bn.js';
import { HXRO_LEG_DECIMALS } from './constants';
import { Convergence } from '@/Convergence';
import { PublicKey } from '@/types';

export const fetchValidHxroMpg = async (cvg: Convergence, manifest: any) => {
  const { validMpg } = await cvg.hxro().fetchConfig();

  const mpg = await manifest.getMPG(validMpg);
  return { pubkey: validMpg, ...mpg };
};

export const numberToHxroFractional = (value: number, negate?: boolean) => {
  let withDecimals = new BigNumber(value).times(
    new BigNumber(10).pow(HXRO_LEG_DECIMALS)
  );

  if (negate) {
    withDecimals = withDecimals.negated();
  }

  return { m: new BN(withDecimals.toString()), exp: new BN(HXRO_LEG_DECIMALS) };
};

export const getFirstHxroExecutionOutput = async (
  cvg: Convergence,
  dexProgramId: PublicKey
) => {
  const [{ pubkey }] = await cvg.connection.getProgramAccounts(dexProgramId, {
    dataSlice: { length: 1, offset: 0 },
    filters: [{ memcmp: { offset: 0, bytes: 'EdEf3SczfYR' } }],
  });

  return pubkey;
};
