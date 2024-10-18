import { Tags } from 'aws-cdk-lib';
import { LambdaRestApi, LambdaRestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface AwsLambdaRestApiBuilderProps extends LambdaRestApiProps {

  logicalId?: string;
}

export class AwsLambdaRestApiBuilder extends Construct {

  private id: string;
  private props: AwsLambdaRestApiBuilderProps;

  build(): LambdaRestApi {
    const lambdaRestApi = new LambdaRestApi (this, this.props.logicalId || 'ApiGateway', this.props);
    if (this.props.restApiName) {
      Tags.of(this).add("Name", this.props.restApiName);
    }
    return lambdaRestApi;
  }

  constructor (construct: Construct, id: string, props: AwsLambdaRestApiBuilderProps) {
    super (construct, id);
    this.id = id;
    this.props = props;
  }
}
