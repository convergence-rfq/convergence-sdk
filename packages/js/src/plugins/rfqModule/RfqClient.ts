import { PublicKey } from '@solana/web3.js';

import { PartialKeys } from '../../utils';
import { OperationOptions, token } from '../../types';
import type { Convergence } from '../../Convergence';
import { SendTokensInput } from '../tokenModule';
import { Rfq } from './models';
import { RfqPdasClient } from './RfqPdasClient';
import {
  cancelResponseOperation,
  CancelResponseInput,
  CancelRfqsInput,
  cancelRfqsOperation,
  cancelResponsesOperation,
  CancelResponsesInput,
  cancelRfqOperation,
  CancelRfqInput,
  cleanUpRfqOperation,
  CleanUpRfqInput,
  confirmResponseOperation,
  ConfirmResponseInput,
  createRfqOperation,
  CreateRfqInput,
  FindRfqsInput,
  findRfqsOperation,
  FindRfqByAddressInput,
  findRfqByAddressOperation,
  FindResponseByAddressInput,
  findResponseByAddressOperation,
  findResponsesByRfqOperation,
  FindResponsesByRfqInput,
  findResponsesByOwnerOperation,
  FindResponsesByOwnerInput,
  respondToRfqOperation,
  RespondToRfqInput,
  settleOperation,
  SettleInput,
  unlockResponseCollateralOperation,
  UnlockResponseCollateralInput,
  CleanUpRfqsInput,
  cleanUpRfqsOperation,
  cleanUpResponseOperation,
  CleanUpResponseInput,
  cleanUpResponsesOperation,
  CleanUpResponsesInput,
  unlockResponsesCollateralOperation,
  UnlockResponsesCollateralInput,
  GetSettlementResultInput,
  getSettlementResultOperation,
  getSettlementResultHandler,
} from './operations';
import { Response } from './models/Response';

/**
 * This is a client for the Rfq module.
 *
 * It enables us to interact with the Rfq program in order to
 * manage Rfqs.
 *
 * You may access this client via the `rfqs()` method of your `Convergence` instance.
 *
 * ```ts
 * const rfqClient = convergence.rfqs();
 * ```
 *
 * @example
 * ```ts
 * const spotInstrumentClient = cvg.spotInstrument();
 * const spotInstrument = spotInstrumentClient.createInstrument(
 *   btcMint.address,
 *   btcMint.decimals,
 *   Side.Bid,
 *   1
 * );
 * const { rfq } = await cvg.rfqs().create({
 *   instruments: [spotInstrument],
 *   quoteAsset: usdcMint,
 * });
 * ```
 *
 * @group Modules
 */
