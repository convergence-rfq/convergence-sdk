import {
  fundCollateralOperation,
  FundCollateralInput,
  initializeCollateralOperation,
  InitializeCollateralInput,
  withdrawCollateralOperation,
  WithdrawCollateralInput,
  findCollateralByAddressOperation,
  FindCollateralByAddressInput,
  FindCollateralByUserInput,
  findCollateralByUserOperation,
} from './operations';
import { CollateralPdasClient } from './CollateralPdasClient';
import { OperationOptions } from '@/types';
import type { Convergence } from '@/Convergence';
import { PublicKey } from '@solana/web3.js';

export class CollateralClient {
  constructor(protected readonly convergence: Convergence) {}

  pdas() {
    return new CollateralPdasClient(this.convergence);
  }

  /** {@inheritDoc fundCollateralOperation} */
  fund(input: FundCollateralInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(fundCollateralOperation(input), options);
  }

  /** {@inheritDoc findCollateralByUserOperation} */
  findByUser(input: FindCollateralByUserInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findCollateralByUserOperation(input), options);
  }

  /** {@inheritDoc initializeCollateralOperation} */
  initialize(input: InitializeCollateralInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(initializeCollateralOperation(input), options);
  }

  /** {@inheritDoc withdrawCollateralOperation} */
  withdraw(input: WithdrawCollateralInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(withdrawCollateralOperation(input), options);
  }

  /** {@inheritDoc findRfqByAddressOperation} */
  findByAddress(
    input: FindCollateralByAddressInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findCollateralByAddressOperation(input), options);
  }

  async initializationNecessary(user: PublicKey): Promise<boolean> {
    const collateralInfoPda = this.pdas().collateralInfo({ user });

    const collateralInfo = await this.convergence
      .rpc()
      .getAccount(collateralInfoPda);

    if (collateralInfo.exists) {
      return false;
    }

    return true;
  }
}