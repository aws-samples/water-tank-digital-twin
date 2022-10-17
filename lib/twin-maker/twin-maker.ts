// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Names, RemovalPolicy } from 'aws-cdk-lib';
import * as twinmaker from 'aws-cdk-lib/aws-iottwinmaker';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Components } from './components';
import { Entities } from './entities';
import { Scenes } from './scenes';

type TwinMakerProps = {
  timestreamReaderArn: string;
  watertankName: string;
};

export class TwinMaker extends Construct {
  workspace: twinmaker.CfnWorkspace;
  bucket: s3.Bucket;
  props: TwinMakerProps;

  constructor(scope: Construct, id: string, props: TwinMakerProps) {
    super(scope, id);
    this.props = props;
    const { timestreamReaderArn, watertankName } = props;

    this.bucket = new s3.Bucket(this, 'TwinmakerBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.HEAD, s3.HttpMethods.DELETE],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    const role = new iam.Role(this, 'TwinmakerRole', {
      assumedBy: new iam.ServicePrincipal('iottwinmaker.amazonaws.com'),
    });
    this.bucket.grantReadWrite(role);
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [timestreamReaderArn],
      })
    );

    const workspace = new twinmaker.CfnWorkspace(this, 'Workspace', {
      role: role.roleArn,
      s3Location: this.bucket.bucketArn,
      workspaceId: Names.uniqueId(this) + '-watertank',
    });
    workspace.node.addDependency(this.bucket);
    workspace.node.addDependency(role);

    const components = new Components(this, 'Components', { workspace, timestreamReaderArn });
    const entities = new Entities(this, 'Entities', { workspace, watertankName });
    entities.node.addDependency(components);

    this.workspace = workspace;
  }

  createScenes(dashboardUrl: string) {
    const workspace = this.workspace;
    const bucket = this.bucket;
    const scenes = new Scenes(this, 'Scenes', { workspace, bucket, dashboardUrl, watertankName: this.props.watertankName });
    scenes.node.addDependency(workspace);
  }
}
