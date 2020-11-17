/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


import config from '../../config/config'
import { StageName } from '../../config/config';
import { BuildEnvironmentVariableType, ComputeType, 
  LinuxBuildImage  } from '@aws-cdk/aws-codebuild'

export const defaultEnvironment = {
  buildImage: LinuxBuildImage.STANDARD_4_0,
  computeType: ComputeType.SMALL,
  privileged: true
}

export function projectEnvironmentVars(props: {
  stageName: StageName
  repoName: string
  bucketName: string
  bucketArn: string
}) {
  const siteVars: any = {}

  return {
    TARGET_ENV: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: props.stageName
    },
    TARGET_ACCOUNT_ID: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: `${config.accountIds[props.stageName]}`
    },
    CROSS_ACCOUNT_ROLE: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: config.deployment['cicdRoleName']
    },
    REPO_NAME: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: props.repoName
    },
    TARGET_REGION: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: `${config.defaultRegions[props.stageName]}`
    },
    ARTIFACTS_BUCKET_NAME: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: props.bucketName
    },
    ARTIFACTS_BUCKET_ARN: {
      type: BuildEnvironmentVariableType.PLAINTEXT,
      value: props.bucketArn
    },
    ...siteVars
  }
}
