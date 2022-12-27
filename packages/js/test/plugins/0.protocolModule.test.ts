import test, { Test } from 'tape';
import spok from 'spok';
import { PublicKey, Keypair } from '@solana/web3.js';
import { PROGRAM_ADDRESS as SPOT_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/spot-instrument';
//import { PROGRAM_ADDRESS as PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS } from '@convergence-rfq/psyoptions-european-instrument';
import {
  convergence,
  killStuckProcess,
  spokSamePubkey,
  initializeProtocol,
  mintAuthority,
} from '../helpers';
import { Convergence } from '@/Convergence';
import { RiskCategory } from '@convergence-rfq/rfq';

killStuckProcess();

let cvg: Convergence;

test('[Convergence] it can create Convergence instance', async () => {
  cvg = await convergence();
});

test('[protocolModule] it can initialize the protocol', async (t: Test) => {
  // const cvg = await convergence();
  const { protocol } = await initializeProtocol(cvg, mintAuthority);

  spok(t, protocol, {
    $topic: 'Initialize Protocol',
    model: 'protocol',
    address: spokSamePubkey(protocol.address),
  });

  const authority = cvg.rpc().getDefaultFeePayer();

  const validateDataAccountAmount = 1;
  const prepareToSettleAccountAmount = 7;
  const settleAccountAmount = 3;
  const revertPreparationAccountAmount = 3;
  const cleanUpAccountAmount = 4;

  await cvg.protocol().addInstrument({
    authority,
    protocol: protocol.address,
    instrumentProgram: new PublicKey(SPOT_INSTRUMENT_PROGRAM_ADDRESS),
    canBeUsedAsQuote: true,
    validateDataAccountAmount,
    prepareToSettleAccountAmount,
    settleAccountAmount,
    revertPreparationAccountAmount,
    cleanUpAccountAmount,
  });

  //spok(t, protocol, {
  //  $topic: 'Add Instrument',
  //  model: 'protocol',
  //  address: spokSamePubkey(protocol.address),
  //});

  //await cvg.protocol().addInstrument({
  //  authority,
  //  protocol: protocol.address,
  //  instrumentProgram: new PublicKey(
  //    PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ADDRESS
  //  ),
  //  validateDataAccountAmount,
  //  prepareToSettleAccountAmount,
  //  settleAccountAmount,
  //  revertPreparationAccountAmount,
  //  cleanUpAccountAmount,
  //});
});

test('[protocolModule] it can add a base asset', async () => {
  const protocol = await cvg.protocol().get({});
  const authority = cvg.rpc().getDefaultFeePayer();
  const rfqProgram = cvg.programs().getRfq();
  const oracleAddress = Keypair.generate().publicKey;
  // const index = 12;
  const indexLe = Buffer.from([0x2, 0x1]);

  //TODO: one of the seeds is the `index`.to_le_bytes(): &u16::from(index).to_le_bytes()
  //  where index: BaseAssetIndex = { value: u16 }
  const [baseAsset] = PublicKey.findProgramAddressSync(
    [Buffer.from('base_asset'), Buffer.from(indexLe)],
    rfqProgram.address
  );

  await cvg.protocol().addBaseAsset({
    authority,
    protocol: protocol.address,
    baseAsset,
    index: { value: 0 },
    ticker: 'USDC',
    riskCategory: RiskCategory.Medium,
    priceOracle: { __kind: 'Switchboard', address: oracleAddress },
  });
});

// test('[protocolModule] it can register mint', async () => {
//   const protocol = await cvg.protocol().get({});

//   const authority = cvg.rpc().getDefaultFeePayer();

//   await cvg.protocol().registerMint({
//     protocol: protocol.address,
//     authority,
//     baseAsset,
//     mint: protocol.collateralMint,
//   });
// });
