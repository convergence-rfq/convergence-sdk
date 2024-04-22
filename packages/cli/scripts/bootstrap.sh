#!env bash

set -x
set -e

export RPC_ENDPOINT=$MAINNET_RPC

export SPOT_INSTRUMENT="BMXWVaYPVJ4G8g2MMJt51CDgjHHuoirPMvsTUadv3s3v"
export PSYOPTIONS_EUROPEAN_INSTRUMENT="4KC8MQi2zQGr7LhTCVTMhbKuP4KcpTmdZjxsDBWrTSVf"
export PSYOPTIONS_AMERICAN_INSTRUMENT="HpmyVA3t3uNGgdx86AuwZww7gnAWB57vepnk3732vEr9"
export HXRO_PRINT_TRADE_PROVIDER="6zyXbd44vYHhpC1gxZr2BhM6m7jThqsBphn2GD36bUi3"

# Same on devnet and mainnet
export BTC_SWITCHBOARD_ORACLE="8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"
export SOL_SWITCHBOARD_ORACLE="GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR"
export BTC_PYTH_ORACLE="GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU"
export SOL_PYTH_ORACLE="H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"

# Devnet
#export USDC_MINT="BREWDGvXEQKx9FkZrSCajzjy4cpm9hofzze3b41Z3V4p"
#export BTC_MINT="A3c9ThQZTUruMm56Eu4fxVwRosg4nBTpJe2B1pxBMYK7"
#export SOL_MINT="FYQ5MgByxnkfGAUzNcbaD734VK8CdEUX49ioTkokypRc"

#export HXRO_MPG="BRWNCEzQTm8kvEXHsVVY9jpb1VLbpv9B8mkF43nMLCtu"

# Mainnet
export USDC_MINT="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
export BTC_MINT="3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"
export SOL_MINT="So11111111111111111111111111111111111111112" # Wrapped SOL

# Mainnet
# export HXRO_MPG="RKTxYKU82RH8kojtyXKR3DTkoxbUk9x6ypBgQzPCZ3G" # High leverage 0 day futures
export HXRO_MPG="LSTqd6kXfMcMmVj63TdFfXvwSEYSkQVcT6GrwH4Ki3h" # ETH, SOL, mSOL, JitoSOL perps & some spreads

# TODO: Add max retries to this command
# If already configured
convergence protocol close --rpc-endpoint=$RPC_ENDPOINT --max-retries=100 --tx-priority-fee=100

# TODO: Add update fee parameter ix to CLI
# TODO: Display add-asset-fee in protocol config

convergence protocol initialize --collateral-mint=$USDC_MINT --asset-add-fee=0.5 --rpc-endpoint=$RPC_ENDPOINT

convergence protocol add-print-trade-provider --print-trade-provider-program=$HXRO_PRINT_TRADE_PROVIDER \
  --settlement-can-expire=false --validate-response-account-amount=2 --rpc-endpoint=$RPC_ENDPOINT
convergence hxro initialize-config --valid-mpg=$HXRO_MPG --rpc-endpoint=$RPC_ENDPOINT
#convergence hxro modify-config --valid-mpg=$HXRO_MPG --rpc-endpoint=$RPC_ENDPOINT
convergence hxro initialize-operator-trg --rpc-endpoint=$RPC_ENDPOINT

# TODO: Verify this works before adding instrument
convergence spot-instrument initialize-config --fee-bps "0.01" --rpc-endpoint=$RPC_ENDPOINT

convergence protocol add-instrument --instrument-program=$SPOT_INSTRUMENT                --can-be-used-as-quote=true \
 --validate-data-account-amount=1 --prepare-to-settle-account-amount=7 --settle-account-amount=5 \
 --revert-preparation-account-amount=3 --clean-up-account-amount=4 --rpc-endpoint=$RPC_ENDPOINT 
convergence protocol add-instrument --instrument-program=$PSYOPTIONS_EUROPEAN_INSTRUMENT --can-be-used-as-quote=false \
  --validate-data-account-amount=2 --prepare-to-settle-account-amount=7 --settle-account-amount=3 \
  --revert-preparation-account-amount=3 --clean-up-account-amount=4 --rpc-endpoint=$RPC_ENDPOINT
convergence protocol add-instrument --instrument-program=$PSYOPTIONS_AMERICAN_INSTRUMENT --can-be-used-as-quote=false \
  --validate-data-account-amount=3 --prepare-to-settle-account-amount=7 --settle-account-amount=3 \
  --revert-preparation-account-amount=3 --clean-up-account-amount=4 --rpc-endpoint=$RPC_ENDPOINT


convergence protocol add-base-asset --ticker=BTC --switchboard-oracle=$BTC_SWITCHBOARD_ORACLE \
  --pyth-oracle=$BTC_PYTH_ORACLE --oracle-source=switchboard --index=0 \
  --rpc-endpoint=$RPC_ENDPOINT --max-retries=100 --tx-priority-fee=100
convergence protocol add-base-asset --ticker=SOL --switchboard-oracle=$SOL_SWITCHBOARD_ORACLE \
  --pyth-oracle=$SOL_PYTH_ORACLE --oracle-source=switchboard --index=1 \
  --rpc-endpoint=$RPC_ENDPOINT --max-retries=100 --tx-priority-fee=100

