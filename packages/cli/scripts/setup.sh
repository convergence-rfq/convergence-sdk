#!env bash

set -e

source .env

KEYPAIR_FILE="$HOME/.config/solana/mint-authority.json"
OPTS="--rpc-endpoint=$RPC_ENDPOINT --keypair-file=$KEYPAIR_FILE"

convergence airdrop sol

read USDC_MINT <<< $(convergence token create-mint $OPTS --decimals=6 | awk '/Address:[[:space:]]/ { print $2 }')
read BTC_MINT  <<< $(convergence token create-mint $OPTS --decimals=9 | awk '/Address:[[:space:]]/ { print $2 }')
read SOL_MINT  <<< $(convergence token create-mint $OPTS --decimals=9 | awk '/Address:[[:space:]]/ { print $2 }')

read USDC_WALLET <<< $(convergence token create-wallet $OPTS --mint=$USDC_MINT --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')
read BTC_WALLET  <<< $(convergence token create-wallet $OPTS --mint=$BTC_MINT  --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')
read SOL_WALLET  <<< $(convergence token create-wallet $OPTS --mint=$SOL_MINT  --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')

convergence token mint-to $OPTS --mint=$USDC_MINT --wallet=$USDC_WALLET --amount=1000000000000000
convergence token mint-to $OPTS --mint=$BTC_MINT  --wallet=$BTC_WALLET  --amount=1000000000000000
convergence token mint-to $OPTS --mint=$SOL_MINT  --wallet=$SOL_WALLET  --amount=1000000000000000