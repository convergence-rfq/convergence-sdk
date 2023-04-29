import { Rfq } from '../models';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';

const Key = 'FindRfqsOperation' as const;

/**
 * Finds all RFQs.
 *
 * ```ts
 * const rfq = await convergence
 *   .rfqs()
 *   .find();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const findRfqsOperation = useOperation<FindRfqsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type FindRfqsOperation = Operation<
  typeof Key,
  FindRfqsInput,
  FindRfqsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type FindRfqsInput = {
  /** Optional RFQ page. */
  page?: number;

  /** Optional RFQs per page. */
  pageCount?: number;
};

/**
 * @group Operations
 * @category Outputs
 */
export type FindRfqsOutput = Rfq[];

/**
 * @group Operations
 * @category Handlers
 */
export const findRfqsOperationHandler: OperationHandler<FindRfqsOperation> = {
  handle: async (
    operation: FindRfqsOperation,
    convergence: Convergence,
    scope: OperationScope
  ): Promise<FindRfqsOutput> => {
    const { programs } = scope;

    const rfqProgram = convergence.programs().getRfq(programs);
    const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
    const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
    scope.throwIfCanceled();

    const rfqs = await Promise.all(
      unparsedAccounts.map((unparsedAccount) =>
        convergence
          .rfqs()
          .findRfqByAddress({ address: unparsedAccount.publicKey })
      )
    );

    return rfqs;
  },
};
