import { NestedStack } from "aws-cdk-lib";

export class AwsInfrastructureNestedStack extends NestedStack {

  static readonly RESOURCE_PREFIX: String = "aws-";
  static readonly RESOURCE_SUFFIX: String = "-dr";

  testMethod(): String {
    return "Test";
  }
}