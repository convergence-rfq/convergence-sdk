#!/bin/bash

set -e 
set -x

npm install --global yarn
yarn install --frozen-lockfile
yarn docs