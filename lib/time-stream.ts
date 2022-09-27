// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';

export class TimeStream extends Construct {
  table: timestream.CfnTable;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const databaseName = 'WaterTank';
    const tableName = 'Telemetry';
    const database = new timestream.CfnDatabase(this, 'Database', { databaseName });
    const table = new timestream.CfnTable(this, 'Table', { databaseName, tableName });
    table.node.addDependency(database);

    const timeStreamAccessRole = new iam.Role(this, 'topicIotTimeStreamRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonTimestreamFullAccess')],
    });

    const telemetryTopicRule = new iot.CfnTopicRule(this, 'TelemetryTopicRule', {
      topicRulePayload: {
        sql: `SELECT * FROM '+/state/telemetry'`,
        actions: [
          {
            timestream: {
              databaseName,
              tableName,
              dimensions: [
                {
                  name: 'TelemetryAssetType',
                  value: 'Telemetry',
                },
                {
                  name: 'TelemetryAssetId',
                  value: '${topic(1)}',
                },
              ],
              timestamp: {
                unit: 'MILLISECONDS',
                value: '${timestamp()}',
              },
              roleArn: timeStreamAccessRole.roleArn,
            },
          },
        ],
      },
    });
    telemetryTopicRule.node.addDependency(database);
    telemetryTopicRule.node.addDependency(table);

    const alarmTopicRule = new iot.CfnTopicRule(this, 'AlarmTopicRule', {
      topicRulePayload: {
        sql: `SELECT CASE leak WHEN 1 THEN 'LEAK' WHEN 2 THEN 'RUN' WHEN 3 THEN 'IDLE' ELSE 'N/A' END as alarm_status FROM '+/state/alarm'`,
        actions: [
          {
            timestream: {
              databaseName,
              tableName,
              dimensions: [
                {
                  name: 'TelemetryAssetType',
                  value: 'Alarm',
                },
                {
                  name: 'TelemetryAssetId',
                  value: '${topic(1)}',
                },
              ],
              timestamp: {
                unit: 'MILLISECONDS',
                value: '${timestamp()}',
              },
              roleArn: timeStreamAccessRole.roleArn,
            },
          },
        ],
      },
    });
    alarmTopicRule.node.addDependency(database);
    alarmTopicRule.node.addDependency(table);

    this.table = table;
  }
}
