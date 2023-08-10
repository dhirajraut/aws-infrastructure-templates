import { Tags } from 'aws-cdk-lib';
import { Function, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface AwsFunctionBuilderProps extends FunctionProps {
    logicalId?: string;
}

export class AwsFunctionBuilder extends Construct {
    private id: string;
    private props: AwsFunctionBuilderProps;

    build(): Function {
        const fn = new Function(this, this.props.logicalId || "Function", this.props);
        if (this.props.functionName) {
            Tags.of(this).add("Name", this.props.functionName);
        }
        return fn;
    }

    constructor(construct: Construct, id: string, props: AwsFunctionBuilderProps) {
        super(construct, id);
        this.id = id;
        this.props = props;
    }

}