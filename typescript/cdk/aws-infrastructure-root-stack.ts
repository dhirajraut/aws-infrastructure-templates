import { Stack, StackProps } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { DeadLetterStack } from './aws-infrastructure-dead-letter-stack';
import { LambdaModuleStack } from './aws-infrastructure-lambda-module-stack';
import { Environment } from './lib/environment';
import { Constants } from './utils/aws-infrastructure-cdk-constants';
import { BatchComponentsStack } from './aws-infrastructure-batch-components-stack';
import { BatchModuleStack } from './aws-infrastructure-batch-module-stack';

export interface AwsInfrastructureStackProps extends StackProps {
  logicalId?: string;
  environment: Environment;
  deadLetterQueue?: Queue;
  stackName?: string;
}

export class AwsInfrastructureRootStack extends Stack {
  constructor(construct: Construct, id: string, props?: StackProps) {
    super(construct, id, props);

    /* Fetch environment details. */
    const environment = this.getAndValidateEnv(construct);

    /* Create Stacks. */
    const deadLetterStack = new DeadLetterStack (this, `${Constants.DEAD_LETTER}`, {
      environment: environment,
    });
    const lambdaModuleStack = new LambdaModuleStack (this, `${Constants.LAMBDA_MODULE}`, {
      environment: environment,
      deadLetterQueue: deadLetterStack.deadLetterQueue,
    });
    const batchComponentsStack = new BatchComponentsStack (this, `${Constants.BATCH_COMPONENTS}`, {
      environment: environment,
    });
    const batchModuleStack = new BatchModuleStack (this, `${Constants.BATCH_MODULE}`, {
      environment: environment,
    });
  }
  getAndValidateEnv(scope: Construct) : Environment {
    const env = scope.node.tryGetContext('env');
    console.log(`ENV in stack: ${env}`);
    console.log(`Validating env`);
    const environment = Environment.fromString(env);
    console.log (`Security Group Ids: ${environment.securityGroupIds}`);
    return environment;
  }
}
