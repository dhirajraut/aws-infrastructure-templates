import { Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { CompositePrincipal, Effect, IManagedPolicy, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { AwsBatchBuilder, AwsBatchProps } from '../lib/aws-batch-builder';
import { AwsFunctionBuilder } from '../lib/aws-function-builder';
import { AwsRoleBuilder } from '../lib/aws-role-builder';
import { AwsSqsBuilder } from '../lib/aws-sqs-builder';
import { Environment } from '../lib/environment';
import { ModuleImplStack } from './aws-infrastructure-moduleimpl-stack';
import { AwsInfrastructureNestedStack } from './aws-infrastructure-template-nested-stack';

export class AwsInfrastructureStack extends Stack {
  constructor(construct: Construct, id: string, props?: StackProps) {
    super(construct, id, props);

    const deploymentEnvironment = construct.node.tryGetContext('deploymentEnvironment');

    Environment.values.forEach(environment => console.log(`Environment: ${environment.name}, ${environment.account}, ${environment.region}, ${environment.vpcId}, ${environment.subnetIds}, ${environment.securityGroupIds}`));

    /* Fetch environment details. */
    const environment = Environment.fromString(`${deploymentEnvironment}`);

    const lambdaModuleStack = new ModuleImplStack (this, `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-stack-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}`, {
      stackName: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-stack-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}`,
    });

    if (this.stackName) {
      Tags.of(this).add("Name", this.stackName);
    }
  }
}
