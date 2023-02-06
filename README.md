# @convergence-rfq/sdk

## Installation

```bash
npm install @convergence-rfq/sdk @solana/web3.js
```

## Setup

The entry point to the JavaScript SDK is a Convergence instance that will give you access to its API. It accepts a Connection instance from @solana/web3.js that will be used to communicate with the cluster.

```ts
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

import { Convergence, walletAdapterIdentity } from '@convergence-rfq/sdk';

const wallet = useWallet();
const cvg = new Convergence(new Connection(clusterApiUrl('devnet')));
cvg.use(walletAdapterIdentity(wallet));
```

## Basic Usage

To create a basic RFQ for BTC spot.

```ts
const { rfq } = await cvg.rfqs().createAndFinalize({
  instruments: [
    new SpotInstrument(cvg, btcMint, {
      amount: 1,
      side: Side.Bid,
    }),
  ],
  orderType: OrderType.Buy,
  fixedSize: { __kind: 'None', padding: 0 },
  quoteAsset: cvg
    .instrument(new SpotInstrument(cvg, usdcMint))
    .toQuoteData(),
});
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

Run the Solana test validator, Solana logs, and the tests.

```bash
yarn test:all
```

Run the validator separately.

```bash
yarn validator:logs
```

Run the tests only.

```bash
yarn test
```

**NPM**

```bash
yarn changeset:change
yarn changeset:version
yarn changeset:publish
```

**TypeDocs**

Documentation is built via CI/CD and released [here](https://convergence-rfq.github.io/convergence-sdk/).