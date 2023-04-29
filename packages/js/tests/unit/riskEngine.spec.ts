import { expect } from 'expect';

import { createUserCvg } from '../helpers';
import { InstrumentType } from '../../src';

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

  it('set instrument type [spot]', async () => {
    const { config } = await cvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Spot,
      instrumentProgram: cvg.programs().getSpotInstrument().address,
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set instrument type [american]', async () => {
    const { config } = await cvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Option,
      instrumentProgram: cvg.programs().getPsyoptionsAmericanInstrument()
        .address,
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });

  it('set instrument type [european]', async () => {
    const { config } = await cvg.riskEngine().setInstrumentType({
      instrumentType: InstrumentType.Option,
      instrumentProgram: cvg.programs().getPsyoptionsEuropeanInstrument()
        .address,
    });
    expect(config.address).toEqual(cvg.riskEngine().pdas().config());
  });
});
