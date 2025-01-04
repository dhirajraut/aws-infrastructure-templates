import { Stack, Tags } from 'aws-cdk-lib';
import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { AwsCdkUtils } from '../utils/aws-infrastructure-cdk-utils';

export interface AwsFunctionBuilderProps extends FunctionProps {
    logicalId?: string;
}

export class AwsFunctionBuilder {
    private stack: Stack;
    private props: AwsFunctionBuilderProps;

    build(): Function {
        console.log("AwsFunctionBuilder Logical Id = " + this.props.logicalId);
        const resource = new Function(this.stack, this.props.logicalId || "Function", this.props);
        if (this.props.functionName) {
            AwsCdkUtils.addGlobalTags(resource);
            Tags.of(resource).add("Name", this.props.functionName);
            Tags.of(resource).add("stack-name", this.stack.stackName);
            Tags.of(resource).add("env", this.props.functionName.split("-")[3]);
        }
        return resource;
    }

    constructor(construct: Stack, props: AwsFunctionBuilderProps) {
        this.stack = construct;
        this.props = props;
    }
}