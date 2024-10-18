import { Tags } from "aws-cdk-lib";
import { CfnSchedule, CfnScheduleProps } from "aws-cdk-lib/aws-scheduler";
import { Construct } from "constructs";

export interface AwsScheduleBuilderPropsWrapper {
  createSchedule: boolean;
  props: AwsScheduleBuilderProps;
}
export interface AwsScheduleBuilderProps extends CfnScheduleProps {
  // env: string,
  logicalId?: string;
}

export class AwsScheduleBuilder extends Construct {

  private id: string;
  private props: AwsScheduleBuilderProps;

  build(): CfnSchedule {
    const schedule = new CfnSchedule(this, this.props.logicalId || `Schedule`, this.props);
    if (this.props.logicalId) {
      Tags.of(this).add("Name", this.props.logicalId);
    }
    return schedule;
  }

  constructor (scope: Construct, id: string, props: AwsScheduleBuilderProps) {
    super (scope, id);
    this.id = id;
    this.props = props;
  }
}