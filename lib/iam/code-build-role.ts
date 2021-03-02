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


import iam = require('@aws-cdk/aws-iam')
import { Construct } from '@aws-cdk/core'
import config from '../../config/config'
import { StageName } from '../../config/config';

export interface CodeBuildRoleProps {
  stageName?: StageName
}

export default class CodeBuildRole extends iam.Role {
  constructor(scope: Construct, name: string, props: CodeBuildRoleProps = {}) {
    const { stageName, ...rest } = props
    super(scope, name, {
      ...rest,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
    })

    if (stageName) {
      this.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${config.accountIds[stageName]}:role/${config.deployment['cicdRoleName']}`]
      }))
    }
    
    this.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions:[
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:DeleteLogGroup',
          'logs:PutLogEvents'
        ],
        resources: [`arn:aws:logs:${config.deployment.region}:*:log-group:*`]
      })
    ) // TODO - specific log groups

    this.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions:[
          'ecr:Describe*',
          'ecr:List*',
          'ecr:Get*',
          'ecr:Put*',
          'ecr:UploadLayerPart',
          'ecr:InitiateLayerUpload',
          'ecr:CompleteLayerUpload',
          'ecr:BatchCheckLayerAvailability',
          'ssm:GetParameters'
        ],
        resources: ['*']
      })
    )
  }
}
