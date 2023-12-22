import { PublicKey } from '@solana/web3.js';

import expect from 'expect';
import { createUserCvg, expectError } from '../helpers';
import { DAO_PK, MAKER_PK, TAKER_PK, TESTING_PK } from '../constants';

describe('unit.whitelist', () => {
  const cvg = createUserCvg('taker');
  it('Create a whitelist', async () => {
    await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      capacity: 10,
      whitelist: [MAKER_PK, DAO_PK],
    });
  });

  it('Add an address to whitelist', async () => {
    const newPublickey = new PublicKey(
      'Eyv3PBdmp5PUVzrT3orDVad8roBMK8au9nKBazZXkKtA'
    );

    const { whitelist } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      capacity: 10,
      whitelist: [MAKER_PK, DAO_PK],
    });

    await cvg.whitelist().addAddressToWhitelist({
      whitelist: whitelist.address,
      addressToAdd: newPublickey,
    });
  });

  it('remove an address from whitelist', async () => {
    const { whitelist } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      capacity: 10,
      whitelist: [MAKER_PK, DAO_PK],
    });

    await cvg.whitelist().removeAddressFromWhitelist({
      whitelist: whitelist.address,
      addressToRemove: DAO_PK,
    });
  });

  it('add duplicate address to whitelist more than capacity', async () => {
    const { whitelist } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      capacity: 10,
      whitelist: [MAKER_PK, DAO_PK],
    });

    await expectError(
      cvg.whitelist().addAddressToWhitelist({
        whitelist: whitelist.address,
        addressToAdd: DAO_PK,
      }),
      'AddressAlreadyExistsOnWhitelist'
    );
  });

  it('add excess addresses to whitelist more than capacity', async () => {
    const { whitelist } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      capacity: 2,
      whitelist: [MAKER_PK, DAO_PK],
    });

    await expectError(
      cvg.whitelist().addAddressToWhitelist({
        whitelist: whitelist.address,
        addressToAdd: TESTING_PK,
      }),
      'WhitelistMaximumCapacityReached'
    );
  });

  it('clean up', async () => {
    const { whitelist } = await cvg.whitelist().createWhitelist({
      creator: TAKER_PK,
      capacity: 10,
      whitelist: [MAKER_PK, DAO_PK],
    });

    await cvg.whitelist().cleanUpWhitelist({
      whitelist: whitelist.address,
    });
  });

  it('find whitelists by creator', async () => {
    const whitelists = await cvg.whitelist().findWhitelistsByCreator({
      creator: TAKER_PK,
    });

    expect(whitelists.length).toBe(5);
  });
});
