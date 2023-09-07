export type PartialKeys<T extends object, K extends keyof T = keyof T> = Omit<
  T,
  K
> &
  Partial<Pick<T, K>>;

export type RequiredKeys<T extends object, K extends keyof T = keyof T> = Omit<
  T,
  K
> &
  Required<Pick<T, K>>;

export type Option<T> = T | null;

export type Opaque<T, K> = T & { __opaque__: K };

export type OptionStrategyData = {
  baseAsset: string;
  quoteAsset: string;
  direction: boolean;
  instrument: string;
  expiry: string;
  strike: number;
  size: number;
};

export enum OptionType {
  CALL = 0,
  PUT = 1,
}
