import { Stack, Tags } from "aws-cdk-lib";
import { CfnSchedule, CfnScheduleProps } from "aws-cdk-lib/aws-scheduler";
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsScheduleBuilderProps extends CfnScheduleProps {
  logicalId?: string
  createSchedule: boolean;
}

export class AwsScheduleBuilder {

  private stack: Stack;
  private props: AwsScheduleBuilderProps;

  build(): CfnSchedule {
    console.log("AwsScheduleBuilder Logical Id = " + this.props.logicalId);
    const resource = new CfnSchedule(this.stack, this.props.logicalId || `Schedule`, this.props);
    if (this.props.name) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.name);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.name.split("-")[3]);
    }
    return resource;
  }

  constructor (stack: Stack, props: AwsScheduleBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}