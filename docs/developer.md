# Developer Instructions

The AWS Simple CICD project provides very prescriptive pipelines. As the developer you are responsible for maintaining a *scripts* folder with three files in the root of your code repository.

```text
scripts/assume-cross-account-role.env

scripts/build.sh

scripts/deploy.sh
```

The build and deploy scripts must contain all the commands required to build your application, including the installation of any dependencies. The pipeline will execute the build script once. The deploy script will be executed once per target environment i.e dev, test and prod.

This enforces the *"build once, deploy many"* paradigm and also ensures that your deployment script is target environment agnostic.

Finally, you as the developer are now in complete control of how your applications gets deployed to your AWS accounts.

## Detailed Instructions

Create a directory called scripts in the root of the application source code repository called *scripts* with 3 files:

1. assume-cross-account-role.env

    Do not modify this file without consulting the administrator/devops team.

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

1. build.sh

    Sample bash script which will build a Java application, generate a Docker image and push it to ECR

    ```bash
      #! /bin/bash

      set -e
      set -u
      set -o pipefail

      # Build Java App
      mvn clean deploy --no-transfer-progress

      # Push container to ECR in shared services
      REPOSITORY_URI="0000000000.dkr.ecr.eu-central-1.amazonaws.com/acme/roadrunner/rocket-powered-skates"
      COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      IMAGE_TAG=${COMMIT_HASH:=latest}

      $(aws ecr get-login --region ca-central-1 --no-include-email)
      docker build -t $REPOSITORY_URI:latest .
      docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$IMAGE_TAG
      docker push $REPOSITORY_URI:latest
      docker push $REPOSITORY_URI:$IMAGE_TAG
    ```

    Sample build script for a project which doesn't require a build

    ```bash
      #! /bin/bash

      set -e
      set -u
      set -o pipefail

      echo "Nothing to build!"
    ```

1. deploy.sh - A bash script which deploys the application. The shell script can trigger Terraform/Cloudformation/AWS CLI etc. Since the shell script will run in the CodeBuild docker environment, as long as the binaries are available CodeBuild will be able to execute it.

    Sample deployment script which installs AWS CDK and triggers the deployment

    ```bash
      #! /bin/bash

      set -e
      set -u
      set -o pipefail

      # Install CDK
      npm install -g aws-cdk

      # Install Dependencies
      npm install
      npm run build
  
      # Deploy
      cdk deploy --require-approval never
    ```

    Sample deployment script which executes an AWS CloudFormation script. In this sample, the *STAGE* environment variable will be automatically set to the target environment (dev, test, prod)

    ```bash
      #! /bin/bash

      set -e
      set -u
      set -o pipefail

      aws cloudformation deploy --template-file cf_usecasecatalog.yaml --stack-name sample-cfn-stack --no-fail-on-empty-changeset --capabilities CAPABILITY_NAMED_IAM --parameter-overrides Environment=${STAGE}
    ```
