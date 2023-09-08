import { AccountMeta, TransactionInstruction } from '@solana/web3.js';
import { TransactionBuilder } from './TransactionBuilder';

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
