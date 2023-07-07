import expect from 'expect';
import { useCache } from '../../src';
import { sleep } from '../helpers';

describe('unit.cache', () => {
  const innerCalls: number[] = [];
  const cachedCall = useCache(async (num: number) => {
    innerCalls.push(num);
    return num;
  }, 0.2); // 200 ms cache validity

  const extractCallsAndReset = () => {
    const calls = [...innerCalls];
    innerCalls.length = 0;
    cachedCall.clear();
    return calls;
  };

  it('first call to a cache goes through', async () => {
    const result = await cachedCall.get(5);
    const calls = extractCallsAndReset();
    expect(result).toEqual(5);
    expect(calls).toEqual([5]);
  });

  it('second call to a cache returns a cached result', async () => {
    await cachedCall.get(10);
    const secondResult = await cachedCall.get(11);
    const calls = extractCallsAndReset();
    expect(secondResult).toEqual(10);
    expect(calls).toEqual([10]);
  });

  it('clearing cache works', async () => {
    await cachedCall.get(50);
    cachedCall.clear();
    const secondResult = await cachedCall.get(51);
    const calls = extractCallsAndReset();
    expect(secondResult).toEqual(51);
    expect(calls).toEqual([50, 51]);
  });

  it('cache expiration works', async () => {
    await cachedCall.get(100);
    await sleep(0.4);
    const secondResult = await cachedCall.get(101);
    const calls = extractCallsAndReset();
    expect(secondResult).toEqual(101);
    expect(calls).toEqual([100, 101]);
  });

  it('waits for existing fetch to resolve', async () => {
    let fetchCount = 0;
    const cache = useCache(async (num: number) => {
      fetchCount++;
      await sleep(0.1);
      return num;
    });
    await Promise.all(Array(10).fill(0).map((_, i) => cache.get(i)));
    expect(fetchCount).toBe(1);
  })
  
  it('resolves current promise, even after expiry', async () => {
    const cache = useCache(async (num: number) => {
      await sleep(0.2);
      return num;
    }, 0);
    expect(await cache.get(1)).toBe(1);
    expect(await cache.get(1)).toBe(1);
  })

  it('resolves current promise, even after clean', async () => {
    const cache = useCache(async (num: number) => {
      await sleep(0.2);
      return num;
    });
    const value = cache.get(1);
    cache.clear();
    expect(await value).toBe(1);
  })
});
