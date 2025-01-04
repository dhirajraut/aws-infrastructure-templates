import { Stack, Tags } from "aws-cdk-lib";
import { CfnJobDefinition, CfnJobDefinitionProps } from "aws-cdk-lib/aws-batch";
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsBatchJobDefinitionBuilderProps extends CfnJobDefinitionProps {
  logicalId?: string
}

export class AwsBatchJobDefinitionBuilder {

  private stack: Stack;
  private props: AwsBatchJobDefinitionBuilderProps;

  build(): CfnJobDefinition {
    console.log("AwsBatchJobDefinitionBuilder Logical Id = " + this.props.logicalId);
    const resource = new CfnJobDefinition (this.stack, this.props.logicalId || "JD", this.props);
    if (this.props.jobDefinitionName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.jobDefinitionName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.jobDefinitionName.split("-")[3]);
    }   
    return resource;
  }

  constructor (stack: Stack, props: AwsBatchJobDefinitionBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}