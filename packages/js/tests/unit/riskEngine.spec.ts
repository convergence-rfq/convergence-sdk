import { expect } from 'expect';

import { createUserCvg } from '../helpers';

describe('riskEngine', () => {
  const cvg = createUserCvg('dao');

  it('fetch config', async () => {
    const config = await cvg.riskEngine().fetchConfig();
    expect(config).toHaveProperty('address');
  });

  it('update config', async () => {
    const { config } = await cvg.riskEngine().updateConfig();
    expect(config).toHaveProperty('address');
  });

  it('close config', async () => {
    // TODO: Implement
  });
});
