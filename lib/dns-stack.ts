import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { CfnOutput, Fn, Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ADMIN_BACKEND_URL, CP_BACKEND_URL, STACK_PREFIX, StageProps } from './_constants';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

export interface VpcStackProps extends StackProps {
  stageName: 'Beta' | 'Prod' | string;
  region: string;
  account: string;
  isHostedZoneStack: boolean;
}

export class DnsStack extends Stack {
  public readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);

    /** Create a hosted zone for the subdomain app.beepbeep.sg */
    if (props?.isHostedZoneStack) {
      this.hostedZone = new HostedZone(this, `${props?.stageName}-${STACK_PREFIX}-HostedZone`, {
        zoneName: ADMIN_BACKEND_URL['Prod'],
        comment: 'Hosted zone for the subdomain app.beepbeep.sg'
      });
      new CfnOutput(this, 'HostedZoneId', {
        value: this.hostedZone.hostedZoneId,
        exportName: 'MainHostedZoneId'
      });
    } else {
      this.hostedZone = HostedZone.fromHostedZoneAttributes(this, `${props?.stageName}-${STACK_PREFIX}-ImportedZone`, {
        zoneName: ADMIN_BACKEND_URL['Prod'],
        hostedZoneId: Fn.importValue('MainHostedZoneId')
      });
    }
    /** */

    /** Create one ACM for the subdomains app.beepbeep.sg, beta.app.beepbeep.sg, beta-cloudpanel.app.beepbeep.sg and cloudpanel.app.beepbeep.sg */
    new Certificate(this, `${props?.stageName}-${STACK_PREFIX}-App-Certificate`, {
      domainName: ADMIN_BACKEND_URL[props?.stageName as keyof StageProps],
      validation: CertificateValidation.fromDns(this.hostedZone),
    })

    new Certificate(this, `${props?.stageName}-${STACK_PREFIX}-CloudPanel-Certificate`, {
      domainName: CP_BACKEND_URL[props?.stageName as keyof StageProps],
      validation: CertificateValidation.fromDns(this.hostedZone)
    })
    /** */
  }
}
