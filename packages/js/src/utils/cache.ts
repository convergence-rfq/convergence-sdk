export const useCache = <T, U extends any[]>(
  stalenessSeconds: number,
  valueGetter: (...u: U) => Promise<T>
) => {
  const stalenessMs = stalenessSeconds * 1000;
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
