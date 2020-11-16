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


import { Pipeline, Artifact } from '@aws-cdk/aws-codepipeline'
import { Construct } from '@aws-cdk/core'
import { IBucket } from '@aws-cdk/aws-s3'
import {
  CodeBuildAction,
  CodeCommitSourceAction,
  ManualApprovalAction,
  LambdaInvokeAction
} from '@aws-cdk/aws-codepipeline-actions'
import config from '../../config/config'
import { StageName } from '../../config/config';
import CodeBuildRole from '../iam/code-build-role'
import { DeployProject } from '../projects/deploy-project'
import { Role } from '@aws-cdk/aws-iam'
import { IFunction } from '@aws-cdk/aws-lambda'
import { Repository } from '@aws-cdk/aws-codecommit'
import { BuildProject } from '../projects/build-project'
import { BuildEnvironmentVariableType, Project } from '@aws-cdk/aws-codebuild'
import { Rule, Schedule } from '@aws-cdk/aws-events'
import ssm = require('@aws-cdk/aws-ssm');
import sns = require('@aws-cdk/aws-sns');
import targets = require('@aws-cdk/aws-events-targets');

export interface CodeCommitPipelineProps {
  artifactsBucket: IBucket
  prefix: string
  ssmRoot: string
  repoName: string
  repoBranch: string,
  cronTrigger?: string,
  pipelineName: string,
  modulePipelineRole: Role
  emailHandler: IFunction
  semverHandler: IFunction
}

export class CodeCommitPipeline extends Pipeline {
  constructor(scope: Construct, id: string, props: CodeCommitPipelineProps) {
    const {
      artifactsBucket,
      prefix,
      ssmRoot,
      repoName,
      repoBranch,
      cronTrigger,
      pipelineName,
      modulePipelineRole, 
      emailHandler,
      semverHandler,
      ...rest
    } = props

    super(scope, id, {
      pipelineName,
      artifactBucket: artifactsBucket,
      role: modulePipelineRole,
      ...rest
    })

    // Provision SNS Topic for notifications
    const notificationTopic = new sns.Topic(this, 'Topic', {
      displayName: `${prefix}-${repoName}-${repoBranch}-cicd-topic` ,
      topicName: `${prefix}-${repoName}-${repoBranch}-cicd-topic`
    })

    new ssm.StringParameter(this, 'SnsTopicArn', {
      description: 'CICD SNS Topic Arn',
      parameterName: `${ssmRoot}/sns-topic/${repoName}-${repoBranch}-arn`,
      stringValue: notificationTopic.topicArn
    })

    const sourceOutputArtifact = new Artifact('SourceArtifact')
    const buildOutputArtifact = new Artifact('BuildArtifact')
    
    const codeCommitRepo = Repository.fromRepositoryName(
      scope,
      `${repoName}${repoBranch}CodeCommitRepo`,
      repoName
    )

    // CodeCommit Repo Target
    codeCommitRepo.onCommit('OnCommit', {
      target: new targets.CodePipeline(this),
      branches: [`${repoBranch}`]
    })

    // SourceAction
    const sourceAction = new CodeCommitSourceAction({
      repository: codeCommitRepo,
      branch: repoBranch,
      output: sourceOutputArtifact,
      actionName: 'Source'
    })

    this.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    })
    
    // Build
    const sourceCodeBuildRole = new CodeBuildRole(this, 'sourceCodeBuildRole')

    const buildProject = new BuildProject(this, 'sourceProject', {
      projectName: `${prefix}-${repoName}-${repoBranch}-build`,
      role: sourceCodeBuildRole,
      environmentVariables: {
        ARTIFACTS_BUCKET_NAME: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: artifactsBucket.bucketName
        },
        ARTIFACTS_BUCKET_ARN: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: artifactsBucket.bucketArn
        },
        REPO_NAME: {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: repoName
        }
      }
    })

    buildProject.onStateChange('deploymentStatus', {
      target: new targets.LambdaFunction(emailHandler)
    })

    const buildAction = new CodeBuildAction ({
      actionName: 'Build',
      outputs: [buildOutputArtifact],
      input: sourceOutputArtifact,
      project: buildProject
    })

    const semverAction = new LambdaInvokeAction({
      actionName: 'SemverLambda',
      lambda: semverHandler,
      userParameters: {
        'repo': repoName,
        'branch': repoBranch
      },
      runOrder: 20
    });

    this.addStage({
      stageName: 'Build',
      actions: [buildAction, semverAction]
    })

    // Deploy
    ;[StageName.dev, StageName.test, StageName.prod].forEach((stageName: StageName) => {

      if (config.accountIds[stageName]) {
        const deployRole = new CodeBuildRole(this, `${stageName}DeployRole`, { stageName })
        const deployProject = new DeployProject(
          this,
          `${prefix}-${repoName}-${repoBranch}-${stageName}-deploy`,
          {
            repoName: repoName,
            stageName: stageName,
            role: deployRole,
            bucketArn: artifactsBucket.bucketArn,
            bucketName: artifactsBucket.bucketName
          }
        )
        deployProject.onStateChange('deploymentStatus', {
          target: new targets.LambdaFunction(emailHandler)
        })

        if (stageName == 'prod') {
          this.addStage({
            stageName: 'prod-approval',
            actions: [new ManualApprovalAction({
              actionName: 'Promote'
              })]
          })
        }

        const moduleDeployOutputArtifact = new Artifact()
        const moduleDeployAction = new CodeBuildAction({
          actionName: 'Deploy',
          input: buildOutputArtifact,
          outputs: [moduleDeployOutputArtifact],
          project: deployProject,
          role: modulePipelineRole
        })
        this.addStage({
          stageName: `${stageName}-deploy`,
          actions: [moduleDeployAction]
        })
      }
    })      

    if (props.cronTrigger) {
      const cwRule = new Rule(this, `${pipelineName}-cronTrigger`, {
        ruleName: `${pipelineName}-trigger`,
        enabled: true,
        schedule: Schedule.expression(`cron(${props.cronTrigger})`)
      })
      cwRule.addTarget(new targets.CodePipeline(this))
    }

    new ssm.StringParameter(this, `${repoName}${repoBranch}Version`, {
      description: `Version number of ${repoName}/${repoBranch}`,
      parameterName: `${ssmRoot}/codecommit/${repoName}/${repoBranch}/version`,
      stringValue: '0.1.0'
    })
  }
}
