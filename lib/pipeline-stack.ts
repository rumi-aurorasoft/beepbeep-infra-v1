import { SecretValue, Stack, StackProps, Stage } from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, FileSet, ShellStep } from 'aws-cdk-lib/pipelines';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendStack } from './_stages';
import { BEEPBEEP_ACCOUNT_NUMBER, BEEPBEEP_REGION } from './_constants';
import { ServerApplication, ServerDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy';
import { CloudFormationCreateUpdateStackAction, CodeDeployServerDeployAction } from 'aws-cdk-lib/aws-codepipeline-actions';


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

    /** Create a CodeDeploy application and deployment group */
    const application = new ServerApplication(this, 'Application-BeepbeepApp-V1', {
      applicationName: 'beepbeep-app-v1'
    })

    const deploymentGroup = new ServerDeploymentGroup(this, 'DeploymentGroup-BeepbeepApp-V1', {
      application: application,
      deploymentGroupName: 'beepbeep-app-deployment-group-v1',
      installAgent: true,
      autoRollback: {
        failedDeployment: true,
        stoppedDeployment: true
      },
    })
    /** */

    /** Define the infrastructure source */
    const infraSource = CodePipelineSource.gitHub(
      'rumi-aurorasoft/beepbeep-infra-v1', 'main', {
        authentication: token
      }
    )
    /** */

    /** Define the application source */
    const applicationSource = CodePipelineSource.gitHub(
      'rumi-aurorasoft/beepbeep-app-v1', 'main', {
        authentication: token
      }
    )
    /** */

    /** Create a build step for your application */
    const buildStep = new ShellStep('Build-BeepbeepApp-V1', {
      input: applicationSource,
      commands: ['npm ci', 'npm run build', 'npm run cdk synth'],
      primaryOutputDirectory: 'app'
    })
    /** */

    /** Pipeline initialization */
    this.pipeline = new CodePipeline(this, 'Pipeline-BeepbeepInfra-V1', {
      pipelineName: 'beepbeep-pipeline-v1',
      synth: new ShellStep('Synth', {
        input: infraSource,
        additionalInputs: {
          'app': applicationSource
        },
        commands: ['npm ci', 'npm run build', 'npx cdk synth']
      }),
      artifactBucket: artifactBucket,
    })
    /** */

    /** Pipeline stages definitions */
    this.pipeline.addStage(new BackendStack(this, 'Beepbeep-Infra-V1-Beta', {
      stageName: 'Beta',
      region: BEEPBEEP_REGION,
      account: BEEPBEEP_ACCOUNT_NUMBER,
    }), {
      pre: [buildStep]
    });

    this.pipeline.addStage(new BackendStack(this, 'Beepbeep-Infra-V1-Prod', {
      stageName: 'Prod',
      region: BEEPBEEP_REGION,
      account: BEEPBEEP_ACCOUNT_NUMBER
    }), {
      pre: [buildStep]
    });
    /** */
  }
}