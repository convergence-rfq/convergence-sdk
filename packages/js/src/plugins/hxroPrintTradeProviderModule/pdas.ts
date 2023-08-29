import { Convergence } from '@/Convergence';
import { Pda, Program } from '@/types';

export class HxroPdasClient {
  constructor(protected readonly cvg: Convergence) {}

  config(): Pda {
    const programId = this.programId();
    return Pda.find(programId, [Buffer.from('config', 'utf8')]);
  }

  private programId(programs?: Program[]) {
    return this.cvg.programs().getHxroPrintTradeProvider(programs).address;
  }
}
