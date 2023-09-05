import {
  FetchHxroPrintTradeProviderConfigInput,
  FetchHxroPrintTradeProviderConfigOutput,
  FetchHxroProductsInput,
  FetchHxroProductsOutput,
  fetchHxroPrintTradeProviderConfigOperation,
  fetchHxroProductsOperation,
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
}
