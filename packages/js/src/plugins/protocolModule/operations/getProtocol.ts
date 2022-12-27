import { PublicKey } from '@solana/web3.js';
import { Protocol, toProtocol } from '../models';
import { toProtocolAccount } from '../accounts';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '@/types';
import { Convergence } from '@/Convergence';

const Key = 'GetProtocolOperation' as const;

/**
 * Finds Rfq by a given address.
 *
 * ```ts
 * const rfq = await convergence
 *   .protocol()
 *   .get();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getProtocolOperation = useOperation<GetProtocolOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetProtocolOperation = Operation<
  typeof Key,
  GetProtocolInput,
  GetProtocolOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetProtocolInput = {} | undefined;

/**
 * @group Operations
 * @category Outputs
 */
export type GetProtocolOutput = Protocol;

/**
 * @group Operations
 * @category Handlers
 */
export const getProtocolOperationHandler: OperationHandler<GetProtocolOperation> =
  {
    handle: async (
      operation: GetProtocolOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<GetProtocolOutput> => {
      const { commitment } = scope;
      scope.throwIfCanceled();

      const rfqProgram = convergence.programs().getRfq();
      const [address] = await PublicKey.findProgramAddress(
        [Buffer.from('protocol')],
        rfqProgram.address
      );
      const account = await convergence.rpc().getAccount(address, commitment);
      const protocol = toProtocol(toProtocolAccount(account));
      scope.throwIfCanceled();

      return protocol;
    },
  };
