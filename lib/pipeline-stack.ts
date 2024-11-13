import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendStack } from './_stages';
import { BEEPBEEP_ACCOUNT_NUMBER, BEEPBEEP_REGION } from './_constants';


export class PipelineStack extends Stack {
  public readonly pipeline: CodePipeline;

  constructor(scope: Construct, id: string, props: StackProps) {
    
    super(scope, id, props);


    /** Bucket holding artifact of the pipeline */
    const artifactBucket = new Bucket(this, 'Pipeline-BackendArtifactBucket', {
      bucketName: 'beepbeep-pipeline-v1-bucket',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })
    /** */

    /** Get token from secrets manager */
    const token = SecretValue.secretsManager('github-token')
    /** */

    /** Pipeline initialization */
    this.pipeline = new CodePipeline(this, 'Pipeline-BeepbeepInfra-V1', {
      pipelineName: 'beepbeep-pipeline-v1',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('rumi-aurorasoft/beepbeep-infra-v1', 'main', {
          authentication: token
        }),
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      }),
      artifactBucket: artifactBucket,
    })
    /** */

    /** Pipeline stages definitions */
    this.pipeline.addStage(new BackendStack(this, 'Beepbeep-Infra-V1-Beta', {
      stageName: 'Beta',
      region: BEEPBEEP_REGION,
      account: BEEPBEEP_ACCOUNT_NUMBER
    }));

    this.pipeline.addStage(new BackendStack(this, 'Beepbeep-Infra-V1-Prod', {
      stageName: 'Prod',
      region: BEEPBEEP_REGION,
      account: BEEPBEEP_ACCOUNT_NUMBER
    }));
    /** */
  }
}