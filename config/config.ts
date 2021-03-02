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


import configFile from "../project-config.json"

export enum TriggerType {
  CodeCommit = "CodeCommit",
  GitHub = "GitHub"
}

export enum Regions {
  CanadaCentral="CA-CENTRAL-1"
}

export enum StageName {
  cicd = 'cicd',
  dev = 'dev',
  test = 'test',
  prod = 'prod'
}

export type ProjectRepo = {
  pipelineName: string,
  repository: string,
  branch: string,
  type: TriggerType,
  owner?: any,
  secret?: any,
  cron?: any,
  targets?: any
}

export interface ProjectConfig {
  naming: {
    company: string,
    dept: string,
    project: string
  },
  deployment: {
    region: string,
    cicdRoleName: string
    githubSecret: string
  },
  accountIds: {
    cicd: string,
    dev: string,
    test: string,
    prod: string
  },
  sharedResources: {
    cicdBucket: string
  },
  defaultRegions: {
    cicd: string,
    dev: string,
    test: string,
    prod: string
  },
  seedPipeline: Array<ProjectRepo>,
  teamOne:  Array<ProjectRepo>
}

const config = <ProjectConfig>configFile

export default config