# @convergence-rfq/sdk

## Installation

```bash
npm install @convergence-rfq/sdk @solana/web3.js
```

## Setup

The entry point to the JavaScript SDK is a Convergence instance that will give you access to its API. It accepts a Connection instance from @solana/web3.js that will be used to communicate with the cluster.

```ts
import { Convergence } from '@convergence-rfq/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('devnet'));
const convergence = new Convergence(connection);
```

## Development

**Requirements**

- [Node](https://nodejs.org/en/download/)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
- [NX](https://nx.dev/recipes/adopting-nx/adding-to-monorepo)

**Setup**

```bash
yarn 
```

**Building**

```bash
yarn build
```