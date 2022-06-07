import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export interface PipelineRoleProps {}

export default class PipelineRole extends iam.Role {
  constructor(scope: Construct, name: string, props: PipelineRoleProps = {}) {
    super(scope, name, {
      ...props,
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
    })
  }
}
