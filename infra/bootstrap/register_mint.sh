#!/bin/bash

set -e
source .env

BASE_ASSET_INDEX=
MINT=

#$CVG register-mint $OPT --base-asset-index=$BASE_ASSET_INDEX --mint=$MINT
$CVG register-mint $OPT --mint=$MINT