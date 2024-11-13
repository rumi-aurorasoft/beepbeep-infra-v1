#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { BEEPBEEP_ACCOUNT_NUMBER, BEEPBEEP_REGION } from '../lib/_constants';

const app = new cdk.App();
new PipelineStack(app, 'Beepbeep-Infra-V1', {
  env: {
    account: BEEPBEEP_ACCOUNT_NUMBER,
    region: BEEPBEEP_REGION
  }
})