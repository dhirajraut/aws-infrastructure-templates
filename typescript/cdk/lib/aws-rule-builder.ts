import { Stack, Tags } from "aws-cdk-lib";
import { CfnRule, CfnRuleProps } from "aws-cdk-lib/aws-events";
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsRuleBuilderProps extends CfnRuleProps {
  logicalId?: string
  createRule: boolean;
}

export class AwsRuleBuilder {

  private stack: Stack;
  private props: AwsRuleBuilderProps;

  build(): CfnRule {
    console.log("AwsRuleBuilderProps Logical Id = " + this.props.logicalId);
    const resource = new CfnRule (this.stack, this.props.logicalId /* Suffix */ || "Rule", this.props);
    if (this.props.logicalId) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.logicalId);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.logicalId.split("-")[3]);
    }
    return resource;
  }

  constructor (stack: Stack, props: AwsRuleBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}