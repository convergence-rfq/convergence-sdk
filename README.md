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

## TODO

- [ ] Fix build
- [ ] Complete `rfqModule`, `riskEngineModule`, and `spotInstrumentModule`
- [ ] Add tests
- [ ] Update inline examples