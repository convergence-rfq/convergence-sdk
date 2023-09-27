import { Rfq } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetRfqStateAndAction' as const;

export type RfqState =
  | 'Active'
  | 'Cancelled'
  | 'Constructed'
  | 'Expired'
  | 'Settling'
  | 'SettlingEnded';

export type RfqAction =
  | 'Cancel'
  | 'UnlockCollateral'
  | 'Cleanup'
  | 'FinalizeConstruction'
  | 'Respond'
  | 'ViewResponses'
  | null;
/**
 * getRfqStateAndAction.
 *
 * ```ts
 * const result = await convergence.rfqs().getRfqStateAndAction({
 * rfq,
 * caller: 'maker' | 'taker',
 * })
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getRfqStateAndActionOperation =
  useOperation<GetRfqStateAndAction>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetRfqStateAndAction = Operation<
  typeof Key,
  GetRfqStateAndActionInput,
  GetRfqStateAndActionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetRfqStateAndActionInput = {
  rfq: Rfq;
  caller: 'maker' | 'taker';
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetRfqStateAndActionOutput = {
  rfqState: RfqState;
  rfqAction: RfqAction;
  rfqStateValidUntil: Date | null;
};

/**
 * @group Operations
 * @category Handlers
 */
export const getRfqStateAndActionHandler: SyncOperationHandler<GetRfqStateAndAction> =
  {
    handle: (operation: GetRfqStateAndAction): GetRfqStateAndActionOutput => {
      const { rfq, caller } = operation.input;
      const timestampStart = new Date(Number(rfq.creationTimestamp));
      const timestampExpiry = new Date(
        timestampStart.getTime() + Number(rfq.activeWindow) * 1000
      );
      const timestampSettlement = new Date(
        timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
      );
      const rfqState = getRfqState(rfq, timestampExpiry, timestampSettlement);
      const rfqStateValidUntil = getRfqStateValidity(
        rfqState,
        rfq,
        timestampExpiry,
        timestampSettlement
      );
      const rfqAction = getRfqAction(rfq, rfqState, caller);
      return { rfqState, rfqStateValidUntil, rfqAction };
    },
  };

const getRfqStateValidity = (
  rfqState: RfqState,
  rfq: Rfq,
  timestampExpiry: Date,
  timestampSettlement: Date
) => {
  if (rfqState === 'Active') {
    return timestampExpiry;
  }
  if (rfqState === 'Settling') {
    return timestampSettlement;
  }
  return null;
};

const getRfqState = (
  rfq: Rfq,
  timestampExpiry: Date,
  timestampSettlement: Date
): RfqState => {
  const rfqExpired = timestampExpiry.getTime() <= Date.now();
  const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
  switch (rfq.state) {
    case 'constructed':
      return 'Constructed';
    case 'canceled':
      return 'Cancelled';
    case 'active': {
      if (!rfqExpired) return 'Active';
      if (rfqExpired) return 'Expired';
      if (!settlementWindowElapsed) return 'Settling';
      if (settlementWindowElapsed) return 'SettlingEnded';
    }
  }
  throw new Error('Invalid Rfq state');
};

const getRfqAction = (
  rfq: Rfq,
  rfqState: RfqState,
  caller: 'maker' | 'taker'
): RfqAction => {
  const pendingResponses = rfq.totalResponses - rfq.clearedResponses;

  switch (rfqState) {
    case 'Active':
      if (caller === 'maker') return 'Respond';
      if (caller === 'taker' && pendingResponses > 0) return 'ViewResponses';
      if (caller === 'taker' && pendingResponses === 0) return 'Cancel';
      break;
    case 'Constructed':
      if (caller === 'maker') return null;
      if (caller === 'taker') return 'FinalizeConstruction';
      break;
    case 'Expired':
      if (
        caller === 'taker' &&
        pendingResponses === 0 &&
        rfq.totalTakerCollateralLocked > 0
      )
        return 'UnlockCollateral';
      if (
        caller === 'taker' &&
        pendingResponses === 0 &&
        rfq.totalTakerCollateralLocked == 0
      )
        return 'Cleanup';
      break;
    case 'Cancelled':
      if (caller === 'maker') return null;
      if (
        caller === 'taker' &&
        pendingResponses === 0 &&
        rfq.totalTakerCollateralLocked > 0
      )
        return 'UnlockCollateral';
      if (
        caller === 'taker' &&
        pendingResponses === 0 &&
        rfq.totalTakerCollateralLocked == 0
      )
        return 'Cleanup';
      break;
    default:
      return null;
  }
  return null;
};
