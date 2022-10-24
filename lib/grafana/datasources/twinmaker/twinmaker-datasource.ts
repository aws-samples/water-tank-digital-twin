// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Stack, CustomResource } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import generateDatasourcePayload from './generateDatasourcePayload';

type TwinMakerDataSourceProps = {
  twinmakerId: string;
  endpoint: string;
  apiKey: string;
};

export class TwinMakerDataSource extends Construct {
  public readonly id: string;
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: TwinMakerDataSourceProps) {
    super(scope, id);
    const region = Stack.of(this).region;
    const { twinmakerId, endpoint, apiKey } = props;

    this.role = new iam.Role(this, 'DataSourceRole', {
      assumedBy: new iam.ServicePrincipal('grafana.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonKinesisVideoStreamsFullAccess'),
      ],
    });
    this.role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iottwinmaker:*'],
        resources: ['*'],
      })
    );

    const datasourceProvider = new cr.Provider(this, 'DataSourceProvider', {
      onEventHandler: new lambdaNode.NodejsFunction(this, 'handler'),
    });

    const payload = generateDatasourcePayload({ roleArn: this.role.roleArn, region, twinmakerId });

    const datasourceCr = new CustomResource(this, 'DataSourceCr', {
      serviceToken: datasourceProvider.serviceToken,
      properties: {
        endpoint,
        apiKey,
        payload: JSON.stringify(payload),
      },
    });
    this.id = datasourceCr.getAttString('id');
  }
}
