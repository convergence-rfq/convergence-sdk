#!/bin/bash

set -e

RPC_ENDPOINT="http://127.0.0.1:8899"
KEYPAIR_FILE="/Users/pindaroso/.config/solana/dao.json"

SPOT_INSTRUMENT_PROGRAM_ID=FTzYU9cFnziCQvJ6ZUve7asaYqRexk7pBcn8zQ9MqoMQ
PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID=BeJcAotUcFEWXVnh6qaBBLKaZaoaM8HSFY1L3sb1Aps3
PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID=Cdaz7EGr2AVDkCpjMVEXDzap6oRrrrZUEaKAVLmJAX7R

#CVG=convergence
CVG="node /Users/pindaroso/code/convergence-sdk/packages/cli/dist/cjs/index.cjs"
OPT="--rpc-endpoint=$RPC_ENDPOINT --keypair-file=$KEYPAIR_FILE"

$CVG airdrop
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