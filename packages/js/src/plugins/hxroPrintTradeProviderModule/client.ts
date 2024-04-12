import {
  FetchHxroPrintTradeProviderConfigInput,
  FetchHxroPrintTradeProviderConfigOutput,
  FetchHxroProductsInput,
  FetchHxroProductsOutput,
  InitializeHxroConfigInput,
  InitializeHxroConfigOutput,
  InitializeOperatorTraderRiskGroupInput,
  InitializeOperatorTraderRiskGroupOutput,
  ModifyHxroConfigInput,
  ModifyHxroConfigOutput,
  fetchHxroPrintTradeProviderConfigOperation,
  fetchHxroProductsOperation,
  initializeHxroConfigOperation,
  initializeOperatorTraderRiskGroupOperation,
  fetchUnusedCollateralLockRecordsOperation,
  FetchUnusedCollateralLockRecordsInput,
  FetchUnusedCollateralLockRecordsOutput,
  unlockHxroCollateralByRecordOperation,
  UnlockHxroCollateralByRecordInput,
  UnlockHxroCollateralByRecordOutput,
  modifyHxroConfigOperation,
  GetRequiredHxroCollateralForSettlementInput,
  GetRequiredHxroCollateralForSettlementOutput,
  getRequiredHxroCollateralForSettlementOperation,
} from './operations';
import { HxroPdasClient } from './pdas';
import { OperationOptions } from '@/types';
import { Convergence } from '@/Convergence';

export class HxroClient {
  constructor(protected readonly cvg: Convergence) {}

  pdas() {
    return new HxroPdasClient(this.cvg);
  }

  fetchConfig(
    input?: FetchHxroPrintTradeProviderConfigInput,
    options?: OperationOptions
  ): Promise<FetchHxroPrintTradeProviderConfigOutput> {
    return this.cvg
      .operations()
      .execute(fetchHxroPrintTradeProviderConfigOperation(input), options);
  }

  fetchProducts(
    input?: FetchHxroProductsInput,
    options?: OperationOptions
  ): Promise<FetchHxroProductsOutput> {
    return this.cvg
      .operations()
      .execute(fetchHxroProductsOperation(input), options);
  }

  initializeConfig(
    input: InitializeHxroConfigInput,
    options?: OperationOptions
  ): Promise<InitializeHxroConfigOutput> {
    return this.cvg
      .operations()
      .execute(initializeHxroConfigOperation(input), options);
  }

  modifyConfig(
    input: ModifyHxroConfigInput,
    options?: OperationOptions
  ): Promise<ModifyHxroConfigOutput> {
    return this.cvg
      .operations()
      .execute(modifyHxroConfigOperation(input), options);
  }

  initializeOperatorTraderRiskGroup(
    input: InitializeOperatorTraderRiskGroupInput,
    options?: OperationOptions
  ): Promise<InitializeOperatorTraderRiskGroupOutput> {
    return this.cvg
      .operations()
      .execute(initializeOperatorTraderRiskGroupOperation(input), options);
  }

  fetchUnusedCollateralLockRecords(
    input?: FetchUnusedCollateralLockRecordsInput,
    options?: OperationOptions
  ): Promise<FetchUnusedCollateralLockRecordsOutput> {
    return this.cvg
      .operations()
      .execute(fetchUnusedCollateralLockRecordsOperation(input), options);
  }

  unlockCollateralByRecord(
    input: UnlockHxroCollateralByRecordInput,
    options?: OperationOptions
  ): Promise<UnlockHxroCollateralByRecordOutput> {
    return this.cvg
      .operations()
      .execute(unlockHxroCollateralByRecordOperation(input), options);
  }

  getRequiredCollateralForSettlement(
    input: GetRequiredHxroCollateralForSettlementInput,
    options?: OperationOptions
  ): Promise<GetRequiredHxroCollateralForSettlementOutput> {
    return this.cvg
      .operations()
      .execute(getRequiredHxroCollateralForSettlementOperation(input), options);
  }
}
