import { Buffer } from 'buffer';
import {
  AccountInfo,
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Commitment,
  ConfirmOptions,
  GetLatestBlockhashConfig,
  GetProgramAccountsConfig,
  PublicKey,
  RpcResponseAndContext,
  SendOptions,
  SignatureResult,
  SolanaJSONRPCError,
  SolanaJSONRPCErrorCode,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';

import {
  FailedToConfirmTransactionError,
  FailedToConfirmTransactionWithResponseError,
  FailedToSendTransactionError,
  ConvergenceError,
  ParsedProgramError,
  UnknownProgramError,
} from '../../errors';
import type { Convergence } from '../../Convergence';
import {
  getSignerHistogram,
  isErrorWithLogs,
  lamports,
  Program,
  Signer,
  SolAmount,
  UnparsedAccount,
  UnparsedMaybeAccount,
} from '../../types';
import { TransactionBuilder, sleep, zipMap } from '../../utils';

export type ConfirmTransactionResponse = RpcResponseAndContext<SignatureResult>;

export type SendAndConfirmTransactionResponse = {
  signature: TransactionSignature;
  confirmResponse: ConfirmTransactionResponse;
  blockhash: Blockhash;
  lastValidBlockHeight: number;
};

/**
 * @group Modules
 */
export class RpcClient {
  protected defaultFeePayer?: Signer;
  protected lastContextSlot?: number; // max slot between all confirmed transactions
  protected static contextRetryDelays = [
    null,
    null,
    0.1,
    0.1,
    0.5,
    0.5,
    1,
    1,
    2,
    2,
  ]; // values in seconds

  constructor(protected readonly convergence: Convergence) {}

  async getTransactionSize(
    transaction: Transaction | TransactionBuilder,
    signers?: any
  ) {
    const prepared = await this.prepareTransaction(transaction, signers);
    const tx = prepared.transaction;
    const message = tx.compileMessage();

    try {
      // This method errors if tx too large
      message.serialize();
    } catch (err) {
      return -1;
    }
    const wireTransaction = tx.serializeMessage();

    return wireTransaction.length;
  }

  protected async prepareTransaction(
    transaction: Transaction | TransactionBuilder,
    signers: Signer[]
  ): Promise<{
    transaction: Transaction;
    signers: Signer[];
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
  }> {
    let blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
    if (
      !('records' in transaction) &&
      transaction.recentBlockhash &&
      transaction.lastValidBlockHeight
    ) {
      blockhashWithExpiryBlockHeight = {
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
      };
    } else {
      blockhashWithExpiryBlockHeight = await this.getLatestBlockhash();
    }

    if ('records' in transaction) {
      signers = [...transaction.getSigners(), ...signers];
      transaction = transaction.toTransaction(blockhashWithExpiryBlockHeight);
    }

    return { transaction, signers, blockhashWithExpiryBlockHeight };
  }

  async signTransaction(
    transaction: Transaction,
    signers: Signer[]
  ): Promise<Transaction> {
    const { keypairs, identities } = getSignerHistogram(signers);

    const { blockhash } =
      await this.convergence.connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;

    // Keypair signers.
    if (keypairs.length > 0) {
      transaction.partialSign(...keypairs);
    }

    // Identity signers.
    for (let i = 0; i < identities.length; i++) {
      transaction = await identities[i].signTransaction(transaction);
    }

    return transaction;
  }

  async sendTransaction(
    transaction: Transaction | TransactionBuilder,
    sendOptions: SendOptions = {},
    signers: Signer[] = []
  ): Promise<TransactionSignature> {
    const prepared = await this.prepareTransaction(transaction, signers);
    transaction = prepared.transaction;
    signers = prepared.signers;

    const defaultFeePayer = this.getDefaultFeePayer();
    if (!transaction.feePayer && defaultFeePayer) {
      transaction.feePayer = defaultFeePayer.publicKey;
      signers = [defaultFeePayer, ...signers];
    }

    transaction = await this.signTransaction(transaction, signers);
    const rawTransaction = transaction.serialize();

    return await this.sendRawTransaction(
      rawTransaction,
      sendOptions,
      transaction
    );
  }

  async sendAndConfirmRawTransaction(
    rawTransaction: Buffer,
    confirmOptions?: ConfirmOptions
  ): Promise<SendAndConfirmTransactionResponse> {
    const signature = await this.sendRawTransaction(
      rawTransaction,
      confirmOptions
    );
    const blockhashWithExpiryBlockHeight = await this.getLatestBlockhash();
    const confirmResponse = await this.confirmTransaction(
      signature,
      blockhashWithExpiryBlockHeight,
      confirmOptions?.commitment
    );
    return { signature, confirmResponse, ...blockhashWithExpiryBlockHeight };
  }

  async sendRawTransaction(
    rawTransaction: Buffer,
    sendOptions: SendOptions = {},
    sourceTransaction?: Transaction
  ) {
    sendOptions.skipPreflight = this.convergence.skipPreflight;
    if (sendOptions.preflightCommitment === undefined) {
      sendOptions.preflightCommitment = this.convergence.connection.commitment;
    }
    if (sendOptions.minContextSlot === undefined) {
      sendOptions.minContextSlot = this.lastContextSlot;
    }

    try {
      return await this.retryGetAccountAction(() =>
        this.convergence.connection.sendRawTransaction(
          rawTransaction,
          sendOptions
        )
      );
    } catch (error) {
      const transaction = sourceTransaction ?? Transaction.from(rawTransaction);
      throw this.parseProgramError(error, transaction);
    }
  }

  async serializeAndSendTransaction(
    transaction: Transaction,
    blockhashWithExpiryBlockHeight?: BlockhashWithExpiryBlockHeight,
    confirmOptions?: ConfirmOptions
  ): Promise<SendAndConfirmTransactionResponse> {
    if (blockhashWithExpiryBlockHeight === undefined) {
      if (typeof transaction.recentBlockhash !== 'string') {
        throw Error('Recent blockhash have not been passed');
      }

      if (typeof transaction.lastValidBlockHeight !== 'number') {
        throw Error('Last valid blockhash have not been passed');
      }

      blockhashWithExpiryBlockHeight = {
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
      };
    } else {
      if (
        blockhashWithExpiryBlockHeight.blockhash !== transaction.recentBlockhash
      ) {
        throw Error(
          'BlockhashWithExpiryBlockHeight passed does not correspond to transaction'
        );
      }
    }

    const rawTransaction = transaction.serialize();
    const signature = await this.sendRawTransaction(
      rawTransaction,
      confirmOptions,
      transaction
    );
    const confirmResponse = await this.confirmTransaction(
      signature,
      blockhashWithExpiryBlockHeight,
      confirmOptions?.commitment
    );
    return { signature, confirmResponse, ...blockhashWithExpiryBlockHeight };
  }

  async confirmTransaction(
    signature: TransactionSignature,
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight,
    commitment?: Commitment
  ): Promise<ConfirmTransactionResponse> {
    let rpcResponse: ConfirmTransactionResponse;
    try {
      rpcResponse = await this.convergence.connection.confirmTransaction(
        { signature, ...blockhashWithExpiryBlockHeight },
        commitment
      );
    } catch (error) {
      // TODO: Improve error handling details
      throw new FailedToConfirmTransactionError(error as Error);
    }

    if (rpcResponse.value.err) {
      // TODO: Improve error handling details
      throw new FailedToConfirmTransactionWithResponseError(rpcResponse);
    }

    if (rpcResponse.context.slot) {
      this.lastContextSlot = Math.max(
        rpcResponse.context.slot,
        this.lastContextSlot ?? -1
      );
    }

    return rpcResponse;
  }

  async sendAndConfirmTransaction(
    transaction: Transaction | TransactionBuilder,
    signers: Signer[] = [],
    confirmOptions?: ConfirmOptions
  ): Promise<SendAndConfirmTransactionResponse> {
    const prepared = await this.prepareTransaction(transaction, signers);
    const { blockhashWithExpiryBlockHeight } = prepared;
    transaction = prepared.transaction;
    signers = prepared.signers;

    const signature = await this.sendTransaction(
      transaction,
      confirmOptions,
      signers
    );

    const confirmResponse = await this.confirmTransaction(
      signature,
      blockhashWithExpiryBlockHeight,
      confirmOptions?.commitment
    );

    return { signature, confirmResponse, ...blockhashWithExpiryBlockHeight };
  }

  async getAccount(publicKey: PublicKey, commitment?: Commitment) {
    const accountInfo = await this.retryGetAccountAction(() =>
      this.convergence.connection.getAccountInfo(
        publicKey,
        this.expandGetAccountCommitment(commitment)
      )
    );

    return this.getUnparsedMaybeAccount(publicKey, accountInfo);
  }

  async accountExists(publicKey: PublicKey, commitment?: Commitment) {
    const balance = await this.retryGetAccountAction(() =>
      this.convergence.connection.getBalance(
        publicKey,
        this.expandGetAccountCommitment(commitment)
      )
    );

    return balance > 0;
  }

  async getMultipleAccounts(publicKeys: PublicKey[], commitment?: Commitment) {
    const accountInfos = await this.retryGetAccountAction(() =>
      this.convergence.connection.getMultipleAccountsInfo(
        publicKeys,
        this.expandGetAccountCommitment(commitment)
      )
    );

    return zipMap(publicKeys, accountInfos, (publicKey, accountInfo) => {
      return this.getUnparsedMaybeAccount(publicKey, accountInfo);
    });
  }

  // sometimes fetching account data immediately after confirming a transaction would hit a different node
  // that is slightly behind in the block history. In that case fetch would fail or return stale data
  // To solve this issue we pass minContextSlot as fetch parameter and retry if node slot is behind
  protected async retryGetAccountAction<T>(action: () => Promise<T>) {
    for (const retryDelay of RpcClient.contextRetryDelays) {
      try {
        const result = await action();
        return result;
      } catch (e) {
        // for some reason in some methods connection doesn't throw a valid SolanaJSONRPCError with correct error code
        // it just a plain Error and encodes error as a part of the message
        const isStringError =
          e instanceof Error &&
          e.message.includes('Minimum context slot has not been reached');
        const isClassError =
          e instanceof SolanaJSONRPCError &&
          e.code ==
            SolanaJSONRPCErrorCode.JSON_RPC_SERVER_ERROR_MIN_CONTEXT_SLOT_NOT_REACHED;

        if (isStringError || isClassError) {
          if (retryDelay !== null) {
            await sleep(retryDelay);
          }

          continue;
        }

        throw e;
      }
    }

    throw Error('Max retries exceeded!');
  }

  protected expandGetAccountCommitment(commitment?: Commitment) {
    return {
      commitment,
      minContextSlot: this.lastContextSlot,
    };
  }

  async getProgramAccounts(
    programId: PublicKey,
    configOrCommitment?: GetProgramAccountsConfig | Commitment
  ): Promise<UnparsedAccount[]> {
    const accounts = await this.convergence.connection.getProgramAccounts(
      programId,
      configOrCommitment
    );

    return accounts.map(({ pubkey, account }) => ({
      ...account,
      publicKey: pubkey,
      lamports: lamports(account.lamports),
    }));
  }

  async getRent(bytes: number, commitment?: Commitment): Promise<SolAmount> {
    const rent =
      await this.convergence.connection.getMinimumBalanceForRentExemption(
        bytes,
        commitment
      );

    return lamports(rent);
  }

  async getLatestBlockhash(
    commitmentOrConfig: Commitment | GetLatestBlockhashConfig = 'finalized'
  ): Promise<BlockhashWithExpiryBlockHeight> {
    return this.convergence.connection.getLatestBlockhash(commitmentOrConfig);
  }

  setDefaultFeePayer(payer: Signer) {
    this.defaultFeePayer = payer;

    return this;
  }

  getDefaultFeePayer(): Signer {
    return this.defaultFeePayer
      ? this.defaultFeePayer
      : this.convergence.identity();
  }

  protected getUnparsedMaybeAccount(
    publicKey: PublicKey,
    accountInfo: AccountInfo<Buffer> | null
  ): UnparsedMaybeAccount {
    if (!accountInfo) {
      return { publicKey, exists: false };
    }

    return {
      ...accountInfo,
      publicKey,
      exists: true,
      lamports: lamports(accountInfo.lamports),
    };
  }

  async signAllTransactions(
    transactions: Transaction[],
    signers: Signer[]
  ): Promise<Transaction[]> {
    const { keypairs, identities } = getSignerHistogram(signers);

    for (let transaction of transactions) {
      if (keypairs.length > 0) {
        transaction.partialSign(...keypairs);
      }

      for (let i = 0; i < identities.length; i++) {
        transaction = await identities[i].signTransaction(transaction);
      }
    }

    return transactions;
  }

  async signTransactionMatrix(
    transactionMatrix: Transaction[][],
    signers: Signer[]
  ): Promise<Transaction[][]> {
    const txLengths: number[] = [];
    for (const txArray of transactionMatrix) {
      txLengths.push(txArray.length);
    }
    const flattendedTransactions = transactionMatrix.flat();
    const { keypairs, identities } = getSignerHistogram(signers);
    for (let transaction of flattendedTransactions) {
      if (keypairs.length > 0) {
        transaction.partialSign(...keypairs);
      }

      for (let i = 0; i < identities.length; i++) {
        transaction = await identities[i].signTransaction(transaction);
      }
    }

    const constructedTxMatrix: Transaction[][] = [];

    for (const len of txLengths) {
      constructedTxMatrix.push(flattendedTransactions.splice(0, len));
    }

    return constructedTxMatrix;
  }

  protected parseProgramError(
    error: unknown,
    transaction: Transaction
  ): ConvergenceError {
    // Ensure the error as logs.
    if (!isErrorWithLogs(error)) {
      return new FailedToSendTransactionError(error as Error);
    }

    // Parse the instruction number.
    const regex = /Error processing Instruction (\d+):/;
    const instruction: string | null = error.message.match(regex)?.[1] ?? null;

    // Ensure there is an instruction number given to find the program.
    if (!instruction) {
      return new FailedToSendTransactionError(error);
    }

    // Get the program ID from the instruction in the transaction.
    const instructionNumber: number = parseInt(instruction, 10);
    const programId: PublicKey | null =
      transaction.instructions?.[instructionNumber]?.programId ?? null;

    // Ensure we were able to find a program ID for the instruction.
    if (!programId) {
      return new FailedToSendTransactionError(error);
    }

    // Find a registered program if any.
    let program: Program;
    try {
      program = this.convergence.programs().get(programId);
    } catch (_programNotFoundError) {
      return new FailedToSendTransactionError(error);
    }

    // Ensure an error resolver exists on the program.
    if (!program.errorResolver) {
      return new UnknownProgramError(program, error);
    }

    // Finally, resolve the error.
    const resolvedError = program.errorResolver(error);

    return resolvedError
      ? new ParsedProgramError(program, resolvedError)
      : new UnknownProgramError(program, error);
  }
}
