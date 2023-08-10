import { Aws } from "aws-cdk-lib";


export enum AccountType {
  PRODUCTION = 'production',
  NON_PRODUCTION = 'non-production'
}

export enum DeploymentEnvironments {
  DEVELOPMENT = 'dev',
  TEST = 'test',
  UAT = 'uat',
  PRODUCTION = 'production'
}

export enum AcceptedRegions {
  US_EAST_1 = 'us-east-1'
}

/* Class to select AWS Environment. */
export class Environment {

  /* Private constructor to avoid instantiation. */
  private constructor (
    public readonly name: string,
    public readonly account: string,
    public readonly region: AcceptedRegions,
    public readonly vpcId: string,
    public readonly subnetIds: string[],
    public readonly securityGroupIds: string[]
  ) {}

  /* Enum values. */
  static readonly DEVELOPMENT = new Environment('dev', 'someaccountid', AcceptedRegions.US_EAST_1, 'devVpcId', ['testSubnetId', 'testSubnetId'], ['testSecurityGroupId']);
  static readonly TEST        = new Environment('tst', 'someaccountid', AcceptedRegions.US_EAST_1, 'testVpcId', ['testSubnetId'], ['testSecurityGroupId']);
  static readonly UAT         = new Environment('uat', 'someaccountid', AcceptedRegions.US_EAST_1, 'uatVpcId', ['testSubnetId'], ['testSecurityGroupId']);
  static readonly PRODUCTION  = new Environment('prd', 'someaccountid', AcceptedRegions.US_EAST_1, 'prdVpcId', ['testSubnetId'], ['testSecurityGroupId']);

  /* Get all the values from enum. */
  static get values() : Environment[] {
    return [
      this.DEVELOPMENT,
      this.TEST,
      this.UAT,
      this.PRODUCTION
    ];
  }

  /* Convert a string to its corresponding Environment instance. */
  static fromString (selector : string) : Environment {
    const value = (this as any) [selector];
    if (value) {
      return value;
    }
    throw new RangeError (`Illegal argument passed to fromString(): ${selector} does not correspond to any instance of the enum ${(this as any).prototype.constructor.name}`);
  }

  /* Called when converting the Enum value to a string using JSON.Stringify.
   * Compare to the fromString() method, which deserializes the object. */
  public toJSON() {
    return this.name
  }

  /**
   * Usage:
   *  List values
   *    Environment.values.forEach (environment => console.log (`Environment: ${environment.name}, ${environment.account}, ${environment.region}, ${environment.vpcId}, ${environment.subnetIds}, ${environment.securityGroupIds}`));
   *  InstanceOf
   *    console.log("instanceof works: " + (Environment.DEVELOPMENT instanceof Environment));
   *  Serialization & Deserialization
   *    const selector = 'DEVELOPMENT';
   *    console.log(`Serialization & deserialization: ${Environment.fromString(selector).toJSON() === selector}`);
   *      OR
   *    const infrastructure = {
   *      description: "Infrastructure",
   *      environment: Environment.DEVELOPMENT
   *    };
   *    console.log(JSON.stringify(infrastructure, null, 2));
   *  Invalid case - Private constructor
   *    const environment = new Environment("INVALID!", -1, "Invalid!"));
   *  Invalid case - Readonly property
   *    Environment.DEVELOPMENT = Environment.UAT;
   *      OR
   *    Environment.DEVELOPMENT.description = "Completed!";
   *  Invalid case - Runtime error
   *    const badEnvironment = Environment.fromString("non-existant!");
   */
}
