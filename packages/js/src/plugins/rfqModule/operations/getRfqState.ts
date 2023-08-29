import { Rfq } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetRfqState' as const;
export type RfqState =
  | 'Kill'
  | 'Reclaim'
  | 'Cleanup'
  | 'Resubmit'
  | 'Respond'
  | 'Responses'
  | 'Complete'
  | 'None';
/**
 * getRfqState.
 *
 * ```ts
 * const result = await convergence.rfqs().getRfqState({
 *  response,
 * rfq,
 * })
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getRfqStateOperation = useOperation<GetRfqState>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetRfqState = Operation<
  typeof Key,
  GetRfqStateInput,
  GetRfqStateOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetRfqStateInput = {
  rfq: Rfq;
  caller: 'maker' | 'taker';
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetRfqStateOutput = {
  rfqState: RfqState;
};

/**
 * @group Operations
 * @category Handlers
 */
export const getRfqStateHandler: SyncOperationHandler<GetRfqState> = {
  handle: (operation: GetRfqState): GetRfqStateOutput => {
    const { rfq, caller } = operation.input;
    let state: RfqState;
    const timestampStart = new Date(Number(rfq.creationTimestamp));
    const timestampExpiry = new Date(
      timestampStart.getTime() + Number(rfq.activeWindow) * 1000
    );
    const timestampSettlement = new Date(
      timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
    );
    const rfqExpired = timestampExpiry.getTime() <= Date.now();
    const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
    const pendingResponses = rfq.totalResponses - rfq.clearedResponses;
    const { confirmedResponses } = rfq;
    const rfqState = rfq.state;
    switch (true) {
      case rfqState === 'active' &&
        !rfqExpired &&
        caller === 'taker' &&
        pendingResponses === 0:
        state = 'Kill';
        break;
      case rfqState === 'constructed' && caller === 'taker':
        state = 'Resubmit';
        break;
      case caller === 'taker' && pendingResponses > 0:
        state = 'Responses';
        break;
      case rfqState === 'active' && !rfqExpired && caller === 'maker':
        state = 'Respond';
        break;
      case ((rfqState === 'active' && pendingResponses === 0 && rfqExpired) ||
        rfqState === 'canceled') &&
        caller === 'taker' &&
        rfq.totalTakerCollateralLocked > 0:
        state = 'Reclaim';
        break;
      case (rfqState === 'canceled' || rfqState === 'active') &&
        pendingResponses === 0 &&
        rfq.totalTakerCollateralLocked == 0 &&
        caller === 'taker':
        state = 'Cleanup';
        break;
      case !settlementWindowElapsed &&
        confirmedResponses > 0 &&
        rfq.totalTakerCollateralLocked > 0:
        state = 'Complete';
        break;
      case caller === 'maker':
        state = 'None';
        break;
      default:
        state = 'None';
        break;
    }
    return { rfqState: state };
  },
};
