// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CdkCustomResourceHandler, CloudFormationCustomResourceUpdateEvent, CloudFormationCustomResourceDeleteEvent } from 'aws-lambda';
import axios from 'axios';

export const handler: CdkCustomResourceHandler = async (event) => {
  console.log(JSON.stringify(event));
  const { RequestType, ResourceProperties } = event;
  const { endpoint, apiKey } = ResourceProperties;
  const url = 'https://' + endpoint;
  const configs = { headers: { Authorization: 'Bearer ' + apiKey } };
  const payload = JSON.parse(ResourceProperties.payload);

  switch (RequestType) {
    case 'Create': {
      const { data } = await axios.post(url + '/api/dashboards/db', payload, configs);
      return { PhysicalResourceId: data.uid, Data: { url: data.url } };
    }
    case 'Update': {
      const { PhysicalResourceId } = event as CloudFormationCustomResourceUpdateEvent;
      await axios.delete(url + '/api/dashboards/uid/' + PhysicalResourceId, configs);
      const { data } = await axios.post(url + '/api/dashboards/db', payload, configs);
      return { PhysicalResourceId: data.uid, Data: { url: data.url } };
    }
    case 'Delete': {
      const { PhysicalResourceId } = event as CloudFormationCustomResourceDeleteEvent;
      axios.delete(url + '/api/dashboards/uid/' + PhysicalResourceId, configs).catch(() => { });
      return {};
    }
    default:
      throw new Error('Invalid Request Type');
  }
};
