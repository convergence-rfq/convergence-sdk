import type { Convergence } from '@/Convergence';

/**
 * This is a client for the risk engine module.
 *
 * It enables us to interact with the risk engine program in order to
 * manage risk.
 *
 * You may access this client via the `riskEngine()` method of your `Convergence` instance.
 *
 * ```ts
 * const riskEngineClient = convergence.riskEngine();
 * ```
 */
export class RiskEngineClient {
  constructor(protected readonly convergence: Convergence) {}
}
