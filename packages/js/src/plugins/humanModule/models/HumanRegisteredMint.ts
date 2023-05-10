import { RegisteredMint } from '../../';

export type HumanRegisteredMint = {
  readonly model: 'humanRegisteredMint';
  readonly address: string;
};

export const toHumanRegisteredMint = (
  registeredMint: RegisteredMint
): HumanRegisteredMint => {
  return {
    model: 'humanRegisteredMint',
    address: registeredMint.address.toBase58(),
  };
};
