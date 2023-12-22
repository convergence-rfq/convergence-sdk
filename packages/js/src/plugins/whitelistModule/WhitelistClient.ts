import { OperationOptions } from '../../types';
import type { Convergence } from '../../Convergence';
import {
  findWhitelistByAddressOperation,
  FindWhitelistsByCreatorInput,
  findWhitelistsByCreatorOperation,
  FindWhitelistByAddressInput,
  CreateWhitelistInput,
  createWhitelistOperation,
  CheckAddressExistsOnWhitelistInput,
  checkAddressExistsOnWhitelistOperation,
  AddAddressToWhitelistInput,
  addAddressToWhitelistOperation,
  RemoveAddressFromWhitelistInput,
  removeAddressFromWhitelistOperation,
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

  /** {@inheritDoc findWhitelistByCreator} */
  findWhitelistsByCreator(
    input: FindWhitelistsByCreatorInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findWhitelistsByCreatorOperation(input), options);
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

  /** {@inheritDoc addAddressToWhitelist} */
  addAddressToWhitelist(
    input: AddAddressToWhitelistInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(addAddressToWhitelistOperation(input), options);
  }

  /** {@inheritDoc removeAddressFromWhitelist} */
  removeAddressFromWhitelist(
    input: RemoveAddressFromWhitelistInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(removeAddressFromWhitelistOperation(input), options);
  }

  /** {@inheritDoc cleanUpWhitelist} */
  cleanUpWhitelist(input: CleanUpWhitelistInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpWhitelistOperation(input), options);
  }
}
