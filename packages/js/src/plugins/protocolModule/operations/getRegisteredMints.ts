import { RegisteredMint, toRegisteredMint } from '../models';
import { toRegisteredMintAccount } from '../accounts';
import { ProtocolGpaBuilder } from '../ProtocolGpaBuilder';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'GetRegisteredMintsOperation' as const;

/**
 * Gets protocol registered mints.
 *
 * ```ts
 * const rfq = await convergence
 *   .protocol()
 *   .getRegisteredMints();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getRegisteredMintsOperation =
  useOperation<GetRegisteredMintsOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetRegisteredMintsOperation = Operation<
  typeof Key,
  GetRegisteredMintsInput,
  GetRegisteredMintsOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetRegisteredMintsInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type GetRegisteredMintsOutput = RegisteredMint[];

/**
 * @group Operations
 * @category Handlers
 */
export const getRegisteredMintsOperationHandler: OperationHandler<GetRegisteredMintsOperation> =
  {
    handle: async (
      operation: GetRegisteredMintsOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<GetRegisteredMintsOutput> => {
      const { programs } = scope;

      const rfqProgram = convergence.programs().getRfq(programs);
      const protocolGpaBuilder = new ProtocolGpaBuilder(
        convergence,
        rfqProgram.address
      );
      const registeredMints = await protocolGpaBuilder
        .whereRegisteredMints()
        .get();
      scope.throwIfCanceled();

      return registeredMints
        .map<RegisteredMint | null>((account) => {
          if (account === null) {
            return null;
          }

          try {
            return toRegisteredMint(toRegisteredMintAccount(account));
          } catch (e) {
            return null;
          }
        })
        .filter(
          (registeredMint): registeredMint is RegisteredMint =>
            registeredMint !== null
        );
    },
  };
