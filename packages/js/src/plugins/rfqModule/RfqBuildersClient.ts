import type { Convergence } from '../../Convergence';

/**
 * This client allows you to access the underlying Transaction Builders
 * for the write operations of the Rfq module.
 *
 * @see {@link RfqClient}
 * @group Module Builders
 * */
export class RfqBuildersClient {
  constructor(protected readonly convergence: Convergence) {}
}
