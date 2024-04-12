import { expect } from 'expect';
import sinon, { SinonStub } from 'sinon';

import { ADDRESS_LABEL, HXRO_MPG, TX_LABEL, runCli } from '../helpers';
import { HXRO_RISK_ENGINE } from '../../../validator';

describe('unit.hxro', () => {
  let stub: SinonStub;

  beforeEach(() => {
    stub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    stub.restore();
  });

  it('display config', async () => {
    await runCli(['hxro', 'display-config']);
    expect(stub.args[0][0]).toEqual(ADDRESS_LABEL);
    expect(stub.args[1][0]).toEqual('Valid Hxro market product group:');
  });

  it('modify config', async () => {
    await runCli(['hxro', 'modify-config', '--valid-mpg', HXRO_MPG.toString()]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });

  it('initialize operator TRG', async () => {
    await runCli([
      'hxro',
      'initialize-operator-trg',
      '--hxro-risk-engine',
      HXRO_RISK_ENGINE,
    ]);
    expect(stub.args[0][0]).toEqual(TX_LABEL);
  });
});
