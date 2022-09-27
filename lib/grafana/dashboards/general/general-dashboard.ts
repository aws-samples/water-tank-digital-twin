// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { CustomResource } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import generateDashboardPayload from './generateDashboardPayload';

type GeneralDashboardProps = {
  datasourceId: string;
  endpoint: string;
  apiKey: string;
  watertankName: string;
};

export class GeneralDashboard extends Construct {
  public readonly id: string;
  public readonly url: string;

  constructor(scope: Construct, id: string, props: GeneralDashboardProps) {
    super(scope, id);
    const { endpoint, apiKey, datasourceId, watertankName } = props;

    const dashboardProvider = new cr.Provider(this, 'DashboardProvider', {
      onEventHandler: new lambdaNode.NodejsFunction(this, 'handler'),
    });

    const payload = generateDashboardPayload({ datasourceId, watertankName });

    const dashboardCr = new CustomResource(this, 'DashboardCr', {
      serviceToken: dashboardProvider.serviceToken,
      properties: {
        endpoint,
        apiKey,
        payload: JSON.stringify(payload),
      },
    });
    this.url = dashboardCr.getAttString('url');
  }
}
