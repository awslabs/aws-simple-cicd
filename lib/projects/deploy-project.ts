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


import { PipelineProject, BuildSpec } from '@aws-cdk/aws-codebuild'
import { Construct } from '@aws-cdk/core'
import { defaultEnvironment } from './deploy-project-environment'
import { projectEnvironmentVars } from './deploy-project-environment'
import { Role } from '@aws-cdk/aws-iam'
import { StageName } from '../../config/config';

export interface DeployProjectProps {
  repoName: string
  stageName: StageName
  bucketName: string
  bucketArn: string
  role: Role
  semverParameter: string
}

export class DeployProject extends PipelineProject {
  constructor(scope: Construct, id: string, props: DeployProjectProps) {
    const { repoName, stageName, bucketName, bucketArn } = props
    super(scope, id, {
      projectName: id,
      role: props.role,
      environment: defaultEnvironment,
      environmentVariables: projectEnvironmentVars({ stageName, repoName, bucketName, bucketArn }),
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        env: {
          shell: 'bash',
          'parameter-store': {
            SEMVER: props.semverParameter
          }
        },
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '10'
            }
          },
          build: {
            commands: [
              'if [ ! -f "${CODEBUILD_SRC_DIR}/scripts/assume-cross-account-role.env" ]; then echo "assume-cross-account-this.role.env not found in repo" && aws s3 cp s3://${ARTIFACTS_BUCKET_NAME}/admin/cross-account/assume-cross-account-role.env ${CODEBUILD_SRC_DIR}/scripts/; else echo "Overriding assume-cross-account-role.env from repo"; fi',
              '. ${CODEBUILD_SRC_DIR}/scripts/assume-cross-account-role.env',
              'bash ${CODEBUILD_SRC_DIR}/scripts/deploy.sh'
            ]
          }
        }
      })
    })
  }
}
