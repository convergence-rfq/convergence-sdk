import { Connection } from "@solana/web3.js";
import { ConvergenceRfqPlugin, Cluster } from "./types";
export declare type ConvergenceRfqOptions = {
    cluster?: Cluster;
};
export declare class ConvergenceRfq {
    readonly connection: Connection;
    readonly cluster: Cluster;
    constructor(connection: Connection, options?: ConvergenceRfqOptions);
    static make(connection: Connection, options?: ConvergenceRfqOptions): ConvergenceRfq;
    use(plugin: ConvergenceRfqPlugin): this;
}
