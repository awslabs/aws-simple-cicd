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
import lambda = require('@aws-cdk/aws-lambda');
import iam = require('@aws-cdk/aws-iam');
import logs = require('@aws-cdk/aws-logs')
import { ServicePrincipal } from '@aws-cdk/aws-iam';

interface EmailHandlerStackProps extends cdk.StackProps {
  prefix: string
  ssmRoot: string
}

export class EmailHandlerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: EmailHandlerStackProps) {
    super(scope, id, props);

    // Provision Lambda
    const emailHandler = new lambda.Function(this, 'emailHandler', {
      code: lambda.Code.asset('./lambda-helpers/email-handler'),
      functionName: `${props.prefix}-cicd-emailHandler`,
      handler: 'lambda.send_codebuild_events_to_sns',
      runtime: lambda.Runtime.PYTHON_3_8,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      environment: {
        "SSM_ROOT": props.ssmRoot,
        "PREFIX": props.prefix
      }
    });

    emailHandler.addPermission('cloudWatchPermission', {
      principal: new ServicePrincipal('events.amazonaws.com')
    })

    emailHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [ 'ssm:GetParameter', 'sns:Publish' ],
      resources: [ '*' ]
    }));

    new ssm.StringParameter(this, 'EmailHandlerArn', {
      description: 'Email Handler Lambda Function Arn',
      parameterName: `${props.ssmRoot}/lambda/cicd-email-handler`,
      stringValue: emailHandler.functionArn
    });

  }
}
