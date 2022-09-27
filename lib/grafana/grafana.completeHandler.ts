// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Grafana } from 'aws-sdk';
import { CdkCustomResourceIsCompleteHandler } from 'aws-lambda';

const grafana = new Grafana();

export const handler: CdkCustomResourceIsCompleteHandler = async (event) => {
  console.log(`Event: ${JSON.stringify(event, null, 2)}`);
  const workspaceId = event.PhysicalResourceId!;
  const { workspace } = await grafana.describeWorkspace({ workspaceId }).promise();

  const Data = { id: workspace.id, endpoint: workspace.endpoint };

  const IsComplete = event.RequestType === 'Delete' ? workspace.status === 'DELETING' : workspace.status === 'ACTIVE';

  return IsComplete ? { IsComplete, Data } : { IsComplete };
};
