import { Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { CompositePrincipal, Effect, IManagedPolicy, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { AwsBatchBuilder, AwsBatchJobProps } from './aws-batch-builder';
import { AwsFunctionBuilder } from './aws-function-builder';
import { AwsRoleBuilder } from './aws-role-builder';
import { AwsSqsBuilder } from './aws-sqs-builder';
import { Environment } from './environment';

export class AwsCdkcloudformationExperimentsStack extends Stack {
  constructor(construct: Construct, id: string, props?: StackProps) {
    super(construct, id, props);

    const deploymentEnvironment = construct.node.tryGetContext('deploymentEnvironment');

    Environment.values.forEach(environment => console.log(`Environment: ${environment.name}, ${environment.account}, ${environment.region}, ${environment.vpcId}, ${environment.subnetIds}, ${environment.securityGroupIds}`));

    /* Fetch environment details. */
    const environment = Environment.fromString(`${deploymentEnvironment}`);

    this.createBatch(`${id}`, environment);

    const deadLetterQueue = this.createDeadLetterQueue(`${id}`, environment);
    const queue = this.createQueue(`${id}`, environment, deadLetterQueue);

    const role = this.createRole(`${id}`, environment, queue);

    this.createFunction(`${id}`, environment, role);

    if (this.stackName) {
      Tags.of(this).add("Name", this.stackName);
    }
  }

  private createRole(id: string, environment: Environment, queue: Queue): Role {

    /* Call custom class to create AWS IAM Role. */
    const servicePrincipalNames: string[] = ["lambda.amazonaws.com"];
    const managedPolicyNames: string[] = ['SecretsManagerReadWrite', 'service-role/AWSLambdaBasicExecutionRole', 'AmazonSSMReadOnlyAccess'];

    let servicePrincipals = new Array<ServicePrincipal>();
    for (var roleServicePrincipal of servicePrincipalNames) {
      servicePrincipals.push(new ServicePrincipal(roleServicePrincipal));
    }

    let managedPolicies = new Array<IManagedPolicy>();
    for (var managedPolicy of managedPolicyNames ?? "") {
      managedPolicies.push(ManagedPolicy.fromAwsManagedPolicyName(managedPolicy));
    }
    const inlinePolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["acm:DescribeCertificate"],
          resources: ['arn:aws:acm:*:*:certificate/*']
        })
      ]
    });

    const role = new AwsRoleBuilder(this, `${id}-lambda-role`, {
      roleName: `aws-${environment.name}-lambda-role`,
      assumedBy: new CompositePrincipal(...servicePrincipals),
      managedPolicies: managedPolicies,
      inlinePolicies: {
        lambdapolicy: inlinePolicy,
      },
      logicalId: "LambdaRole",
    }).build();
    return role;
  }

  private createFunction(id: string, environment: Environment, role?: Role): Function {

    /* Identify code source. */
    const bucket: IBucket = Bucket.fromBucketArn(this, `${id}-s3`, `<<bucketArn>>`);
    const key: string = "<<jarpath>>";

    /* Call custom class to create AWS Lambda Function. */
    const fn = new AwsFunctionBuilder(this, `${id}-function`, {
      functionName: `aws-lambda-${environment.name}-purpose`,
      runtime: Runtime.JAVA_11,
      code: Code.fromBucket(bucket, key),
      handler: "<<Handler::method>>",
      role: role,
    }).build();
    return fn;
  }

  private createDeadLetterQueue(id: string, environment: Environment): Queue {

    /* Call custom class to create AWS SQS. */
    const deadLetterQueue = new AwsSqsBuilder(this, `${id}-dlq`, {
      queueName: `aws-${environment.name}-dlq`,
      retentionPeriod: Duration.days(14),
      receiveMessageWaitTime: Duration.seconds(20),
      visibilityTimeout: Duration.seconds(90),
      logicalId: "DLQ",
    }).build();
    return deadLetterQueue;
  }

  private createQueue(id: string, environment: Environment, deadLetterQueue: Queue): Queue {

    const queue = new AwsSqsBuilder(this, `${id}-queue`, {
      queueName: `aws-${environment.name}-purpose`,
      retentionPeriod: Duration.days(14),
      receiveMessageWaitTime: Duration.seconds(20),
      visibilityTimeout: Duration.seconds(90),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 10
      },
      logicalId: "Queue",
    }).build();
    return queue;
  }

  private createBatch(id: string, environment: Environment): void {
    /* Identify VPC from vpcId. */
    const vpc = Vpc.fromLookup(this, 'vpc', {
      vpcId: environment.vpcId,
    });

    /* Create role for batch. */
    const role = this.buildRoleForBatch(`${id}`, environment);

    /* Call custom class to create all components required for AWS Batch job. */
    let paramters = new Map<string, string>();
    paramters.set("env", `${environment.name}`);

    const props: AwsBatchJobProps = {
      /* Props required for ECR repository. */
      repositoryProps: {
        repositoryName: `${id}-ecr`,
        removalPolicy: RemovalPolicy.DESTROY, /* Confirm this before deploying. */
      },

      /* Props required for Compute. */
      computeEnvironmentProps: {
        computeEnvironmentName: `${id}-compute`,
        // serviceRole: role, To be added
        type: "MANAGED",
        state: 'ENABLED',
        computeResources: {
          type: "FARGATE",
          maxvCpus: 128,
          subnets: environment.subnetIds,
          // subnets: vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnetIds, /* Select one option. */
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
        jobDefinitionName: `${id}-jobdefinition`,
        type: 'container',
        timeout: {
          attemptDurationSeconds: 86400,
        },
        platformCapabilities: ['FARGATE'],
        parameters: paramters,
        containerProperties: {
          command: ["java", "-jar",
            `/test.jar`,
            "Ref::REC_TYPE"
          ],
          image: `test`,
          resourceRequirements: [{
            type: 'VCPU',
            value: '1',
          },
          {
            type: 'MEMORY',
            value: '2048'
          }
          ],
          jobRoleArn: role.roleArn, /* Readonly property. Cannot delegate the role creation to AwsBatchBuilder. */
          executionRoleArn: role.roleArn, /* Readonly property. Cannot delegate the role creation to AwsBatchBuilder. */
          fargatePlatformConfiguration: {
            platformVersion: '1.4.0'
          },
          environment: [
            {
              name: "env",
              value: `${environment.name}`
            },
          ],
          secrets: [
            {
              name: "secret",
              valueFrom: `${environment.name}`
            },
          ],
        }
      },

      /* Props required for Job Definition. */
      logGroupProps: {
        logGroupName: `${id}-log`,
        retention: RetentionDays.ONE_YEAR,
        removalPolicy: RemovalPolicy.DESTROY, /* Confirm this before deploying. */
      },
    };
    new AwsBatchBuilder(this, `${id}-batch`, props).build();
  }

  private buildRoleForBatch(id: string, environment: Environment): Role {

    const servicePrincipalNames: string[] = ["batch.amazonaws.com"];
    const managedPolicyNames: string[] = ['SecretsManagerReadWrite', 'service-role/AWSLambdaBasicExecutionRole', 'AmazonSSMReadOnlyAccess'];

    let servicePrincipals = new Array<ServicePrincipal>();
    for (var roleServicePrincipal of servicePrincipalNames) {
      servicePrincipals.push(new ServicePrincipal(roleServicePrincipal));
    }

    let managedPolicies = new Array<IManagedPolicy>();
    for (var managedPolicy of managedPolicyNames ?? "") {
      managedPolicies.push(ManagedPolicy.fromAwsManagedPolicyName(managedPolicy));
    }
    const inlinePolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["acm:DescribeCertificate"],
          resources: ['arn:aws:acm:*:*:certificate/*']
        })
      ]
    });
    const role = new AwsRoleBuilder(this, `${id}-batch-role`, {
      roleName: `aws-${environment.name}-batch-role`,
      assumedBy: new CompositePrincipal(...servicePrincipals),
      managedPolicies: managedPolicies,
      inlinePolicies: {
        batchpolicy: inlinePolicy,
      },
      logicalId: "BatchRole"
    }).build();
    return role;
  }
}
