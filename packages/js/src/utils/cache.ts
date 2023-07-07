interface CahcedValue<T> {
  value: T;
  time: number;
}

export const useCache = <T, U extends any[]>(
  valueGetter: (...u: U) => Promise<T>,
  stalenessSeconds = 300
) => {
  const stalenessMs = stalenessSeconds * 1_000;
  let cache: CahcedValue<T> | null = null;
  let operation: Promise<T> | undefined;

  return {
    get: async (...u: U) => {
      if (cache !== null) {
        if (Date.now() - cache.time <= stalenessMs) {
          // return cached value
          return cache.value;
        } else {
          // clear cached value once expired
          cache = null;
          operation = undefined;
        }
      }

      // return existing getter promise or start a new one
      let value: T;
      if (operation) {
        value = await operation;
      } else {
        operation = valueGetter(...u);
        value = await operation;
      }
      cache = {
        value,
        time: Date.now(),
      };

      return cache.value;
    },
    clear: () => {
      cache = null;
      operation = undefined;
    },
  };
};