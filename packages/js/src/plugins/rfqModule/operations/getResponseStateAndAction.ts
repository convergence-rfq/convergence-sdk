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
 *  response,
 * rfq,
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
      let responseState: ResponseState;
      switch (true) {
        case response.state === 'active':
          responseState = 'Active';
          break;
        case response.state === 'settling-preparations':
          responseState = 'SettlingPreparations';
          break;
        case response.state === 'ready-for-settling':
          responseState = 'ReadyForSettling';
          break;
        case response.state === 'settled':
          responseState = 'Settled';
          break;
        case response.state === 'defaulted':
          responseState = 'Defaulted';
          break;
        case response.state === 'canceled':
          responseState = 'Cancelled';
          break;
        case response.state === 'waiting-for-last-look':
          responseState = 'WaitingForLastLook';
          break;
        default:
          responseState = null;
          break;
      }

      if (!response.rfq.equals(rfq.address)) {
        throw new Error('Response does not match RFQ');
      }
      let responseAction: ResponseAction;
      const timestampStart = new Date(Number(rfq.creationTimestamp));
      const timestampExpiry = new Date(
        timestampStart.getTime() + Number(rfq.activeWindow) * 1000
      );
      const timestampSettlement = new Date(
        timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
      );
      const rfqExpired = timestampExpiry.getTime() <= Date.now();
      const settlementWindowElapsed =
        timestampSettlement.getTime() <= Date.now();
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
        caller === 'maker'
          ? makerPreparedLegsComplete
          : takerPreparedLegsComplete;
      const counterpartyPreparedLegsComplete =
        caller === 'maker'
          ? takerPreparedLegsComplete
          : makerPreparedLegsComplete;

      const defaulted = response.defaultingParty
        ? response.defaultingParty !== null
        : settlementWindowElapsed &&
          (!partyPreparedLegsComplete || !counterpartyPreparedLegsComplete);

      const responseConfirmed = response?.confirmed !== null;
      switch (caller) {
        case 'maker':
          switch (true) {
            case responseState === 'Active' &&
              !responseConfirmed &&
              !rfqExpired:
              responseAction = 'Cancel';
              break;
            case ((responseState === 'Active' &&
              !responseConfirmed &&
              rfqExpired) ||
              responseState === 'Cancelled') &&
              response.makerCollateralLocked > 0:
              responseAction = 'UnlockCollateral';
              break;
            case (responseState === 'Active' ||
              responseState === 'Cancelled') &&
              response.makerCollateralLocked === 0:
              responseAction = 'Cleanup';
              break;
            case responseConfirmed && confirmedInverseResponseSide:
              responseAction = 'Rejected';
              break;
            case confirmedResponseSide &&
              (responseState === 'SettlingPreparations' ||
                responseState === 'ReadyForSettling') &&
              !defaulted:
              responseAction = 'Settle';
              break;
            case defaulted || responseState === 'Defaulted':
              responseAction = 'Defaulted';
              break;
            case !defaulted && responseState === 'Settled':
              responseAction = 'Settled';
              break;
            default:
              responseAction = null;
              break;
          }
          break;

        case 'taker':
          switch (true) {
            case responseState === 'Active' && rfqExpired && !responseConfirmed:
              responseAction = 'Expired';
              break;
            case responseState === 'Cancelled':
              responseAction = 'Cancelled';
              break;
            case responseConfirmed && confirmedInverseResponseSide:
              responseAction = 'Rejected';
              break;
            case responseState === 'Active' &&
              !rfqExpired &&
              !responseConfirmed:
              responseAction = 'Approve';
              break;
            case confirmedResponseSide &&
              (responseState === 'SettlingPreparations' ||
                responseState === 'ReadyForSettling') &&
              !defaulted:
              responseAction = 'Settle';
              break;
            case defaulted || responseState === 'Defaulted':
              responseAction = 'Defaulted';
              break;
            case responseState === 'Settled':
              responseAction = 'Settled';
              break;
            default:
              responseAction = null;
              break;
          }
          break;
        default:
          responseAction = null;
          break;
      }

      return { responseState, responseAction };
    },
  };
