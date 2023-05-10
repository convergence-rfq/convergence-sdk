import { Protocol } from '../../protocolModule/models/Protocol';
import { u64ToNumber } from '../types';
import { HumanInstrument, toHumanInstrument } from './HumanInstrument';

export type HumanFees = {
  makerBps: number;
  takerBps: number;
};

export type HumanProtocol = {
  readonly model: 'humanProtocol';
  readonly address: string;
  readonly authority: string;
  readonly active: boolean;
  readonly settleFees: HumanFees;
  readonly defaultFees: HumanFees;
  readonly riskEngine: string;
  readonly collateralMint: string;
  readonly instruments: HumanInstrument[];
};

export const toHumanProtocol = (protocol: Protocol): HumanProtocol => {
  return {
    model: 'humanProtocol',
    address: protocol.address.toBase58(),
    authority: protocol.authority.toBase58(),
    active: protocol.active,
    settleFees: {
      makerBps: u64ToNumber(protocol.settleFees.makerBps),
      takerBps: u64ToNumber(protocol.settleFees.takerBps),
    },
    defaultFees: {
      makerBps: u64ToNumber(protocol.defaultFees.makerBps),
      takerBps: u64ToNumber(protocol.defaultFees.takerBps),
    },
    riskEngine: protocol.riskEngine.toBase58(),
    collateralMint: protocol.collateralMint.toBase58(),
    instruments: protocol.instruments.map(toHumanInstrument),
  };
};
