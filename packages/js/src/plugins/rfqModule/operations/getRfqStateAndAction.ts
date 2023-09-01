import { Rfq } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetRfqStateAndAction' as const;

export type RfqState =
  | 'Active'
  | 'Cancelled'
  | 'Constructed'
  | 'Expired'
  | 'Settling'
  | 'SettlingEnded'
  | null;

export type RfqAction =
  | 'Cancel'
  | 'UnlockCollateral'
  | 'Cleanup'
  | 'FinalizeConstruction'
  | 'Respond'
  | 'NewResponses'
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
      const rfqState = getRfqState(rfq);
      const rfqStateValidUntil = getRfqStateValidaity(rfqState, rfq);
      const rfqAction = getRfqAction(rfq, rfqState, caller);
      return { rfqState, rfqStateValidUntil, rfqAction };
    },
  };

const getRfqStateValidaity = (rfqState: RfqState, rfq: Rfq) => {
  if (rfqState === 'Active') {
    const timestampStart = new Date(Number(rfq.creationTimestamp));
    const timestampExpiry = new Date(
      timestampStart.getTime() + Number(rfq.activeWindow) * 1000
    );
    return timestampExpiry;
  }

  if (rfqState === 'Settling') {
    const timestampStart = new Date(Number(rfq.creationTimestamp));
    const timestampExpiry = new Date(
      timestampStart.getTime() + Number(rfq.activeWindow) * 1000
    );
    const timestampSettlement = new Date(
      timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
    );
    return timestampSettlement;
  }
  return null;
};

const getRfqState = (rfq: Rfq): RfqState => {
  const timestampStart = new Date(Number(rfq.creationTimestamp));
  const timestampExpiry = new Date(
    timestampStart.getTime() + Number(rfq.activeWindow) * 1000
  );
  const rfqExpired = timestampExpiry.getTime() <= Date.now();
  const timestampSettlement = new Date(
    timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
  );
  const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
  if (rfq.state === 'constructed') return 'Constructed';
  if (rfq.state === 'canceled') return 'Cancelled';
  if (rfq.state === 'active') {
    if (!rfqExpired) return 'Active';
    if (rfqExpired && rfq.confirmedResponses === 0) return 'Expired';
    if (!settlementWindowElapsed) return 'Settling';
    if (settlementWindowElapsed) return 'SettlingEnded';
  }
  return null;
};

const getRfqAction = (
  rfq: Rfq,
  rfqState: RfqState,
  caller: 'maker' | 'taker'
): RfqAction => {
  const timestampStart = new Date(Number(rfq.creationTimestamp));
  const timestampExpiry = new Date(
    timestampStart.getTime() + Number(rfq.activeWindow) * 1000
  );
  const rfqExpired = timestampExpiry.getTime() <= Date.now();
  const pendingResponses = rfq.totalResponses - rfq.clearedResponses;
  if (
    rfqState === 'Active' &&
    !rfqExpired &&
    caller === 'taker' &&
    pendingResponses === 0
  )
    return 'Cancel';

  if (rfqState === 'Constructed' && caller === 'taker')
    return 'FinalizeConstruction';

  if (rfqState === 'Constructed' && caller === 'maker') return null;

  if (caller === 'taker' && pendingResponses > 0) return 'NewResponses';

  if (rfqState === 'Active' && !rfqExpired && caller === 'maker')
    return 'Respond';

  if (
    ((rfqState === 'Active' && pendingResponses === 0 && rfqExpired) ||
      rfqState === 'Cancelled') &&
    caller === 'taker' &&
    rfq.totalTakerCollateralLocked > 0
  )
    return 'UnlockCollateral';

  if (
    (rfqState === 'Cancelled' || rfqState === 'Active') &&
    pendingResponses === 0 &&
    rfq.totalTakerCollateralLocked == 0 &&
    caller === 'taker'
  )
    return 'Cleanup';

  if (caller === 'maker') return null;

  return null;
};
