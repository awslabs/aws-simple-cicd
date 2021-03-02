#! /bin/bash

set -e
set -u
set -o pipefail

# Running CDK Project

# Install CDK 
npm install -g aws-cdk

# Install Dependencies
npm install
npm run build

# Deploy
cdk bootstrap
cdk deploy --all --require-approval never
