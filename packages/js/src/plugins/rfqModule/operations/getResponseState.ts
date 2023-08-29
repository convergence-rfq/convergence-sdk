import { Rfq, Response } from '../models';
import { Operation, SyncOperationHandler, useOperation } from '../../../types';
const Key = 'GetResponseState' as const;
export type ResponseState =
  | 'Kill'
  | 'Reclaim'
  | 'Cleanup'
  | 'Rejected'
  | 'Defaulted'
  | 'Settle'
  | 'Settled'
  | 'Expired'
  | 'Approve'
  | 'Cancelled'
  | 'None';
/**
 * getResponseState.
 *
 * ```ts
 * const result = await convergence.rfqs().getResponseState({
 *  response,
 * rfq,
 * })
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const getResponseStateOperation = useOperation<GetResponseState>(Key);

/**
 * @group Operations
 * @category Types
 */
export type GetResponseState = Operation<
  typeof Key,
  GetResponseStateInput,
  GetResponseStateOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type GetResponseStateInput = {
  response: Response;
  rfq: Rfq;
  caller: 'taker' | 'maker';
  responseSide: 'ask' | 'bid';
};

/**
 * @group Operations
 * @category Outputs
 */
export type GetResponseStateOutput = {
  responseState: ResponseState;
};

/**
 * @group Operations
 * @category Handlers
 */
export const getResponseStateHandler: SyncOperationHandler<GetResponseState> = {
  handle: (operation: GetResponseState): GetResponseStateOutput => {
    const { response, caller, rfq, responseSide } = operation.input;
    if (!response.rfq.equals(rfq.address)) {
      throw new Error('Response does not match RFQ');
    }
    let state: ResponseState;
    const responseState = response.state;
    const timestampStart = new Date(Number(rfq.creationTimestamp));
    const timestampExpiry = new Date(
      timestampStart.getTime() + Number(rfq.activeWindow) * 1000
    );
    const timestampSettlement = new Date(
      timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
    );
    const rfqExpired = timestampExpiry.getTime() <= Date.now();
    const settlememtWindowElapsed = timestampSettlement.getTime() <= Date.now();
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
      : settlememtWindowElapsed &&
        (!partyPreparedLegsComplete || !counterpartyPreparedLegsComplete);

    const responseConfirmed = response?.confirmed !== null;
    switch (caller) {
      case 'maker':
        switch (true) {
          case responseState === 'active' && !responseConfirmed && !rfqExpired:
            state = 'Kill';
            break;
          case ((responseState === 'active' &&
            !responseConfirmed &&
            rfqExpired) ||
            responseState === 'canceled') &&
            response.makerCollateralLocked > 0:
            state = 'Reclaim';
            break;
          case (responseState === 'active' || responseState === 'canceled') &&
            response.makerCollateralLocked === 0:
            state = 'Cleanup';
            break;
          case responseConfirmed && confirmedInverseResponseSide:
            state = 'Rejected';
            break;
          case confirmedResponseSide &&
            (responseState === 'settling-preparations' ||
              responseState === 'ready-for-settling') &&
            !defaulted:
            state = 'Settle';
            break;
          case defaulted || responseState === 'defaulted':
            state = 'Defaulted';
            break;
          case !defaulted && responseState === 'settled':
            state = 'Settled';
            break;
          default:
            state = 'None';
            break;
        }
        break;

      case 'taker':
        switch (true) {
          case responseState === 'active' && rfqExpired && !responseConfirmed:
            state = 'Expired';
            break;
          case responseState === 'canceled':
            state = 'Cancelled';
            break;
          case responseConfirmed && confirmedInverseResponseSide:
            state = 'Rejected';
            break;
          case responseState === 'active' && !rfqExpired && !responseConfirmed:
            state = 'Approve';
            break;
          case confirmedResponseSide &&
            (responseState === 'settling-preparations' ||
              responseState === 'ready-for-settling') &&
            !defaulted:
            state = 'Settle';
            break;
          case defaulted || responseState === 'defaulted':
            state = 'Defaulted';
            break;
          case responseState === 'settled':
            state = 'Settled';
            break;
          default:
            state = 'None';
            break;
        }
        break;
      default:
        state = 'None';
        break;
    }

    return { responseState: state };
  },
};
