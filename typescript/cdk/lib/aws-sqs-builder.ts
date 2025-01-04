import { Stack, Tags } from 'aws-cdk-lib';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsSqsBuilderProps extends QueueProps {

  logicalId?: string;
}

export class AwsSqsBuilder {

  private stack: Stack;
  private props: AwsSqsBuilderProps;

  build(): Queue {
    console.log("AwsSqsBuilder Logical Id = " + this.props.logicalId);
    const resource = new Queue(this.stack, this.props.logicalId || 'Queue', this.props);
    if (this.props.queueName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.queueName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.queueName.split("-")[3]);
    }
    return resource;
  }

  constructor (stack: Stack, props: AwsSqsBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}