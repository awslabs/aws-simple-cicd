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


import cdk = require('@aws-cdk/core');
import ssm = require('@aws-cdk/aws-ssm');
import iam = require("@aws-cdk/aws-iam");
import lambda = require('@aws-cdk/aws-lambda');
import logs = require('@aws-cdk/aws-logs')
import { ServicePrincipal } from '@aws-cdk/aws-iam';

interface SemverHandlerStackProps extends cdk.StackProps {
  prefix: string
  ssmRoot: string
}

export class SemverHandlerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: SemverHandlerStackProps) {
    super(scope, id, props);

    // Provision Lambda Layer
    const pythonLayer = new lambda.LayerVersion(this, 'python3Layer', {
      code: lambda.Code.fromAsset('./lambda-helpers/layers/python3_layer.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_6, lambda.Runtime.PYTHON_3_7, lambda.Runtime.PYTHON_3_8],
      description: 'A Python layer with Semver',
      layerVersionName: `${props.prefix}-cicd-python3-layer`
    });

    // Provision Lambda
    const semverHandler = new lambda.Function(this, 'semverHandler', {
      code: lambda.Code.asset('./lambda-helpers/semver-handler'),
      functionName: `${props.prefix}-cicd-semverHandler`,
      handler: 'lambda.semver_handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      layers: [ pythonLayer ],
      logRetention: logs.RetentionDays.TWO_WEEKS,
      environment: {
        "SSM_ROOT": props.ssmRoot
      }
    });

    semverHandler.addPermission('codePipelinePermission', {
      principal: new ServicePrincipal('codepipeline.amazonaws.com')
    })

    semverHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [ 'ssm:GetParameter', 'ssm:PutParameter', 'codepipeline:PutJobFailureResult', 'codepipeline:PutJobSuccessResult' ],
      resources: [ '*' ]
    }));

    new ssm.StringParameter(this, 'SemverHandlerArn', {
      description: 'Semver Handler Lambda Function Arn',
      parameterName: `${props.ssmRoot}/lambda/cicd-semver-handler`,
      stringValue: semverHandler.functionArn
    });

  }
}
