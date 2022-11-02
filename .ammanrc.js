const path = require('path');
const { LOCALHOST, tmpLedgerDir } = require('@metaplex-foundation/amman');
const rfq = require('@convergence-rfq/rfq');
const riskEngine = require('@convergence-rfq/risk-engine');
const spotInstrument = require('@convergence-rfq/spot-instrument');
const MOCK_STORAGE_ID = 'js-next-sdk';

function localDeployPath(programName) {
  return path.join(__dirname, 'programs', `${programName}.so`);
}

const programs = [
  {
    label: 'RFQ',
    programId: rfq.PROGRAM_ADDRESS,
    deployPath: localDeployPath('mpl_token_metadata'),
  },
  {
    label: 'Risk Engine',
    programId: riskEngine.PROGRAM_ADDRESS,
    deployPath: localDeployPath('mpl_candy_machine'),
  },
  {
    label: 'Spot Instrument',
    programId: spotInstrument.PROGRAM_ADDRESS,
    deployPath: localDeployPath('mpl_auction_house'),
  },
  {
    label: 'Gateway',
    programId: 'gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs',
    deployPath: localDeployPath('solana_gateway_program'),
  },
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
      // ...mplAuctionHouse.accountProviders,
      ...mplCandyMachineCore.accountProviders,
      ...mplCandyGuard.accountProviders,
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
