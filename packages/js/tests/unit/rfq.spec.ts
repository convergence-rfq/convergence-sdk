import { expect } from 'expect';

import { ChildProccess, spawnValidator } from '../../../validator';

describe('rfq', () => {
  let validator: ChildProccess;

  before((done) => {
    validator = spawnValidator(done);
  });

  after(() => {
    validator.kill();
  });

  it('get', async () => {
    expect(true).toBe(true);
  });
});
