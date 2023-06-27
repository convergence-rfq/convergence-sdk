import { PublicKey } from '@solana/web3.js';

import { PartialKeys } from '../../utils';
import { OperationOptions, token } from '../../types';
import type { Convergence } from '../../Convergence';
import { SendTokensInput } from '../tokenModule';
import { Rfq } from './models';
import { RfqPdasClient } from './RfqPdasClient';
import {
  addInstrumentOperation,
  AddInstrumentInput,
  addLegsToRfqOperation,
  AddLegsToRfqInput,
  cancelResponseOperation,
  CancelResponseInput,
  cancelRfqOperation,
  CancelRfqInput,
  cleanUpResponseOperation,
  CleanUpResponseInput,
  cleanUpResponseLegsOperation,
  CleanUpResponseLegsInput,
  cleanUpRfqOperation,
  CleanUpRfqInput,
  confirmResponseOperation,
  ConfirmResponseInput,
  createRfqOperation,
  CreateRfqInput,
  CreateAndFinalizeRfqConstructionInput,
  createAndAddLegsToRfqOperation,
  CreateAndAddLegsToRfqInput,
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
  findResponsesByRfqsOperation,
  FindResponsesByRfqsInput,
  findResponsesByOwnerOperation,
  FindResponsesByOwnerInput,
  findRfqsByInstrumentOperation,
  FindRfqsByInstrumentInput,
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
} from './operations';
import { Response } from './models/Response';
import {
  UnlockMultipleResponseCollateralInput,
  unlockMultipleResponseCollateralOperation,
} from './operations/unlockMultipleResponseCollateral';
import {
  UnlockMultipleRfqCollateralInput,
  unlockMultipleRfqCollateralOperation,
} from './operations/unlockMultipleRfqCollateral';
import {
  CancelMultipleResponseInput,
  cancelMultipleResponseOperation,
} from './operations/cancelMultipleResponse';
import {
  CancelMultipleRfqInput,
  cancelMultipleRfqOperation,
} from './operations/cancelMultipleRfq';
import {
  CleanUpMultipleRfqInput,
  cleanUpMultipleRfqOperation,
} from './operations/cleanUpMultipleRfq';
import {
  CleanUpMultipleResponsesInput,
  cleanUpMultipleResponsesOperation,
} from './operations/cleanUpMultipleResponse';

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
   * You may use the `builders()` client to access the
   * underlying Transaction Builders of this module.
   *
   * ```ts
   * const buildersClient = convergence.rfqs().builders();
   * ```
   */
  // builders() {
  //   return new RfqBuildersClient(this.convergence);
  // }

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

  /** {@inheritDoc cancelMultipleResponseOperation} */
  cancelMultipleResponse(
    input: CancelMultipleResponseInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(cancelMultipleResponseOperation(input), options);
  }

  /** {@inheritDoc cancelRfqOperation} */
  cancelRfq(input: CancelRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelRfqOperation(input), options);
  }

  /** {@inheritDoc cancelMultipleRfqOperation} */
  cancelMultipleRfq(input: CancelMultipleRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cancelMultipleRfqOperation(input), options);
  }

  /** {@inheritDoc cleanUpResponseOperation} */
  cleanUpResponse(input: CleanUpResponseInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpResponseOperation(input), options);
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
  /** {@inheritDoc cleanUpMultipleResponsesOperation} */
  cleanUpMultipleResponses(
    input: CleanUpMultipleResponsesInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(cleanUpMultipleResponsesOperation(input), options);
  }

  /** {@inheritDoc cleanUpRfqOperation} */
  cleanUpRfq(input: CleanUpRfqInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(cleanUpRfqOperation(input), options);
  }

  /** {@inheritDoc cleanUpMultipleRfqOperation} */
  cleanUpMultipleRfq(
    input: CleanUpMultipleRfqInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(cleanUpMultipleRfqOperation(input), options);
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

  /** {@inheritDoc createRfqAndAddLegsToRfqOperation} */
  createRfqAndAddLegs(
    input: CreateAndAddLegsToRfqInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(createAndAddLegsToRfqOperation(input), options);
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
      .execute(findRfqsOperation(input), options);
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

  /** {@inheritDoc findResponsesByRfqsOperation} */
  findResponsesByRfqs(
    input: FindResponsesByRfqsInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findResponsesByRfqsOperation(input), options);
  }

  /** {@inheritDoc findRfqByAddressOperation} */
  findRfqByAddress(input: FindRfqByAddressInput, options?: OperationOptions) {
    return this.convergence
      .operations()
      .execute(findRfqByAddressOperation(input), options);
  }

  /** {@inheritDoc findRfqsByInstrumentOperation} */
  findRfqsByInstrument(
    input: FindRfqsByInstrumentInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(findRfqsByInstrumentOperation(input), options);
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
  //  * rfq = await convergence.rfqs().refreshResponse(response);
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

  /** {@inheritDoc unlockMultipleResponseCollateralOperation} */
  unlockMultipleResponseCollateral(
    input: UnlockMultipleResponseCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unlockMultipleResponseCollateralOperation(input), options);
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

  /** {@inheritDoc unlockMultipleRfqCollateralOperation} */
  unlockMultipleRfqCollateral(
    input: UnlockMultipleRfqCollateralInput,
    options?: OperationOptions
  ) {
    return this.convergence
      .operations()
      .execute(unlockMultipleRfqCollateralOperation(input), options);
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
}
