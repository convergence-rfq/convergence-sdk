export interface AsyncCollection<T> extends AsyncIterable<T> {
  /**
   * Resolves the generator into a Promise that yields an array of all its values.
   */
  promise(): Promise<T[]>;
}

export function toCollection<T>(generator: () => AsyncGenerator<T, void, void>): AsyncCollection<T> {
    const iterable: AsyncIterable<T> = {
        [Symbol.asyncIterator]: generator,
    };

    return Object.assign(iterable, {
        promise: () => promise(iterable),
    });
}

async function promise<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const item of iterable) {
        result.push(item);
    }
    return result;
}
