import {
  InitializeSpotInstrumentConfigInput,
  InitializeSpotInstrumentConfigOutput,
  initializeSpotInstrumentConfigOperation,
  ModifySpotInstrumentConfigInput,
  ModifySpotInstrumentConfigOutput,
  modifySpotInstrumentConfigOperation,
  FetchSpotInstrumentConfigInput,
  FetchSpotInstrumentConfigOutput,
  fetchSpotInstrumentConfigOperation,
} from './operations';
import { SpotInstrumentPdasClient } from './pdas';
import { OperationOptions } from '@/types';
import { Convergence } from '@/Convergence';

export class SpotInstrumentClient {
  constructor(protected readonly cvg: Convergence) {}

  pdas() {
    return new SpotInstrumentPdasClient(this.cvg);
  }

  fetchConfig(
    input?: FetchSpotInstrumentConfigInput,
    options?: OperationOptions
  ): Promise<FetchSpotInstrumentConfigOutput> {
    return this.cvg
      .operations()
      .execute(fetchSpotInstrumentConfigOperation(input), options);
  }

  initializeConfig(
    input: InitializeSpotInstrumentConfigInput,
    options?: OperationOptions
  ): Promise<InitializeSpotInstrumentConfigOutput> {
    return this.cvg
      .operations()
      .execute(initializeSpotInstrumentConfigOperation(input), options);
  }

  modifyConfig(
    input: ModifySpotInstrumentConfigInput,
    options?: OperationOptions
  ): Promise<ModifySpotInstrumentConfigOutput> {
    return this.cvg
      .operations()
      .execute(modifySpotInstrumentConfigOperation(input), options);
  }
}
