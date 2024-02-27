import { COption } from '@convergence-rfq/beet';
import { CustomOptionalF64, CustomOptionalPubkey } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';

export const toCustomOptionalF64 = (
  input: COption<number>
): CustomOptionalF64 => {
  if (input !== null) {
    return {
      __kind: 'Some',
      value: input,
    };
  }
  return {
    __kind: 'None',
  };
};

export const toCustomOptionalPubkey = (
  input: COption<PublicKey>
): CustomOptionalPubkey => {
  if (input !== null) {
    return {
      __kind: 'Some',
      value: input,
    };
  }
  return {
    __kind: 'None',
  };
};
