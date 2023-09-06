import {
  FetchHxroPrintTradeProviderConfigInput,
  FetchHxroPrintTradeProviderConfigOutput,
  FetchHxroProductsInput,
  FetchHxroProductsOutput,
  InitializeHxroConfigInput,
  InitializeHxroConfigOutput,
  ModifyHxroConfigInput,
  ModifyHxroConfigOutput,
  fetchHxroPrintTradeProviderConfigOperation,
  fetchHxroProductsOperation,
  initializeHxroConfigOperation,
  modifyHxroConfigOperation,
} from './operations';
import { HxroPdasClient } from './pdas';
import { OperationOptions } from '@/types';
import { Convergence } from '@/Convergence';

export class HxroClient {
  constructor(protected readonly cvg: Convergence) {}

  pdas() {
    return new HxroPdasClient(this.cvg);
  }

  fetchConfig(
    input?: FetchHxroPrintTradeProviderConfigInput,
    options?: OperationOptions
  ): Promise<FetchHxroPrintTradeProviderConfigOutput> {
    return this.cvg
      .operations()
      .execute(fetchHxroPrintTradeProviderConfigOperation(input), options);
  }

  fetchProducts(
    input?: FetchHxroProductsInput,
    options?: OperationOptions
  ): Promise<FetchHxroProductsOutput> {
    return this.cvg
      .operations()
      .execute(fetchHxroProductsOperation(input), options);
  }

  initializeConfig(
    input: InitializeHxroConfigInput,
    options?: OperationOptions
  ): Promise<InitializeHxroConfigOutput> {
    return this.cvg
      .operations()
      .execute(initializeHxroConfigOperation(input), options);
  }

  modifyConfig(
    input: ModifyHxroConfigInput,
    options?: OperationOptions
  ): Promise<ModifyHxroConfigOutput> {
    return this.cvg
      .operations()
      .execute(modifyHxroConfigOperation(input), options);
  }
}
