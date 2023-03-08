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
} from '@/errors';
import type { Convergence } from '@/Convergence';
import {
  assertSol,
  getSignerHistogram,
  isErrorWithLogs,
  lamports,
  Program,
  Signer,
  SolAmount,
  UnparsedAccount,
  UnparsedMaybeAccount,
} from '@/types';
import { TransactionBuilder, zipMap } from '@/utils';

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

  constructor(protected readonly convergence: Convergence) {}

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

  async getTransactionSize(
    transaction: Transaction | TransactionBuilder,
    signers?: any
  ) {
    const prepared = await this.prepareTransaction(transaction, signers);

    const tx = prepared.transaction;

    const message = tx.compileMessage();

    let signData: Buffer;

    try {
      //@ts-ignore
      signData = message.serialize(); //this method errors if tx too large
    } catch (err) {
      return -1;
    }
    // @ts-expect-error
    const wireTransaction = tx.serializeMessage(signData);

    return wireTransaction.length;
  }

  async signTransaction(
    transaction: Transaction,
    signers: Signer[]
  ): Promise<Transaction> {
    const { keypairs, identities } = getSignerHistogram(signers);

    // Keypair signers.
    if (keypairs.length > 0) {
      transaction.partialSign(...keypairs);
    }

    // Identity signers.
    for (let i = 0; i < identities.length; i++) {
      await identities[i].signTransaction(transaction);
    }

    return transaction;
  }

  async signAllTransactions(
    transactions: Transaction[],
    signers: Signer[]
  ): Promise<Transaction[]> {
    const { keypairs, identities } = getSignerHistogram(signers);

    for (const transaction of transactions) {
      // Keypair signers.
      if (keypairs.length > 0) {
        transaction.partialSign(...keypairs);
      }

      // Identity signers.
      for (let i = 0; i < identities.length; i++) {
        await identities[i].signTransaction(transaction);
      }
    }

    return transactions;
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
    sendOptions.skipPreflight = this.convergence.skipPreflight;

    // TODO: Make this configurable.
    sendOptions.skipPreflight = true;

    try {
      return await this.convergence.connection.sendRawTransaction(
        rawTransaction,
        sendOptions
      );
    } catch (error) {
      throw this.parseProgramError(error, transaction);
    }
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
      throw new FailedToConfirmTransactionError(error as Error);
    }

    if (rpcResponse.value.err) {
      throw new FailedToConfirmTransactionWithResponseError(rpcResponse);
    }

    return rpcResponse;
  }

  async sendAndConfirmTransaction(
    transaction: Transaction | TransactionBuilder,
    confirmOptions?: ConfirmOptions,
    signers: Signer[] = []
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
    const accountInfo = await this.convergence.connection.getAccountInfo(
      publicKey,
      commitment
    );

    return this.getUnparsedMaybeAccount(publicKey, accountInfo);
  }

  async getAccounts(publicKeys: PublicKey[], commitment?: Commitment) {
    const accountInfos: UnparsedMaybeAccount[] = [];

    for (const publicKey of publicKeys) {
      const accountInfo = await this.convergence.connection.getAccountInfo(
        publicKey,
        commitment
      );

      accountInfos.push(this.getUnparsedMaybeAccount(publicKey, accountInfo));
    }

    return accountInfos;
  }

  async accountExists(publicKey: PublicKey, commitment?: Commitment) {
    const balance = await this.convergence.connection.getBalance(
      publicKey,
      commitment
    );

    return balance > 0;
  }

  async getMultipleAccounts(publicKeys: PublicKey[], commitment?: Commitment) {
    const accountInfos =
      await this.convergence.connection.getMultipleAccountsInfo(
        publicKeys,
        commitment
      );

    return zipMap(publicKeys, accountInfos, (publicKey, accountInfo) => {
      return this.getUnparsedMaybeAccount(publicKey, accountInfo);
    });
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

  /** Airdrops the specified amount of SOL to the specified pubkey address. */
  async airdrop(
    publicKey: PublicKey,
    amount: SolAmount,
    commitment?: Commitment
  ): Promise<SendAndConfirmTransactionResponse> {
    assertSol(amount);

    const signature = await this.convergence.connection.requestAirdrop(
      publicKey,
      amount.basisPoints.toNumber()
    );

    const blockhashWithExpiryBlockHeight = await this.getLatestBlockhash();
    const confirmResponse = await this.confirmTransaction(
      signature,
      blockhashWithExpiryBlockHeight,
      commitment
    );

    return { signature, confirmResponse, ...blockhashWithExpiryBlockHeight };
  }

  /** Gets the balance of the specified pubkey address. */
  async getBalance(
    publicKey: PublicKey,
    commitment?: Commitment
  ): Promise<SolAmount> {
    const balance = await this.convergence.connection.getBalance(
      publicKey,
      commitment
    );

    return lamports(balance);
  }

  /** Gets the minimum balance required to create an account with the specified number of bytes. */
  async getRent(bytes: number, commitment?: Commitment): Promise<SolAmount> {
    const rent =
      await this.convergence.connection.getMinimumBalanceForRentExemption(
        bytes,
        commitment
      );

    return lamports(rent);
  }

  /** Gets the latest blockhash. */
  async getLatestBlockhash(
    commitmentOrConfig: Commitment | GetLatestBlockhashConfig = 'finalized'
  ): Promise<BlockhashWithExpiryBlockHeight> {
    return this.convergence.connection.getLatestBlockhash(commitmentOrConfig);
  }

  /** Gets the Solana Explorer URL. */
  getSolanaExporerUrl(signature: string): string {
    let clusterParam = '';
    switch (this.convergence.cluster) {
      case 'devnet':
        clusterParam = '?cluster=devnet';
        break;
      case 'testnet':
        clusterParam = '?cluster=testnet';
        break;
      case 'localnet':
      case 'custom':
        const url = encodeURIComponent(this.convergence.connection.rpcEndpoint);
        clusterParam = `?cluster=custom&customUrl=${url}`;
        break;
    }

    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  }

  /** Sets the default fee payer. */
  setDefaultFeePayer(payer: Signer) {
    this.defaultFeePayer = payer;

    return this;
  }

  /** Gets the default fee payer. */
  getDefaultFeePayer(): Signer {
    return this.defaultFeePayer
      ? this.defaultFeePayer
      : this.convergence.identity();
  }

  /** Helper method to get an `UnparsedMaybeAccount` from `AccountInfo` */
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

  /** Helper method to parse a program error. */
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
