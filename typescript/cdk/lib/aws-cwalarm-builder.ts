import { Stack, Tags } from 'aws-cdk-lib';
import { Alarm, AlarmProps } from 'aws-cdk-lib/aws-cloudwatch';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsCloudWatchAlarmProps extends AlarmProps {
    logicalId?: string;
}

export class AwsCloudWatchAlarmBuilder {
    private stack: Stack;
    private props: AwsCloudWatchAlarmProps;

    build(): Alarm {
        console.log("AwsCloudWatchAlarmBuilder Logical Id = " + this.props.logicalId);
        const resource = new Alarm(this.stack, this.props.logicalId || "Function", this.props);
        if (this.props.alarmName) {
            AwsCdkUtils.addGlobalTags(resource);
            Tags.of(resource).add("Name", this.props.alarmName);
            Tags.of(resource).add("stack-name", this.stack.stackName);
            Tags.of(resource).add("env", this.props.alarmName.split("-")[3]);
        }
        return resource;
    }

    constructor(construct: Stack, props: AwsCloudWatchAlarmProps) {
        this.stack = construct;
        this.props = props;
    }
}