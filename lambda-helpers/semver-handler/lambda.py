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
import json
import boto3
import semver
import os
import traceback

ssm = boto3.client('ssm')
code_pipeline = boto3.client('codepipeline')
ssm_root = os.environ['SSM_ROOT']

def put_job_success(job, message):
    """Notify CodePipeline of a successful job
    
    Args:
        job: The CodePipeline job ID
        message: A message to be logged relating to the job status
        
    Raises:
        Exception: Any exception thrown by .put_job_success_result()
    
    """
    print('Putting job success')
    try:
      code_pipeline.put_job_success_result(jobId=job)
      
    except Exception as e:
      raise Exception('Put job success notification failed')
  
def put_job_failure(job, message):
    """Notify CodePipeline of a failed job
    
    Args:
        job: The CodePipeline job ID
        message: A message to be logged relating to the job status
        
    Raises:
        Exception: Any exception thrown by .put_job_failure_result()
    
    """
    print('Putting job failure')
    try:
      code_pipeline.put_job_failure_result(jobId=job, failureDetails={'message': message, 'type': 'JobFailed'})

    except Exception as e:
      raise Exception('Put job failure notification failed')

def get_user_params(job_data):
    """Decodes the JSON user parameters and validates the required properties.
    
    Args:
        job_data: The job data structure containing the UserParameters string which should be a valid JSON structure
        
    Returns:
        The JSON parameters decoded as a dictionary.
        
    Raises:
        Exception: The JSON can't be decoded or a property is missing.
        
    """
    try:
        # Get the user parameters which contain the stack, artifact and file settings
        user_parameters = job_data['actionConfiguration']['configuration']['UserParameters']
        decoded_parameters = json.loads(user_parameters)
    except Exception as e:
        # We're expecting the user parameters to be encoded as JSON
        # so we can pass multiple values. If the JSON can't be decoded
        # then fail the job with a helpful message.
        raise Exception('UserParameters could not be decoded as JSON')
    
    if 'repo' not in decoded_parameters:
        # Validate that the repo is provided, otherwise fail the job
        # with a helpful message.
        raise Exception('Your UserParameters JSON must include the repo name')
    
    if 'branch' not in decoded_parameters:
        # Validate that the repo is provided, otherwise fail the job
        # with a helpful message.
        raise Exception('Your UserParameters JSON must include the branch')
    
    return decoded_parameters

def semver_handler(event, context):

  try:
    # Extract the Job ID
    job_id = event['CodePipeline.job']['id']
    
    # Extract the Job Data 
    job_data = event['CodePipeline.job']['data']
    
    # Extract the params
    params = get_user_params(job_data)
    repo = params['repo']
    branch = params['branch']

    ssm_param = ssm_root + '/simple-cicd/' + repo + '/' + branch + '/version'

    response = ssm.get_parameter(
        Name=ssm_param,
        WithDecryption=False
    )
    version = semver.parse_version_info(response['Parameter']['Value'])
    next_version = version.bump_patch()
    response = ssm.put_parameter(
        Name=ssm_param,
        Value=str(next_version),
        Type='String',
        Overwrite=True
    )

  except Exception as e:
    # If any other exceptions which we didn't expect are raised
    # then fail the job and log the exception message.
    print('Function failed due to exception.') 
    print(e)
    traceback.print_exc()
    put_job_failure(job_id, 'Function exception: ' + str(e))

  print('Function complete.')   
  put_job_success(job_id, 'Function complete')
  return "Complete."