import {
  BlockhashWithExpiryBlockHeight,
  ComputeBudgetProgram,
  ConfirmOptions,
  Keypair,
  PACKET_DATA_SIZE,
  SignaturePubkeyPair,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../plugins/rpcModule';
import type { Convergence } from '../Convergence';
import type { OperationOptions, Signer } from '../types';
import { TRANSACTION_PRIORITY_FEE_MAP } from '../constants';

export const DUMMY_BLOCKHASH = 'H9cCgV1suCbdxMGDGUecdgJPZzdCe4CbNYa6ijP1uBLS';

export type InstructionWithSigners = {
  instruction: TransactionInstruction;
  signers: Signer[];
  key?: string;
};

type TransactionOptions = {
  /** Additional signatures. */
  signatures?: Array<SignaturePubkeyPair>;
};

export type TransactionBuilderOptions = Pick<
  OperationOptions,
  'programs' | 'payer'
>;

export class TransactionBuilder<C extends object = object> {
  /** The list of all instructions and their respective signers. */
  protected records: InstructionWithSigners[] = [];

  /** Options used when building the transaction. */
  protected transactionOptions: TransactionOptions;

  /** The signer to use to pay for transaction fees. */
  protected feePayer: Signer | undefined = undefined;

  /** Any additional context gathered when creating the transaction builder. */
  protected context: C = {} as C;

  constructor(transactionOptions: TransactionOptions = {}) {
    this.transactionOptions = transactionOptions;
  }

  checkTransactionFits = () => {
    const transaction = this.toTransaction({
      blockhash: DUMMY_BLOCKHASH,
      lastValidBlockHeight: 0,
    });
    const message = transaction.compileMessage();

    const serializedMessage = message.serialize();
    const txSize =
      1 + 64 * message.header.numRequiredSignatures + serializedMessage.length;
    if (txSize > PACKET_DATA_SIZE) {
      return false;
    }

    return true;
  };

  static make<C extends object = object>(
    transactionOptions?: TransactionOptions
  ): TransactionBuilder<C> {
    return new TransactionBuilder<C>(transactionOptions);
  }

  prepend(
    ...txs: (InstructionWithSigners | TransactionBuilder)[]
  ): TransactionBuilder<C> {
    const newRecords = txs.flatMap((tx) =>
      tx instanceof TransactionBuilder ? tx.getInstructionsWithSigners() : [tx]
    );
    this.records = [...newRecords, ...this.records];

    return this;
  }

  append(
    ...txs: (InstructionWithSigners | TransactionBuilder)[]
  ): TransactionBuilder<C> {
    const newRecords = txs.flatMap((tx) =>
      tx instanceof TransactionBuilder ? tx.getInstructionsWithSigners() : [tx]
    );
    this.records = [...this.records, ...newRecords];

    return this;
  }

  add(
    ...txs: (InstructionWithSigners | TransactionBuilder)[]
  ): TransactionBuilder<C> {
    return this.append(...txs);
  }

  splitUsingKey(
    key: string,
    include = true
  ): [TransactionBuilder, TransactionBuilder] {
    const firstBuilder = new TransactionBuilder(this.transactionOptions);
    const secondBuilder = new TransactionBuilder(this.transactionOptions);
    let keyPosition = this.records.findIndex((record) => record.key === key);

    if (keyPosition > -1) {
      keyPosition += include ? 1 : 0;
      firstBuilder.add(...this.records.slice(0, keyPosition));
      firstBuilder.add(...this.records.slice(keyPosition));
    } else {
      firstBuilder.add(this);
    }

    return [firstBuilder, secondBuilder];
  }

  splitBeforeKey(key: string): [TransactionBuilder, TransactionBuilder] {
    return this.splitUsingKey(key, false);
  }

  splitAfterKey(key: string): [TransactionBuilder, TransactionBuilder] {
    return this.splitUsingKey(key, true);
  }

  getInstructionsWithSigners(): InstructionWithSigners[] {
    return this.records;
  }

  getInstructions(): TransactionInstruction[] {
    return this.records.map((record) => record.instruction);
  }

  getInstructionCount(): number {
    return this.records.length;
  }

  isEmpty(): boolean {
    return this.getInstructionCount() === 0;
  }

  getSigners(): Signer[] {
    const feePayer = this.feePayer == null ? [] : [this.feePayer];
    const signers = this.records.flatMap((record) => record.signers);

    return [...feePayer, ...signers];
  }

  setTransactionOptions(
    transactionOptions: TransactionOptions
  ): TransactionBuilder<C> {
    this.transactionOptions = transactionOptions;

    return this;
  }

  getTransactionOptions(): TransactionOptions | undefined {
    return this.transactionOptions;
  }

  setFeePayer(feePayer: Signer): TransactionBuilder<C> {
    this.feePayer = feePayer;

    return this;
  }

  getFeePayer(): Signer | undefined {
    return this.feePayer;
  }

  setContext(context: C): TransactionBuilder<C> {
    this.context = context;

    return this;
  }

  getContext(): C {
    return this.context;
  }

  when(
    condition: boolean,
    callback: (tx: TransactionBuilder<C>) => TransactionBuilder<C>
  ) {
    return condition ? callback(this) : this;
  }

  unless(
    condition: boolean,
    callback: (tx: TransactionBuilder<C>) => TransactionBuilder<C>
  ) {
    return this.when(!condition, callback);
  }

  toTransaction(
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight,
    options: TransactionOptions = {}
  ): Transaction {
    options = { ...this.getTransactionOptions(), ...options };

    const transaction = new Transaction({
      feePayer: this.getFeePayer()?.publicKey,
      signatures: options.signatures,
      blockhash: blockhashWithExpiryBlockHeight.blockhash,
      lastValidBlockHeight: blockhashWithExpiryBlockHeight.lastValidBlockHeight,
    });

    transaction.add(...this.getInstructions());

    return transaction;
  }

  toPartiallySignedTransaction(
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight,
    options: TransactionOptions = {}
  ): Transaction {
    const transaction = this.toTransaction(
      blockhashWithExpiryBlockHeight,
      options
    );
    const keypairSigners = this.getSigners().filter(
      (s): s is Keypair => s instanceof Keypair
    );
    if (keypairSigners.length > 0) {
      transaction.partialSign(...keypairSigners);
    }

    return transaction;
  }

  protected cloneWithoutRecords(): TransactionBuilder<C> {
    const result = TransactionBuilder.make<C>(this.transactionOptions);
    if (this.feePayer !== undefined) {
      result.setFeePayer(this.feePayer);
    }

    result.setContext(this.context);

    return result;
  }

  divideToMultipleBuildersThatFit(): TransactionBuilder<C>[] {
    if (this.checkTransactionFits()) {
      return [this];
    }

    if (this.records.length === 0) {
      return [];
    }

    const builders: TransactionBuilder<C>[] = [];
    let unprocessedRecords = [...this.records];

    while (unprocessedRecords.length > 0) {
      let builderAdded = false;
      for (
        let recordsToTake = unprocessedRecords.length;
        recordsToTake > 0;
        recordsToTake--
      ) {
        const records = unprocessedRecords.slice(0, recordsToTake);
        const builder = this.cloneWithoutRecords().append(...records);

        if (builder.checkTransactionFits()) {
          builders.push(builder);
          unprocessedRecords = unprocessedRecords.slice(recordsToTake);
          builderAdded = true;
          break;
        }
      }

      if (!builderAdded) {
        throw new Error(
          `Instruction ${unprocessedRecords[0].key} is too big to fit into the transaction`
        );
      }
    }

    return builders;
  }

  async sendAndConfirm(
    convergence: Convergence,
    confirmOptions?: ConfirmOptions
  ): Promise<{ response: SendAndConfirmTransactionResponse } & C> {
    const response = await convergence
      .rpc()
      .sendAndConfirmTransaction(this, [], confirmOptions);

    return {
      response,
      ...this.getContext(),
    };
  }

  addStaticComputeBudgetIxs(convergence: Convergence, computeUnits: number) {
    if (convergence.transactionPriority === 'dynamic') {
      return this;
    }
    const txPriorityInLamports =
      typeof convergence.transactionPriority === 'number'
        ? convergence.transactionPriority
        : TRANSACTION_PRIORITY_FEE_MAP[convergence.transactionPriority];
    return this.prepend({
      instruction: ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: txPriorityInLamports * Math.pow(10, 6),
      }),
      signers: [],
    }).prepend({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
      }),
      signers: [],
    });
  }

  addDynamicComputeBudgetIxs(microLamports: number, computeUnits: number) {
    return this.prepend({
      instruction: ComputeBudgetProgram.setComputeUnitPrice({
        microLamports,
      }),
      signers: [],
    }).prepend({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
      }),
      signers: [],
    });
  }
}
