#!/bin/bash

set -e
source .env

TICKER=BTC
ORACLE_ADDRESS=8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee

$CVG add-base-asset $OPT --ticker=$TICKER --oracle-address=$ORACLE_ADDRESS