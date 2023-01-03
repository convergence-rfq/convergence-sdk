const path = require('path');
const { LOCALHOST, tmpLedgerDir } = require('@metaplex-foundation/amman');
const rfq = require('@convergence-rfq/rfq');
const riskEngine = require('@convergence-rfq/risk-engine');
const spotInstrument = require('@convergence-rfq/spot-instrument');
const psyoptionsEuropeanInstrument = require('@convergence-rfq/psyoptions-european-instrument');
const psyoptionsEuropeanPrimitive = require('@mithraic-labs/tokenized-euros');

const MOCK_STORAGE_ID = 'js-next-sdk';

function localDeployPath(programName) {
  return path.join(__dirname, 'programs', `${programName}.so`);
}

function localJsonPath(programName) {
  return path.join(__dirname, 'programs', `${programName}.json`);
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
  },
  {
    label: 'Switchboard BTC Oracle',
    programId: '8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee',
    deployPath: localJsonPath('btc_20000_oracle_switchboard'),
  },
  {
    label: 'Switchboard SOL Oracle',
    programId: 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
    deployPath: localJsonPath('sol_30_oracle_switchboard'),
  },
  {
    label: 'PsyOptions European Primitive',
    programId: psyoptionsEuropeanPrimitive.programId,
    deployPath: localDeployPath('euro_primitive'),
  },
  {
    label: 'Pseudo Pyth Oracle',
    programId: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH',
    deployPath: localDeployPath('pseudo_pyth'),
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
    limitLedgerSize: 300_000_000,
    resetLedger: true,
    verifyFees: false,
  },
  relay: {
    accountProviders: {
      ...rfq.accountProviders,
      ...riskEngine.accountProviders,
      ...spotInstrument.accountProviders,
      ...psyoptionsEuropeanInstrument.accountProviders,
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
