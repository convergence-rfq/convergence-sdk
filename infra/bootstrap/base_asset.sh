#!/bin/bash

set -e
source .env

TICKER=BTC
ORACLE_ADDRESS=$BTC_ORACLE_ADDRESS

$CVG add-base-asset $OPT --ticker=$TICKER --oracle-address=$ORACLE_ADDRESS