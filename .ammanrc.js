const path = require('path');
const { LOCALHOST, tmpLedgerDir } = require('@metaplex-foundation/amman');
const rfq = require('@convergence-rfq/rfq');
const riskEngine = require('@convergence-rfq/risk-engine');
const spotInstrument = require('@convergence-rfq/spot-instrument');
const psyoptionsEuropeanInstrument = require('@convergence-rfq/psyoptions-european-instrument');

const MOCK_STORAGE_ID = 'js-next-sdk';

function localDeployPath(programName) {
  return path.join(__dirname, 'programs', `${programName}.so`);
}

const programs = [
  {
    label: 'RFQ',
    programId: rfq.PROGRAM_ADDRESS,
    deployPath: localDeployPath('rfq'),
  },
  {
    label: 'Risk Engine',
    programId: riskEngine.PROGRAM_ADDRESS,
    deployPath: localDeployPath('risk_engine'),
  },
  {
    label: 'Spot Instrument',
    programId: spotInstrument.PROGRAM_ADDRESS,
    deployPath: localDeployPath('spot_instrument'),
  },
  {
    label: 'PsyOptions European Instrument',
    programId: psyoptionsEuropeanInstrument.PROGRAM_ADDRESS,
    deployPath: localDeployPath('psyoptions_european_instrument'),
  }
];

module.exports = {
  validator: {
    killRunningValidators: true,
    programs,
    jsonRpcUrl: LOCALHOST,
    websocketUrl: '',
    commitment: 'confirmed',
    ledgerDir: tmpLedgerDir(),
    resetLedger: true,
    verifyFees: false,
  },
  relay: {
    accountProviders: {
      ...rfq.accountProviders,
      ...riskEngine.accountProviders,
      ...spotInstrument.accountProviders,
    },
  },
  storage: {
    storageId: MOCK_STORAGE_ID,
    clearOnStart: true,
  },
  snapshot: {
    snapshotFolder: path.join(__dirname, 'snapshots'),
  },
};
