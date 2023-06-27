import { Rfq } from '../models';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  PublicKey,
  UnparsedAccount,
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
  /**
   * Optional RFQ owner.
   */
  owner?: PublicKey;
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
    const { owner } = operation.input;

    const rfqProgram = convergence.programs().getRfq(programs);
    const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);

    const unparsedAccounts: UnparsedAccount[] = [];
    if (owner) {
      const result = await rfqGpaBuilder.whereTaker(owner).get();
      unparsedAccounts.push(...result);
    } else {
      const result = await rfqGpaBuilder.withoutData().get();
      unparsedAccounts.push(...result);
    }

    const rfqs = await Promise.all(
      unparsedAccounts.map((acc) =>
        convergence.rfqs().findRfqByAddress({ address: acc.publicKey })
      )
    );

    return rfqs;
  },
};
