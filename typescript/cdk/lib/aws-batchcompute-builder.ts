import { Stack, Tags } from 'aws-cdk-lib';
import { CfnComputeEnvironment, CfnComputeEnvironmentProps } from 'aws-cdk-lib/aws-batch';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsBatchComputeProps extends CfnComputeEnvironmentProps {
  logicalId?: string
}

export class AwsBatchComputeBuilder {

  private stack: Stack;
  private props: AwsBatchComputeProps;

  build(): CfnComputeEnvironment {

    /* Job Queue */
    console.log("AwsBatchComputeBuilder Logical Id = " + this.props.logicalId);
    const resource = new CfnComputeEnvironment (this.stack, this.props.logicalId /* Suffix */ || `Compute`, this.props);
    if (this.props.computeEnvironmentName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", `${this.props.computeEnvironmentName}`);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.computeEnvironmentName.split("-")[3]);
    }
    return resource;
  }

  constructor(stack: Stack, props: AwsBatchComputeProps) {
    this.stack = stack;
    this.props = props;
  }
}