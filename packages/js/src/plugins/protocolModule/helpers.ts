import { COption } from '@convergence-rfq/beet';
import { CustomOptionalF64, CustomOptionalPubkey } from '@convergence-rfq/rfq';
import { PublicKey } from '@solana/web3.js';
import { Convergence } from '@/index';

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

export const findVacantBaseAssetIndex = async (cvg: Convergence) => {
  const getRandomNumber = (min: number, max: number) => {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
  };

  let elementsToSkip = getRandomNumber(0, 100);
  const existingBaseAssets = await cvg.protocol().getBaseAssets();
  const existing = existingBaseAssets
    .map((el) => el.index)
    .sort((a, b) => a - b);

  let nextExistingIndex = 0;
  for (let i = 0; i < 2 ** 16; i++) {
    const nextExisting =
      nextExistingIndex < existing.length ? existing[nextExistingIndex] : null;
    if (i === nextExisting) {
      nextExistingIndex++;
    } else if (elementsToSkip > 0) {
      elementsToSkip--;
    } else {
      return i;
    }
  }

  throw new Error('Failed to find a vacant base asset index');
};
