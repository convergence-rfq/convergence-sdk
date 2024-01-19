import { OperationOptions } from '../../types';
import type { Convergence } from '../../Convergence';
import {
  findWhitelistByAddressOperation,
  FindWhitelistByAddressInput,
  CreateWhitelistInput,
  createWhitelistOperation,
  CheckAddressExistsOnWhitelistInput,
  checkAddressExistsOnWhitelistOperation,
  CleanUpWhitelistInput,
  cleanUpWhitelistOperation,
} from './operations';

export class WhitelistClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc createWhitelist} */
  createWhitelist(input: CreateWhitelistInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createWhitelistOperation(input), options);
  }

  /** {@inheritDoc findWhitelistByAddress} */
  findWhitelistByAddress(
    input: FindWhitelistByAddressInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findWhitelistByAddressOperation(input), options);
  }

  /** {@inheritDoc checkAddressExistsOnWhitelist} */
  checkAddressExistsOnWhitelist(
    input: CheckAddressExistsOnWhitelistInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(checkAddressExistsOnWhitelistOperation(input), options);
  }

  /** {@inheritDoc cleanUpWhitelist} */
  cleanUpWhitelist(input: CleanUpWhitelistInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpWhitelistOperation(input), options);
  }
}
