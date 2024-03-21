import { Connection } from '@solana/web3.js';
import {
  ConvergencePlugin,
  Cluster,
  resolveClusterFromConnection,
} from './types';
import { corePlugins } from './plugins/corePlugins';
import { TransactionPriority } from './utils';

export type ConvergenceOptions = {
  cluster?: Cluster;
  skipPreflight?: boolean;
  transactionPriority?: TransactionPriority;
  maxRetries?: number;
};

export class Convergence {
  public readonly connection: Connection;
  public readonly cluster: Cluster;
  public readonly skipPreflight: boolean;
  public readonly transactionPriority: TransactionPriority;
  public readonly maxRetries: number;

  constructor(connection: Connection, options: ConvergenceOptions = {}) {
    this.connection = connection;
    this.cluster = options.cluster ?? resolveClusterFromConnection(connection);
    this.skipPreflight = options.skipPreflight ?? false;
    this.transactionPriority = options.transactionPriority ?? 'none';
    this.maxRetries = options.maxRetries ?? 0;
    this.use(corePlugins());
  }

  static make(connection: Connection, options: ConvergenceOptions = {}) {
    return new this(connection, options);
  }

  use(plugin: ConvergencePlugin) {
    plugin.install(this);
    return this;
  }
}
