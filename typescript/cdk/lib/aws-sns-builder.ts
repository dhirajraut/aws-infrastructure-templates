import { Stack, Tags } from 'aws-cdk-lib';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsSnsBuilderProps extends TopicProps {

  logicalId?: string;
}

export class AwsSnsBuilder {

  private stack: Stack;
  private props: AwsSnsBuilderProps;

  build(): Topic {
    console.log("AwsSnsBuilder Logical Id = " + this.props.logicalId);
    const resource = new Topic(this.stack, this.props.logicalId || 'Topic', this.props);
    if (this.props.topicName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.topicName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.topicName.split("-")[3]);
    }
    return resource;
  }

  constructor (stack: Stack, props: AwsSnsBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}