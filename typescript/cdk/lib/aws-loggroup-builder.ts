import { Stack, Tags } from "aws-cdk-lib";
import { LogGroup, LogGroupProps } from "aws-cdk-lib/aws-logs";
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsLogGroupBuilderProps extends LogGroupProps {
  logicalId?: string
}

export class AwsLogGroupBuilder {

  private stack: Stack;
  private props: AwsLogGroupBuilderProps;

  build(): LogGroup {
    console.log("AwsLogGroupBuilder Logical Id = " + this.props.logicalId);
    const resource = new LogGroup (this.stack, this.props.logicalId || "LogGroup", this.props);
    if (this.props.logGroupName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.logGroupName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.logGroupName.split("-")[3]);
    }   
    return resource;
  }

  constructor (stack: Stack, props: AwsLogGroupBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}