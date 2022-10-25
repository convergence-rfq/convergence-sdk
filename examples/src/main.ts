import { Connection, clusterApiUrl } from "@solana/web3.js";

import { ConvergenceRfq } from "@convergence-rfq/sdk";

const connection = new Connection(clusterApiUrl("devnet"));
const convergenceRfq = new ConvergenceRfq(connection);
