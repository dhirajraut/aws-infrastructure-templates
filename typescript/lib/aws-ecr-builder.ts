import { Construct } from "constructs";
import { CfnRepository, CfnRepositoryProps } from 'aws-cdk-lib/aws-ecr';
import { Tags } from "aws-cdk-lib";

export interface AwsEcrBuilderProps extends CfnRepositoryProps {
  env: string,
  logicalId?: string
}

export class AwsEcrBuilder extends Construct {

  private id: string;
  private props: AwsEcrBuilderProps;

  build(): CfnRepository {
    const ecr = new CfnRepository (this, this.props.logicalId || 'Ecr', this.props);
    if (this.props.logicalId) {
      Tags.of(this).add("Name", this.props.logicalId);
    }   
    return ecr;
  }

  constructor (scope: Construct, id: string, props: AwsEcrBuilderProps) {
    super (scope, id);
    this.id = id;
    this.props = props;
  }
}