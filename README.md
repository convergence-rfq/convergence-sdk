# @convergence-rfq/sdk

## Installation

```bash
npm install @convergence-rfq/sdk @solana/web3.js
```

## Setup

The entry point to the JavaScript SDK is a Convergence instance that will give you access to its API. It accepts a Connection instance from @solana/web3.js that will be used to communicate with the cluster.

```ts
import { Convergence, walletAdapterIdentity } from '@convergence-rfq/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'));
const cvg = new Convergence(connection);
cvg.use(walletAdapterIdentity({ publicKey: wallet.publicKey }));
```

## Development

**Requirements**

- [Node (18.12.1)](https://nodejs.org/en/download/)
- [Yarn (1.22.15)](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
- [NX (14.8.6)](https://nx.dev/recipes/adopting-nx/adding-to-monorepo)

**Setup**

```bash
yarn 
yarn build
```

**TDD**

```bash
yarn amman:start # Run this in a separate tab and do not forget to restart when rerunning tests
yarn test
```