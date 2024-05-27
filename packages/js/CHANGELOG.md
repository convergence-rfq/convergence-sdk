# @convergence-rfq/sdk

## 6.6.21

### Patch Changes

- add logs to check unlockhxroCollateralTxSize

## 6.6.20

### Patch Changes

- fix tx size overflow for unlockHxroCollateralTx

## 6.6.19

### Patch Changes

- modify unclockHxroCollateral and add markPriceUpdate ixs

## 6.6.18

### Patch Changes

- update getHxroCollateralForSettlement

## 6.6.17

### Patch Changes

- finish hxro updateMarkPrice integration

## 6.6.16

### Patch Changes

- remove console logs

## 6.6.15

### Patch Changes

- experiment hxro updateMarkPrice

## 6.6.14

### Patch Changes

- Modify preparePrintTradeSettlement logic

## 6.6.13

### Patch Changes

- fix sig verify error

## 6.6.12

### Patch Changes

- add updateMarkPrice ix to lockcollateral

## 6.6.11

### Patch Changes

- Update hxro collateral logs fetching logic

## 6.6.10

### Patch Changes

- Fix an issue with hxro library when the SDK is imported as .mjs

## 6.6.9

### Patch Changes

- Disable CU calculations for Create RFQ Txs

## 6.6.8

### Patch Changes

- fix FinalizeRFQCOnstruction CU limits

## 6.6.7

### Patch Changes

- Add Offset of 1000 CUs to simulates CUs

## 6.6.6

### Patch Changes

- ComputeUnits Improvement and implement dynamic Priority fee

## 6.6.5

### Patch Changes

- replace microlamports with lamports to test

## 6.6.4

### Patch Changes

- Update Tx priortiy fees

## 6.6.3

### Patch Changes

- change bootstrap script and add retryExpiration logic to closeProtocol

## 6.6.2

### Major Changes

- add getRequiredCollateralForSettlement operation

## 6.6.1

### Patch Changes

- Add clear cache before finding a vacant base asset index

## 6.6.0

### Minor Changes

- Add user asset functionality, remove duplicated operation to change the existing base asset, add logic to automatically find a vacant base asset index

## 6.5.0

### Minor Changes

- Replace risk engine program with a simplified one, add squads integration

## 6.4.2

### Patch Changes

- Update some of vault operator actions API

## 6.4.1

### Patch Changes

- Removed reduntant console log

## 6.4.0

### Minor Changes

- Add vault operator functionality - an ability to predefine acceptable price for an rfq. User would deposit tokens at the moment of the rfq creation and the settlement would be executed automatically if an acceptable response arrives using a crank bot

## 6.3.3

### Patch Changes

- Update max-retries logic

## 6.3.2

### Patch Changes

- Add max-retries arg to cli and also implement maxRetries logic for retrying sending failed txs to chain again

## 6.3.1

### Patch Changes

- Add tx-priority-fee argument to cli and modify sdk txPriority to take custom values

## 6.3.0

### Minor Changes

- Update program ids and add vault operator program

## 6.2.1

### Patch Changes

- fix addJupBaseAssets command

## 6.2.0

### Minor Changes

- Integrate hxro ,collateral req changes

## 6.1.0

### Minor Changes

- Remove collateral requirements, add quote spot fees, add spot instrument config, remove operations to unlock collateral or settle defaults

## 6.0.1

### Patch Changes

- update cpl packages

## 6.0.0

### Minor Changes

- Hxro integration

## 4.5.35

### Patch Changes

- fix collateral calculation for in-place price oracles

## 4.5.30

### Patch Changes

- add UpdateBaseAsset operation to sdk

## 4.5.29

### Patch Changes

- Optimize Whitelist creation logic for sigle signature on user side

## 4.5.28

### Patch Changes

- Update SDK with CPL whitelist changes

## 4.5.27

### Patch Changes

- revoke NoopWallet logic and use this instead of CvgWallet while creating programs

## 4.5.26

### Patch Changes

- Add Priority Fees to sdk

## 4.5.25

### Patch Changes

- Update CPL packages and add updated programs in fixtures
  (cpl ref : adding validation for whitelst in respond_to_rfq ix)

## 4.5.24

### Patch Changes

- add Whitelist feature to SDK

## 4.5.22

### Patch Changes

- update solana and anchor package versions amd add ixType to checkedAdd method

## 4.5.21

### Patch Changes

- Fix getResponseState to avoid conflict between enum DefaultingParty.Talker (0) and null

## 4.5.20

### Patch Changes

- Update CPL Solita packages to version - 2.3.0

## 4.5.19

### Patch Changes

- Fresh Deployment with new program Ids

## 4.5.18

### Patch Changes

- Update getResponseStateAndAction to account for responseExpiration

## 4.5.17

### Patch Changes

- Add expirationTimestamp to Response Model
  Update CPL solita packages to version 2.2.14

## 4.5.16

### Patch Changes

