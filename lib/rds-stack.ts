import { Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  Port,
  SecurityGroup,
  Peer,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AuroraCapacityUnit, AuroraMysqlEngineVersion, ClusterInstance, Credentials, DatabaseCluster, DatabaseClusterEngine, ParameterGroup } from 'aws-cdk-lib/aws-rds';
import { STACK_PREFIX, REMOVAL_POLICY, RemovalPolicyStageProps } from './_constants';


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

    const parameterGroup = new ParameterGroup(this, `${props?.stageName}-${STACK_PREFIX}-DB-ParameterGroup`, {
      engine: DatabaseClusterEngine.auroraMysql({
        version: AuroraMysqlEngineVersion.VER_3_06_0
      }),
      description: 'Parameter group for RDS',
      parameters: {
        'max_connections': '1000',
        'character_set_server': 'utf8mb4',
        'collation_server': 'utf8mb4_unicode_ci'
      }
    })

    const dbCluster = new DatabaseCluster(this, `${props?.stageName}-${STACK_PREFIX}-DB-Cluster`, {
      engine: DatabaseClusterEngine.auroraMysql({version: AuroraMysqlEngineVersion.VER_3_06_0}),
      clusterIdentifier: `${props?.stageName.toLowerCase()}-${STACK_PREFIX.toLowerCase()}-db-cluster`,
      defaultDatabaseName: `app`,
      credentials: Credentials.fromSecret(dbCredentials),
      vpc: props?.vpc!,
      securityGroups: [dbSecurityGroup],
      writer: ClusterInstance.serverlessV2('write-endpoint'),
      readers: [
        ClusterInstance.serverlessV2('read-endpoint-1', {scaleWithWriter: true}),
        ClusterInstance.serverlessV2('read-endpoint-2', {scaleWithWriter: true})
      ],
      serverlessV2MaxCapacity: AuroraCapacityUnit.ACU_2,
      serverlessV2MinCapacity: AuroraCapacityUnit.ACU_1,
      parameterGroup: parameterGroup,
      removalPolicy: REMOVAL_POLICY[props?.stageName as keyof RemovalPolicyStageProps],
    })
    /** */

    /** Create a connection to a compute resource to the dbCluster */
    dbCluster.connections.allowDefaultPortFrom(
      Peer.ipv4(props?.vpc.vpcCidrBlock!)
    )
    /** */
  }
}
