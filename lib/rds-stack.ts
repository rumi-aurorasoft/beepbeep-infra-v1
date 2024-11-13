import { Duration, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  Port,
  SecurityGroup,
  Peer,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AuroraCapacityUnit, AuroraMysqlEngineVersion, Credentials, DatabaseClusterEngine } from 'aws-cdk-lib/aws-rds';
import { ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { STACK_PREFIX, AUTOPAUSE_DURATION, DurationStageProps } from './_constants';


export interface DatabaseStackProps extends StackProps {
  stageName: string;
  region: string;
  account: string;
  vpc: Vpc;
}

export class DatabaseStack extends Stack {
  constructor(scope: Construct, id: string, props?: DatabaseStackProps) {
    super(scope, id, props);

    /** Create a security group for RDS */
    const dbSecurityGroup = new SecurityGroup(this, `${props?.stageName}-${STACK_PREFIX}-DB-SG`, {
      vpc: props?.vpc!,
      allowAllOutbound: true,
      description: 'Security group for RDS'
    })
    /** */

    /** Allow inbound traffic to RDS security group in between the subnets */
    dbSecurityGroup.addIngressRule(
      Peer.ipv4(props?.vpc.vpcCidrBlock!),
      Port.tcp(3306),
      'Allow inbound traffic to RDS'
    )
    /** */

    /** Create a secrets manager to store the db credentials */
    const dbCredentials = new Secret(this, `${props?.stageName}-${STACK_PREFIX}-DB-Credentials`, {
      secretName: `${props?.stageName.toLowerCase()}-${STACK_PREFIX.toLowerCase()}-db-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'admin'
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    })
    /** */

    /** Create a DB Cluster */
    const dbCluster = new ServerlessCluster(this, `${props?.stageName}-${STACK_PREFIX}-DB-Cluster`, {
      engine: DatabaseClusterEngine.auroraMysql({version: AuroraMysqlEngineVersion.VER_3_07_0}),
      clusterIdentifier: `${props?.stageName.toLowerCase()}-${STACK_PREFIX.toLowerCase()}-db-cluster`,
      defaultDatabaseName: `app`,
      credentials: Credentials.fromSecret(dbCredentials),
      vpc: props?.vpc!,
      securityGroups: [dbSecurityGroup],
      scaling: {
        autoPause: AUTOPAUSE_DURATION[props?.stageName as keyof DurationStageProps],
        minCapacity: AuroraCapacityUnit.ACU_1,
        maxCapacity: AuroraCapacityUnit.ACU_2
      },
    })
    /** */
  }
}
