// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { readFileSync } from 'fs';
import { Construct } from 'constructs';
import * as twinmaker from 'aws-cdk-lib/aws-iottwinmaker';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

type ScenesProps = {
  workspace: twinmaker.CfnWorkspace;
  bucket: s3.Bucket;
  dashboardUrl: string;
  watertankName: string;
};

export class Scenes extends Construct {
  constructor(scope: Construct, id: string, props: ScenesProps) {
    super(scope, id);
    const { workspace, bucket, dashboardUrl, watertankName } = props;

    new twinmaker.CfnScene(this, 'ProtLab', {
      workspaceId: workspace.workspaceId,
      contentLocation: bucket.s3UrlForObject('PrototypingLabs.json'),
      sceneId: 'PrototypingLabs',
    });

    new twinmaker.CfnScene(this, 'WaterTankDetailed', {
      workspaceId: workspace.workspaceId,
      contentLocation: bucket.s3UrlForObject('WaterTankDetailed.json'),
      sceneId: 'WaterTankDetailed',
    });

    new twinmaker.CfnScene(this, 'CalgaryCookieFactory', {
      workspaceId: workspace.workspaceId,
      contentLocation: bucket.s3UrlForObject('CookieFactory_Calgary.json'),
      sceneId: 'Calgary_CookieFactory',
    });

    new twinmaker.CfnScene(this, 'CalgaryWaterTankDetailed', {
      workspaceId: workspace.workspaceId,
      contentLocation: bucket.s3UrlForObject('WaterTankDetailed_Calgary.json'),
      sceneId: 'Calgary_WaterTankDetailed',
    });

    const prototypingLabs = readFileSync('lib/twin-maker/data/scenes/PrototypingLabs.json')
      .toString()
      .replace(/\${bucket}/g, bucket.s3UrlForObject())
      .replace(/\${dashboardUrl}/g, dashboardUrl)
      .replace(/\${sel_entity}/g, watertankName);
    const waterTankDetailed = readFileSync('lib/twin-maker/data/scenes/WaterTankDetailed.json')
      .toString()
      .replace(/\${bucket}/g, bucket.s3UrlForObject())
      .replace(/\${sel_entity}/g, watertankName);
    const cookieFactoryCalgary = readFileSync('lib/twin-maker/data/scenes/CookieFactory_Calgary.json')
      .toString()
      .replace(/\${bucket}/g, bucket.s3UrlForObject());
    const waterTankDetailedCalgary = readFileSync('lib/twin-maker/data/scenes/WaterTankDetailed_Calgary.json')
      .toString()
      .replace(/\${bucket}/g, bucket.s3UrlForObject());

    new s3deploy.BucketDeployment(this, 'UploadResources', {
      sources: [
        s3deploy.Source.data('PrototypingLabs.json', prototypingLabs),
        s3deploy.Source.data('WaterTankDetailed.json', waterTankDetailed),
        s3deploy.Source.data('CookieFactory_Calgary.json', cookieFactoryCalgary),
        s3deploy.Source.data('WaterTankDetailed_Calgary.json', waterTankDetailedCalgary),
        s3deploy.Source.asset('lib/twin-maker/data/models'),
      ],
      destinationBucket: bucket,
      retainOnDelete: false,
    });
  }
}
