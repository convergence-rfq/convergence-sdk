#!env bash

set -e

export DEVNET="true"

export SPOT_INSTRUMENT="CjQCEjXtG3QNBuT5Z1sctaAYCo5Mt6edftqHQetEPo9w"
export PSYOPTIONS_EUROPEAN_INSTRUMENT="A86fhhdNVDdXV8pB48WXtPeM3EBkcBeJEdrx9xrUo9nF"
export PSYOPTIONS_AMERICAN_INSTRUMENT="6JG1tWK4w6LmjeXbmDZJsmUsPSjgnp74j2XPsTvjjTX8"

# Same for devnet and mainnet
export BTC_ORACLE_ADDRESS="8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"
export SOL_ORACLE_ADDRESS="GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR"

# Mainnet
if [ $DEVNET = "true" ]; then
  export RPC_ENDPOINT="https://api.devnet.solana.com/"

  export USDC_MINT="BREWDGvXEQKx9FkZrSCajzjy4cpm9hofzze3b41Z3V4p"
  export BTC_MINT="A3c9ThQZTUruMm56Eu4fxVwRosg4nBTpJe2B1pxBMYK7"
  export SOL_MINT="FYQ5MgByxnkfGAUzNcbaD734VK8CdEUX49ioTkokypRc"
else
  export RPC_ENDPOINT="https://api.mainnet-beta.solana.com/"

  export USDC_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  export BTC_MINT="3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"
  export SOL_MINT="So11111111111111111111111111111111111111112"
fi

convergence protocol initialize --collateral-mint=$USDC_MINT --rpc-endpoint=$RPC_ENDPOINT

convergence risk-engine initialize --rpc-endpoint=$RPC_ENDPOINT

convergence protocol add-print-trade-provider --print-trade-provider-program $HXRO_PRINT_TRADE_PROVIDER --settlement-can-expire false --validate_response_account_amount 2
convergence hxro initialize-config --valid-mpg $HXRO_MPG
convergence hxro initialize-operator-trg

convergence protocol add-instrument --instrument-program=$SPOT_INSTRUMENT                --can-be-used-as-quote=true  --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4 --rpc-endpoint=$RPC_ENDPOINT  
convergence protocol add-instrument --instrument-program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --can-be-used-as-quote=false --validate-data-account-amount=2 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4 --rpc-endpoint=$RPC_ENDPOINT
convergence protocol add-instrument --instrument-program=$PSYOPTIONS_AMERICAN_INSTRUMENT --can-be-used-as-quote=false --validate-data-account-amount=3 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4 --rpc-endpoint=$RPC_ENDPOINT

convergence risk-engine set-instrument-type --program=$SPOT_INSTRUMENT                --type=spot   --rpc-endpoint=$RPC_ENDPOINT  
convergence risk-engine set-instrument-type --program=$PSYOPTIONS_AMERICAN_INSTRUMENT --type=option --rpc-endpoint=$RPC_ENDPOINT
convergence risk-engine set-instrument-type --program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --type=option --rpc-endpoint=$RPC_ENDPOINT

convergence risk-engine set-risk-categories-info --new-value="0.05,0.5,0.02,0.2,0.04,0.3,0.08,0.4,0.12,0.5,0.2,0.6,0.3,0.7" --category=very-low  --rpc-endpoint=$RPC_ENDPOINT
convergence risk-engine set-risk-categories-info --new-value="0.05,0.8,0.04,0.4,0.08,0.6,0.16,0.8,0.24,1.0,0.4,1.2,0.6,1.4" --category=low       --rpc-endpoint=$RPC_ENDPOINT
convergence risk-engine set-risk-categories-info --new-value="0.05,1.2,0.06,0.6,0.12,0.9,0.24,1.2,0.36,1.5,0.6,1.8,0.9,2.1" --category=medium    --rpc-endpoint=$RPC_ENDPOINT
convergence risk-engine set-risk-categories-info --new-value="0.05,2.4,0.08,0.8,0.16,1.2,0.32,1.6,0.48,2.0,0.8,2.4,1.2,2.8" --category=high      --rpc-endpoint=$RPC_ENDPOINT
convergence risk-engine set-risk-categories-info --new-value="0.05,5.0,0.10,1.0,0.20,1.5,0.40,2.0,0.60,2.5,1.0,3.0,1.5,3.5" --category=very-high --rpc-endpoint=$RPC_ENDPOINT

convergence protocol add-base-asset --ticker=BTC --oracle-address=$BTC_ORACLE_ADDRESS --oracle-source=switchboard --rpc-endpoint=$RPC_ENDPOINT
convergence protocol add-base-asset --ticker=SOL --oracle-address=$SOL_ORACLE_ADDRESS --oracle-source=switchboard --rpc-endpoint=$RPC_ENDPOINT

convergence protocol register-mint --mint=$BTC_MINT --base-asset-index=0 --rpc-endpoint=$RPC_ENDPOINT
convergence protocol register-mint --mint=$SOL_MINT --base-asset-index=1 --rpc-endpoint=$RPC_ENDPOINT
convergence protocol register-mint --mint=$USDC_MINT                     --rpc-endpoint=$RPC_ENDPOINT
