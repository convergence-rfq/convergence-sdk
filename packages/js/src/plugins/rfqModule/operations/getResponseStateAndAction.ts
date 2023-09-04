import { Rfq, Response } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetResponseStateAndAction' as const;
export type ResponseState =
  | 'Active'
  | 'Cancelled'
  | 'Expired'
  | 'Defaulted'
  | 'Settled'
  | 'SettlingPreparations'
  | 'ReadyForSettling'
  | 'WaitingForLastLook'
  | 'OnlyMakerPrepared'
  | 'OnlyTakerPrepared';

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
      const timestampStart = new Date(Number(rfq.creationTimestamp));
      const timestampExpiry = new Date(
        timestampStart.getTime() + Number(rfq.activeWindow) * 1000
      );
      const timestampSettlement = new Date(
        timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
      );
      const responseState = getResponseState(
        response,
        rfq,
        timestampExpiry,
        timestampSettlement
      );
      const responseAction = getResponseAction(
        response,
        rfq,
        responseSide,
        caller,
        responseState,
        timestampSettlement
      );
      return { responseState, responseAction };
    },
  };

const getResponseState = (
  response: Response,
  rfq: Rfq,
  timestampExpiry: Date,
  timestampSettlement: Date
): ResponseState => {
  const rfqExpired = timestampExpiry.getTime() <= Date.now();
  const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
  switch (response.state) {
    case 'active':
      if (!rfqExpired) return 'Active';
      return 'Expired';
    case 'canceled':
      return 'Cancelled';
    case 'waiting-for-last-look':
      if (!rfqExpired) return 'WaitingForLastLook';
      return 'Expired';
    case 'settling-preparations':
      if (!settlementWindowElapsed) {
        if (response.makerPreparedLegs === rfq.legs.length)
          return 'OnlyMakerPrepared';
        if (response.takerPreparedLegs === rfq.legs.length)
          return 'OnlyTakerPrepared';
        return 'SettlingPreparations';
      }
      return 'Defaulted';
    case 'ready-for-settling':
      return 'ReadyForSettling';
    case 'settled':
      return 'Settled';
    case 'defaulted':
      return 'Defaulted';
    default:
      throw new Error('Invalid Response state');
  }
};

const getResponseAction = (
  response: Response,
  rfq: Rfq,
  responseSide: 'ask' | 'bid',
  caller: 'maker' | 'taker',
  responseState: ResponseState,
  timestampSettlement: Date
): ResponseAction => {
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

  const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
  const defaulted = response.defaultingParty
    ? response.defaultingParty !== null
    : settlementWindowElapsed &&
      (!partyPreparedLegsComplete || !counterpartyPreparedLegsComplete);

  const responseConfirmed = response?.confirmed !== null;
  if (responseConfirmed && confirmedResponseSide && defaulted)
    return 'Defaulted';
  switch (caller) {
    case 'maker':
      switch (responseState) {
        case 'Active':
          if (!responseConfirmed) return 'Cancel';
          if (responseConfirmed && confirmedInverseResponseSide)
            return 'Rejected';
          break;
        case 'Expired':
          if (!responseConfirmed && response.makerCollateralLocked > 0)
            return 'UnlockCollateral';
        case 'Cancelled':
          if (response.makerCollateralLocked > 0) return 'UnlockCollateral';
          if (response.makerCollateralLocked === 0) return 'Cleanup';
          break;
        case 'SettlingPreparations':
        case 'OnlyMakerPrepared':
        case 'OnlyTakerPrepared':
        case 'ReadyForSettling':
          if (defaulted) return 'Defaulted';
          if (confirmedInverseResponseSide) return 'Rejected';
          if (confirmedResponseSide) return 'Settle';
          break;
        case 'Settled':
          if (confirmedInverseResponseSide) return 'Rejected';
          return 'Settled';
        case 'Defaulted':
          if (confirmedInverseResponseSide) return 'Rejected';
          return 'Defaulted';
      }
      break;

    case 'taker':
      switch (responseState) {
        case 'Active':
          if (!responseConfirmed) return 'Approve';
          if (responseConfirmed && confirmedInverseResponseSide)
            return 'Rejected';
          break;
        case 'Expired':
          return 'Expired';
        case 'Cancelled':
          return 'Cancelled';
        case 'SettlingPreparations':
        case 'OnlyMakerPrepared':
        case 'OnlyTakerPrepared':
        case 'ReadyForSettling':
          if (confirmedInverseResponseSide) return 'Rejected';
          if (confirmedResponseSide) return 'Settle';
          break;
        case 'Settled':
          if (confirmedInverseResponseSide) return 'Rejected';
          return 'Settled';
        case 'Defaulted':
          if (confirmedInverseResponseSide) return 'Rejected';
          return 'Defaulted';
      }
      break;
  }
  return null;
};
