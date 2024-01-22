import { PublicKey } from '@solana/web3.js';
import expect from 'expect';
import { createUserCvg } from '../helpers';
import { DAO_PK, MAKER_PK, TAKER_PK } from '../constants';

describe('unit.whitelist', () => {
  const cvg = createUserCvg('taker');
  it('Create a whitelist', async () => {
    await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      whitelist: [MAKER_PK, DAO_PK],
    });
  });

  it('Create a whitelist with MAX Capacity = 20', async () => {
    const pubkeys: PublicKey[] = [];
    for (let i = 0; i < 20; i++) {
      pubkeys.push(TAKER_PK);
    }
    await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      whitelist: [...pubkeys],
    });
  });

  it('clean up', async () => {
    const { whitelist } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      whitelist: [MAKER_PK, DAO_PK],
    });

    await cvg.whitelist().cleanUpWhitelist({
      whitelist: whitelist.address,
    });
  });

  it('find whitelists by address', async () => {
    const {
      whitelist: { address },
    } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      whitelist: [MAKER_PK, DAO_PK],
    });
    const whitelist = await cvg.whitelist().findWhitelistByAddress({
      address,
    });

    expect(whitelist.address).toEqual(address);
  });
});
