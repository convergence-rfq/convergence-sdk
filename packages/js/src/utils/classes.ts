import { AccountMeta, TransactionInstruction } from '@solana/web3.js';
import { TransactionBuilder } from './TransactionBuilder';
import { Response, Rfq } from '@/plugins/rfqModule';

export type IxType = 'TransactionInstruction' | 'TransactionBuilder';
export class InstructionUniquenessTracker {
  constructor(public readonly IxArray: TransactionInstruction[]) {
    this.IxArray = IxArray;
  }

  private matchKeys = (
    keys: AccountMeta[],
    keysToMatch: AccountMeta[]
  ): boolean => {
    if (keys.length !== keysToMatch.length) {
      return false;
    }
    return keys.every(
      (key, index) =>
        key.isSigner === keysToMatch[index].isSigner &&
        key.isWritable === keysToMatch[index].isWritable &&
        key.pubkey.equals(keysToMatch[index].pubkey)
    );
  };
  private matchInstruction = (ixToBeAdded: TransactionInstruction): boolean => {
    return !this.IxArray.every(
      (ix) =>
        !(
          this.matchKeys(ix.keys, ixToBeAdded.keys) &&
          ix.programId.equals(ixToBeAdded.programId) &&
          ix.data.equals(ixToBeAdded.data)
        )
    );
  };

  checkedAdd(
    ix: TransactionInstruction | TransactionBuilder,
    ixType: IxType
  ): boolean {
    switch (ixType) {
      case 'TransactionInstruction':
        if (!this.matchInstruction(ix as TransactionInstruction)) {
          this.IxArray.push(ix as TransactionInstruction);
          return true;
        }
        return false;
      case 'TransactionBuilder':
        const instructions = (ix as TransactionBuilder).getInstructions();
        const areAllUnique = instructions.every(
          (ix) => !this.matchInstruction(ix)
        );
        if (areAllUnique) {
          this.IxArray.push(...instructions);
          return true;
        }
        return false;
      default:
        throw new Error('Invalid Instruction type');
    }
  }

  static dedup(builders: TransactionBuilder[]): TransactionBuilder[] {
    const tracker = new InstructionUniquenessTracker([]);
    const result = [];
    for (const builder of builders) {
      const isUnique = tracker.checkedAdd(builder, 'TransactionBuilder');
      if (isUnique) {
        result.push(builder);
      }
    }

    return result;
  }
}

export class RfqTimers {
  public timestampExpiry: Date;
  public timestampStart: Date;
  public timeStampSettlement: Date;

  constructor(rfq: Rfq) {
    this.timestampStart = new Date(Number(rfq.creationTimestamp));
    this.timestampExpiry = new Date(
      this.timestampStart.getTime() + Number(rfq.activeWindow) * 1000
    );
    this.timeStampSettlement = new Date(
      this.timestampExpiry.getTime() + Number(rfq.settlingWindow) * 1000
    );
  }

  isRfqExpired(): boolean {
    return Date.now() >= this.timestampExpiry.getTime();
  }

  isRfqSettlementWindowElapsed(): boolean {
    return Date.now() >= this.timeStampSettlement.getTime();
  }
}

export class ResponseTimers {
  public timestampExpiry: Date;

  constructor(response: Response) {
    this.timestampExpiry = new Date(response.expirationTimestamp);
  }

  isResponseExpired(): boolean {
    return Date.now() >= this.timestampExpiry.getTime();
  }
}
