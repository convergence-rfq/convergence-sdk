#!/bin/bash

set -e
source .env

MINT=6zt5mcA6F1svAGTvnqpfj93wAyiW8vU8xetfDa4VmoQ8
OWNER=HGm8jGLSazATztBSUxXfU62oRyVsmwPKnUsjvviRYbRG

read WALLET <<< $($CVG create-wallet $OPT --mint=$MINT --owner=$OWNER | awk '/Address:[[:space:]]/ { print $2 }')
$CVG mint-to $OPT --mint=$MINT --wallet=$WALLET --amount=1000000000000000