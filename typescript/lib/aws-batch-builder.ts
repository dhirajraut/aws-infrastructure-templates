import { Tags } from 'aws-cdk-lib';
import { CfnComputeEnvironment, CfnComputeEnvironmentProps, CfnJobDefinition, CfnJobDefinitionProps, CfnJobQueue, CfnJobQueueProps } from 'aws-cdk-lib/aws-batch';
import { Repository, RepositoryProps } from 'aws-cdk-lib/aws-ecr';
import { LogGroup, LogGroupProps } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface AwsBatchComputeProps {
  computeEnvironmentProps: CfnComputeEnvironmentProps;
}
export class AwsBatchJobComputeBuilder extends Construct {
  private id: string;
  private props: AwsBatchComputeProps;

  build(): CfnComputeEnvironment {
    const compute: CfnComputeEnvironment = new CfnComputeEnvironment(this, `${this.id}-compute`, this.props.computeEnvironmentProps);
    if (this.props.computeEnvironmentProps.computeEnvironmentName) {
      Tags.of(this).add("Name", this.props.computeEnvironmentProps.computeEnvironmentName);
    }
    const cfLogicalId = this.id.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    console.log("logical Id = " + cfLogicalId);
    compute.overrideLogicalId(`${cfLogicalId}-Compute`);
    return compute;
  }

  constructor(construct: Construct, id: string, props: AwsBatchComputeProps) {
    super(construct, id);
    this.id = id;
    this.props = props;
  }
}

/* --------------------------------------------------------------- */

export interface AwsBatchJobQueueProps {
  jobQueueProps: CfnJobQueueProps;
}
export class AwsBatchJobQueueBuilder extends Construct {
  private id: string;
  private props: AwsBatchJobQueueProps;

  build(): CfnJobQueue {
    const jobQueue: CfnJobQueue = new CfnJobQueue(this, `${this.id}-jq`, this.props.jobQueueProps);
    if (this.props.jobQueueProps.jobQueueName) {
      Tags.of(this).add("Name", this.props.jobQueueProps.jobQueueName);
    }
    jobQueue.overrideLogicalId("JobQueue");
    return jobQueue;
  }

  constructor(construct: Construct, id: string, props: AwsBatchJobQueueProps) {
    super(construct, id);
    this.id = id;
    this.props = props;
  }
}

/* --------------------------------------------------------------- */


export interface AwsBatchProps {
  repositoryProps: RepositoryProps;
  jobDefinitionProps: CfnJobDefinitionProps;
  logGroupProps: LogGroupProps;
  stackName?: string;
}

export class AwsBatch {
  ecr: Repository;
  compute: CfnComputeEnvironment;
  jobDefinition: CfnJobDefinition;
  jobQueue: CfnJobQueue;
  logGroup: LogGroup;
}

export class AwsBatchBuilder extends Construct {

  private id: string;
  private props: AwsBatchProps;

  build(): AwsBatch {

    let batch = new AwsBatch();

    /* Create ECR Repo. */
    batch.ecr = new Repository(this, `${this.id}-ecr`, this.props.repositoryProps);
    if (this.props.repositoryProps.repositoryName) {
      Tags.of(this).add("Name", this.props.repositoryProps.repositoryName);
    }
    console.log("Repo URI = " + batch.ecr.repositoryUri);

    /* Job Definition */
    batch.jobDefinition = new CfnJobDefinition(this, `${this.id}-jd`, this.props.jobDefinitionProps);
    if (this.props.jobDefinitionProps.jobDefinitionName) {
      Tags.of(this).add("Name", this.props.jobDefinitionProps.jobDefinitionName);
    }
    batch.jobDefinition.overrideLogicalId("JobDefinition");
    batch.jobDefinition.addDependsOn(batch.compute);
    
    /* Build LogGroup. */
    batch.logGroup = new LogGroup(this, `${this.id}-loggroup`, this.props.logGroupProps);
    if (this.props.logGroupProps.logGroupName) {
      Tags.of(this).add("Name", this.props.logGroupProps.logGroupName);
    }

    return batch;
  }

  constructor(construct: Construct, id: string, props: AwsBatchProps) {
    super(construct, id);
    this.id = id;
    this.props = props;
  }
}