// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { CustomResource } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import { TwinMakerDataSource } from './datasources/twinmaker/twinmaker-datasource';
import { GeneralDashboard } from './dashboards/general/general-dashboard';

type GrafanaProps = {
  twinmakerId: string;
  watertankName: string;
};

export class Grafana extends Construct {
  public readonly dashboardUrl: string;

  constructor(scope: Construct, id: string, props: GrafanaProps) {
    super(scope, id);
    const { twinmakerId, watertankName } = props;

    const grafanaRole = new iam.Role(this, 'GrafanaRole', { assumedBy: new iam.ServicePrincipal('grafana.amazonaws.com') });

    const { endpoint, apiKey } = this.createWorkspace(grafanaRole);

    const datasource = new TwinMakerDataSource(this, 'TwinMakerDS', { twinmakerId, endpoint, apiKey });
    datasource.role.grantAssumeRole(grafanaRole);
    datasource.role.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        principals: [new iam.ArnPrincipal(grafanaRole.roleArn)],
      }),
    );

    const dashboard = new GeneralDashboard(this, 'GeneralDashboard', { watertankName, endpoint, apiKey, datasourceId: datasource.id });
    this.dashboardUrl = 'https://' + endpoint + dashboard.url;
  }

  createWorkspace(grafanaRole: iam.Role) {
    const lambdaRole = new iam.Role(this, 'lambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSGrafanaAccountAdministrator'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSSSOReadOnly')
      ],
    });
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sso:*'],
        resources: ['*'],
      }),
    );

    const workspace = new CustomResource(this, 'WorkspaceCr', {
      serviceToken: new cr.Provider(this, 'WorkspaceProvider', {
        onEventHandler: new lambdaNode.NodejsFunction(this, 'handler', { role: lambdaRole }),
        isCompleteHandler: new lambdaNode.NodejsFunction(this, 'completeHandler', { role: lambdaRole }),
      }).serviceToken,
      properties: { roleArn: grafanaRole.roleArn },
    });

    const workspaceId = workspace.getAttString('id');
    const endpoint = workspace.getAttString('endpoint');

    const apiKeyCr = new cr.AwsCustomResource(this, 'ApiKeyCr', {
      onUpdate: {
        service: 'Grafana',
        action: 'createWorkspaceApiKey',
        parameters: {
          workspaceId,
          keyName: 'key-' + Date.now(),
          keyRole: 'ADMIN',
          secondsToLive: 60 * 60,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    const apiKey = apiKeyCr.getResponseField('key');

    return { endpoint, apiKey };
  }
}
