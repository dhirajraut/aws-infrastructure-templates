from aws_cdk import Stack
from constructs import Construct
from .aws_infrastructure_lambda_module_stack import LambdaModule

class AwsInfrastructureRootStack (Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        nested_stack = LambdaModule (self, 'lambda-module')
        # The code that defines your stack goes here

