import { Convergence, HumanOrderType } from '../..';
import { createRfq } from './helpers';

/**
 * @group Modules
 */
export class HumanClient {
  constructor(protected readonly convergence: Convergence) {}

  async createRfq(amount: number, orderType: HumanOrderType): Promise<any> {
    return await createRfq(this.convergence, amount, orderType);
  }
}
