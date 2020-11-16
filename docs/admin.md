# Administrator Guide

These instructions are for the users who will be deploying and maintaining the platform.

0. [Setup Project Config](#setup-project-config)
1. [Configure Accounts](#configure-accounts)
2. [Configure Naming](#configure-naming)
3. [Configure Pipelines](#configure-pipelines)
4. [Grouping Pipelines](#grouping-pipelines)
5. [Deploying Pipelines](#deploy-pipelines)

## Setup Project Config

Create a [project-config.json](../project-config.sample.json) file in the root of the Simple-CICD project. There is a sample ***project-config.sample.json*** file provided

## Configure Accounts

Add the account ids of the target accounts to the project-config.json file. The account Id will be passed to the deployment stage as an environment variable. Do not set the account id for any environment you do not want to target.

```text
{
  dev: string,
  test: string,
  prod: string
}
```

Example:

```json
{
  "dev": "123456789000",
  "test": "123456789001",
  "prod": "123456789002"
}
```

### Deploy cross-account IAM role *(if needed)*

If you already have a cross-account role set up for deployments, then skip step 1.

#### Step 1

The pipelines will be deployed and executed in the Shared Services account. The pipeline will need to assume an IAM role in the target  accounts in order to provision resources.

A sample IAM role and profile is provided in this project if this does not already exist. Modify [deployment-role.yaml](../cross-account/deployment-role.yaml) based on your requirements and deploy it using the following commands. This role will need to be deployed to each target (dev, test and prod) AWS account.

```bash
cd cross-account

aws cloudformation deploy --template-file deployment-role.yaml --stack-name cicd-iam-stack --capabilities CAPABILITY_NAMED_IAM --parameter-overrides SharedAccountId={SHARED-ACCOUNT-ID}
```
Note: Replace {SHARED-ACCOUNT-ID} with the appropiate ID.

The IAM role name in the sample provided is ***deployment-role***.

#### Step 2

Set the cross-account role name in the [sample](../project-config.sample.json) file. Update ***cicdRoleName***.

```bash
"deployment": {
    "region": "ca-central-1",
    "cicdRoleName": "deployment-role"
  },
```

## Configure Naming

All the AWS resources provisioned by this project will follow a standard naming convention. This can be configured as desired.

```text
{
  company: string,
  dept: string,
  project: string
}
```

Example:

This will generate resources prefixed with ***acme-markets-roadrunner***

```json
{
  "company": "acme",
  "dept": "markets",
  "project":  "roadrunner"
}
```

## Configure Pipelines

- The pipeline name and branch are concatenated to create a unique pipeline per branch.
- The sample provides a single TriggerType - CodeCommit. This can be extended to add Github, BitBucket etc.
- An SNS Topic is generated for the pipeline. Subscribers receive notifications on status of each pipeline stage. Emails are sent by a Lambda function.
- A Parameter Store parameter is generated which stores the semantic version and automatically increments (uses python semver library) on every successful build.
- A Cron parameter can be set to trigger the pipeline on a schedule managed by CloudWatch.

```text
{
  pipelineName: string,
  ccRepoName: string,
  branch: string,
  type: TriggerType,
  cron: string
}
```

Example:

The following sample will generate a pipeline called ***acme-markets-roadrunner-rocket-powered-skates-master***

```json
{
  "pipelineName": "rocket-powered-skates",
  "ccRepoName": "rocket-powered-skates",
  "branch": "master",
  "type": "CodeCommit",
  "cron": ""
}
```

## Grouping Pipelines

AWS CloudFormation has a limit of 500 resources per stack. To bypass this limitation we recommend grouping pipelines together and generating a separate stack for each group. In the [sample](../project-config.sample.json) the pipelines are grouped by team, Team One and Team Two.

### Adding a new group

1. Create a new array in project-config.json for Team Three. See teamOne or teamTwo for an example.

    ```bash
    "teamThree": [
      {
        "pipelineName": "rocket-powered-skates",
        "ccRepoName": "rocket-powered-skates",
        "branch": "master",
        "type": "CodeCommit",
        "cron": ""
      }
    ]
    ```

1. Update [config.ts](../config/config.ts) and update the ProjectConfig interface by exporting the configuration for Team Three.

    ```bash
      teamThree:  Array<ProjectRepo>
    ```

1. Update [cicd.ts](../bin/cicd.ts) to generate a new stack for Team Three.

    ```bash
      new CicdStack(app, 'AWS-Simple-CICD-TeamThree', { prefix, ssmRoot, repos: config.teamThree})
    ```  

Group your pipelines based on your needs. Grouping by teams is just provided as an example.

## Deploying Pipelines

If you have not installed AWS CDK already please refer to the [pre-requisites](./prereq.md)

```bash
npm install

npm run build

# The bootstrap only needs to be executed once
cdk bootstrap --profile <shared services account profile>

cdk deploy --all --profile <shared services account profile>
```
