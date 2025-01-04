import { Duration } from 'aws-cdk-lib';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { AwsInfrastructureNestedBaseStack } from './aws-infrastructure-nasted-base-stack';
import { AwsInfrastructureStackProps } from './aws-infrastructure-root-stack';
import { AwsFunctionBuilder, AwsFunctionBuilderProps } from './lib/aws-function-builder';
import { AwsSqsBuilder, AwsSqsBuilderProps } from './lib/aws-sqs-builder';
import { Environment } from './lib/environment';
import { Constants } from './utils/aws-infrastructure-cdk-constants';

export class DeadLetterStack extends AwsInfrastructureNestedBaseStack {

  readonly RESOURCE_SUFFIX: string;
  public readonly deadLetterQueue: Queue;

  constructor(scope: Construct, id: string, props: AwsInfrastructureStackProps) {
    super(scope, id, props);
    console.log(`------------------${id.toUpperCase()}-START------------------`);
    this.RESOURCE_SUFFIX = id;
    console.log (`Environment: ${props.environment.name}`);
    const environment = props.environment;

    const queueProps: AwsSqsBuilderProps = this.buildQueueProps (environment);
    const queue = new AwsSqsBuilder(this, queueProps).build();
    this.deadLetterQueue = queue;
  
    const fnProps: AwsFunctionBuilderProps = this.buildFunctionProps(environment);
    const fn = new AwsFunctionBuilder(this, fnProps).build();
    fn.addEventSource(new SqsEventSource(queue, {
      batchSize: Constants.DEFAULT_QUEUE_SUBSCRIPTION_BATCH_SIZE
    }));
    
    console.log(`------------------${id.toUpperCase()}-END------------------`);
  }

  buildQueueProps(environment: Environment): AwsSqsBuilderProps {
    const props: AwsSqsBuilderProps = {
      queueName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-sqs-${environment.name}-${this.RESOURCE_SUFFIX}`,
      retentionPeriod: Duration.days(Constants.DEFAULT_QUEUE_RETENTION_PERIOD_DAYS),
      visibilityTimeout: Duration.seconds(Constants.DEFAULT_QUEUE_VISITIBLITY_TIMEOUT_SECONDS),
    }
    return props;
  }

  buildFunctionProps(environment: Environment): AwsFunctionBuilderProps {

    const props: AwsFunctionBuilderProps = {
      functionName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-lambda-${environment.name}-${this.RESOURCE_SUFFIX}`,

      runtime: Runtime.JAVA_11,
      code: Code.fromBucket (this.getArtifactBucket(environment), `${Constants.DEFAULT_LAMBDA_CODE_KEY}`),
      handler: 'com.dhirajraut.awsinfrastructuretemplates.deadLetter.Handler::handleRequest',
      vpc: this.getVpc(environment),
      vpcSubnets: 
      {
        subnets: this.getSubnets(environment),
      },
      securityGroups: this.getSecurityGroups(environment),
      memorySize: Constants.DEFAULT_LAMBDA_MEMORY_MB,
      environment: {
        'env': environment.name,
      },
      role: this.getCommonRole(environment),
      timeout: Duration.seconds(Constants.DEFAULT_LAMBDA_TIMEOUT_SECONDS),
    };
    return props;
  }
}
