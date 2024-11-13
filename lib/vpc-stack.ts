import { Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, SubnetType, SecurityGroup, CfnInstanceConnectEndpoint } from 'aws-cdk-lib/aws-ec2';
import { STACK_PREFIX } from './_constants';

export interface VpcStackProps extends StackProps {
  stageName: 'Beta' | 'Prod' | string;
  region: string;
  account: string;
}

export class VpcStack extends Stack {
  public readonly vpc: Vpc;
  public readonly connectEndpointSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);

    /** Create a VPC for the app server */
    this.vpc = new Vpc(this, `${props?.stageName}-${STACK_PREFIX}-VPC`, {
      cidr: '192.168.1.0/24',
      natGateways: 1,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 28,
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });
    /** */

    /** Create an EC2 Connect Endpoint to ssh to the instances */
    this.connectEndpointSecurityGroup = new SecurityGroup(this, `${props?.stageName}-${STACK_PREFIX}-ConnectEndpointSecurityGroup`, {
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    new CfnInstanceConnectEndpoint(this, `${props?.stageName}-${STACK_PREFIX}-EC2ConnectEndpoint`, {
      subnetId: this.vpc.selectSubnets({ subnetGroupName: 'private' }).subnetIds[0],
      securityGroupIds: [this.connectEndpointSecurityGroup.securityGroupId],
    })
    /** */
  }
}
