import { Duration, Fn, StackProps, Tags } from 'aws-cdk-lib';
import { AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, LambdaRestApi, LambdaRestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { ISecurityGroup, ISubnet, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CompositePrincipal, IManagedPolicy, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { AwsCdkUtils } from '../lib/aws-cdk-utils';
import { AwsFunctionBuilder, AwsFunctionBuilderProps } from '../lib/aws-function-builder';
import { AwsLambdaRestApiBuilder, AwsLambdaRestApiBuilderProps } from '../lib/aws-lambdarestapi-builder';
import { AwsRoleBuilder, AwsRoleBuilderProps } from '../lib/aws-role-builder';
import { AwsScheduleBuilder, AwsScheduleBuilderPropsWrapper } from '../lib/aws-schedule-builder';
import { Environment } from '../lib/environment';
import { AwsInfrastructureNestedStack } from './aws-infrastructure-template-nested-stack';
import { AwsBatchBuilder, AwsBatchComputeProps, AwsBatchJobComputeBuilder, AwsBatchJobQueueBuilder, AwsBatchJobQueueProps, AwsBatchProps } from '../lib/aws-batch-builder';
import { RepositoryProps } from 'aws-cdk-lib/aws-ecr';
import { CfnComputeEnvironment, CfnComputeEnvironmentProps, CfnJobDefinitionProps, CfnJobQueueProps } from 'aws-cdk-lib/aws-batch';
import { LogGroupProps } from 'aws-cdk-lib/aws-logs';

export class ModuleImplStack extends AwsInfrastructureNestedStack {

  static readonly RESOURCE_NAME: String = "module-dr";

  constructor(scope: Construct, id: string, props?: StackProps) {
    console.log("ModuleImplStack-START.");
    super(scope, id, props);
    const env = scope.node.tryGetContext('env')
    console.log("ENV in stack = " + env);
    console.log("Validating env");
    const environment = Environment.fromString(env);
    console.log (environment.securityGroupIds);

    var role: Role = this.buildRole(id, environment);
    var fn: Function = this.buildFunction(id, environment);
    var lambdaRestApi: LambdaRestApi = this.buildLambdaRestApi(id, environment, fn);
    this.buildSchedule(id, environment);

    var compute: CfnComputeEnvironment = this.buildJobCompute(id, environment);
    this.buildJobQueue(id, environment, compute);
    this.buildBatch(id, environment);


    console.log("ModuleImplStack-END.");
  }

  buildRole(id: string, environment: Environment): Role {
    /* Build Props. */
    const roleProps: AwsRoleBuilderProps = this.buildRoleProps(environment);
    /* Create Role. */
    const role = new AwsRoleBuilder(this, `${roleProps.roleName}`, roleProps).build();
    /* Add Tags. */
    AwsCdkUtils.addGlobalTags(role);
    Tags.of(role).add (`stack-name`, `${id}`);

    return role;
  }
  buildRoleProps (environment: Environment): AwsRoleBuilderProps {
    const servicePrincipalNames: string[] = ["lambda.amazonaws.com"];
    const managedPolicyNames: string[] = ['AmazonRDSDataFullAccess', 'AmazonSSMReadOnlyAccess', 'service-role/AWSLambdaVPCAccessExecutionRole'];

    let servicePrincipals = new Array<ServicePrincipal>();
    for (var roleServicePrincipal of servicePrincipalNames) {
      servicePrincipals.push(new ServicePrincipal(roleServicePrincipal));
    }
    let managedPolicies = new Array<IManagedPolicy>();
    for (var managedPolicy of managedPolicyNames ?? "") {
      managedPolicies.push(ManagedPolicy.fromAwsManagedPolicyName(managedPolicy));
    }

    const props: AwsRoleBuilderProps = {
      roleName: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-role-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}`,
      assumedBy: new CompositePrincipal(...servicePrincipals),
      managedPolicies: managedPolicies,
      logicalId: "LambdaRole",
    };
    return props;
  }

  buildFunction(id: string, environment: Environment): Function{
    /* Create AWS Lambda Function. */
    const functionProps: AwsFunctionBuilderProps = this.buildFunctionProps(environment);
    const scoreOrchestratorFn = new AwsFunctionBuilder(this, `${functionProps.functionName}`, functionProps).build();

    /* Add Tags to AWS Lambda. */
    AwsCdkUtils.addGlobalTags(scoreOrchestratorFn);
    Tags.of(scoreOrchestratorFn).add (`stack-name`, `${id}`);

    /* Source For Lambda. */
    const sourceQueueArn = 
      `arn:aws:sqs:${environment.region}:${environment.account}:${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-sqs-${environment.name}-internal-score`;
    scoreOrchestratorFn.addEventSource(new SqsEventSource(Queue.fromQueueArn(this, `${sourceQueueArn}`, sourceQueueArn)))

    return scoreOrchestratorFn;
  }
  buildFunctionProps(environment: Environment): AwsFunctionBuilderProps {

    /* Subnets */
    var subnets: ISubnet[] = [];
    for (let ctr = 0; ctr < environment.subnetIds.length; ctr ++) {
      const subnet = Subnet.fromSubnetId(this, `${environment.subnetIds[ctr]}`, environment.subnetIds[ctr]);
      if (subnet) {
        subnets.push(subnet);
      }  
    }

    /* Security Groups */
    var securityGroups: ISecurityGroup[] = [];
    for (let ctr = 0; ctr < environment.securityGroupIds.length; ctr ++) {
      const securityGroup = SecurityGroup.fromSecurityGroupId(this, `${environment.securityGroupIds[ctr]}`, environment.securityGroupIds[ctr]);
      if (securityGroup) {
        securityGroups.push(securityGroup);
      }  
    }

    /* Role */
    const roleArn: string = `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-${environment.name}-common-role`;

    const props: AwsFunctionBuilderProps = {
      functionName: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-lambda-${environment.name}-${ModuleImplStack.RESOURCE_SUFFIX}`,

      runtime: Runtime.JAVA_17,
      // code: Code.fromBucket(b,k),
      code: Code.fromAsset("\\target\\<<jar file>>.jar"),
      handler: '<<handler class path>>::handleRequest',
      vpc: Vpc.fromVpcAttributes(this, `${environment.vpcId}`, {
        vpcId: environment.vpcId,
        availabilityZones: Fn.getAzs()
      }),
      vpcSubnets: 
      {
        subnets: subnets
      },
      securityGroups: securityGroups,
      memorySize: 4096,
      environment: {
        'env': environment.name,
      },
      role: Role.fromRoleArn(this, `${roleArn}`, roleArn),
      timeout: Duration.seconds(900),
    };
    return props;
  }

  buildLambdaRestApi (id: string, environment: Environment, targetFunction: Function): LambdaRestApi {
    /* Build Props. */
    const lambdaRestApiProps: AwsLambdaRestApiBuilderProps = this.buildLambdaRestApiProps(environment, targetFunction);
    /* Build API. */
    const lambdaRestApi = new AwsLambdaRestApiBuilder(this, `${lambdaRestApiProps.restApiName}`, lambdaRestApiProps).build();
    
    /* Set Additional Properties. */
    this.setLambdaRestApiAdditionalProperties(environment, lambdaRestApi, targetFunction);
    
    /* Add Tags. */
    AwsCdkUtils.addGlobalTags(lambdaRestApi);
    Tags.of(lambdaRestApi).add (`stack-name`, `${id}`);

    return lambdaRestApi;
  }
  buildLambdaRestApiProps (environment: Environment, fn: Function): AwsLambdaRestApiBuilderProps {
    const lambdaRestApiProps: LambdaRestApiProps = {
      handler: fn,
      proxy: false,
      restApiName: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-ag-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}`,
      deployOptions: {
        stageName: `v1`,
      }
    }
    return lambdaRestApiProps;
  }
  setLambdaRestApiAdditionalProperties (environment: Environment, lambdaRestApi: LambdaRestApi, studentAccommodationFn: Function) {

    let cognitoUserPoolNames = new Map<string, string>();
    cognitoUserPoolNames.set("dev", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");
    cognitoUserPoolNames.set("test", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");
    cognitoUserPoolNames.set("uat", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");
    cognitoUserPoolNames.set("prod", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");

    // const accommodationsResource = lambdaRestApi.root.addResource('students').addResource('{ssid}').addResource('accommodations');
    const studentsResource = lambdaRestApi.root.addResource('students');
    const ssidResource = studentsResource.addResource('{ssid}');
    const accommodationsResource = ssidResource.addResource('accommodations');
    const userPool = UserPool.fromUserPoolArn (this, `${cognitoUserPoolNames.get(environment.name)}`, `${cognitoUserPoolNames.get(environment.name)}`);
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoUserAuthorizer', {
      cognitoUserPools: [userPool],
    });
    accommodationsResource.addMethod('GET', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    accommodationsResource.addMethod('POST', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    accommodationsResource.addMethod('PUT', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    accommodationsResource.addMethod('DELETE', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
  }

  buildSchedule (id: string, environment: Environment) {
    var props: AwsScheduleBuilderPropsWrapper = this.buildSchedulePropsWrapper(environment);
    if (props && props.createSchedule) {
      console.log("Creating Schedule.");
      const schedule = new AwsScheduleBuilder(this, `${id}-schedule`, props.props).build();      
      console.log("Created Schedules.");
    }
  }
  buildSchedulePropsWrapper(environment: Environment): any {
    /* Default Values. */
    var createSchedule = false; // Master Switch.
    var scheduleState = 'DISABLED';
    var scheduleExpression = 'cron(0 0 ? * MON 2024)';

    /* Environment Overrides. */
    switch (environment.name) {
      case 'dev': 
        // No Schedule Required.
      break;
      case 'uat': 
        createSchedule = true;
        scheduleState = 'ENABLED';
        scheduleExpression = 'cron(00 20 ? * * *)';
        break;
      case 'prod': 
        createSchedule = true;
        scheduleState = 'DISABLED';
        scheduleExpression = 'cron(00 20 ? * * *)';
        break;
      default:
        return undefined;
    }

    const config: any = {
      createSchedule: createSchedule,
      scheduleConfigCaaspp: {
        state: scheduleState,
        name: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-schedule-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}`,
        flexibleTimeWindow: { mode: 'OFF'},
        scheduleExpression: scheduleExpression,
        scheduleExpressionTimezone: `America/New_York`,
        target: {
          arn: `arn:aws:scheduler:::aws-sdk:batch:submitJob`,
          input: `{\"JobDefinition\": \"${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-<<jd name>>\",
            \"JobName\": \"Schedule_DaySchedules_Caaspp\",
            \"JobQueue\": \"${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-<<queue name>>\"
            }`,
          roleArn: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-${environment.name}-<<role name>>`
        }
      },
    }
    return config as AwsScheduleBuilderPropsWrapper;
  }

  buildJobCompute (id: string, environment: Environment) : CfnComputeEnvironment {
    var props: AwsBatchComputeProps = this.buildJobComputeEnvironmentProps(environment);
    const compute: CfnComputeEnvironment = new AwsBatchJobComputeBuilder(this, `${id}-compute`, props).build();
    return compute;
  }
  buildJobComputeEnvironmentProps (environment: Environment): AwsBatchComputeProps {
    const computeProps: AwsBatchComputeProps = {
      computeEnvironmentProps: {
        computeEnvironmentName: `/aws/batch/job/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}-compute`,
        serviceRole: `<<role arn>>`,
        type: 'MANAGED',
        state: 'ENABLED',
        computeResources: {
          maxvCpus: 256,
          type: `FARGATE`,
          subnets: environment.securityGroupIds,
        }
      }
    }
    return computeProps;
  }

  buildJobQueue (id: string, environment: Environment, compute: CfnComputeEnvironment)  {
    var props: AwsBatchJobQueueProps = this.buildJobQueueProps(environment, compute);
    new AwsBatchJobQueueBuilder(this, `${id}-jq`, props).build();
  }
  buildJobQueueProps (environment: Environment, compute: CfnComputeEnvironment): AwsBatchJobQueueProps {
    const jobQueueProps: AwsBatchJobQueueProps = {
      jobQueueProps: {
        jobQueueName: `<<job queue name>>`,
        state: `ENABLED`,
        priority: 1,
        computeEnvironmentOrder: [{
          order: 1,
          computeEnvironment: compute.attrComputeEnvironmentArn,
        },]
      }
    }
    return jobQueueProps;
  }

  buildBatch (id: string, environment: Environment) {
    var batchPropsCaaspp: AwsBatchProps = this.buildBatchProps (environment);
    const jd = new AwsBatchBuilder(this, id, batchPropsCaaspp).build();
  }
  buildBatchProps (environment: Environment) {
    var batchProps: AwsBatchProps = {
      repositoryProps: this.getRepositoryProps(environment),
      jobDefinitionProps: this.getJobDefinitionProps(environment),
      logGroupProps: this.getLogGroupProps(environment),
    };
    return batchProps;
  }

  getRepositoryProps(environment: Environment): RepositoryProps {
    const repositoryProps: RepositoryProps = {
      repositoryName: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}`
    }
    return repositoryProps;
  }
  getJobDefinitionProps(environment: Environment): CfnJobDefinitionProps {
    const jobDefinitionProps: CfnJobDefinitionProps = {
      jobDefinitionName: `${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}-jd`,
      type: 'container',
      platformCapabilities: ['FARGATE'],
      parameters: { "env": `${environment.name}` },
      containerProperties: {
        command: [ "java", "-jar",
          `/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}.jar`,
          "Ref::PROGRAM"
        ],
        image: `${environment.account}.dkr.ecr.${environment.region}.amazonaws.com/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}:latest`,
        resourceRequirements: [{
              type: 'VCPU',
              value: `8`,
            },
            {
              type: 'MEMORY',
              value: `36864`,
            }
        ],
        jobRoleArn: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-${environment.name}-<<role name>>`,
        executionRoleArn: `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-${environment.name}-<<role name>>`,
        fargatePlatformConfiguration: {
          platformVersion: "1.4.0"
        },
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": `/aws/batch/job/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}-loggroup`
          }
        },
        environment: [
          {
            name: "env",
            value: `${environment.name}`
          },
        ],
        secrets: [
          {
            name: "SECRET1",
            valueFrom: `arn:aws:ssm:${environment.region}:${environment.account}:parameter/infra/rds/snr_${environment.name}/aws2_url`
          },
        ]
      }
    }
    return jobDefinitionProps;
  }
  getLogGroupProps(environment: Environment): LogGroupProps {
    const jobLogGroupProps: LogGroupProps = {
      logGroupName: `/aws/batch/job/${AwsInfrastructureNestedStack.RESOURCE_PREFIX}-batch-${environment.name}-${AwsInfrastructureNestedStack.RESOURCE_SUFFIX}-loggroup`
    }
    return jobLogGroupProps;
  }
}
