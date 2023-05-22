import { CfnComputeEnvironment, CfnComputeEnvironmentProps, CfnJobDefinition, CfnJobDefinitionProps, CfnJobQueue, CfnJobQueueProps } from 'aws-cdk-lib/aws-batch';
import { Repository, RepositoryProps } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export interface AwsBatchJobProps {
  repositoryProps: RepositoryProps;
  computeEnvironmentProps: CfnComputeEnvironmentProps;
  jobQueueProps: CfnJobQueueProps;
  jobDefinitionProps: CfnJobDefinitionProps;
}

export class AwsBatchJob extends Construct {

  ecr: Repository;
  ecrArn: string;

  compute: CfnComputeEnvironment;
  computeArn: string;

  jobDefinition: CfnJobDefinition;
  jobDefinitionArn: string;

  jobQueue: CfnJobQueue;
  jobQueueArn: string;

  constructor (construct: Construct, id: string, props: AwsBatchJobProps) {
    super (construct, id);

    const cfLogicalId = id.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    console.log("logical " + cfLogicalId);

    this.ecr = new Repository (this, `${id}-ecr`, props.repositoryProps);
    console.log("Repo URI = " + this.ecr.repositoryUri);

    this.compute = new CfnComputeEnvironment (this, `${id}-compute`, props.computeEnvironmentProps);
    this.compute.overrideLogicalId (`${cfLogicalId}Compute`);

    // this.jobQueue = new CfnJobQueue (this, `${id}-jq`, props.jobQueueProps);

    // this.job`${Aws.ACCOUNT_ID}.dkr.ecr.${Aws.REGION}.amazonaws.com/ets-${props.group}-batch-${props.environment}-${props.batchSuffix}:latest`,
    // this.jobDefinition = new CfnJobDefinition (this, `${id}-jd`, props.jobDefinitionProps);
    
  }
}