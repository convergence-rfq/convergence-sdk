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
import { Collateral } from './models';

export class CollateralClient {
  constructor(protected readonly convergence: Convergence) {}

  pdas() {
    return new CollateralPdasClient(this.convergence);
  }

  /** {@inheritDoc initializeCollateralOperation} */
  initialize(input: InitializeCollateralInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(initializeCollateralOperation(input), options);
  }

  /** {@inheritDoc fundCollateralOperation} */
  fund(input: FundCollateralInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(fundCollateralOperation(input), options);
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

  /** {@inheritDoc findCollateralByUserOperation} */
  findByUser(input: FindCollateralByUserInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findCollateralByUserOperation(input), options);
  }

  // /**
  //  * Helper method that refetches a given model
  //  * and returns an instance of the same type.
  //  *
  //  * If the model we pass is an `Response`, we extract the pubkey and
  //  * pass to `findResponseByAddress`. Else, it's a pubkey and we pass
  //  * it directly.
  //  *
  //  * ```ts
  //  * collateral = await convergence.collateral().refresh(collateral);
  //  * ```
  //  */
  refresh<T extends Collateral | PublicKey>(
    model: T,
    options?: OperationOptions
  ): Promise<T extends PublicKey ? Collateral : T> {
    return this.findByAddress(
      {
        address: 'model' in model ? model.address : model,
      },
      options
    ) as Promise<T extends PublicKey ? Collateral : T>;
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
