import { Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  UserData,
  Port,
  Instance,
  SecurityGroup,
  BlockDeviceVolume,
  EbsDeviceVolumeType,
  Peer,
  CfnEIP,
  SubnetType,
  Vpc
} from 'aws-cdk-lib/aws-ec2';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ADMIN_BACKEND_URL, REMOVAL_POLICY, STACK_PREFIX, RemovalPolicyStageProps, CP_BACKEND_URL, StageProps } from './_constants';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';


export interface CloudPanelStackProps extends StackProps {
  stageName: 'Beta' | 'Prod' | string;
  region: string;
  account: string;
  vpc: Vpc;
  connectEndpointSG: SecurityGroup
  hostedZone: HostedZone
}

export class CloudPanelStack extends Stack {

  constructor(scope: Construct, id: string, props?: CloudPanelStackProps) {
    super(scope, id, props);

    /** Create install script for the cloud panel instance */
    const installScript = UserData.forLinux();
    installScript.addCommands(
      'set -e',  // Exit immediately if a command exits with a non-zero status
      'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
      'sudo su',  // Send output to console and log file
      'apt update && apt -y upgrade && apt -y install curl wget sudo ssl-cert awscli',
    )
    /** */

    /** Create a security group for the cloud panel instance */
    const cloudPanelSG = new SecurityGroup(this, `${props?.stageName}-${STACK_PREFIX}-CloudPanel-SG`, {
      vpc: props?.vpc!,
      allowAllOutbound: true
    })
    /** */

    /** Create a static EC2 instance using c4 family and provisioned EBS storage */
    const cloudPanelInstance = new Instance(this, `${props?.stageName}-${STACK_PREFIX}-CloudPanel-Instance`, {
      vpc: props?.vpc!,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC
      },
      instanceType: InstanceType.of(InstanceClass.C4, InstanceSize.LARGE),
      machineImage: MachineImage.genericLinux({
        'ap-southeast-1': 'ami-06cf564c53d4b7dc4'
      }),
      userData: installScript,
      securityGroup: cloudPanelSG,
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: BlockDeviceVolume.ebs(30, { 
            encrypted: true,
            volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
            deleteOnTermination: true
          })
        },
        {
          deviceName: '/dev/sdf', // This is an additional EBS volume
          volume: BlockDeviceVolume.ebs(50, { 
            volumeType: EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: true
          })
        }
      ]
    })
    /** */

    /** Add ingress rules to the cloudPanelInstance security group */
    // Allow SSH traffic port 22 for allowed IP
    cloudPanelSG.addIngressRule(
      props?.connectEndpointSG!,
      Port.tcp(22),
      'Allow SSH for allowed IP'
    )
    // Allow HTTPS traffic port 443 for everyone
    cloudPanelSG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      'Allow HTTPS for everyone'
    )
    // Allow Cloud Panel port 8443 for allowed IP
    cloudPanelSG.addIngressRule(
      Peer.ipv4('103.175.213.143/32'),
      Port.tcp(8443),
      'Allow Cloud Panel for Rama IP'
    )

    cloudPanelSG.addIngressRule(
      Peer.ipv4('106.185.151.182/32'),
      Port.tcp(8443),
      'Allow Cloud Panel for Rumi IP'
    )
    // Allow HTTP traffic port 80 for everyone
    cloudPanelSG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow HTTP for everyone'
    )
    // Allow UDP traffic for everyone
    cloudPanelSG.addIngressRule(
      Peer.anyIpv4(),
      Port.udp(443),
      'Allow UDP for everyone'
    )
    /** */

    /** Create an elastic IP address and associate with the EC2 instance */
   const publicIp = new CfnEIP(this, `${props?.stageName}-${STACK_PREFIX}-CloudPanel-EIP-${props?.stageName}`, {
      domain: 'vpc',
      instanceId: cloudPanelInstance.instanceId
    })
    /** */

    /** Create an S3 Bucket to hold all the objects required for the app */
    const storageS3 = new Bucket(this, `${props?.stageName}-${STACK_PREFIX}-Beepbeep-Objects`, {
      bucketName: `${props?.stageName.toLowerCase()}-${STACK_PREFIX.toLowerCase()}-beepbeep-objects`,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: REMOVAL_POLICY[props?.stageName as keyof RemovalPolicyStageProps],
    })
    /** */

    /** Add a policy to the role to allow access to the S3 bucket */
    cloudPanelInstance.role.addToPrincipalPolicy(new PolicyStatement({
      actions: [
        's3:PutObject',
        's3:ListBucket',
        's3:ListAllMyBuckets',
        's3:GetBucketLocation',
        's3:PutObjectAcl',
        's3:PutObjectTagging',
        's3:ListBucketV2'
      ],
      resources: [storageS3.bucketArn, `${storageS3.bucketArn}/*`],
    }))
    /** */

    /** Create an A record for the cloudpanel domain and point it to the eip of the cloudpanel instance */
    new ARecord(this, `${props?.stageName}-${STACK_PREFIX}-CloudPanel-Domain`, {
      zone: props?.hostedZone!,
      target: RecordTarget.fromIpAddresses(publicIp.attrPublicIp),
      recordName: CP_BACKEND_URL[props?.stageName as keyof StageProps]
    })
    /** */

    /** Create an A record for the actual admin page */
    new ARecord(this, `${props?.stageName}-${STACK_PREFIX}-Admin-Domain`, {
      zone: props?.hostedZone!,
      target: RecordTarget.fromIpAddresses(publicIp.attrPublicIp),
      recordName: ADMIN_BACKEND_URL[props?.stageName as keyof StageProps]
    })
    /** */
  }
}
