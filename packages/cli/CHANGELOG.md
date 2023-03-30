# @convergence-rfq/cli

## 4.0.24-rc.21

### Patch Changes

- remove console.log
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.20

### Patch Changes

- fix minting receiver logic for options
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.19

### Patch Changes

- fix response conversion, bid,ask, getCreateAccountsAndMintOptionsTransaction
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.18

### Patch Changes

- use BN in convertResponseOutput
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.17

### Patch Changes

- don't mutate state in convertResponseOutput
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.16

### Patch Changes

- dont change bid ask state in convertResponseInput
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.9

### Patch Changes

- pull options mint receiver dynamically
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.8

### Patch Changes

- add method to get tx to mint american options
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.7

### Patch Changes

- change caller to signer in createAndMintAmerican
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.6

### Patch Changes

- add mint options methods
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.5

### Patch Changes

- use getAccount and createToken in prepareSettlement instead of getOrCreateAssociatedTokenAccount
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.4

### Patch Changes

- call getMultipleAccounts with only leq 100 pubkeys
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc.3

### Patch Changes

- use getMultipleAccounts to fetch rfq, response, fix psyop euro fixed base rfq creation collateral
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.23-rc.6

### Patch Changes

- Updated dependencies
  - @convergence-rfq/sdk@4.0.23-rc.5

## 4.0.23-rc.5

### Patch Changes

- fix fixedSize, response decimals, reduce rpc calls
- Updated dependencies
  - @convergence-rfq/sdk@4.0.23

## 4.0.23-rc.4

### Patch Changes

- add oracle id to psyoptions euro creation
- Updated dependencies
  - @convergence-rfq/sdk@4.0.23

## 4.0.23-rc.3

### Patch Changes

- update cli script
- Updated dependencies
  - @convergence-rfq/sdk@4.0.23

## 4.0.23-rc.2

### Patch Changes

- add psyoptions american program creation method, CvgWallet
- Updated dependencies
  - @convergence-rfq/sdk@4.0.25

## 4.0.24

### Patch Changes

- add psyoptions american program creation method, CvgWallet
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.24-rc

### Patch Changes

- update version number to have `rc`
- Updated dependencies
  - @convergence-rfq/sdk@4.0.24

## 4.0.23

### Patch Changes

- fix collateral locked tokens amount
- Updated dependencies
  - @convergence-rfq/sdk@4.0.23

## 4.0.22

### Patch Changes

- fix options creation
- Updated dependencies
  - @convergence-rfq/sdk@4.0.22

## 4.0.21

### Patch Changes

- fix options creation
- Updated dependencies
  - @convergence-rfq/sdk@4.0.21

## 4.0.20

### Patch Changes

- fix options creation
- Updated dependencies
  - @convergence-rfq/sdk@4.0.20

## 4.0.19

### Patch Changes

- fix options serialization / creation
- Updated dependencies
  - @convergence-rfq/sdk@4.0.19

## 4.0.18

### Patch Changes

- fix initializeNewOptionMeta
- Updated dependencies
  - @convergence-rfq/sdk@4.0.18

## 4.0.17

### Patch Changes

- add method createEuropeanProgram
- Updated dependencies
  - @convergence-rfq/sdk@4.0.17

## 4.0.16

### Patch Changes

- export initializeNewOptionMeta fn
- Updated dependencies
  - @convergence-rfq/sdk@4.0.16

## 4.0.15

### Patch Changes

- add initializeNewOptionMeta method
- Updated dependencies
  - @convergence-rfq/sdk@4.0.15

## 4.0.14

### Patch Changes

- add faucet airdrop helper method
- Updated dependencies
  - @convergence-rfq/sdk@4.0.14

## 4.0.13

### Patch Changes

- make necessary changes for updated CPL
- Updated dependencies
  - @convergence-rfq/sdk@4.0.13

## 4.0.12

### Patch Changes

- change type of rfq pda timestamp buffer
- Updated dependencies
  - @convergence-rfq/sdk@4.0.12

## 4.0.11

### Patch Changes

- fix locked collateral, risk engine collateral calculations
- Updated dependencies
  - @convergence-rfq/sdk@4.0.11

## 4.0.10

### Patch Changes

- add rfq / response pdas
- Updated dependencies
  - @convergence-rfq/sdk@4.0.10

## 3.0.4

### Patch Changes

- Rebuilt package

## 3.0.3

### Patch Changes

- Rebuilt package

## 3.0.2

### Patch Changes

- Improved logging for devnet airdrop

## 3.0.1

### Patch Changes

- Minor improvements in decimal conversions and devnet airdrop

- Updated dependencies
  - @convergence-rfq/sdk@4.0.0

## 3.0.0

### Major Changes

- Added method for retrieving registered mints and devnet airdrops helper"

### Patch Changes

- Updated dependencies
  - @convergence-rfq/sdk@3.0.0

## 2.0.24

### Patch Changes

- update findResponsesByOwner & findRfqsByOwner
- Updated dependencies
  - @convergence-rfq/sdk@2.0.24

## 2.0.20

### Patch Changes

- Updated dependencies
  - @convergence-rfq/sdk@2.0.20

## 2.0.19

### Patch Changes

- Updated dependencies
  - @convergence-rfq/sdk@2.0.19
