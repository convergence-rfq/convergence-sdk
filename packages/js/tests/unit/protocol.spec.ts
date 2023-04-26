import { expect } from 'expect';

import { ChildProccess, spawnValidator } from '../../../validator';
import { createCvg } from '../helpers';
import { protocolCache } from '../../src/plugins/protocolModule/cache';

describe('protocol', () => {
  const cvg = createCvg();

  let validator: ChildProccess;

  before((done) => {
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('get', async () => {
    const protocol = await cvg.protocol().get();
    expect(protocol).toHaveProperty('address');
  });

  it('cache', async () => {
    const protocol = await protocolCache.get(cvg);
    expect(protocol).toHaveProperty('address');
  });
});
