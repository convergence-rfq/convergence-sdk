#!env bash

set -e

SPOT_INSTRUMENT="HNHBtGzS58xJarSbz5XbEjTTEFbAQUHdP8TjQmwjx1gW"
PSYOPTIONS_EUROPEAN_INSTRUMENT="HmJ8K5xb6kXbVbvRriq1Z7oPdEaPmKXpEM4Un9nr5b1"
PSYOPTIONS_AMERICAN_INSTRUMENT="7GcKLyM73RRJshRLQqX8yw9K3hTHkx1Ei14mKoKxi3ZR"

BTC_ORACLE_ADDRESS="8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"
SOL_ORACLE_ADDRESS="GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR"

# TODO: Verify
USDC_MINT=BREWDGvXEQKx9FkZrSCajzjy4cpm9hofzze3b41Z3V4p
BTC_MINT=A3c9ThQZTUruMm56Eu4fxVwRosg4nBTpJe2B1pxBMYK7
SOL_MINT=FYQ5MgByxnkfGAUzNcbaD734VK8CdEUX49ioTkokypRc

RPC_ENDPOINT="https://api.mainnet-beta.solana.com"
KEYPAIR_FILE="$HOME/.config/solana/id.json"

OPTS="--rpc-endpoint=$RPC_ENDPOINT --keypair-file=$KEYPAIR_FILE"

convergence protocol initialize $OPTS --taker-fee=1 --maker-fee=0 --collateral-mint=$USDC_MINT
convergence risk-engine initialize $OPTS

convergence protocol add-instrument $OPTS --instrument-program=$SPOT_INSTRUMENT                --can-be-used-as-quote=true --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
convergence protocol add-instrument $OPTS --instrument-program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --can-be-used-as-quote=true --validate-data-account-amount=2 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
convergence protocol add-instrument $OPTS --instrument-program=$PSYOPTIONS_AMERICAN_INSTRUMENT --can-be-used-as-quote=true --validate-data-account-amount=3 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4

convergence risk-engine set-instrument-type $OPTS --program=$SPOT_INSTRUMENT                --type=spot     
convergence risk-engine set-instrument-type $OPTS --program=$PSYOPTIONS_AMERICAN_INSTRUMENT --type=option 
convergence risk-engine set-instrument-type $OPTS --program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --type=option 

convergence risk-engine set-risk-categories-info $OPTS --new-value=0.05,0.5,0.02,0.2,0.04,0.3,0.08,0.4,0.12,0.5,0.0 --category=very-low   
convergence risk-engine set-risk-categories-info $OPTS --new-value=0.05,0.8,0.04,0.4,0.08,0.6,0.16,0.8,0.24,1.0,0.4 --category=low       
convergence risk-engine set-risk-categories-info $OPTS --new-value=0.05,1.2,0.06,0.6,0.12,0.9,0.24,1.2,0.36,1.5,0.0 --category=medium    
convergence risk-engine set-risk-categories-info $OPTS --new-value=0.05,2.4,0.08,0.8,0.16,1.2,0.32,1.6,0.48,2.0,0.8 --category=high      
convergence risk-engine set-risk-categories-info $OPTS --new-value=0.05,5.0,0.10,1.0,0.20,1.5,0.40,2.0,0.60,2.5,1,3,1.5,3.5 --category=very-high 

convergence protocol add-base-asset $OPTS --ticker=BTC --oracle-address=$BTC_ORACLE_ADDRESS
convergence protocol add-base-asset $OPTS --ticker=SOL --oracle-address=$SOL_ORACLE_ADDRESS

convergence protocol register-mint $OPTS --mint=$BTC_MINT --base-asset-index=0
convergence protocol register-mint $OPTS --mint=$SOL_MINT --base-asset-index=1
convergence protocol register-mint $OPTS --mint=$USDC_MINT
