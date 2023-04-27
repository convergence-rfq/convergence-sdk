#!env bash

set -e
set -x

LOCALNET="http://127.0.0.1:8899"
DEVNET="https://api.devnet.solana.com"
TESTNET="https://api.testnet.solana.com"
MAINNET="https://api.mainnet-beta.solana.com"

RPC_ENDPOINT=$DEVNET

OWNER="HGm8jGLSazATztBSUxXfU62oRyVsmwPKnUsjvviRYbRG"
DAO_KEYPAIR="$HOME/.config/solana/id.json"
MINT_KEYPAIR="$HOME/.config/solana/mint-authority.json"

CVG="node /Users/pindaroso/code/convergence-sdk/packages/cli/dist/cjs/index.cjs"

SPOT_INSTRUMENT_PROGRAM_ID="HNHBtGzS58xJarSbz5XbEjTTEFbAQUHdP8TjQmwjx1gW"
PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID="HmJ8K5xb6kXbVbvRriq1Z7oPdEaPmKXpEM4Un9nr5b1"
PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID="7GcKLyM73RRJshRLQqX8yw9K3hTHkx1Ei14mKoKxi3ZR"

BTC_ORACLE_ADDRESS="8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"
SOL_ORACLE_ADDRESS="GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR"

OPT="--rpc-endpoint=$RPC_ENDPOINT --keypair-file=$MINT_KEYPAIR"

USDC_MINT=BREWDGvXEQKx9FkZrSCajzjy4cpm9hofzze3b41Z3V4p
BTC_MINT=A3c9ThQZTUruMm56Eu4fxVwRosg4nBTpJe2B1pxBMYK7
SOL_MINT=FYQ5MgByxnkfGAUzNcbaD734VK8CdEUX49ioTkokypRc

#$CVG airdrop $OPT

#read USDC_MINT <<< $($CVG create-mint $OPT --decimals=6 | awk '/Address:[[:space:]]/ { print $2 }')
#read BTC_MINT <<< $($CVG create-mint $OPT --decimals=9 | awk '/Address:[[:space:]]/ { print $2 }')
#read SOL_MINT <<< $($CVG create-mint $OPT --decimals=9 | awk '/Address:[[:space:]]/ { print $2 }')

#read USDC_WALLET <<< $($CVG create-wallet $OPT --mint=$USDC_MINT --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')
#read BTC_WALLET <<< $($CVG create-wallet $OPT --mint=$BTC_MINT  --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')
#read SOL_WALLET <<< $($CVG create-wallet $OPT --mint=$SOL_MINT  --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')

#$CVG mint-to $OPT --mint=$USDC_MINT --wallet=$USDC_WALLET --amount=1000000000000000
#$CVG mint-to $OPT --mint=$BTC_MINT  --wallet=$BTC_WALLET  --amount=1000000000000000
#$CVG mint-to $OPT --mint=$SOL_MINT  --wallet=$SOL_WALLET  --amount=1000000000000000

#$CVG airdrop $OPT

KEYPAIR_FILE=$DAO_KEYPAIR
OPT="--rpc-endpoint=$RPC_ENDPOINT --keypair-file=$KEYPAIR_FILE"

$CVG initialize-protocol $OPT --taker-fee=1 --maker-fee=0 --collateral-mint=$USDC_MINT
$CVG initialize-risk-engine $OPT

$CVG add-instrument $OPT --instrument-program=$SPOT_INSTRUMENT_PROGRAM_ID --can-be-used-as-quote=true --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
$CVG add-instrument $OPT --instrument-program=$PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID --can-be-used-as-quote=true --validate-data-account-amount=2 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
$CVG add-instrument $OPT --instrument-program=$PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID --can-be-used-as-quote=true --validate-data-account-amount=3 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4

$CVG set-risk-engine-instrument-type $OPT --type=spot --program=$SPOT_INSTRUMENT_PROGRAM_ID
$CVG set-risk-engine-instrument-type $OPT --type=option --program=$PSYOPTIONS_AMERICAN_INSTRUMENT_PROGRAM_ID
$CVG set-risk-engine-instrument-type $OPT --type=option --program=$PSYOPTIONS_EUROPEAN_INSTRUMENT_PROGRAM_ID

$CVG set-risk-engine-risk-categories-info $OPT --category=very-low --new-value=0.05,0.5,0.02,0.2,0.04,0.3,0.08,0.4,0.12,0.5,0.2,0.6,0.3,0.7
$CVG set-risk-engine-risk-categories-info $OPT --category=low --new-value=0.05,0.8,0.04,0.4,0.08,0.6,0.16,0.8,0.24,1,0.4,1.2,0.6,1.4
$CVG set-risk-engine-risk-categories-info $OPT --category=medium --new-value=0.05,1.2,0.06,0.6,0.12,0.9,0.24,1.2,0.36,1.5,0.6,1.8,0.9,2.1
$CVG set-risk-engine-risk-categories-info $OPT --category=high --new-value=0.05,2.4,0.08,0.8,0.16,1.2,0.32,1.6,0.48,2,0.8,2.4,1.2,2.8,
$CVG set-risk-engine-risk-categories-info $OPT --category=very-high --new-value=0.05,5,0.1,1,0.2,1.5,0.4,2,0.6,2.5,1,3,1.5,3.5

$CVG add-base-asset $OPT --ticker=BTC --oracle-address=$BTC_ORACLE_ADDRESS
$CVG add-base-asset $OPT --ticker=SOL --oracle-address=$SOL_ORACLE_ADDRESS

$CVG register-mint $OPT --mint=$BTC_MINT --base-asset-index=0
$CVG register-mint $OPT --mint=$SOL_MINT --base-asset-index=1
$CVG register-mint $OPT --mint=$USDC_MINT
