import type { Convergence } from '../../Convergence';
import {
  CreateVaultInput,
  CreateVaultOutput,
  createVaultOperation,
  FindVaultByAddressInput,
  FindVaultByAddressOutput,
  findVaultByAddressOperation,
  FindVaultsInput,
  FindVaultsOutput,
  findVaultsOperation,
  ConfirmAndPrepareVaultInput,
  ConfirmAndPrepareVaultOutput,
  confirmAndPrepareVaultOperation,
  WithdrawVaultTokensInput,
  WithdrawVaultTokensOutput,
  withdrawVaultTokensOperation,
} from './operations';
import { VaultOperatorPdasClient } from './pdas';
import { OperationOptions } from '@/types';

export class VaultOperatorClient {
  constructor(protected readonly cvg: Convergence) {}

  pdas() {
    return new VaultOperatorPdasClient(this.cvg);
  }

  create(
    input: CreateVaultInput,
    options?: OperationOptions
  ): Promise<CreateVaultOutput> {
    return this.cvg.operations().execute(createVaultOperation(input), options);
  }

  findByAddress(
    input: FindVaultByAddressInput,
    options?: OperationOptions
  ): Promise<FindVaultByAddressOutput> {
    return this.cvg
      .operations()
      .execute(findVaultByAddressOperation(input), options);
  }

  find(
    input: FindVaultsInput = {},
    options?: OperationOptions
  ): Promise<FindVaultsOutput> {
    return this.cvg.operations().execute(findVaultsOperation(input), options);
  }

  confirmAndPrepare(
    input: ConfirmAndPrepareVaultInput,
    options?: OperationOptions
  ): Promise<ConfirmAndPrepareVaultOutput> {
    return this.cvg
      .operations()
      .execute(confirmAndPrepareVaultOperation(input), options);
  }

  withdrawTokens(
    input: WithdrawVaultTokensInput,
    options?: OperationOptions
  ): Promise<WithdrawVaultTokensOutput> {
    return this.cvg
      .operations()
      .execute(withdrawVaultTokensOperation(input), options);
  }
}
