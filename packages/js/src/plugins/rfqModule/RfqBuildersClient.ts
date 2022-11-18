import { createRfqBuilder, CreateRfqBuilderParams } from './operations';
import type { Convergence } from '@/Convergence';
import { TransactionBuilderOptions } from '@/utils';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the NFT module.
 *
 * @see {@link NftClient}
 * @group Module Builders
 * */
export class RfqBuildersClient {
  constructor(protected readonly convergence: Convergence) {}

  /** {@inheritDoc createNftBuilder} */
  create(input: CreateRfqBuilderParams, options?: TransactionBuilderOptions) {
    return createRfqBuilder(this.convergence, input, options);
  }
}
