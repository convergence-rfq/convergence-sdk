# @convergence-rfq/sdk

## 4.0.24-rc.32

### Patch Changes

- the dist folder(RpcClient.mjs) was missing recentBlockhash , built sdk again and now its there

## 4.0.24-rc.21

### Patch Changes

- remove console.log

## 4.0.24-rc.20

### Patch Changes

- fix minting receiver logic for options

## 4.0.24-rc.19

### Patch Changes

- fix response conversion, bid,ask, getCreateAccountsAndMintOptionsTransaction

## 4.0.24-rc.18

### Patch Changes

- use BN in convertResponseOutput

## 4.0.24-rc.17

### Patch Changes

- don't mutate state in convertResponseOutput

## 4.0.24-rc.16

### Patch Changes

- dont change bid ask state in convertResponseInput

## 4.0.24-rc.11

### Patch Changes

- Fixed build via updated tsconfig.json configuration

## 4.0.24-rc.10

### Patch Changes

- Updated Solita versions to 2.2.2-rc.2

## 4.0.24-rc.9

### Patch Changes

- pull options mint receiver dynamically

## 4.0.24-rc.8

### Patch Changes

- add method to get tx to mint american options

## 4.0.24-rc.7

### Patch Changes

- change caller to signer in createAndMintAmerican

## 4.0.24-rc.6

### Patch Changes

- add mint options methods

## 4.0.24-rc.5

### Patch Changes

- use getAccount and createToken in prepareSettlement instead of getOrCreateAssociatedTokenAccount

## 4.0.24-rc.4

### Patch Changes

- call getMultipleAccounts with only leq 100 pubkeys

## 4.0.24-rc.3

### Patch Changes

- use getMultipleAccounts to fetch rfq, response, fix psyop euro fixed base rfq creation collateral

## 4.0.23-rc.6

### Patch Changes

- Updated PsyOptions European SDK version number to 0.2.3

## 4.0.23-rc.5

### Patch Changes

- fix fixedSize, response decimals, reduce rpc calls

## 4.0.23-rc.4

### Patch Changes

- add oracle id to psyoptions euro creation

## 4.0.23-rc.3

### Patch Changes

- update cli script

## 4.0.23-rc.2

### Patch Changes

- add psyoptions american program creation method, CvgWallet

## 4.0.24

### Patch Changes

- add psyoptions american program creation method, CvgWallet

## 4.0.24-rc

### Patch Changes

- update version number to have `rc`

## 4.0.23-rc

### Patch Changes

- fix collateral locked tokens amount

## 4.0.22

### Patch Changes

- fix options creation

## 4.0.21

### Patch Changes

- fix options creation

## 4.0.20

### Patch Changes

- fix options creation

## 4.0.19

### Patch Changes

- fix options serialization / creation

## 4.0.18

### Patch Changes

- fix initializeNewOptionMeta

## 4.0.17

### Patch Changes

- add method createEuropeanProgram

## 4.0.16

### Patch Changes

- export initializeNewOptionMeta fn

## 4.0.15

### Patch Changes

- add initializeNewOptionMeta method

## 4.0.14

### Patch Changes

- add faucet airdrop helper method

## 4.0.13

### Patch Changes

- make necessary changes for updated CPL

## 4.0.12

### Patch Changes

- change type of rfq pda timestamp buffer

## 4.0.11

### Patch Changes

- fix locked collateral, risk engine collateral calculations

## 4.0.10

### Patch Changes

- add rfq / response pdas

## 4.0.7

### Patch Changes

- add logic for converting number-> bignum

## 4.0.6

### Patch Changes

- use a different sha256 client so sdk builds correctly

## 3.1.0

### Minor Changes

- Cleaned up SpotInstrument interface to include toQuoteAsset method

## 3.0.1

### Patch Changes

- Minor improvements in decimal conversions and devnet airdrop

## 3.0.0

### Major Changes

- Added method for retrieving registered mints and devnet airdrops helper"

## 2.0.24

### Patch Changes

- update findResponsesByOwner & findRfqsByOwner

## 2.0.20

### Patch Changes

- update version to 2.0.20

## 2.0.19

### Patch Changes

- register ops, export Response model

## 2.0.18

### Patch Changes

- Added helper function quoteAssetToInstrument and renamed toQuoteData to toQuoteAsset

## 2.0.17

### Patch Changes

- Added methods and refactoring

## 2.0.15

### Patch Changes

- Added helper method for converting RFQ legs into instruments

## 2.0.14

### Patch Changes

- Added legsToInstruments helper function for RFQ legs

## 2.0.13

### Patch Changes

- Refactoring and cleanup

## 2.0.12

### Patch Changes

- 2257596: Added findByUser method to collateral module

## 2.0.11

### Patch Changes

- Minor updates to all modules including updated API interfaces and more complete models

## 2.0.10

### Patch Changes

- Minor fixes for collateral account management

## 2.0.9

### Patch Changes

- Updated tests

## 2.0.8

### Patch Changes

- d66ac3a: Added changeset for package management
