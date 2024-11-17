import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcStack } from './vpc-stack';
import { DatabaseStack } from './rds-stack';
import { CloudPanelStack } from './cp-stack';
import { DnsStack } from './dns-stack';

interface BackendStackProps extends StageProps {
  account: string;
  region: string;
  stageName: string;
}

// Define a new application stage
export class BackendStack extends Stage {

  constructor(scope: Construct, id: string, props?: BackendStackProps) {
    super(scope, id, props);

    /** Initiation of stacks per stage */
    if (props) {

      const dnsStack = new DnsStack(this, 'DnsStack', {
        stageName: props.stageName,
        region: props.region,
        account: props.account,
        isHostedZoneStack: props.stageName === 'Beta'
      })

      const vpcStack = new VpcStack(this, 'VpcStack', {
        stageName: props.stageName,
        region: props.region,
        account: props.account
      });

      const cloudPanelStack = new CloudPanelStack(this, 'CloudPanelStack', {
        stageName: props.stageName,
        region: props.region,
        account: props.account,
        vpc: vpcStack.vpc,
        connectEndpointSG: vpcStack.connectEndpointSecurityGroup,
        hostedZone: dnsStack.hostedZone
      })

      const databaseStack = new DatabaseStack(this, 'DatabaseStack', {
        stageName: props.stageName,
        region: props.region,
        account: props.account,
        vpc: vpcStack.vpc
      })

      /** Adding dependency on vpcStack and dnsStack */
      cloudPanelStack.addDependency(vpcStack);
      databaseStack.addDependency(vpcStack);
      cloudPanelStack.addDependency(dnsStack);
    }
  }
}