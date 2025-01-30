import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsInfrastructureRootStack } from './aws-infrastructure-root-stack';
import { Environment } from './lib/environment';

const app = new cdk.App();

/* Read deploymentEnvironment from context. e.g. 	cdk deploy --context deploymentEnvironment=DEVELOPMENT */
const deploymentEnvironment = app.node.tryGetContext('env');
console.log (`Received deploymentEnvironment as ${deploymentEnvironment}`)

/* Fetch environment details. */
const environment = Environment.fromString(`${deploymentEnvironment}`);

const stackName = `aws-batch-${environment.name}-cdk`;
console.log (`Processing stackName as ${stackName}`)

new AwsInfrastructureRootStack(app, stackName, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '<<accountId>>', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});