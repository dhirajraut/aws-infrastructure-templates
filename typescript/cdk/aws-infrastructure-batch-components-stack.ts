import { Duration } from 'aws-cdk-lib';
import { CfnComputeEnvironment, CfnJobQueue } from 'aws-cdk-lib/aws-batch';
import { ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { CompositePrincipal, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AwsBatchComputeBuilder, AwsBatchComputeProps } from './lib/aws-batchcompute-builder';
import { AwsBatchQueueBuilder, AwsBatchQueueProps } from './lib/aws-batchqueue-builder';
import { AwsCloudWatchAlarmBuilder, AwsCloudWatchAlarmProps } from './lib/aws-cwalarm-builder';
import { AwsRoleBuilder, AwsRoleBuilderProps } from './lib/aws-role-builder';
import { Environment } from './lib/environment';
import { AwsInfrastructureNestedBaseStack } from './aws-infrastructure-nasted-base-stack';
import { AwsInfrastructureStackProps } from './aws-infrastructure-root-stack';

export class BatchComponentsStack extends AwsInfrastructureNestedBaseStack {

  readonly RESOURCE_SUFFIX: string;

  constructor(scope: Construct, id: string, props: AwsInfrastructureStackProps) {
    super(scope, id, props);
    console.log(`------------------${id.toUpperCase()}-START------------------`);
    this.RESOURCE_SUFFIX = id.split("-").slice(-2).join("-");
    console.log (`Environment: ${props.environment.name}`);
    const environment = props.environment;

    /* Create Compute Role. */
    const computeRoleProps = this.buildComputeRoleProps(environment);
    const computeRole = new AwsRoleBuilder(this, computeRoleProps).build();

    /* Create Compute. */
    const computeProps = this.buildBatchComputeProps(environment, computeRole);
    const compute = new AwsBatchComputeBuilder(this, computeProps).build();

    /* Create Job Queue. */
    const jobQueueProps = this.buildBatchQueueProps(environment, compute);
    const jq = new AwsBatchQueueBuilder(this, jobQueueProps).build();
    jq.addDependency(compute);

    /* Create Alarm. Todo */
    // const alarmProps = this.buildCWAlarmProps(environment, jq);
    // const alarm = new AwsCloudWatchAlarmBuilder(this, alarmProps).build();

    console.log(`------------------${id.toUpperCase()}-END------------------`);
  }

  buildComputeRoleProps(environment: Environment): AwsRoleBuilderProps {
    let servicePrincipals = new Array<ServicePrincipal>();
    servicePrincipals.push (new ServicePrincipal(`batch.amazonaws.com`));
    servicePrincipals.push (new ServicePrincipal(`states.amazonaws.com`));
    servicePrincipals.push (new ServicePrincipal(`scheduler.amazonaws.com`));
    servicePrincipals.push (new ServicePrincipal(`events.amazonaws.com`));
    servicePrincipals.push (new ServicePrincipal(`ecs-tasks.amazonaws.com`));
    let compositePrincipal = new CompositePrincipal(...servicePrincipals);

    const props: AwsRoleBuilderProps = {
      roleName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-role-${environment.name}-compute-fargate-dr`,
      assumedBy: compositePrincipal,
      managedPolicies: [ 
        ManagedPolicy.fromAwsManagedPolicyName (`AmazonEC2ContainerRegistryReadOnly`),
        ManagedPolicy.fromAwsManagedPolicyName (`AmazonEventBridgeFullAccess`),
        ManagedPolicy.fromAwsManagedPolicyName (`AmazonSNSFullAccess`),
        ManagedPolicy.fromAwsManagedPolicyName (`AmazonSSMReadOnlyAccess`),
        ManagedPolicy.fromAwsManagedPolicyName (`AWSBatchFullAccess`),
        ManagedPolicy.fromAwsManagedPolicyName (`service-role/AWSBatchServiceRole`),
        ManagedPolicy.fromAwsManagedPolicyName (`CloudWatchFullAccess`),
      ],
    }
    return props;
  }

  buildBatchQueueProps(environment: Environment, compute: CfnComputeEnvironment): AwsBatchQueueProps {
    const props: AwsBatchQueueProps = {
      jobQueueName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-queue-priority1-dr`,
      priority: 1,
      state: `ENABLED`,
      computeEnvironmentOrder: [{
        order: 1,
        computeEnvironment: compute.computeEnvironmentName || 'Compute',
      }]
    };
    return props;
  }

  buildBatchComputeProps(environment: Environment, role: Role): AwsBatchComputeProps {
    const props: AwsBatchComputeProps = {
      computeEnvironmentName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-compute-fargate-dr`,
      type: 'MANAGED',
      serviceRole: role.roleName,
      // serviceRole: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-${environment.name}-common-role`,
      state: `ENABLED`,
      computeResources: {
        type: 'FARGATE',
        maxvCpus: 256,
        subnets: environment.subnetIds,
        securityGroupIds: environment.securityGroupIds,
      },
    }
    return props;
  }

  buildCWAlarmProps(environment: Environment, jq: CfnJobQueue): AwsCloudWatchAlarmProps {
    const props: AwsCloudWatchAlarmProps = {
      alarmDescription: `AWS Batch submitted on queue ${jq.jobQueueName} failed.`,
      alarmName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-alarm-${environment.name}-queue-priority1-dr`,
      actionsEnabled: true,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      metric: new Metric ({
        metricName: `TriggeredRules`,
        namespace: `AWS/Events`,
        statistic: `Sum`,
        period: Duration.seconds(60),
        dimensionsMap: {
          
        }
      }),
      treatMissingData: TreatMissingData.NOT_BREACHING,
      threshold: 0,
    }
    return props;
  }
}
