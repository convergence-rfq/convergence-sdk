#!/bin/bash

set -e
source .env

DECIMALS=

$CVG create-mint $OPT --decimals=$DECIMALS