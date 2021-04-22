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
 import { Construct, SecretValue } from '@aws-cdk/core'
 import { IBucket } from '@aws-cdk/aws-s3'
 import {
   CodeBuildAction,
   CodeCommitSourceAction,
   ManualApprovalAction,
   LambdaInvokeAction,
   GitHubSourceAction
 } from '@aws-cdk/aws-codepipeline-actions'
 import config from '../../config/config'
 import { StageName, TriggerType, ProjectRepo } from '../../config/config';
 import CodeBuildRole from '../iam/code-build-role'
 import { DeployProject } from '../projects/deploy-project'
 import { Role } from '@aws-cdk/aws-iam'
 import { IFunction } from '@aws-cdk/aws-lambda'
 import { Repository } from '@aws-cdk/aws-codecommit'
 import { BuildProject } from '../projects/build-project'
 import { TestProject } from '../projects/test-project'
 import { Rule, Schedule } from '@aws-cdk/aws-events'
 import ssm = require('@aws-cdk/aws-ssm');
 import sns = require('@aws-cdk/aws-sns');
 import targets = require('@aws-cdk/aws-events-targets');
 
 export interface SimpleCicdPipelineProps {
   artifactsBucket: IBucket
   prefix: string
   ssmRoot: string
   repo: ProjectRepo
   pipelineName: string,
   modulePipelineRole: Role
   emailHandler: IFunction
   semverHandler: IFunction
 }
 
 export class SimpleCicdPipeline extends Pipeline {
   constructor(scope: Construct, id: string, props: SimpleCicdPipelineProps) {
     const {
       artifactsBucket,
       prefix,
       ssmRoot,
       repo,
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
 
     let repoName = repo.repository
     let repoBranch = repo.branch
     
     // Provision SNS Topic for notifications
     const notificationTopic = new sns.Topic(this, 'Topic', {
       displayName: `${pipelineName}-cicd-topic` ,
       topicName: `${pipelineName}-cicd-topic`
     })
 
     new ssm.StringParameter(this, 'SnsTopicArn', {
       description: 'CICD SNS Topic Arn',
       parameterName: `${ssmRoot}/sns-topic/${repoName}-${repoBranch}-arn`,
       stringValue: notificationTopic.topicArn
     })
 
     // Source Control Stage (CodeCommit)
     const sourceOutputArtifact = new Artifact('SourceArtifact')
     switch (repo.type) {
       case TriggerType.CodeCommit: {
         const codeCommitRepo = Repository.fromRepositoryName(
           scope,
           `${repoName}${repoBranch}CodeCommitRepo`,
           repoName
         )
     
         codeCommitRepo.onCommit('OnCommit', {
           target: new targets.CodePipeline(this),
           branches: [`${repoBranch}`]
         })
     
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
         break
       }
       case TriggerType.GitHub: {
         const oauth = SecretValue.secretsManager(config.deployment['githubSecret'])
 
         const sourceAction = new GitHubSourceAction({
           actionName: 'Source',
           oauthToken: oauth,
           owner: repo.owner,
           repo: repoName,
           branch: repoBranch,
           output: sourceOutputArtifact,
         })
 
         this.addStage({
           stageName: 'Source',
           actions: [sourceAction]
         })
         break
       }
     }
     
     
     // Building Stage
     const buildOutputArtifact = new Artifact('BuildArtifact')
     const buildRole = new CodeBuildRole(this, 'buildRole')
 
     const buildProject = new BuildProject(this, `${pipelineName}-build`, {
         repoName: repoName,
         role: buildRole,
         bucketArn: artifactsBucket.bucketArn,
         bucketName: artifactsBucket.bucketName
     })
 
     buildProject.onStateChange('build', {
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
 
     // Push SemVer to Parameter Store
     let semverParam = `${ssmRoot}/simple-cicd/${repoName}/${repoBranch}/version`
     new ssm.StringParameter(this, `${repoName}${repoBranch}Version`, {
       description: `Version number of ${repoName}/${repoBranch}`,
       parameterName: semverParam,
       stringValue: '0.1.0'
     })
 
     // Testing Stage
     const testOutputArtifact = new Artifact('TestArtifact')
     const testRole = new CodeBuildRole(this, 'testRole')
 
     const testProject = new TestProject(this, `${pipelineName}-test`, {
         repoName: repoName,
         role: testRole,
         bucketArn: artifactsBucket.bucketArn,
         bucketName: artifactsBucket.bucketName,
         semverParameter: semverParam
     })
 
     testProject.onStateChange('test', {
       target: new targets.LambdaFunction(emailHandler)
     })
 
     const testAction = new CodeBuildAction ({
       actionName: 'Test',
       outputs: [testOutputArtifact],
       input: buildOutputArtifact,
       project: testProject
     })
 
     this.addStage({
       stageName: 'Test',
       actions: [testAction]
     })
 
     // Target defaults
     // TODO: Make this user configurable
     let targetEnvs = [StageName.dev, StageName.test, StageName.prod]
     if (repo.targets) {
       targetEnvs = repo.targets
     }
 
     // Deploying Stage (One stage per target environment)
     targetEnvs.forEach((stageName: StageName) => {
 
       // Only add stage if accountId is set
       if (config.accountIds[stageName]) {
         const deployRole = new CodeBuildRole(this, `${stageName}DeployRole`, { stageName })
         const deployProject = new DeployProject(
           this,
           `${pipelineName}-${stageName}-deploy`,
           {
             repoName: repoName,
             stageName: stageName,
             role: deployRole,
             bucketArn: artifactsBucket.bucketArn,
             bucketName: artifactsBucket.bucketName,
             semverParameter: semverParam
           }
         )
         deployProject.onStateChange('deploy', {
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
           input: testOutputArtifact,
           outputs: [moduleDeployOutputArtifact],
           project: deployProject,
           role: modulePipelineRole
         })
         this.addStage({
           stageName: `Deploy-to-${stageName}-environment`,
           actions: [moduleDeployAction]
         })
       }
     })      
 
     if (repo.cron) {
       const cwRule = new Rule(this, `${pipelineName}-cronTrigger`, {
         ruleName: `${pipelineName}-trigger`,
         enabled: true,
         schedule: Schedule.expression(`cron(${repo.cron})`)
       })
       cwRule.addTarget(new targets.CodePipeline(this))
     }
 
   }
 }
 