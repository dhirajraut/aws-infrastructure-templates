import { Duration } from 'aws-cdk-lib';
import { AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, LambdaRestApi, LambdaRestApiProps } from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { CompositePrincipal, IManagedPolicy, ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { AwsInfrastructureNestedBaseStack } from './aws-infrastructure-nasted-base-stack';
import { AwsInfrastructureStackProps } from './aws-infrastructure-root-stack';
import { AwsFunctionBuilder, AwsFunctionBuilderProps } from './lib/aws-function-builder';
import { AwsLambdaRestApiBuilder, AwsLambdaRestApiBuilderProps } from './lib/aws-lambdarestapi-builder';
import { AwsRoleBuilder, AwsRoleBuilderProps } from './lib/aws-role-builder';
import { Environment } from './lib/environment';
import { Constants } from './utils/aws-infrastructure-cdk-constants';


export class LambdaModuleStack extends AwsInfrastructureNestedBaseStack {

  readonly RESOURCE_SUFFIX: string;

  constructor(scope: Construct, id: string, props: AwsInfrastructureStackProps) {
    super(scope, id, props);
    console.log(`------------------${id.toUpperCase()}-START------------------`);
    this.RESOURCE_SUFFIX = id;
    console.log (`Environment: ${props.environment.name}`);
    const environment = props.environment;

    var role: Role = this.buildRole(id, environment);
    var fn: Function = this.buildFunction(id, environment);
    var lambdaRestApi: LambdaRestApi = this.buildLambdaRestApi(id, environment, fn);

    console.log("ModuleImplStack-END.");
  }

  buildRole(id: string, environment: Environment): Role {
    /* Build Props. */
    const roleProps: AwsRoleBuilderProps = this.buildRoleProps(environment);
    /* Create Role. */
    const role = new AwsRoleBuilder(this, roleProps).build();
    return role;
  }
  buildRoleProps (environment: Environment): AwsRoleBuilderProps {
    const servicePrincipalNames: string[] = ["lambda.amazonaws.com"];
    const managedPolicyNames: string[] = ['AmazonRDSDataFullAccess', 'AmazonSSMReadOnlyAccess', 'service-role/AWSLambdaVPCAccessExecutionRole'];

    let servicePrincipals = new Array<ServicePrincipal>();
    for (var roleServicePrincipal of servicePrincipalNames) {
      servicePrincipals.push(new ServicePrincipal(roleServicePrincipal));
    }
    let managedPolicies = new Array<IManagedPolicy>();
    for (var managedPolicy of managedPolicyNames ?? "") {
      managedPolicies.push(ManagedPolicy.fromAwsManagedPolicyName(managedPolicy));
    }

    const props: AwsRoleBuilderProps = {
      roleName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-role-${environment.name}-${AwsInfrastructureNestedBaseStack.RESOURCE_SUFFIX}`,
      assumedBy: new CompositePrincipal(...servicePrincipals),
      managedPolicies: managedPolicies,
    };
    return props;
  }

  buildFunction(id: string, environment: Environment): Function{
    /* Create AWS Lambda Function. */
    const functionProps: AwsFunctionBuilderProps = this.buildFunctionProps(environment);
    const fn = new AwsFunctionBuilder(this, functionProps).build();

    /* Source For Lambda. Can be enabled instead of API Gateway. */
    // const sourceQueueArn = 
    //   `arn:aws:sqs:${environment.region}:${environment.account}:${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-sqs-${environment.name}-source-queue`;
    // fn.addEventSource(new SqsEventSource(Queue.fromQueueArn(this, `${sourceQueueArn}`, sourceQueueArn), {
    //   batchSize: Constants.DEFAULT_QUEUE_SUBSCRIPTION_BATCH_SIZE,
    //   enabled: false,
    // }));
    return fn;
  }
  buildFunctionProps(environment: Environment): AwsFunctionBuilderProps {
    let reservedConcurrency: Map<string,number> = new Map<string, number>()
      .set("uat", 100)
      .set("prod", 20);

    const props: AwsFunctionBuilderProps = {
      functionName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-lambda-${environment.name}-${this.RESOURCE_SUFFIX}`,

      runtime: Runtime.JAVA_11,
      code: Code.fromBucket (this.getArtifactBucket(environment), `${Constants.DEFAULT_LAMBDA_CODE_KEY}`),
      handler: 'com.dhirajraut.awsinfrastructuretemplates.module.Handler::handleRequest',
      vpc: this.getVpc(environment),
      vpcSubnets: 
      {
        subnets: this.getSubnets(environment)
      },
      securityGroups: this.getSecurityGroups(environment),
      memorySize: Constants.DEFAULT_LAMBDA_MEMORY_MB,
      environment: {
        'env': environment.name,
      },
      role: this.getCommonRole(environment),
      timeout: Duration.seconds(Constants.DEFAULT_LAMBDA_TIMEOUT_SECONDS),
      reservedConcurrentExecutions: reservedConcurrency.get(environment.name),
    };
    return props;
  }

  buildLambdaRestApi (id: string, environment: Environment, targetFunction: Function): LambdaRestApi {
    /* Build Props. */
    const lambdaRestApiProps: AwsLambdaRestApiBuilderProps = this.buildLambdaRestApiProps(environment, targetFunction);
    /* Build API. */
    const lambdaRestApi = new AwsLambdaRestApiBuilder(this, lambdaRestApiProps).build();
    
    /* Set Additional Properties. */
    this.setLambdaRestApiAdditionalProperties(environment, lambdaRestApi, targetFunction);
    return lambdaRestApi;
  }
  buildLambdaRestApiProps (environment: Environment, fn: Function): AwsLambdaRestApiBuilderProps {
    const lambdaRestApiProps: LambdaRestApiProps = {
      handler: fn,
      proxy: false,
      restApiName: `${AwsInfrastructureNestedBaseStack.RESOURCE_PREFIX}-ag-${environment.name}-${AwsInfrastructureNestedBaseStack.RESOURCE_SUFFIX}`,
      deployOptions: {
        stageName: `v1`,
      }
    }
    return lambdaRestApiProps;
  }
  setLambdaRestApiAdditionalProperties (environment: Environment, lambdaRestApi: LambdaRestApi, studentAccommodationFn: Function) {

    let cognitoUserPoolNames = new Map<string, string>();
    cognitoUserPoolNames.set("dev", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");
    cognitoUserPoolNames.set("test", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");
    cognitoUserPoolNames.set("uat", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");
    cognitoUserPoolNames.set("prod", "arn:aws:cognito-idp:us-east-1:<<account id>>:userpool/<<user pool id>>");

    // const accommodationsResource = lambdaRestApi.root.addResource('resource').addResource('{id}').addResource('sub-resource');
    const resource = lambdaRestApi.root.addResource('resource');
    const id = resource.addResource('{id}');
    const subResource = id.addResource('sub-resource');
    const userPool = UserPool.fromUserPoolArn (this, `${cognitoUserPoolNames.get(environment.name)}`, `${cognitoUserPoolNames.get(environment.name)}`);
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoUserAuthorizer', {
      cognitoUserPools: [userPool],
    });
    subResource.addMethod('GET', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    subResource.addMethod('POST', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    subResource.addMethod('PUT', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    subResource.addMethod('DELETE', new LambdaIntegration(studentAccommodationFn), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
  }
}
