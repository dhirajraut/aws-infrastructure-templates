import { Duration } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface AwsQueueProps {
  name: string;
  visibilityTimeout: number;
}

export class AwsSqs extends Construct {

  constructor (construct: Construct, id: string, props: AwsQueueProps) {
    super(construct, id);
    const queue = new Queue(this, 'Queue', {
      queueName: props.name,
      visibilityTimeout: Duration.seconds(props.visibilityTimeout)
    });
  }
}