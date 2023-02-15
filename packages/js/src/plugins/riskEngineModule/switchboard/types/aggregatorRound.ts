import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import * as borsh from '@coral-xyz/borsh'; // eslint-disable-line @typescript-eslint/no-unused-vars
import {
  SwitchboardDecimal,
  SwitchboardDecimalFields,
} from './switchboardDecimal';

export interface AggregatorRoundFields {
  /**
   * Maintains the number of successful responses received from nodes.
   * Nodes can submit one successful response per round.
   */
  numSuccess: number;
  /** Number of error responses. */
  numError: number;
  /** Whether an update request round has ended. */
  isClosed: boolean;
  /** Maintains the `solana_program::clock::Slot` that the round was opened at. */
  roundOpenSlot: BN;
  /** Maintains the `solana_program::clock::UnixTimestamp;` the round was opened at. */
  roundOpenTimestamp: BN;
  /** Maintains the current median of all successful round responses. */
  result: SwitchboardDecimalFields;
  /** Standard deviation of the accepted results in the round. */
  stdDeviation: SwitchboardDecimalFields;
  /** Maintains the minimum node response this round. */
  minResponse: SwitchboardDecimalFields;
  /** Maintains the maximum node response this round. */
  maxResponse: SwitchboardDecimalFields;
  /** Pubkeys of the oracles fulfilling this round. */
  oraclePubkeysData: Array<PublicKey>;
  /** Represents all successful node responses this round. `NaN` if empty. */
  mediansData: Array<SwitchboardDecimalFields>;
  /** Current rewards/slashes oracles have received this round. */
  currentPayout: Array<BN>;
  /** Keep track of which responses are fulfilled here. */
  mediansFulfilled: Array<boolean>;
  /** Keeps track of which errors are fulfilled here. */
  errorsFulfilled: Array<boolean>;
}

export class AggregatorRound {
  /**
   * Maintains the number of successful responses received from nodes.
   * Nodes can submit one successful response per round.
   */
  readonly numSuccess: number;
  /** Number of error responses. */
  readonly numError: number;
  /** Whether an update request round has ended. */
  readonly isClosed: boolean;
  /** Maintains the `solana_program::clock::Slot` that the round was opened at. */
  readonly roundOpenSlot: BN;
  /** Maintains the `solana_program::clock::UnixTimestamp;` the round was opened at. */
  readonly roundOpenTimestamp: BN;
  /** Maintains the current median of all successful round responses. */
  readonly result: SwitchboardDecimal;
  /** Standard deviation of the accepted results in the round. */
  readonly stdDeviation: SwitchboardDecimal;
  /** Maintains the minimum node response this round. */
  readonly minResponse: SwitchboardDecimal;
  /** Maintains the maximum node response this round. */
  readonly maxResponse: SwitchboardDecimal;
  /** Pubkeys of the oracles fulfilling this round. */
  readonly oraclePubkeysData: Array<PublicKey>;
  /** Represents all successful node responses this round. `NaN` if empty. */
  readonly mediansData: Array<SwitchboardDecimal>;
  /** Current rewards/slashes oracles have received this round. */
  readonly currentPayout: Array<BN>;
  /** Keep track of which responses are fulfilled here. */
  readonly mediansFulfilled: Array<boolean>;
  /** Keeps track of which errors are fulfilled here. */
  readonly errorsFulfilled: Array<boolean>;

  constructor(fields: AggregatorRoundFields) {
    this.numSuccess = fields.numSuccess;
    this.numError = fields.numError;
    this.isClosed = fields.isClosed;
    this.roundOpenSlot = fields.roundOpenSlot;
    this.roundOpenTimestamp = fields.roundOpenTimestamp;
    this.result = new SwitchboardDecimal({ ...fields.result });
    this.stdDeviation = new SwitchboardDecimal({
      ...fields.stdDeviation,
    });
    this.minResponse = new SwitchboardDecimal({ ...fields.minResponse });
    this.maxResponse = new SwitchboardDecimal({ ...fields.maxResponse });
    this.oraclePubkeysData = fields.oraclePubkeysData;
    this.mediansData = fields.mediansData.map(
      (item) => new SwitchboardDecimal({ ...item })
    );
    this.currentPayout = fields.currentPayout;
    this.mediansFulfilled = fields.mediansFulfilled;
    this.errorsFulfilled = fields.errorsFulfilled;
  }

  static layout(property?: string) {
    return borsh.struct(
      [
        borsh.u32('numSuccess'),
        borsh.u32('numError'),
        borsh.bool('isClosed'),
        borsh.u64('roundOpenSlot'),
        borsh.i64('roundOpenTimestamp'),
        SwitchboardDecimal.layout('result'),
        SwitchboardDecimal.layout('stdDeviation'),
        SwitchboardDecimal.layout('minResponse'),
        SwitchboardDecimal.layout('maxResponse'),
        borsh.array(borsh.publicKey(), 16, 'oraclePubkeysData'),
        borsh.array(SwitchboardDecimal.layout(), 16, 'mediansData'),
        borsh.array(borsh.i64(), 16, 'currentPayout'),
        borsh.array(borsh.bool(), 16, 'mediansFulfilled'),
        borsh.array(borsh.bool(), 16, 'errorsFulfilled'),
      ],
      property
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromDecoded(obj: any) {
    return new AggregatorRound({
      numSuccess: obj.numSuccess,
      numError: obj.numError,
      isClosed: obj.isClosed,
      roundOpenSlot: obj.roundOpenSlot,
      roundOpenTimestamp: obj.roundOpenTimestamp,
      result: SwitchboardDecimal.fromDecoded(obj.result),
      stdDeviation: SwitchboardDecimal.fromDecoded(obj.stdDeviation),
      minResponse: SwitchboardDecimal.fromDecoded(obj.minResponse),
      maxResponse: SwitchboardDecimal.fromDecoded(obj.maxResponse),
      oraclePubkeysData: obj.oraclePubkeysData,
      mediansData: obj.mediansData.map(
        (
          item: any /* eslint-disable-line @typescript-eslint/no-explicit-any */
        ) => SwitchboardDecimal.fromDecoded(item)
      ),
      currentPayout: obj.currentPayout,
      mediansFulfilled: obj.mediansFulfilled,
      errorsFulfilled: obj.errorsFulfilled,
    });
  }
}
