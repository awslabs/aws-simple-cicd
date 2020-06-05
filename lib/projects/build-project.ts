import { Construct } from '@aws-cdk/core'
import { PipelineProject, ProjectProps, BuildSpec} from '@aws-cdk/aws-codebuild'
import { defaultEnvironment } from './project-environment'

export interface BuildProjectProps extends ProjectProps {
}

export class BuildProject extends PipelineProject {
  constructor(scope: Construct, id: string, props: BuildProjectProps) {
    const { ...rest } = props
    super(scope, id, {
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              java: 'openjdk8',
              nodejs: '10'
            }
          },
          build: {
            commands: [
              'aws s3 sync s3://${ARTIFACTS_BUCKET_NAME}/libs ${HOME}/.m2/repository/com/amazonaws/proserve --no-progress --exclude "*octagon*"',
              'aws s3 sync s3://${ARTIFACTS_BUCKET_NAME}/libs/octagon ${HOME}/.m2/repository/com/amazonaws/octagon --no-progress',
              'bash ${CODEBUILD_SRC_DIR}/scripts/build.sh'
            ]
          },
          post_build: {
            commands: [
            ]
          }
        },
        artifacts: {
          files: '**/*'
        }
      }),
      environment: defaultEnvironment,
      ...rest
    })
  }
}
