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


import 'source-map-support/register'
import cdk = require('@aws-cdk/core')
import { CicdStack } from '../lib/cicd-stack'
import { S3Stack } from '../lib/cicd-s3-stack'
import { EmailHandlerStack } from '../lib/emailHandler-stack'
import { SemverHandlerStack } from '../lib/semverHandler-stack'
import {default as config } from '../config/config'

// Setup prefix
let prefix = `${config.naming.company}-${config.naming.dept}-${config.naming.project}`
let ssmRoot = `/${config.naming.company}/${config.naming.dept}/${config.naming.project}`
let cicdRoleName = config.deployment['cicdRoleName']

const app = new cdk.App()

new S3Stack(app, 'AWS-Simple-CICD-01-S3', { prefix, ssmRoot })
new EmailHandlerStack(app, 'AWS-Simple-CICD-02-EmailHandler', { prefix, ssmRoot })
new SemverHandlerStack(app, 'AWS-Simple-CICD-03-SemverHandler', { prefix, ssmRoot })
new CicdStack(app, 'AWS-Simple-CICD-04-SeedPipeline', { prefix, ssmRoot, cicdRoleName, repos: config.seedPipeline})
new CicdStack(app, 'AWS-Simple-CICD-TeamOne', { prefix, ssmRoot, cicdRoleName, repos: config.teamOne})
//new CicdStack(app, 'TeamTWo-CICD', { prefix, ssmRoot, repos: config.teamTwo})