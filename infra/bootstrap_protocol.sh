#!/bin/bash

set -e

#RPC_ENDPOINT="http://127.0.0.1:8899"
RPC_ENDPOINT="https://api.devnet.solana.com"
KEYPAIR_FILE="/Users/pindaroso/.config/solana/dao.json"

SPOT_INSTRUMENT_PROGRAM_ID=ZsYgiLpGrn287cJ4EFVToKULMuTVJyGLcMM6ADcm9iS
PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID=Hk3n7BobDvZuf7sVAD68vpth2ziTFqvuytVtiBGmCwes
PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID=DgP7BXvyTUzDDWVThy6usX7HZvBF5b6QwHovCz271hAv

#CVG=convergence
CVG="node /Users/pindaroso/code/convergence-sdk/packages/cli/dist/cjs/index.cjs"
OPT="--rpc-endpoint=$RPC_ENDPOINT --keypair-file=$KEYPAIR_FILE"

$CVG airdrop $OPT
read COLLATERAL_MINT_ADDRESS <<< $($CVG create-mint $OPT --decimals=6 | awk '/Address:[[:space:]]/ { print $2 }')
read BASE_ASSET_MINT_ADDRESS <<< $($CVG create-mint $OPT --decimals=9 | awk '/Address:[[:space:]]/ { print $2 }')
$CVG initialize-protocol $OPT --taker-fee=1 --maker-fee=0 --collateral-mint=$COLLATERAL_MINT_ADDRESS

$CVG initialize-risk-engine $OPT
$CVG add-instrument $OPT --instrument-program=$SPOT_INSTRUMENT_PROGRAM_ID --can-be-used-as-quote=true --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
$CVG add-instrument $OPT --instrument-program=$PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID --can-be-used-as-quote=true --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
$CVG add-instrument $OPT --instrument-program=$PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID --can-be-used-as-quote=true --validate-data-account-amount=2 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4

$CVG set-risk-engine-instrument-type $OPT --type=spot --program=$SPOT_INSTRUMENT_PROGRAM_ID
$CVG set-risk-engine-instrument-type $OPT --type=option --program=$PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID
$CVG set-risk-engine-instrument-type $OPT --type=option --program=$PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID

$CVG set-risk-engine-risk-categories-info $OPT --category=very-low --new-value=0.05,0.5,0.02,0.2,0.04,0.3,0.08,0.4,0.12,0.5,0.2,0.6,0.3,0.7
$CVG set-risk-engine-risk-categories-info $OPT --category=low --new-value=0.05,0.8,0.04,0.4,0.08,0.6,0.16,0.8,0.24,1,0.4,1.2,0.6,1.4
$CVG set-risk-engine-risk-categories-info $OPT --category=medium --new-value=0.05,1.2,0.06,0.6,0.12,0.9,0.24,1.2,0.36,1.5,0.6,1.8,0.9,2.1
$CVG set-risk-engine-risk-categories-info $OPT --category=high --new-value=0.05,2.4,0.08,0.8,0.16,1.2,0.32,1.6,0.48,2,0.8,2.4,1.2,2.8,
$CVG set-risk-engine-risk-categories-info $OPT --category=very-high --new-value=0.05,5,0.1,1,0.2,1.5,0.4,2,0.6,2.5,1,3,1.5,3.5