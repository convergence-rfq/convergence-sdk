import { DEFAULT_STALENESS } from '..';

export const useCache = <T, U extends any[]>(
  valueGetter: (...u: U) => Promise<T>,
  stalenessSeconds = DEFAULT_STALENESS
) => {
  const stalenessMs = stalenessSeconds * 1_000;
  let cache: { value: T; time: Date } | null = null;

  return {
    get: async (...u: U) => {
      if (cache === null || Date.now() - cache.time.getDate() > stalenessMs) {
        const value = await valueGetter(...u);
        cache = {
          value,
          time: new Date(),
        };
      }

      return cache.value;
    },
    clear: () => {
      cache = null;
    },
  };
};
