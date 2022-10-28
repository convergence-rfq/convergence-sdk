import {
  createRfqBuilder,
  CreateRfqBuilderParams,
  useRfqBuilder,
  UseRfqBuilderParams,
  verifyRfqLegsBuilder,
  VerifyRfqLegsBuilderParams,
  verifyRfqCreatorBuilder,
  VerifyRfqCreatorBuilderParams,
} from './operations';
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

  /** {@inheritDoc useNftBuilder} */
  use(input: UseRfqBuilderParams, options?: TransactionBuilderOptions) {
    return useRfqBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc verifyNftCreatorBuilder} */
  verifyCreator(
    input: VerifyRfqCreatorBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return verifyRfqCreatorBuilder(this.convergence, input, options);
  }

  /** {@inheritDoc verifyNftCollectionBuilder} */
  verifyCollection(
    input: VerifyRfqLegsBuilderParams,
    options?: TransactionBuilderOptions
  ) {
    return verifyRfqLegsBuilder(this.convergence, input, options);
  }
}
