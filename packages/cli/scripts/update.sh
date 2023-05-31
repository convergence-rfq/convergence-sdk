#!env bash

set -e
set -x

while IFS=',' read -r oracle name ticker mint null
do
  echo "Oracle: $oracle"
  echo "Name: $name"
  echo "Ticker: $ticker"
  echo "Mint: $mint"
  yarn cli protocol register-mint --mint="$mint"
done < "/Users/pindaroso/Downloads/oracles.csv"