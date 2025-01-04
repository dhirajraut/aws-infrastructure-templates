import { Stack, Tags } from "aws-cdk-lib";
import { Repository, RepositoryProps } from 'aws-cdk-lib/aws-ecr';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsEcrBuilderProps extends RepositoryProps {
  logicalId?: string
}

export class AwsEcrBuilder {

  private stack: Stack;
  private props: AwsEcrBuilderProps;

  build(): Repository {
    console.log("AwsEcrBuilder Logical Id = " + this.props.logicalId);
    const resource = new Repository (this.stack, this.props.logicalId || "Ecr", this.props);
    if (this.props.repositoryName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.repositoryName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.repositoryName.split("-")[3]);
    }   
    return resource;
  }

  constructor (stack: Stack, props: AwsEcrBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}