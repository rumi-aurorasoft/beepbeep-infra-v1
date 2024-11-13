import { Duration, RemovalPolicy } from "aws-cdk-lib"

export const BEEPBEEP_ACCOUNT_NUMBER = "767398097517"
export const BEEPBEEP_REGION = "ap-southeast-1"
export const STACK_PREFIX = "V1-BeepBeep-Infra"

export interface StageProps {
  'Beta': string 
  'Prod': string
}

export interface RemovalPolicyStageProps {
  'Beta': RemovalPolicy
  'Prod': RemovalPolicy
}

type StageNames = 'Beta' | 'Prod'

export interface DurationStageProps {
  'Beta': Duration
  'Prod': Duration
}

export const ADMIN_BACKEND_URL: StageProps = {
  'Beta': 'beta.app.beepbeep.sg',
  'Prod': 'app.beepbeep.sg'
}
// CP For CloudPanel
export const CP_BACKEND_URL: StageProps = {
  'Beta': 'beta-cloudpanel.app.beepbeep.sg',
  'Prod': 'cloudpanel.app.beepbeep.sg'
}

export const REMOVAL_POLICY: RemovalPolicyStageProps = {
  'Beta': RemovalPolicy.DESTROY,
  'Prod': RemovalPolicy.RETAIN
}

export const AUTOPAUSE_DURATION: DurationStageProps = {
  'Beta': Duration.minutes(10),
  'Prod': Duration.minutes(120)
}