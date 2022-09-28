// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Stack, StackProps, Stage, StageProps } from 'aws-cdk-lib';
import { WaterTankDemoStack } from '../lib/water-tank-demo-stack';
import * as pipelines from 'aws-cdk-lib/pipelines';

export class CicdStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { name, branch, connectionArn } = this.node.tryGetContext('repo');

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      synth: new pipelines.ShellStep('SynthStep', {
        input: pipelines.CodePipelineSource.connection(name, branch, { connectionArn }),
        commands: ['npm ci', 'npm run build', 'npm run cdk synth'],
      }),
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
    });
    const devStage = new WorkshopPipelineStage(this, 'Dev');
    const deployStage = pipeline.addStage(deploy);
  }
}

export class WorkshopPipelineStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    const virtual = this.node.tryGetContext('virtual');
    const watertankName = this.node.tryGetContext('watertankName');

    new WaterTankDemoStack(this, 'WaterTankStack' + (virtual ? 'Virtual' : ''), { watertankName, virtual });
  }
}
