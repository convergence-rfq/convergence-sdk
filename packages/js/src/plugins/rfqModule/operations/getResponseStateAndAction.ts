import { DefaultingParty } from '@convergence-rfq/rfq';
import { Rfq, Response } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetResponseStateAndAction' as const;
export type ResponseState =
  | 'Active'
  | 'Cancelled'
  | 'Expired'
  | 'MakerDefaulted'
  | 'TakerDefaulted'
  | 'BothDefaulted'
  | 'Settled'
  | 'SettlingPreparations'
  | 'ReadyForSettling'
  | 'WaitingForLastLook'
  | 'OnlyMakerPrepared'
  | 'OnlyTakerPrepared'
  | 'Rejected';

export type ResponseAction =
  | 'Cancel'
  | 'UnlockCollateral'
  | 'Cleanup'
  | 'Settle'
  | 'Approve'
  | 'Settle One Party Defaulted'
  | 'Settle Both Party Defaulted'
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
        timestampSettlement,
        caller,
        responseSide
      );
      const responseAction = getResponseAction(
        response,
        responseState,
        rfq,
        caller
      );
      return { responseState, responseAction };
    },
  };

const getResponseState = (
  response: Response,
  rfq: Rfq,
  timestampExpiry: Date,
  timestampSettlement: Date,
  caller: 'maker' | 'taker',
  responseSide: 'ask' | 'bid'
): ResponseState => {
  const rfqExpired = timestampExpiry.getTime() <= Date.now();
  const settlementWindowElapsed = timestampSettlement.getTime() <= Date.now();
  const confirmedInverseResponseSide =
    (responseSide === 'ask' && response?.confirmed?.side !== 'ask') ||
    (responseSide === 'bid' && response?.confirmed?.side !== 'bid');
  const responseConfirmed = response?.confirmed !== null;
  const takerPreparedLegsComplete =
    response.takerPreparedLegs === rfq.legs.length;
  const makerPreparedLegsComplete =
    response.makerPreparedLegs === rfq.legs.length;
  const defaulted = response.defaultingParty
    ? response.defaultingParty !== null
    : settlementWindowElapsed &&
      (!makerPreparedLegsComplete || !takerPreparedLegsComplete);

  let { defaultingParty } = response;

  if (defaulted && defaultingParty === null) {
    if (!makerPreparedLegsComplete && !takerPreparedLegsComplete)
      defaultingParty = DefaultingParty.Both;
    if (!makerPreparedLegsComplete) defaultingParty = DefaultingParty.Maker;
    if (!takerPreparedLegsComplete) defaultingParty = DefaultingParty.Taker;
  }

  if (responseConfirmed && confirmedInverseResponseSide) return 'Rejected';
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
      switch (defaultingParty) {
        case DefaultingParty.Maker:
          return 'MakerDefaulted';
        case DefaultingParty.Taker:
          return 'TakerDefaulted';
        case DefaultingParty.Both:
          return 'BothDefaulted';
      }
    case 'ready-for-settling':
      return 'ReadyForSettling';
    case 'settled':
      return 'Settled';
    case 'defaulted':
      switch (defaultingParty) {
        case DefaultingParty.Maker:
          return 'MakerDefaulted';
        case DefaultingParty.Taker:
          return 'TakerDefaulted';
        case DefaultingParty.Both:
          return 'BothDefaulted';
      }
    default:
      throw new Error('Invalid Response state');
  }
};

const getResponseAction = (
  response: Response,
  responseState: ResponseState,
  rfq: Rfq,
  caller: 'maker' | 'taker'
): ResponseAction => {
  const responseConfirmed = response?.confirmed !== null;
  switch (caller) {
    case 'maker':
      switch (responseState) {
        case 'Active':
          if (!responseConfirmed) return 'Cancel';
          break;
        case 'Expired':
        case 'Cancelled':
          if (response.makerCollateralLocked > 0) return 'UnlockCollateral';
          if (response.makerCollateralLocked === 0) return 'Cleanup';
          break;
        case 'SettlingPreparations':
        case 'OnlyMakerPrepared':
        case 'OnlyTakerPrepared':
        case 'ReadyForSettling':
          return 'Settle';
        case 'Settled':
          if (response.makerCollateralLocked > 0) return 'UnlockCollateral';
          if (response.makerCollateralLocked === 0) return 'Cleanup';
        case 'MakerDefaulted':
        case 'TakerDefaulted':
          return 'Settle One Party Defaulted';
        case 'BothDefaulted':
          return 'Settle Both Party Defaulted';
        case 'Rejected':
          return null;
      }
      break;

    case 'taker':
      switch (responseState) {
        case 'Active':
          if (!responseConfirmed) return 'Approve';
          break;
        case 'SettlingPreparations':
        case 'OnlyMakerPrepared':
        case 'OnlyTakerPrepared':
        case 'ReadyForSettling':
          return 'Settle';
        case 'Settled':
        case 'MakerDefaulted':
          return 'Settle One Party Defaulted';
        case 'TakerDefaulted':
          return 'Settle One Party Defaulted';
        case 'BothDefaulted':
          return 'Settle Both Party Defaulted';
        case 'Expired':
        case 'Cancelled':
          if (response.takerCollateralLocked > 0) return 'UnlockCollateral';
          if (response.takerCollateralLocked === 0) return 'Cleanup';
        case 'Rejected':
          return null;
      }
      break;
  }
  return null;
};
