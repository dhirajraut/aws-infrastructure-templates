import { CfnJobDefinitionProps } from 'aws-cdk-lib/aws-batch';
import { Construct } from 'constructs';
import { AwsBatchBuilder, AwsBatchProps } from './lib/aws-batch-builder';
import { AwsEcrBuilder, AwsEcrBuilderProps } from './lib/aws-ecr-builder';
import { AwsScheduleBuilderProps } from './lib/aws-schedule-builder';
import { Environment } from './lib/environment';
import { AwsInfrastructureNestedBaseStack } from './aws-infrastructure-nasted-base-stack';
import { AwsInfrastructureStackProps } from './aws-infrastructure-root-stack';

export class BatchModuleStack extends AwsInfrastructureNestedBaseStack {

  readonly RESOURCE_SUFFIX: string;

  constructor(scope: Construct, id: string, props: AwsInfrastructureStackProps) {
    super(scope, id, props);
    console.log(`------------------${id.toUpperCase()}-START------------------`);
    this.RESOURCE_SUFFIX = id;
    console.log (`Environment: ${props.environment.name}`);
    const environment = props.environment;
    props.stackName = `${id}`;

    /* Create ECR. */
    const ecrProps: AwsEcrBuilderProps = this.buildEcrProps(environment, `${this.RESOURCE_SUFFIX}`);
    const ecr = new AwsEcrBuilder(this, ecrProps).build();

    /* Create Batch. */
    const batchProps: AwsBatchProps = this.buildBatchProps (environment, `variant`);
    const batch = new AwsBatchBuilder(this, batchProps).build();

    console.log(`------------------${id.toUpperCase()}-END------------------`);
  }

  /* Batch Creation. */
  buildBatchProps(environment: Environment, variant: string): AwsBatchProps {
    const batchProps: AwsBatchProps = {
      jobDefinitionProps: this.buildJobDefinitionProps(environment, variant),
      logGroupProps: this.buildBatchLogGroupProps(environment, `${this.RESOURCE_SUFFIX}-${variant}`),
      scheduleProps: this.buildScheduleProps(environment, variant),
    };
    batchProps.jobDefinitionProps.logicalId = `${variant}-jd`;
    batchProps.logGroupProps.logicalId = `${variant}-loggroup`;
    if (batchProps.scheduleProps) {
      batchProps.scheduleProps.logicalId = `${variant}-schedule`;
    }
    return batchProps;
  }
  buildJobDefinitionProps(environment: Environment, variant: string): CfnJobDefinitionProps {
    var emailCommonRecipient = "";
    switch (environment.name) {
      case 'dev': 
      case 'uat':
        emailCommonRecipient = "devteam@org.com";
        break;
      case 'prod':
        emailCommonRecipient = `psteam@org.com`;
        break;
      default:
        //exit(); @Todo
    }
    const jobDefinitionProps: CfnJobDefinitionProps = {
      jobDefinitionName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-${this.RESOURCE_SUFFIX}-jd-${variant.toLowerCase()}`,
      type: 'container',
      platformCapabilities: ['FARGATE'],
      parameters: { "env": `${environment.name}`, "PROGRAM" : `${variant.toUpperCase()}` },
      containerProperties: {
        command: [ "java", "-jar",
          `/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-${this.RESOURCE_SUFFIX}.jar`,
          "Ref::PROGRAM"
        ],
        image: `${environment.account}.dkr.ecr.${environment.region}.amazonaws.com/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-${this.RESOURCE_SUFFIX}:latest`,
        resourceRequirements: [{
              type: 'VCPU',
              value: `8`,
            },
            {
              type: 'MEMORY',
              value: `36864`,
            }
        ],
        jobRoleArn: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-${environment.name}-common-role`,
        executionRoleArn: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-${environment.name}-common-role`,
        fargatePlatformConfiguration: {
          platformVersion: "1.4.0"
        },
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": `/aws/batch/job/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-${this.RESOURCE_SUFFIX}-${variant}`
          }
        },
        environment: [
          {
            name: `env`,
            value: `${environment.name}`
          },
          {
            name: `email_common_sender`,
            value: `sender@org.com`
          },
          {
            name: `email_common_recipient`,
            value: emailCommonRecipient
          }
        ],
        secrets: this.buildBatchSecrets(environment),
      }
    }
    return jobDefinitionProps;
  }

  /**
   * Generate Configuration required for Schedule.
   */
  buildScheduleProps(environment: Environment, variant: string) : AwsScheduleBuilderProps {

    var createSchedule = false;
    var state = 'DISABLED';
    var scheduleExpression = 'cron(0 0 ? * MON 2024)';

    switch (environment.name) {
      case 'uat':
        switch(variant) {
          case `variant`:
            createSchedule = true;
            // state = 'ENABLED';
            scheduleExpression = 'cron(30 18 ? * * *)';
          break;
        }
      break;
      case 'prod':
        switch(variant) {
          case `variant`:
            createSchedule = true;
            // state = 'ENABLED';
            scheduleExpression = 'cron(30 18 ? * * *)';
          break;
        }
        break;
      } 
    const props: AwsScheduleBuilderProps = {
      createSchedule: createSchedule,
      state: state,
      name: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-schedule-${environment.name}-${this.RESOURCE_SUFFIX}-${variant}`,
      flexibleTimeWindow: { mode: 'OFF'},
      scheduleExpression: scheduleExpression,
      scheduleExpressionTimezone: `America/New_York`,
      target: {
        arn: `arn:aws:scheduler:::aws-sdk:batch:submitJob`,
        input: `{\"JobDefinition\": \"${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-${this.RESOURCE_SUFFIX}-jd-${variant}\",
          \"JobName\": \"schedule_${this.RESOURCE_SUFFIX}_${variant}\",
          \"JobQueue\": \"${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-queue-priority1\"
          }`,
        roleArn: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-${environment.name}-common-role`
      }
    }
    return props;
  }
}
