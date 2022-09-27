// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { createHash } from 'crypto';
import { SSM } from 'aws-sdk';
import { CdkCustomResourceHandler } from 'aws-lambda';

const ssm = new SSM();

export const handler: CdkCustomResourceHandler = async (event) => {
  let version = '0.0.1';
  const { name, content, assetHash } = event.ResourceProperties;

  if (event.RequestType === 'Delete') {
    await ssm.deleteParameter({ Name: name }).promise();
    return {};
  }

  const hash = createHash('sha256').update(JSON.stringify({ content, assetHash })).digest('hex');

  try {
    const result = await ssm.getParameter({ Name: name }).promise();
    const [currentVersion, currentHash] = result.Parameter?.Value?.split(',')!;
    const semVer = currentVersion.split('.').map(Number);
    if (hash !== currentHash) semVer[2]++;
    version = semVer.join('.');
  } catch (err) {}

  await ssm.putParameter({ Name: name, Value: [version, hash].join(','), Type: 'StringList', Overwrite: true }).promise();

  return { Data: { version } };
};
