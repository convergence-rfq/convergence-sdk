# Convergence RFQ SDK

[![Tests](https://github.com/convergence-rfq/convergence-sdk/actions/workflows/tests.yml/badge.svg)](https://github.com/convergence-rfq/convergence-sdk/actions/workflows/tests.yml)
[![Docs](https://github.com/convergence-rfq/convergence-sdk/actions/workflows/release-docs.yml/badge.svg)](https://github.com/convergence-rfq/convergence-sdk/actions/workflows/release-docs.yml)

## Overview

**Installation**

```bash
npm install @convergence-rfq/sdk @solana/web3.js
```

**Setup**

The entry point to the JavaScript SDK is a Convergence instance that will give you access to its API. It accepts a Connection instance from @solana/web3.js that will be used to communicate with the cluster.

```ts
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

import { Convergence, walletAdapterIdentity } from '@convergence-rfq/sdk';

const wallet = useWallet();
const cvg = new Convergence(new Connection(clusterApiUrl('devnet')));
cvg.use(walletAdapterIdentity(wallet));
```

**Example**

To create a basic RFQ for BTC spot quoted in USDC spot.

```ts
import { SpotInstrument, Side, OrderType } from '@convergence-rfq/sdk';

const { rfq, response } = await cvg.rfqs().createAndFinalize({
  instruments: [
    new SpotInstrument(cvg, btcMint, {
      amount: 1.3,
      side: Side.Bid,
    }),
  ],
  orderType: OrderType.Buy,
  quoteAsset: new SpotInstrument(cvg, usdcMint).toQuoteAsset(),
});

console.log('Tx:', response.signature);
```

## Development

**Requirements**

- [Node (18.12.1)](https://nodejs.org/en/download/)
- [Solana (1.14.11)](https://docs.solana.com/cli/install-solana-cli-tools#use-solanas-install-tool)
- [PNPM (6.23.6)](https://pnpm.io/installation)
- [Yarn (1.22.15)](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
- [Turbo (1.7.0)](https://turbo.build/)

**Setup**

```bash
yarn 
yarn build
```

**TDD**

First run the Solana test validator.

```bash
yarn validator
```

Run the validator logs separately.

```bash
yarn validator-logs
```

Finally run the tests.
  
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