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

**Tests**

First run the Solana test validator.

```bash
yarn validator
```

Run the validator logs separately.

```bash
yarn validator:logs
```

Finally run the test in a new terminal.
  
```bash
yarn test
# It is possible to run individual module tests
cd packages/js
yarn test -g spot
```

**NPM**

```bash
yarn packages:change
yarn packages:version
yarn packages:publish
```

**TypeDocs**

Documentation is built via CI/CD and released [here](https://convergence-rfq.github.io/convergence-sdk/).