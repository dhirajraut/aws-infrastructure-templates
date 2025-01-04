import { Stack } from 'aws-cdk-lib';
import { CfnJobDefinition } from 'aws-cdk-lib/aws-batch';
import { CfnRule } from 'aws-cdk-lib/aws-events';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { CfnSchedule } from 'aws-cdk-lib/aws-scheduler';
import { AwsBatchJobDefinitionBuilder, AwsBatchJobDefinitionBuilderProps } from './aws-batchjobdefinition-builder';
import { AwsLogGroupBuilder, AwsLogGroupBuilderProps } from './aws-loggroup-builder';
import { AwsRuleBuilder, AwsRuleBuilderProps } from './aws-rule-builder';
import { AwsScheduleBuilder, AwsScheduleBuilderProps } from './aws-schedule-builder';

export interface AwsBatchProps {
  jobDefinitionProps: AwsBatchJobDefinitionBuilderProps;
  logGroupProps: AwsLogGroupBuilderProps;
  scheduleProps?: AwsScheduleBuilderProps;
  ruleProps?: AwsRuleBuilderProps;
  stackName?: string;
  logicalId?: string
}

export class AwsBatch {
  jobDefinition: CfnJobDefinition;
  logGroup: LogGroup;
  schedule: CfnSchedule;
  rule: CfnRule;
}

export class AwsBatchBuilder {

  private stack: Stack;
  private props: AwsBatchProps;

  build(): AwsBatch {

    let batch = new AwsBatch();

    /* Job Definition */
    batch.jobDefinition = new AwsBatchJobDefinitionBuilder (this.stack, this.props.jobDefinitionProps).build();
    
    /* Build LogGroup. */
    batch.logGroup = new AwsLogGroupBuilder (this.stack, this.props.logGroupProps).build();
    
    /* Build Schedule. */
    if (this.props.scheduleProps && this.props.scheduleProps.createSchedule) {
      console.log("AwsScheduleBuilder Logical Id = " + this.props.scheduleProps.logicalId);
      console.log (`Creating schedule for ${this.props.scheduleProps.name}.`);
      batch.schedule = new AwsScheduleBuilder(this.stack, this.props.scheduleProps).build();
    }
    else {
      console.log (`Skipping schedule creation.`);
    }

    /* Build Rule. */
    if (this.props.ruleProps && this.props.ruleProps.createRule) {
      console.log (`Creating Rule for ${this.props.ruleProps.name}.`);
      batch.rule = new AwsRuleBuilder(this.stack, this.props.ruleProps).build();
    }
    else {
      console.log (`Skipping Rule creation.`);
    }

    return batch;
  }

  constructor(stack: Stack, props: AwsBatchProps) {
    this.stack = stack;
    this.props = props;
  }
}