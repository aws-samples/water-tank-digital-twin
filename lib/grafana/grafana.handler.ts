// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Grafana } from 'aws-sdk';
import { CdkCustomResourceHandler } from 'aws-lambda';

const grafana = new Grafana();

export const handler: CdkCustomResourceHandler = async (event) => {
  switch (event.RequestType) {
    case 'Create': {
      const { workspace } = await grafana
        .createWorkspace({
          accountAccessType: 'CURRENT_ACCOUNT',
          authenticationProviders: ['AWS_SSO'],
          permissionType: 'SERVICE_MANAGED',
          workspaceDataSources: ['TIMESTREAM'],
          workspaceRoleArn: event.ResourceProperties.roleArn,
        })
        .promise();
      return { PhysicalResourceId: workspace.id };
    }
    case 'Update': {
      const workspaceId = event.PhysicalResourceId;
      await grafana.updateWorkspace({ workspaceId }).promise();
      return {};
    }
    case 'Delete': {
      const workspaceId = event.PhysicalResourceId;
      await grafana.deleteWorkspace({ workspaceId }).promise();
      return {};
    }
    default:
      throw new Error('Invalid Request Type');
  }
};
