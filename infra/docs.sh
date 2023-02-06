#!/bin/bash

set -e 
set -x

npm install --global yarn
yarn install --pure-lockfile
yarn docs