#!/bin/bash

set -e
source .env

DECIMALS=9

$CVG create-mint $OPT --decimals=$DECIMALS