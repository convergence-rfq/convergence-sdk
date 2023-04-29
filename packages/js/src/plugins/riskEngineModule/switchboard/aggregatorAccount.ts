/*
This folder is copied from @switchboard-xyz/solana.js package
The original package had problem building .mjs files with .js extention causing problems with esm-export test suite
Also this package had some problems with ui integration
*/

import Big from 'big.js';
import { AggregatorAccountData } from './types/aggregatorAccountData';

export class AggregatorAccount {
  /**
   * Get the latest confirmed value stored in the aggregator account.
   * @param aggregator Optional parameter representing the already loaded
   * aggregator info.
   * @return latest feed value
   */
  public static decodeLatestValue(
    aggregator: AggregatorAccountData
  ): Big | null {
    if ((aggregator.latestConfirmedRound?.numSuccess ?? 0) === 0) {
      return null;
    }
    const result = aggregator.latestConfirmedRound.result.toBig();
    return result;
  }
}
