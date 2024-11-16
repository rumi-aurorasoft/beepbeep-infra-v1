import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Stack, StackProps} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ADMIN_BACKEND_URL, CP_BACKEND_URL, STACK_PREFIX, StageProps } from './_constants';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

export interface VpcStackProps extends StackProps {
  stageName: 'Beta' | 'Prod' | string;
  region: string;
  account: string;
}

export class DnsStack extends Stack {
  public readonly hostedZone: HostedZone;

  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);

    /** Create a hosted zone for the subdomain app.beepbeep.sg */
    this.hostedZone = new HostedZone(this, `${props?.stageName}-${STACK_PREFIX}-HostedZone`, {
      zoneName: ADMIN_BACKEND_URL['Prod'],
      comment: 'Hosted zone for the subdomain app.beepbeep.sg'
    })
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
