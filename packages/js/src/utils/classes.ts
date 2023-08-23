import { AccountMeta, TransactionInstruction } from '@solana/web3.js';

export class InstructionUniquenessTracker {
  constructor(public readonly IxArray: TransactionInstruction[]) {
    this.IxArray = IxArray;
  }

  private matchKeys = (
    keys: AccountMeta[],
    keysToMatch: AccountMeta[]
  ): boolean => {
    let matching = true;
    if (keys.length !== keysToMatch.length) {
      return false;
    }
    for (let i = 0; i < keys.length; i++) {
      if (
        keys[i].isSigner !== keysToMatch[i].isSigner ||
        keys[i].isWritable !== keysToMatch[i].isWritable ||
        !keys[i].pubkey.equals(keysToMatch[i].pubkey)
      ) {
        matching = false;
        break;
      }
    }
    return matching;
  };
  private matchInstruction = (ixToBeAdded: TransactionInstruction): boolean => {
    let match = false;
    this.IxArray.forEach((ix) => {
      if (
        this.matchKeys(ix.keys, ixToBeAdded.keys) &&
        ix.programId.equals(ixToBeAdded.programId) &&
        ix.data.equals(ixToBeAdded.data)
      ) {
        match = true;
        return match;
      }
    });
    return match;
  };
  checkedAdd(ix: TransactionInstruction): boolean {
    if (!this.matchInstruction(ix)) {
      this.IxArray.push(ix);
      return true;
    }
    return false;
  }
}