export class RfqClient {
  constructor(protected readonly convergence: Convergence) {}

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = convergence.rfqs().pdas();
   * ```
   */
  pdas() {
    return new RfqPdasClient(this.convergence);
  }

  /** {@inheritDoc cancelResponseOperation} */
  cancelResponse(input: CancelResponseInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelResponseOperation(input), options);
  }

  /** {@inheritDoc cancelResponsesOperation} */
  cancelResponses(input: CancelResponsesInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelResponsesOperation(input), options);
  }

  /** {@inheritDoc cancelRfqOperation} */
  cancelRfq(input: CancelRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelRfqOperation(input), options);
  }

  /** {@inheritDoc cancelRfqsOperation} */
  cancelRfqs(input: CancelRfqsInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelRfqsOperation(input), options);
  }

  /** {@inheritDoc cleanUpResponseOperation} */
  cleanUpResponse(input: CleanUpResponseInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpResponseOperation(input), options);
  }

  /** {@inheritDoc cleanUpResponsesOperation} */
  cleanUpResponses(input: CleanUpResponsesInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpResponsesOperation(input), options);
  }

  /** {@inheritDoc cleanUpRfqOperation} */
  cleanUpRfq(input: CleanUpRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpRfqOperation(input), options);
  }

  /** {@inheritDoc cleanUpRfqsOperation} */
  cleanUpRfqs(input: CleanUpRfqsInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpRfqsOperation(input), options);
  }

  /** {@inheritDoc cleanUpRfqOperation} */
  confirmResponse(input: ConfirmResponseInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(confirmResponseOperation(input), options);
  }

  /** {@inheritDoc createRfqOperation} */
  create(input: CreateRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(createRfqOperation(input), options);
  }

  /** {@inheritDoc findResponseByAddressOperation} */
  findResponseByAddress(
    input: FindResponseByAddressInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findResponseByAddressOperation(input), options);
  }
  /** {@inheritDoc findResponsesByOwnerOperation} */
  findResponsesByOwner(
    input: FindResponsesByOwnerInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findResponsesByOwnerOperation(input), options);
  }

  /** {@inheritDoc findRfqsOperation} */
  findRfqs(input: FindRfqsInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .toCollection(findRfqsOperation(input), options);
  }

  /** {@inheritDoc findResponsesByRfqOperation} */
  findResponsesByRfq(
    input: FindResponsesByRfqInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findResponsesByRfqOperation(input), options);
  }

  /** {@inheritDoc findRfqByAddressOperation} */
  findRfqByAddress(input: FindRfqByAddressInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqByAddressOperation(input), options);
  }

  /**
   * Helper method that refetches a given model
   * and returns an instance of the same type.
   *
   * If the model we pass is an `Rfq`, we extract the pubkey and
   * pass to `findRfqByAddress`. Else, it's a pubkey and we pass
   * it directly.
   *
   * ```ts
   * rfq = await convergence.rfqs().refresh(rfq);
   * ```
   */
  refreshRfq<T extends Rfq | PublicKey>(
    model: T,
    options?: OperationOptions
  ): Promise<T extends PublicKey ? Rfq : T> {
    return this.findRfqByAddress(
      {
        address: 'model' in model ? model.address : model,
      },
      options
    ) as Promise<T extends PublicKey ? Rfq : T>;
  }

  // /**
  //  * Helper method that refetches a given model
  //  * and returns an instance of the same type.
  //  *
  //  * If the model we pass is an `Response`, we extract the pubkey and
  //  * pass to `findResponseByAddress`. Else, it's a pubkey and we pass
  //  * it directly.
  //  *
  //  * ```ts
  //  * const rfq = await convergence.rfqs().refreshResponse(response);
  //  * ```
  //  */
  refreshResponse<T extends Response | PublicKey>(
    model: T,
    options?: OperationOptions
  ): Promise<T extends PublicKey ? Response : T> {
    return this.findResponseByAddress(
      {
        address: 'model' in model ? model.address : model,
      },
      options
    ) as Promise<T extends PublicKey ? Response : T>;
  }

  /** {@inheritDoc respondToRfqOperation} */
  respond(input: RespondToRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(respondToRfqOperation(input), options);
  }

  /** {@inheritDoc settleOperation} */
  settle(input: SettleInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(settleOperation(input), options);
  }

  /** {@inheritDoc unlockResponseCollateralOperation} */
  unlockResponseCollateral(
    input: UnlockResponseCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unlockResponseCollateralOperation(input), options);
  }

  /** {@inheritDoc unlockResponsesCollateralOperation} */
  unlockResponsesCollateral(
    input: UnlockResponsesCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unlockResponsesCollateralOperation(input), options);
  }

  /** {@inheritDoc sendTokensOperation} */
  send(
    input: PartialKeys<SendTokensInput, 'amount'>,
    options?: OperationOptions
  ) {
    return this.convergence
      .tokens()
      .send({ ...input, amount: token(1) }, options);
  }

  /** {@inheritDoc getSettlementResultOperation} */
  getSettlementResult(input: GetSettlementResultInput) {
    return getSettlementResultHandler.handle(
      getSettlementResultOperation(input),
      this.convergence
    );
  }
}
