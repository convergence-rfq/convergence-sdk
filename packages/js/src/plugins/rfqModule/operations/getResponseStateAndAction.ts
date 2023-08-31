import { Rfq, Response } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetResponseStateAndAction' as const;
export type ResponseAction =
  | 'Cancel'
  | 'UnlockCollateral'
  | 'Cleanup'
  | 'Rejected'
  | 'Defaulted'
  | 'Settle'
  | 'Settled'
  | 'Expired'
  | 'Approve'
  | 'Cancelled'
  | null;

export type ResponseState =
  | 'Active'
  | 'Cancelled'
  | 'Defaulted'
  | 'Settled'
  | 'SettlingPreparations'
  | 'ReadyForSettling'
  | 'WaitingForLastLook'
  | null;

/**
 * getResponseStateAndAction.
 *
 * ```ts
 * const result = await convergence.rfqs().getResponseStateAndAction({
 * response,
 * rfq,
 * caller: 'taker'| 'maker,
 * responseSide: 'ask' | 'bid'
 * })
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getResponseStateAndActionOperation =
  useOperation<GetResponseStateAndAction>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetResponseStateAndAction = Operation<
  typeof Key,
  GetResponseStateAndActionInput,
  GetResponseStateAndActionOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetResponseStateAndActionInput = {
  response: Response;
  rfq: Rfq;
  caller: 'taker' | 'maker';
  responseSide: 'ask' | 'bid';
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetResponseStateAndActionOutput = {
  responseState: ResponseState;
  responseAction: ResponseAction;
};

/**
 * @group Operations
 * @category Handlers
 */
export const getResponseStateAndActionHandler: SyncOperationHandler<GetResponseStateAndAction> =
  {
    handle: (
      operation: GetResponseStateAndAction
    ): GetResponseStateAndActionOutput => {
      const { response, caller, rfq, responseSide } = operation.input;
      if (!response.rfq.equals(rfq.address)) {
        throw new Error('Response does not match RFQ');
      }

      const responseState = getResponseState(response);
      const responseAction = getResponseAction(
        response,
        rfq,
        responseSide,
        caller,
        responseState
      );
      return { responseState, responseAction };
    },
  };

const getResponseState = (response: Response): ResponseState => {
  if (response.state === 'active') return 'Active';
  if (response.state === 'settling-preparations') return 'SettlingPreparations';
  if (response.state === 'ready-for-settling') return 'ReadyForSettling';
  if (response.state === 'settled') return 'Settled';
  if (response.state === 'defaulted') return 'Defaulted';
  if (response.state === 'canceled') return 'Cancelled';
  if (response.state === 'waiting-for-last-look') return 'WaitingForLastLook';
  return null;
};

const getResponseAction = (
  response: Response,
  rfq: Rfq,
  responseSide: 'ask' | 'bid',
  caller: 'maker' | 'taker',
  responseState: ResponseState
): ResponseAction => {
  const timestampStart = new Date(Number(rfq.creationTimestamp));
  const timestampExpiry = new Date(
    timestampStart.getTime() + Number(rfq.activeWindow) * 1000
  );
  const timestampSettlement = new Date(
    timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
  );
  const rfqExpired = timestampExpiry.getTime() <= Date.now();
  const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
  const confirmedResponseSide =
    (responseSide === 'ask' && response?.confirmed?.side === 'ask') ||
    (responseSide === 'bid' && response?.confirmed?.side === 'bid');

  const confirmedInverseResponseSide =
    (responseSide === 'ask' && response?.confirmed?.side !== 'ask') ||
    (responseSide === 'bid' && response?.confirmed?.side !== 'bid');

  const takerPreparedLegsComplete =
    response.takerPreparedLegs === rfq.legs.length;
  const makerPreparedLegsComplete =
    response.makerPreparedLegs === rfq.legs.length;
  const partyPreparedLegsComplete =
    caller === 'maker' ? makerPreparedLegsComplete : takerPreparedLegsComplete;
  const counterpartyPreparedLegsComplete =
    caller === 'maker' ? takerPreparedLegsComplete : makerPreparedLegsComplete;

  const defaulted = response.defaultingParty
    ? response.defaultingParty !== null
    : settlementWindowElapsed &&
      (!partyPreparedLegsComplete || !counterpartyPreparedLegsComplete);

  const responseConfirmed = response?.confirmed !== null;

  if (caller === 'maker') {
    if (responseState === 'Active' && !responseConfirmed && !rfqExpired)
      return 'Cancel';

    if (
      (responseState === 'Active' && !responseConfirmed && rfqExpired) ||
      (responseState === 'Cancelled' && response.makerCollateralLocked > 0)
    )
      return 'UnlockCollateral';

    if (
      (responseState === 'Active' || responseState === 'Cancelled') &&
      response.makerCollateralLocked === 0
    )
      return 'Cleanup';

    if (responseConfirmed && confirmedInverseResponseSide) return 'Rejected';

    if (
      confirmedResponseSide &&
      (responseState === 'SettlingPreparations' ||
        responseState === 'ReadyForSettling') &&
      !defaulted
    )
      return 'Settle';

    if (defaulted || responseState === 'Defaulted') return 'Defaulted';

    if (!defaulted && responseState === 'Settled') return 'Settled';

    return null;
  } else if (caller === 'taker') {
    if (responseState === 'Active' && rfqExpired && !responseConfirmed)
      return 'Expired';

    if (responseState === 'Cancelled') return 'Cancelled';

    if (responseConfirmed && confirmedInverseResponseSide) return 'Rejected';

    if (responseState === 'Active' && !rfqExpired && !responseConfirmed)
      return 'Approve';

    if (
      confirmedResponseSide &&
      (responseState === 'SettlingPreparations' ||
        responseState === 'ReadyForSettling') &&
      !defaulted
    )
      return 'Settle';

    if (defaulted || responseState === 'Defaulted') return 'Defaulted';

    if (responseState === 'Settled') return 'Settled';

    return null;
  }
  return null;
};
