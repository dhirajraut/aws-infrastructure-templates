import { Stack, Tags } from 'aws-cdk-lib';
import { CfnJobQueue, CfnJobQueueProps } from 'aws-cdk-lib/aws-batch';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsBatchQueueProps extends CfnJobQueueProps {
  stackName?: string;
  logicalId?: string
}

export class AwsBatchQueueBuilder {

  private stack: Stack;
  private props: AwsBatchQueueProps;

  build(): CfnJobQueue {

    /* Job Queue */
    console.log("AwsBatchQueueBuilder Logical Id = " + this.props.logicalId);
    const resource = new CfnJobQueue(this.stack, this.props.logicalId /* Suffix */ || `Jq`, this.props);
    if (this.props.jobQueueName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", `${this.props.jobQueueName}`);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.jobQueueName.split("-")[3]);
    }
    return resource;
  }

  constructor(stack: Stack, props: AwsBatchQueueProps) {
    this.stack = stack;
    this.props = props;
  }
}