# Developer Instructions

## Prepare application project

Using shell scripts gives the team complete freedom to control their toolset and processes. These scripts will be executed by AWS CodeBuild. 

Create a directory called scripts in the root of the application source code repo with 3 files:

1. assume-cross-account-role.env *A sample of this file is provided in the scripts directory of this project*

    ```bash
    ROLE_NAME=role/deployment-role
    SESSION_NAME=${STAGE}-Deploy
    echo Assuming role ${ROLE_NAME} in account ${CROSS_ACCOUNT_ID} with session name ${SESSION_NAME}

    if [[ "${CROSS_ACCOUNT_ID}" == "" ]]; then
      >&2 echo Error: CROSS_ACCOUNT_ID must be set. Assuming cross account role has failed!
      exit 1
    else
      IMPERSONATION=$(aws sts assume-role --role-arn "arn:aws:iam::${CROSS_ACCOUNT_ID}:${ROLE_NAME}" --role-session-name ${SESSION_NAME} --output text | tail -1)
      export AWS_ACCESS_KEY_ID=$(echo $IMPERSONATION | awk '{print $2}')
      export AWS_SECRET_ACCESS_KEY=$(echo $IMPERSONATION | awk '{print $4}')
      export AWS_SESSION_TOKEN=$(echo $IMPERSONATION | awk '{print $5}')
    fi
    ```

1. build.sh - A bash script which will build the application.

    ```bash
    ###
    ## This is a sample java application being built and packaged as a docker image
    ###

    #! /bin/bash

    set -e
    set -u
    set -o pipefail

    # Build Java App
    mvn clean deploy --no-transfer-progress

    # Push container to ECR
    REPOSITORY_URI="0000000000.dkr.ecr.eu-central-1.amazonaws.com/acme/roadrunner/rocket-powered-skates"
    COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
    IMAGE_TAG=${COMMIT_HASH:=latest}

    $(aws ecr get-login --region ca-central-1 --no-include-email)
    docker build -t $REPOSITORY_URI:latest .
    docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG
    docker push $REPOSITORY_URI:latest
    docker push $REPOSITORY_URI:$IMAGE_TAG
    ```

1. deploy.sh - A bash script which deploys the application. The shell script can trigger Terraform/Cloudformation/AWS CLI etc. Since the shell script will run in the CodeBuild docker environment, as long as the binaries are available CodeBuild will be able to execute it.

    ```bash
    ###
    ## This is a sample installs AWS CDK and triggers the deployment
    ###
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
    cdk deploy --require-approval never
    ```
