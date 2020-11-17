# Developer Guide

These instructions are for the application developers who will be using the CI/CD platform to deliver their applications.

As the developer you are responsible for maintaining a scripts folder with three files in the root of your code repository.

```text
scripts/build.sh

scripts/test.sh

scripts/deploy.sh
```

The build,test and deploy scripts must contain all the commands required to build your application, including the installation of any dependencies. The pipeline will execute the build and test scripts once per run. The deploy script will be executed once per target environment i.e dev, test and prod.

This enforces the *"build once, deploy many"* paradigm and also ensures that your deployment script is environment agnostic.

Finally, you as the developer are now in complete control of how your applications get deployed to your AWS accounts.

## Detailed Instructions

Create a directory called scripts in the root of the application source code repository called ***scripts*** with 3 files:

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

1. test.sh

    Sample build script for a project which doesn't require a build

    ```bash
      #! /bin/bash

      set -e
      set -u
      set -o pipefail

      echo "Nothing to test. Tests executed as part of build."
    ```

1. deploy.sh - A bash script which deploys the application. The shell script can trigger Terraform/Cloudformation/AWS CDK etc. Since the shell script will run in the AWS CodeBuild docker environment, as long as the binaries are available CodeBuild will be able to execute it.

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

    Sample deployment script which executes an AWS CloudFormation script. In this sample, the *TARGET_ENV* environment variable will be automatically set to the target environment (dev, test, prod)

    ```bash
      #! /bin/bash

      set -e
      set -u
      set -o pipefail

      aws cloudformation deploy --template-file cf_usecasecatalog.yaml --stack-name sample-cfn-stack --no-fail-on-empty-changeset --capabilities CAPABILITY_NAMED_IAM --parameter-overrides Environment=${TARGET_ENV}
    ```
