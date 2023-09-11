import { AccountMeta, TransactionInstruction } from '@solana/web3.js';
import { TransactionBuilder } from './TransactionBuilder';
import { Rfq } from '@/plugins/rfqModule';

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
    this.IxArray.forEach((ix) => {
      if (
        this.matchKeys(ix.keys, ixToBeAdded.keys) &&
        ix.programId.equals(ixToBeAdded.programId) &&
        ix.data.equals(ixToBeAdded.data)
      )
        return true;
    });
    return false;
  };
  checkedAdd(ix: TransactionInstruction | TransactionBuilder): boolean {
    if (ix instanceof TransactionBuilder) {
      const instructions = ix.getInstructions();
      const ixLength = instructions.length;
      let checked = 0;
      instructions.forEach((ix) => {
        if (!this.matchInstruction(ix)) {
          checked++;
        }
      });
      if (checked === ixLength) {
        this.IxArray.push(...instructions);
        return true;
      }
      return false;
    } else if (ix instanceof TransactionInstruction) {
      if (!this.matchInstruction(ix)) {
        this.IxArray.push(ix);
        return true;
      }
      return false;
    }
    throw new Error('Invalid Instruction type');
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
