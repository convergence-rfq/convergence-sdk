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
    const { response } = await cvg.riskEngine().closeConfig();
    expect(response).toHaveProperty('signature');
  });

  it('initialize config', async () => {
    const { config } = await cvg.riskEngine().initializeConfig();
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });
});
