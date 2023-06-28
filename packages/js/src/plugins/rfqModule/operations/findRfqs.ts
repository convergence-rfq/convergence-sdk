import { Rfq, toRfq } from '../models';
import { RfqGpaBuilder } from '../RfqGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import { Convergence } from '../../../Convergence';
import { toRfqAccount } from "../accounts";

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
   * Specifies the number of RFQs returned per interation.
   * Defaults to 100
   */
  chunkSize?: number;
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
  handle: async function*(
    operation: FindRfqsOperation,
    convergence: Convergence,
    scope: OperationScope
  ) {
    const { programs, commitment } = scope;
    const { input: { chunkSize = 100 } } = operation;

    const rfqProgram = convergence.programs().getRfq(programs);
    const rfqGpaBuilder = new RfqGpaBuilder(convergence, rfqProgram.address);
    const unparsedAccounts = await rfqGpaBuilder.withoutData().get();
    scope.throwIfCanceled();

    const unparsedAddresses = unparsedAccounts.map(account => account.publicKey);

    for (let i = 0; i < unparsedAddresses.length; i += chunkSize) {
      const chunk = unparsedAddresses.slice(i, i + chunkSize);

      const accounts = await convergence.rpc().getMultipleAccounts(chunk, commitment);
      yield await Promise.all(
        accounts.map(account => toRfq(convergence, toRfqAccount(account)))
      );
    }
  },
};
