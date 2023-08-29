import {
  GetHxroPrintTradeProviderConfigInput,
  getHxroPrintTradeProviderConfigOperation,
} from './operations';
import { HxroPdasClient } from './pdas';
import { OperationOptions } from '@/types';
import { Convergence } from '@/Convergence';

export class HxroClient {
  constructor(protected readonly cvg: Convergence) {}

  /**
   * You may use the `pdas()` client to build PDAs related to this module.
   *
   * ```ts
   * const pdasClient = convergence.rfqs().pdas();
   * ```
   */
  pdas() {
    return new HxroPdasClient(this.cvg);
  }

  /** {@inheritDoc addInstrumentOperation} */
  getConfig(
    input?: GetHxroPrintTradeProviderConfigInput,
    options?: OperationOptions
  ) {
    return this.cvg
      .operations()
      .execute(getHxroPrintTradeProviderConfigOperation(input), options);
  }
}
