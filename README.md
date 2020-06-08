# AWS-Simple-CICD Project

This project aims to provide a production-grade, serverless CI/CD platform built using native AWS services without limiting the flexibility of developers. As per the AWS Well Architected Framework, this project assumes the use of multiple AWS accounts for secure isolation of environments. It assumes a production, test, dev and shared-services account are present. This is configurable and can be easily modified to suit your specific needs.

This platform is in use at a variety of AWS clients where the development teams are leveraging CloudFormation, Serverless Framework, AWS CDK and Terraform.

## Goals

- Bring Developers closer to their infrastructure and operations. Goal is **not** to insert "DevOps" in the middle, which defeats the whole purpose.
- Support for (almost) any toolset the application developers want to use.
- Minimize platform lock-in. Applications can be migrated to any other CI/CD orchestration platform with minimal changes required by the developers.
- Enables "you build it, you run it".

## Features

- Cloud native and built on top of [AWS Serverless CI/CD tools](https://aws.amazon.com/serverless/developer-tools/)
- Plug & Play on top of [AWS Landing Zone](https://aws.amazon.com/solutions/implementations/aws-landing-zone/)/[Control Tower](https://aws.amazon.com/controltower/)
- Supports pipeline notifications via [AWS SNS](https://aws.amazon.com/sns/)
- Supports branches (pipeline per branch)
- Auto-increments [semantic versioning](https://www.semver.org) per pipeline.

## Architecture

This is the pipeline that will be generated for each repository. The build and deployment stages in the pipeline execute a user defined shell script in an isolated docker container. The docker environment is provisioned on the fly by AWS CodeBuild.

The number of stages and their function is fully customizable e.g. adding a stage for security/vulnerability scanning, adding a stage for executing test cases etc.

![Architecture](./architecture.png "CI/CD Architecture")

### AWS services

- AWS CodeCommit (or any source control providor supported by CodePipeline)
- AWS CodePipeline
- AWS CodeBuild
- AWS Lambda
- AWS S3
- AWS SNS
- AWS CloudWatch
- AWS Systems Manager: Parameter Store
- AWS CloudFormation

## Getting started

- [Pre-Requisites](docs/prereq.md)
- [Administrator Guide](docs/admin.md)
- [Developer Guide](docs/developer.md)

## See also

- [fourTheorem SLIC Starter](https://github.com/fourTheorem/slic-starter)
- [Semantic Versioning](https://semver.org)