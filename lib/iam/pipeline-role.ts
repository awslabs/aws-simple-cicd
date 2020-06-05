import iam = require('@aws-cdk/aws-iam')
import { Construct } from '@aws-cdk/core'

export interface PipelineRoleProps {}

export default class PipelineRole extends iam.Role {
  constructor(scope: Construct, name: string, props: PipelineRoleProps = {}) {
    super(scope, name, {
      ...props,
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    })
  }
}
