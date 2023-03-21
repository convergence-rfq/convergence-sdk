import { expect } from 'expect';

import { ChildProccess, spawnValidator } from '../../../validator';
import { createCvg } from '../helpers';
import { Convergence } from '../../src';

describe('protocol', () => {
  let validator: ChildProccess;
  let cvg: Convergence;

  before((done) => {
    cvg = createCvg();
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('get', async () => {
    const protocol = await cvg.protocol().get();
    expect(protocol).toHaveProperty('address');
  });
});
