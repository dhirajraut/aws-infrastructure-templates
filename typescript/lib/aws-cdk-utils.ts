import { Tags } from "aws-cdk-lib";


export class AwsCdkUtils {
  static addGlobalTags (inputResource: any): void {
    Tags.of(inputResource).add("application", "<<app name>>");
    Tags.of(inputResource).add("sub-application", "<<sub app name>>");
    Tags.of(inputResource).add("cost-center", "<<cost center>>");
  }
}