- Update CPL solita packages to version 2.2.13

## 4.5.15

### Patch Changes

- fix technical debt
  handle american put options
  handle duplicate atas creation

## 4.5.14

### Patch Changes

- fix prepareSettlementLogic to handle transaction already processed error

## 4.5.13

### Patch Changes

- handle blockheight issue popping in browser

## 4.5.12

### Patch Changes

- fix BN error import

## 4.5.11

### Patch Changes

- handle option market creation in createRfq logic
  optimize prepareSettlement logic for single tx confirmation

## 4.5.10

### Patch Changes

- refactor prepareSettlement logic to handle creation of atas and minting option tokens if required
  add getTokenBalance operation to token module
  add getRfqStateAndAction
  add getResponseStateAndAction
  fix cli-tests

## 4.5.9

### Patch Changes

- CLI get-registered-mints now logs mint address and decimals

## 4.5.8

### Patch Changes

- Added min collateral requirement flag to CLI

## 4.5.7

### Patch Changes

- Risk engine config default config is now 10 USDC

## 4.5.6

### Patch Changes

- Fixed typo in CLI input parameters

## 4.5.5

### Patch Changes

- Initialize protocol now takes and utilizes parameters for all fees

## 4.5.4

### Patch Changes

- make getSettlementResult a synchronous operation & Refactor Client Risk Engine to remove unnecessary decimal conversions and add + replace new Api models from Solita"

## 4.5.3

### Patch Changes

- Added fix for blockhash and incremented CPL Solita packages to 2.2.12

## 4.5.2

### Patch Changes

- Remove decimals from override legMultiplier and remove Bps suffixes , also improve getSettlementResultOperation to work for non confirmed response

## 4.5.1

### Patch Changes

- use getSettlementResult to mintOptions and getOrCreateOptionAtas to cover all cases

## 4.5.0

### Patch Changes

- Added getSettlementResult Operation to Rfq Module

## 4.4.10

### Patch Changes

- Added method for unlocking multiple RFQs collateral

## 4.4.9

### Patch Changes

- Updated risk engine to no longer experience out of bounds issues

## 4.4.8

### Patch Changes

- Fixed response cleanup block issue

## 4.4.7

### Patch Changes

- Updated CPL Solita bindings

## 4.4.6

### Patch Changes

- f1e1b8cb: Update cache to resolve existing value before calling getter again
- 650ce19b: Removed cleanUpResponse from RfqClient

## 4.4.5

### Patch Changes

- 30273e1b: Updated Anchor NoopWallet

## 4.4.4

### Patch Changes

- 71ed402e: Use NoopWallet for Anchor

## 4.4.3

### Patch Changes

- 3214c2c4: Methods to return multiple txs now return them in responses
- 3335acbf: No longer importing Anchor Wallet explicitly

## 4.4.2

### Patch Changes

- c700c7de: Added StoredResponseState API model
- c700c7de: Updated Settlement APIs to include Side and Quote models

## 4.4.1

### Patch Changes

- 1a830ff7: Added API model AuthoritySide
- 1a830ff7: Fix for fetching RFQs where no wallet is provided
- 9eeda287: Added subscribe method to GpaBuilers to listen to account changes

## 4.4.0

### Minor Changes

- ff080022: Added AsyncCollection to SDK and convert findRfqs to return it instead of an AsyncGenerator
- ff080022: Converted the findRfqs API to an async generator
- ff080022: Normalized the RFQ plugin interface

### Patch Changes

- ff080022: Exported account plugin

## 4.3.10

### Patch Changes

- Add minContextSlot and preflight confirmation to sending transactions

## 4.3.9

### Patch Changes

- Use latest blockhash in sendRawTransaction

## 4.3.8

### Patch Changes

- Added sendRawTransaction to RPC client

## 4.3.7

### Patch Changes

- Response add decimals and sign all tx fix and cleaned up tests

## 4.3.6

### Patch Changes

- Added throttling and bumped Solita packages

## 4.3.5

### Patch Changes

- Fix psyoptions American deserialization error

## 4.3.4

### Patch Changes

- Added method to retry account fetching when confirmed transaction hit unsynced RPC nodes based on slot updates

## 4.3.3

### Patch Changes

- 408456c0: Added scripts for CLI

### Minor Changes

- 933919c1: Updated Collateral APIs and added Account subscription client
- 21540900: Updated fixtures, models and instructions for CPL update v2.2.6
- 0bdfcba0: Minor update for 4.3.2 adding normalized collateral, protocol, base asset and registered mint normalized modules, as well as new instrument interface.

### Patch Changes

- 5fca902e: Added tests for adding base assets with in-place price and Pyth oracle
- Cleanup old ids and minor housekeeping with removing registered mint output

## 4.2.4

### Patch Changes

- Added back skipPreFlight in RpcClient

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

## 3.2.1

### Patch Changes

- add new rfq / response pdas

## 3.2.0

### Minor Changes

- Rebuilt

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
