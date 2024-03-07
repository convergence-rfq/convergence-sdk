import { Convergence } from '@/Convergence';
import { Pda, Program, PublicKey } from '@/types';

export class HxroPdasClient {
  constructor(protected readonly cvg: Convergence) {}

  config(): Pda {
    const programId = this.programId();
    return Pda.find(programId, [Buffer.from('config', 'utf8')]);
  }

  operator(): Pda {
    const programId = this.programId();
    return Pda.find(programId, [Buffer.from('operator', 'utf8')]);
  }

  lockedCollateralRecord(user: PublicKey, response: PublicKey): Pda {
    const programId = this.programId();
    return Pda.find(programId, [
      Buffer.from('locked_collateral_record', 'utf8'),
      user.toBuffer(),
      response.toBuffer(),
    ]);
  }

  private programId(programs?: Program[]) {
    return this.cvg.programs().getHxroPrintTradeProvider(programs).address;
  }
}
