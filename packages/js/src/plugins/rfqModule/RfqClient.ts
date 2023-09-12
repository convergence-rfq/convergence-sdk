import { PublicKey } from '@solana/web3.js';

import { PartialKeys } from '../../utils';
import { OperationOptions, token } from '../../types';
import type { Convergence } from '../../Convergence';
import { addInstrumentOperation, AddInstrumentInput } from '../protocolModule';
import { SendTokensInput } from '../tokenModule';
import { Rfq } from './models';
import { RfqPdasClient } from './RfqPdasClient';
import {
  addLegsToRfqOperation,
  AddLegsToRfqInput,
  cancelResponseOperation,
  CancelResponseInput,
  CancelRfqsInput,
  cancelRfqsOperation,
  cancelResponsesOperation,
  CancelResponsesInput,
  cancelRfqOperation,
  CancelRfqInput,
  cleanUpResponseLegsOperation,
  CleanUpResponseLegsInput,
  cleanUpRfqOperation,
  CleanUpRfqInput,
  confirmResponseOperation,
  ConfirmResponseInput,
  createRfqOperation,
  CreateRfqInput,
  CreateAndFinalizeRfqConstructionInput,
  finalizeRfqConstructionOperation,
  FinalizeRfqConstructionInput,
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
  partiallySettleLegsOperation,
  PartiallySettleLegsInput,
  partlyRevertSettlementPreparationOperation,
  PartlyRevertSettlementPreparationInput,
  partiallySettleLegsAndSettleOperation,
  PartiallySettleLegsAndSettleInput,
  revertSettlementPreparationOperation,
  RevertSettlementPreparationInput,
  prepareMoreLegsSettlementOperation,
  PrepareMoreLegsSettlementInput,
  prepareSettlementOperation,
  PrepareSettlementInput,
  prepareSettlementAndPrepareMoreLegsOperation,
  PrepareSettlementAndPrepareMoreLegsInput,
  respondToRfqOperation,
  RespondToRfqInput,
  settleOperation,
  SettleInput,
  settleOnePartyDefaultOperation,
  SettleOnePartyDefaultInput,
  settleTwoPartyDefaultOperation,
  SettleTwoPartyDefaultInput,
  unlockResponseCollateralOperation,
  UnlockResponseCollateralInput,
  unlockRfqCollateralOperation,
  UnlockRfqCollateralInput,
  createAndFinalizeRfqConstructionOperation,
  CleanUpRfqsInput,
  cleanUpRfqsOperation,
  cleanUpResponseOperation,
  CleanUpResponseInput,
  cleanUpResponsesOperation,
  CleanUpResponsesInput,
  unlockResponsesCollateralOperation,
  UnlockResponsesCollateralInput,
  UnlockRfqsCollateralInput,
  unlockRfqsCollateralOperation,
  GetSettlementResultInput,
  getSettlementResultOperation,
  getSettlementResultHandler,
  RetrieveBidAndAskInput,
  retrieveBidAndAskHandler,
  retrieveBidAndAskOperation,
  GetResponseStateAndActionInput,
  getResponseStateAndActionHandler,
  getResponseStateAndActionOperation,
  GetRfqStateAndActionInput,
  getRfqStateAndActionHandler,
  getRfqStateAndActionOperation,
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

  /** {@inheritDoc addInstrumentOperation} */
  addInstrument(input: AddInstrumentInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(addInstrumentOperation(input), options);
  }

  /** {@inheritDoc addLegsToRfqOperation} */
  addLegsToRfq(input: AddLegsToRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(addLegsToRfqOperation(input), options);
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

  /** {@inheritDoc cleanUpResponseLegsOperation} */
  cleanUpResponseLegs(
    input: CleanUpResponseLegsInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(cleanUpResponseLegsOperation(input), options);
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

  /** {@inheritDoc createAndFinalizeRfqConstructionOperation} */
  createAndFinalize(
    input: CreateAndFinalizeRfqConstructionInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(createAndFinalizeRfqConstructionOperation(input), options);
  }

  /** {@inheritDoc finalizeRfqConstructionOperation} */
  finalizeRfqConstruction(
    input: FinalizeRfqConstructionInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(finalizeRfqConstructionOperation(input), options);
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

  /** {@inheritDoc partiallySettleLegsOperation} */
  partiallySettleLegs(
    input: PartiallySettleLegsInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(partiallySettleLegsOperation(input), options);
  }

  /** {@inheritDoc partlyRevertSettlementPreparationOperation} */
  partlyRevertSettlementPreparation(
    input: PartlyRevertSettlementPreparationInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(partlyRevertSettlementPreparationOperation(input), options);
  }

  /** {@inheritDoc partiallySettleLegsAndSettleOperation} */
  partiallySettleLegsAndSettle(
    input: PartiallySettleLegsAndSettleInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(partiallySettleLegsAndSettleOperation(input), options);
  }

  /** {@inheritDoc revertSettlementPreparationOperation} */
  revertSettlementPreparation(
    input: RevertSettlementPreparationInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(revertSettlementPreparationOperation(input), options);
  }

  /** {@inheritDoc prepareMoreLegsSettlementOperation} */
  prepareMoreLegsSettlement(
    input: PrepareMoreLegsSettlementInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(prepareMoreLegsSettlementOperation(input), options);
  }

  /** {@inheritDoc prepareSettlementOperation} */
  prepareSettlement(input: PrepareSettlementInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(prepareSettlementOperation(input), options);
  }

  /** {@inheritDoc prepareSettlementAndPrepareMoreLegsOperation} */
  prepareSettlementAndPrepareMoreLegs(
    input: PrepareSettlementAndPrepareMoreLegsInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(prepareSettlementAndPrepareMoreLegsOperation(input), options);
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

  /** {@inheritDoc settleOnePartyDefaultOperation} */
  settleOnePartyDefault(
    input: SettleOnePartyDefaultInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(settleOnePartyDefaultOperation(input), options);
  }

  /** {@inheritDoc settleTwoPartyDefaultOperation} */
  settleTwoPartyDefault(
    input: SettleTwoPartyDefaultInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(settleTwoPartyDefaultOperation(input), options);
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

  /** {@inheritDoc unlockRfqCollateralOperation} */
  unlockRfqCollateral(
    input: UnlockRfqCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unlockRfqCollateralOperation(input), options);
  }

  /** {@inheritDoc unlockRfqsCollateralOperation} */
  unlockRfqsCollateral(
    input: UnlockRfqsCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unlockRfqsCollateralOperation(input), options);
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

  /** {@inheritDoc retrieveBidAndAskOperation} */
  retrieveBidAndAsk(input: RetrieveBidAndAskInput) {
    return retrieveBidAndAskHandler.handle(
      retrieveBidAndAskOperation(input),
      this.convergence
    );
  }

  /** {@inheritDoc getResponseStateAndAction} */
  getResponseStateAndAction(input: GetResponseStateAndActionInput) {
    return getResponseStateAndActionHandler.handle(
      getResponseStateAndActionOperation(input),
      this.convergence
    );
  }

  /** {@inheritDoc getRFqStateAndAction} */
  getRfqStateAndAction(input: GetRfqStateAndActionInput) {
    return getRfqStateAndActionHandler.handle(
      getRfqStateAndActionOperation(input),
      this.convergence
    );
  }
}
