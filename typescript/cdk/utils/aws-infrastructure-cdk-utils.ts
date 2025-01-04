import { Tags } from "aws-cdk-lib";
import { Environment } from "../lib/environment";
import { AwsInfrastructureNestedBaseStack } from "../aws-infrastructure-nasted-base-stack";



export class AwsCdkUtils {
  static addGlobalTags (resource: any): void {
    if (resource) {
      Tags.of(resource).add("application", "appname");
      Tags.of(resource).add("cost-center", "number");
      Tags.of(resource).add("contact-email", "email");
    }
  }

  static getLambdaArtifactBucketName (environment: Environment): string {
    var lambdaArtifactBucket = ``;
    switch (environment.name) {
      case `dev1`:
      case `dev2`:
      case `dev3`:
      case `st`:
      case `pt`:
      case `uat`:
        lambdaArtifactBucket = `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-s3-allenv-artifacts-bucket-${environment.account}-${environment.region}`;
        break;
      case `prod`:
        lambdaArtifactBucket = `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-s3-prod-artifacts-bucket-${environment.account}-${environment.region}`;
        break;
      default:
        break;
    }
    return lambdaArtifactBucket;
  }
}