convergence protocol register-mint --mint=$BTC_MINT --base-asset-index=0 --rpc-endpoint=$RPC_ENDPOINT \
  --max-retries=100 --tx-priority-fee=100
convergence protocol register-mint --mint=$SOL_MINT --base-asset-index=1 --rpc-endpoint=$RPC_ENDPOINT \
  --max-retries=100 --tx-priority-fee=100
convergence protocol register-mint --mint=$USDC_MINT                     --rpc-endpoint=$RPC_ENDPOINT \
  --max-retries=100 --tx-priority-fee=100

# Devnet
#convergence token create-mint --decimals=9 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT

# Devnet
# JUP:  decimals 6, address: 98e4U9AzuFbXaAVZmiatVmvyxhvat1Yzs3PMDScjgtup
# BONK: decimals 5, address: 4Y19DgUgB1CcAhhJDAMAKfe3qUucaCMwFrjwNwSbCzwY
# RAY:  decimals 6, address: Axex6mZAPMpNYXoiC1chNn7vU4Rk45Kb3KSMLhKRrN3R
# ETH:  decimals 8, address: Dg44qfVkw9u1tL8LZQHCBH1HdzN8pSHRX6XRPMnh3d1i
# HNT:  decimals 8, address: 72SJp15dP7XzGGP91wKjeHSCZ4AaRA1d1wf9KZkF8K1J
# PYTH: decimals 6, address: GHmnaeudJVBdLLjTy5Xb7hzvfLcMKr2p9cw9cLYuE4ap
# JTO:  decimals 9, address: Gz7fE9eZqyyc9PtBg73Kae6prW2eKv1hkSkwdpfWW4z7

# Devnet
#convergence token create-mint --decimals=6 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT
#convergence token create-mint --decimals=5 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT
#convergence token create-mint --decimals=6 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT
#convergence token create-mint --decimals=8 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT
#convergence token create-mint --decimals=8 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT
#convergence token create-mint --decimals=6 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT
#convergence token create-mint --decimals=9 --keypair-file=/root/.config/solana/mint-authority.json --rpc-endpoint=$RPC_ENDPOINT

# Devnet
#convergence protocol add-base-asset --ticker=BONK --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol add-base-asset --ticker=JUP  --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol add-base-asset --ticker=RAY  --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol add-base-asset --ticker=ETH  --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol add-base-asset --ticker=HNT  --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol add-base-asset --ticker=PYTH --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol add-base-asset --ticker=JTO  --oracle-price=1 --oracle-source=in-place --rpc-endpoint=$RPC_ENDPOINT

# Devnet
#convergence protocol register-mint --mint=34Z7hJLBmKqmp1MZiBAKDqoNNV3b9MeVgVovTLmybrZ2 --base-asset-index=2 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=B8e4aXQkEXzdB6iKiMHNqCfC6r9CyWkNYdEJTJ16U2sg --base-asset-index=3 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=527T3wvevS8AZ7aTU5by6MAdZqAk1LyEKYD8ct7CuprV --base-asset-index=4 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=B2bX5WkwkHgb1idzhq4MGhn1uJjBwDEAwwwVxph1SCYm --base-asset-index=5 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=J5FQoBmquKExHKQTgvdRkLemHSNLfijtZNVQ5NfDvnX4  --base-asset-index=6 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=Dbrdb6BxJNiifDZXt3cnymN75jSAk3mS1UUBwXCo4UTS --base-asset-index=7 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=DH7GRZfMj2KU5pVbh4EUJEj7CFUYAsga23hxkeUR5VVg  --base-asset-index=8 --rpc-endpoint=$RPC_ENDPOINT

# Devnet
#convergence protocol register-mint --mint=98e4U9AzuFbXaAVZmiatVmvyxhvat1Yzs3PMDScjgtup  --base-asset-index=3 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=4Y19DgUgB1CcAhhJDAMAKfe3qUucaCMwFrjwNwSbCzwY  --base-asset-index=4 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=Axex6mZAPMpNYXoiC1chNn7vU4Rk45Kb3KSMLhKRrN3R  --base-asset-index=5 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=Dg44qfVkw9u1tL8LZQHCBH1HdzN8pSHRX6XRPMnh3d1i  --base-asset-index=6 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=72SJp15dP7XzGGP91wKjeHSCZ4AaRA1d1wf9KZkF8K1J  --base-asset-index=7 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=GHmnaeudJVBdLLjTy5Xb7hzvfLcMKr2p9cw9cLYuE4ap  --base-asset-index=8 --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol register-mint --mint=Gz7fE9eZqyyc9PtBg73Kae6prW2eKv1hkSkwdpfWW4z7  --base-asset-index=9 --rpc-endpoint=$RPC_ENDPOINT

# Devnet
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=2 --enabled=false --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=3 --enabled=false --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=4 --enabled=false --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=5 --enabled=false --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=6 --enabled=false --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=7 --enabled=false --rpc-endpoint=$RPC_ENDPOINT
#convergence protocol update-base-asset --oracle-source=in-place --risk-category=medium --oracle-price=1 --index=8 --enabled=false --rpc-endpoint=$RPC_ENDPOINT