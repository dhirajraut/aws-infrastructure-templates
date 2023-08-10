import { Duration, Tags } from 'aws-cdk-lib';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { CompositePrincipal, Effect, ManagedPolicy, PolicyStatement, Role, RoleProps, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AwsRoleBuilderProps extends RoleProps {

  logicalId?: string;
}

export class AwsRoleBuilder extends Construct {

  private id: string;
  private props: AwsRoleBuilderProps;

  build(): Role {
    const role = new Role (this, this.props.logicalId || 'Role', this.props);
    if (this.props.roleName) {
      Tags.of(this).add("Name", this.props.roleName);
    }
    return role;
  }

  constructor (construct: Construct, id: string, props: AwsRoleBuilderProps) {
    super (construct, id);
    this.id = id;
    this.props = props;
  }
}
