import { Stack, Tags } from 'aws-cdk-lib';
import { LambdaRestApi, LambdaRestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsLambdaRestApiBuilderProps extends LambdaRestApiProps {
  logicalId?: string;
}

export class AwsLambdaRestApiBuilder {

  private stack: Stack;
  private props: AwsLambdaRestApiBuilderProps;

  build(): LambdaRestApi {
    console.log("AwsLambdaRestApiBuilder Logical Id = " + this.props.logicalId);
    const resource = new LambdaRestApi (this.stack, this.props.logicalId || 'ApiGateway', this.props);
    if (this.props.restApiName) {
      AwsCdkUtils.addGlobalTags(resource);
      Tags.of(resource).add("Name", this.props.restApiName);
      Tags.of(resource).add("stack-name", this.stack.stackName);
      Tags.of(resource).add("env", this.props.restApiName.split("-")[3]);
    }
    return resource;
  }

  constructor (stack: Stack, props: AwsLambdaRestApiBuilderProps) {
    this.stack = stack;
    this.props = props;
  }
}
