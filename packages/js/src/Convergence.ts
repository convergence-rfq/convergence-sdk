import { Connection } from '@solana/web3.js';
import {
  ConvergencePlugin,
  Cluster,
  resolveClusterFromConnection,
} from './types';
import { corePlugins } from './plugins/corePlugins';

export type ConvergenceOptions = {
  cluster?: Cluster;
};

export class Convergence {
  public readonly connection: Connection;
  public readonly cluster: Cluster;

  constructor(connection: Connection, options: ConvergenceOptions = {}) {
    this.connection = connection;
    this.cluster = options.cluster ?? resolveClusterFromConnection(connection);
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
