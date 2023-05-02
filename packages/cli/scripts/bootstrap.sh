#!env bash

set -e
source .env

convergence protocol initialize --taker-fee=1 --maker-fee=0 --collateral-mint=$USDC_MINT
convergence risk-engine initialize

convergence protocol add-instrument --instrument-program=$SPOT_INSTRUMENT                --can-be-used-as-quote=true --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
convergence protocol add-instrument --instrument-program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --can-be-used-as-quote=true --validate-data-account-amount=2 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4
convergence protocol add-instrument --instrument-program=$PSYOPTIONS_AMERICAN_INSTRUMENT --can-be-used-as-quote=true --validate-data-account-amount=3 --prepare-to-settle-account-amount=7 --settle-account-amount=3 --revert-preparation-account-amount=3 --clean-up-account-amount=4

convergence risk-engine set-instrument-type --program=$SPOT_INSTRUMENT                --type=spot     
convergence risk-engine set-instrument-type --program=$PSYOPTIONS_AMERICAN_INSTRUMENT --type=option 
convergence risk-engine set-instrument-type --program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --type=option 

convergence risk-engine set-risk-categories-info --new-value=0.05,0.5,0.02,0.2,0.04,0.3,0.08,0.4,0.12,0.5,0.2,0.6,0.3,0.7 --category=very-low   
convergence risk-engine set-risk-categories-info --new-value=0.05,0.8,0.04,0.4,0.08,0.6,0.16,0.8,0.24,1.0,0.4,1.2,0.6,1.4 --category=low       
convergence risk-engine set-risk-categories-info --new-value=0.05,1.2,0.06,0.6,0.12,0.9,0.24,1.2,0.36,1.5,0.6,1.8,0.9,2.1 --category=medium    
convergence risk-engine set-risk-categories-info --new-value=0.05,2.4,0.08,0.8,0.16,1.2,0.32,1.6,0.48,2.0,0.8,2.4,1.2,2.8 --category=high      
convergence risk-engine set-risk-categories-info --new-value=0.05,5.0,0.10,1.0,0.20,1.5,0.40,2.0,0.60,2.5,1.0,3.0,1.5,3.5 --category=very-high 

convergence protocol add-base-asset --ticker=BTC --oracle-address=$BTC_ORACLE_ADDRESS
convergence protocol add-base-asset --ticker=SOL --oracle-address=$SOL_ORACLE_ADDRESS

convergence protocol register-mint --mint=$BTC_MINT --base-asset-index=0
convergence protocol register-mint --mint=$SOL_MINT --base-asset-index=1
convergence protocol register-mint --mint=$USDC_MINT
