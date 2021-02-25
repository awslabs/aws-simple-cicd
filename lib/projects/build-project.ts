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


import { Construct } from '@aws-cdk/core'
import { PipelineProject, ProjectProps, BuildSpec} from '@aws-cdk/aws-codebuild'
import { defaultEnvironment } from './build-project-environment'
import { projectEnvironmentVars } from './build-project-environment'
import { Role } from '@aws-cdk/aws-iam'

export interface BuildProjectProps extends ProjectProps {
  repoName: string
  bucketName: string
  bucketArn: string
  role: Role
}

export class BuildProject extends PipelineProject {
  constructor(scope: Construct, id: string, props: BuildProjectProps) {
    const { repoName, bucketName, bucketArn } = props
    super(scope, id, {
      projectName: id,
      role: props.role,
      environment: defaultEnvironment,
      environmentVariables: projectEnvironmentVars({ repoName, bucketName, bucketArn }),
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        env: {
          shell: 'bash'
        },
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '10'
            }
          },
          build: {
            commands: [
              'bash ${CODEBUILD_SRC_DIR}/scripts/build.sh'
            ]
          }
        },
        artifacts: {
          files: '**/*'
        }
      })
    })
  }
}
