from aws_cdk import (
  NestedStack,
  aws_lambda as _lambda,
  aws_sqs as _sqs,
  Duration,
)
from aws_cdk.aws_lambda_event_sources import SqsEventSource
from constructs import Construct

class LambdaModule (NestedStack): 
  def __init__ (self, scope: Construct, id: str, **kwargs) -> None:
    super().__init__(scope, id, **kwargs)

    queue = _sqs.Queue (self, 'Queue',
      visibility_timeout=Duration.seconds(300),
    )

    function = _lambda.Function (self, 'Lambda',
      runtime=_lambda.Runtime.PYTHON_3_9,
      handler="function.handler",
      code=_lambda.Code.from_asset("./src"),
    )

    function.add_event_source (SqsEventSource (queue))