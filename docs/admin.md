
# Administrator Guide

## Configure pipelines

Edit the project-config.json file. In the sample provided there are two arrays, for Team One and Team Two. Each element of the array defines a pipeline along with some basic configuration parameters.

### Project Schema

```json
{
  owner: string,
  pipelineName: string,
  ccRepoName: string,
  branch: string,
  type: TriggerType,
  cron: string
}
```

- The pipeline generated concatenates the pipelineName and branch to create a unique pipeline per branch.
- The sample provides a single TriggerType - CodeCommit. This can be extended to add Github, BitBucket etc.
- An SNS Topic is generated for the pipeline. Subscribers receive notifications on status of each pipeline stage. Emails are sent by a Lambda function.
- A Parameter Store parameter is generated which stores the semantic version and automatically increments (uses python semver library) on every successful build.
- A Cron parameter can be set to trigger the pipeline on a schedule managed by CloudWatch.

### Sample

```json
{
  "owner": "acme",
  "pipelineName": "rocket-powered-skates",
  "ccRepoName": "rocket-powered-skates",
  "branch": "master",
  "type": "CodeCommit",
  "cron": ""
}
```

## Deploy pipelines

Deploy the pipeline to the shared services account using the commands below.

```bash
npm install
npm run build
cdk bootstrap --profile <shared services account profile>
cdk deploy --profile <shared services account profile>
```
