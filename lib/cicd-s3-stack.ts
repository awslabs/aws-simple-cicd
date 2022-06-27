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


import * as cdk from 'aws-cdk-lib'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import config from '../config/config'
import { Construct } from 'constructs'

interface S3StackProps extends cdk.StackProps {
  prefix: string,
  ssmRoot: string,
}

export class S3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props)

    const bucketName = `${props.prefix}-${config.sharedResources.cicdBucket}`

    const artifactsBucket = new Bucket(this, 'artifactsBucket', {
      bucketName: bucketName,
      versioned: false,
      lifecycleRules: [{
          enabled: true,
          expiration: cdk.Duration.days(14)
        }
      ]
    })

    new ssm.StringParameter(this, 'cicdArtifactsBucketNameParam', {
      description: 'Name of the CICD artifacts Bucket',
      parameterName: `${props.ssmRoot}/buckets/cicdArtifactsBucketName`,
      stringValue: artifactsBucket.bucketName
    })

    new ssm.StringParameter(this, 'cicdArtifactsBucketArnParam', {
      description: 'Arn of the CICD artifacts Bucket',
      parameterName: `${props.ssmRoot}/buckets/cicdArtifactsBucketArn`,
      stringValue: artifactsBucket.bucketArn
    })

  }
}


