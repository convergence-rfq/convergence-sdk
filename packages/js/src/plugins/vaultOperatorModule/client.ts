import type { Convergence } from '../../Convergence';
import {
  CreateVaultInput,
  CreateVaultOutput,
  createVaultOperation,
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
}
