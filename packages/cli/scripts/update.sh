#!env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

i=2

while IFS=',' read -r oracle name ticker mint null
do
  echo "Index: ${i}"
  echo "Oracle: $oracle"
  echo "Name: $name"
  echo "Ticker: $ticker"
  echo "Mint: $mint"
  convergence protocol add-base-asset --rpc-endpoint=https://api.devnet.solana.com --ticker=$ticker --oracle-address=$oracle --oracle-kind=switchboard
  convergence protocol register-mint  --rpc-endpoint=https://api.devnet.solana.com --mint=$mint --base-asset-index=$index
  ((i=i+1))
done < "${SCRIPT_DIR}/switchboard_assets.csv"