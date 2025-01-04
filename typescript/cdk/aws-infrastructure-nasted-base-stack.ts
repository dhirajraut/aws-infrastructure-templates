import { Fn, NestedStack, RemovalPolicy } from "aws-cdk-lib";
import { ISecurityGroup, ISubnet, IVpc, SecurityGroup, Subnet, Vpc } from "aws-cdk-lib/aws-ec2";
import { Environment } from "./lib/environment";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { AwsCdkUtils } from "./utils/aws-infrastructure-cdk-utils";
import { IRole, Role } from "aws-cdk-lib/aws-iam";
import { CfnJobDefinition } from "aws-cdk-lib/aws-batch";
import { AwsEcrBuilderProps } from "./lib/aws-ecr-builder";
import { LogGroupProps } from "aws-cdk-lib/aws-logs";

export class AwsInfrastructureNestedBaseStack extends NestedStack {

  static readonly RESOURCE_PREFIX: String = "aws";
  static readonly RESOURCE_SUFFIX: String = "-dr";

  private static subnets: ISubnet[];
  getSubnets(environment: Environment): ISubnet[] {
    if (AwsInfrastructureNestedBaseStack.subnets) {
      console.log(`Using pre-calculated subnets ${AwsInfrastructureNestedBaseStack.subnets}`);
      return AwsInfrastructureNestedBaseStack.subnets;
    }
    var subnets: ISubnet[] = [];
    for (let ctr = 0; ctr < environment.subnetIds.length; ctr ++) {
      const subnet = Subnet.fromSubnetId(this, `${environment.subnetIds[ctr]}`, environment.subnetIds[ctr]);
      if (subnet) {
        subnets.push(subnet);
      }  
    }
    AwsInfrastructureNestedBaseStack.subnets = subnets;
    console.log(`Using subnets ${AwsInfrastructureNestedBaseStack.subnets}`);
    return subnets;
  }
  
  private static securityGroups: ISecurityGroup[];
  getSecurityGroups(environment: Environment): ISecurityGroup[] {
    if (AwsInfrastructureNestedBaseStack.securityGroups) {
      console.log(`Using pre-calculated security groups ${AwsInfrastructureNestedBaseStack.securityGroups}`);
      return AwsInfrastructureNestedBaseStack.securityGroups;
    }
    var securityGroups: ISecurityGroup[] = [];
    for (let ctr = 0; ctr < environment.securityGroupIds.length; ctr ++) {
      const securityGroup = SecurityGroup.fromSecurityGroupId(this, `${environment.securityGroupIds[ctr]}`, environment.securityGroupIds[ctr]);
      if (securityGroup) {
        securityGroups.push(securityGroup);
      }  
    }
    AwsInfrastructureNestedBaseStack.securityGroups = securityGroups;
    console.log(`Using securityGroups ${AwsInfrastructureNestedBaseStack.securityGroups}`);
    return securityGroups;
  }
  
  private static artifactsBucket: IBucket;
  getArtifactBucket(environment: Environment): IBucket {
    if (AwsInfrastructureNestedBaseStack.artifactsBucket) {
      console.log(`Using pre-calculated artifact bucket ${AwsInfrastructureNestedBaseStack.artifactsBucket}`);
      return AwsInfrastructureNestedBaseStack.artifactsBucket;
    }
    const artifactsBucketName = `${AwsCdkUtils.getLambdaArtifactBucketName(environment)}`;
    console.log(`Using Artifact Bucket Name: ${artifactsBucketName}`);
    const artifactsBucket = Bucket.fromBucketName(this, `${artifactsBucketName}`, `${artifactsBucketName}`);
    console.log(`Bucket Identified As: ${artifactsBucket}`);
    AwsInfrastructureNestedBaseStack.artifactsBucket = artifactsBucket;
    console.log(`Using artifacts bucket ${AwsInfrastructureNestedBaseStack.artifactsBucket}`);
    return artifactsBucket;
  }

  private static commonRole: IRole;
  getCommonRole (environment: Environment) {
    // if (AwsInfrastructureNestedBaseStack.commonRole) {
    //   console.log(`Using pre-calculated common role ${AwsInfrastructureNestedBaseStack.commonRole}`);
    //   return AwsInfrastructureNestedBaseStack.commonRole;
    // }
    const roleArn: string = `arn:aws:iam::${environment.account}:role/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-${environment.name}-common-role`;
    const commonRole = Role.fromRoleArn(this, `${roleArn}`, roleArn);
    AwsInfrastructureNestedBaseStack.commonRole = commonRole;
    console.log(`Using common role ${AwsInfrastructureNestedBaseStack.commonRole}`);
    return commonRole;    
  }

  private static vpc: IVpc;
  getVpc (environment: Environment) {
    if (AwsInfrastructureNestedBaseStack.vpc) {
      console.log(`Using pre-calculated VPC ${AwsInfrastructureNestedBaseStack.vpc}`);
      return AwsInfrastructureNestedBaseStack.vpc;
    }
    // const vpc = Vpc.fromLookup(this, `${environment.vpcId}`, { vpcId: environment.vpcId, region: environment.region });
    const vpc = Vpc.fromVpcAttributes(this, `${environment.vpcId}`, {
      vpcId: environment.vpcId,
      availabilityZones: Fn.getAzs()
    })
    AwsInfrastructureNestedBaseStack.vpc = vpc;
    console.log(`Using VPC ${AwsInfrastructureNestedBaseStack.vpc}`);
    return vpc;    
  }

  buildBatchSecrets(environment: Environment) : CfnJobDefinition.SecretProperty[] {
    var secrets: any[] = [];
    secrets.push(
      {
        name: "DB_URL",
        valueFrom: `arn:aws:ssm:${environment.region}:${environment.account}:parameter/infra/rds/${environment.name}/aws2_url`
      }
    );
    secrets.push(
      {
        name: "DB_USERNAME",
        valueFrom: `arn:aws:ssm:${environment.region}:${environment.account}:parameter/infra/rds/${environment.name}/aws2_username`
      },
    );
    secrets.push(
      {
        name: "DB_PASSWORD",
        valueFrom: `arn:aws:ssm:${environment.region}:${environment.account}:parameter/infra/rds/${environment.name}/aws2_password`
      },
    );
    return secrets;
  }


  /* Default ECR Props. */
  buildEcrProps (environment: Environment, repositoryName: string) : AwsEcrBuilderProps {
    const ecrProps: AwsEcrBuilderProps = {
      repositoryName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-${repositoryName}`,
      emptyOnDelete: true,
      removalPolicy: RemovalPolicy.DESTROY
    }
    return ecrProps;
  }

  /* Default Log Group Props. */
  buildBatchLogGroupProps(environment: Environment, logGroupName: string): LogGroupProps {
    var removalPolicy = RemovalPolicy.DESTROY;
    if (environment.name == `prod`) {
      removalPolicy = RemovalPolicy.RETAIN;
    }
    console.log(`Using removalPolicy = ${removalPolicy}`);
    const jobLogGroupProps: LogGroupProps = {
      logGroupName: `/aws/batch/job/${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-batch-${environment.name}-${logGroupName}`,
      removalPolicy: removalPolicy,
    }
    return jobLogGroupProps;
  }
}