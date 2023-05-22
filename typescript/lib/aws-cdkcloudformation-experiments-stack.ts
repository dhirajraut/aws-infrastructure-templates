import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AwsBatchJob, AwsBatchJobProps } from './batch/aws-batch-job';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Environment } from './environment';
import { AwsSqs } from './aws-sqs';

export class AwsCdkcloudformationExperimentsStack extends cdk.Stack {
  constructor(construct: Construct, id: string, props?: cdk.StackProps) {
    super(construct, id, props);

    const deploymentEnvironment = construct.node.tryGetContext('deploymentEnvironment');

    Environment.values.forEach (environment => console.log (`Environment: ${environment.name}, ${environment.account}, ${environment.region}, ${environment.vpcId}, ${environment.subnetIds}, ${environment.securityGroupIds}`));

    /* Fetch environment details. */
    const environment = Environment.fromString(`${deploymentEnvironment}`);
    
    /* Identify VPC from vpcId. */
    const vpc = Vpc.fromLookup(this, 'vpc', {
      vpcId: environment.vpcId,
    });

    /* Call custom class to create all components required for AWS Batch job. */
    new AwsBatchJob (this, `${id}`, {

      /* Props required for ECR repository. */
      repositoryProps: {
        repositoryName: `${id}-ecr`,
      },

      /* Props required for Compute. */
      computeEnvironmentProps: {
        type: "MANAGED",
        computeEnvironmentName: `${id}-compute`,
        state: 'ENABLED',
        computeResources: {
          type: "FARGATE",
          maxvCpus: 256,
          subnets: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnetIds,
          securityGroupIds: environment.securityGroupIds,
        }
      },

      /* Props required for Job Queue. */
      jobQueueProps: {
        jobQueueName: `${id}-jq`,
        priority: 1,
        computeEnvironmentOrder: [
          {
            computeEnvironment: `${id}-compute`,
            order: 1
          }
        ],
      },

      /* Props required for Job Definition. */
      jobDefinitionProps: {
        type: 'container'
      }
    });

    /* Call custom class to create AWS SQS. */
    new AwsSqs(this, `${id}-sqs`, {
      name: `${id}-sqs`,
      visibilityTimeout: 900
    });
  }
}
