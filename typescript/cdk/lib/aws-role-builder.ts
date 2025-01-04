import { Stack, Tags } from 'aws-cdk-lib';
import { Role, RoleProps } from 'aws-cdk-lib/aws-iam';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsRoleBuilderProps extends RoleProps {

  logicalId?: string;
}

export class AwsRoleBuilder {

  private stack: Stack;
  private props: AwsRoleBuilderProps;

  build(): Role {
    console.log("AwsRoleBuilder Logical Id = " + this.props.logicalId);
    const resource = new Role (this.stack, this.props.logicalId || 'Role', this.props);
    if (this.props.roleName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.roleName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.roleName.split("-")[3]);
    }
    return resource;
  }

  constructor (stack: Stack, props: AwsRoleBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}
