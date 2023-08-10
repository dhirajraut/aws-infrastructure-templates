import { Duration, Tags } from 'aws-cdk-lib';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface AwsSqsBuilderProps extends QueueProps {

  logicalId?: string;
}

export class AwsSqsBuilder extends Construct {

  private id: string;
  private props: AwsSqsBuilderProps;

  build(): Queue {
    const queue = new Queue(this, this.props.logicalId || 'Queue', this.props);
    if (this.props.queueName) {
      Tags.of(this).add("Name", this.props.queueName);
    }
    return queue;
  }

  constructor (construct: Construct, id: string, props: AwsSqsBuilderProps) {
    super(construct, id);
    this.id = id;
    this.props = props;
  }
}