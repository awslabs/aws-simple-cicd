'''
Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
'''

import boto3
import os
import re

sns = boto3.client('sns')
ssm = boto3.client('ssm')
ssm_root = os.environ['SSM_ROOT']
prefix = os.environ['PREFIX']

def send_codebuild_events_to_sns(message, context):
   
    status = message['detail']['build-status']
    project = message['detail']['project-name']
    build_id = message['detail']['build-id']
    repo = re.search(rf'.*/{prefix}-(.*)',
                     message['detail']['additional-information']['initiator']
                     ).group(1)
    
    ssm_key = ssm_root + '/sns-topic/' + repo + '-arn'

    sns_topic = ssm.get_parameter(
        Name=ssm_key,
        WithDecryption=False
    )
  
    subject = "{project}: {status}".format(status=status, project=project)
    body = "Project: {project} \nStatus: {status} \nBuild Id: {build_id}".format(status=status, project=project, build_id=build_id)

    sns.publish(
        TopicArn=sns_topic['Parameter']['Value'],
        Subject=subject,
        Message=body
    )

    return ('Sent a message to an Amazon SNS topic.')