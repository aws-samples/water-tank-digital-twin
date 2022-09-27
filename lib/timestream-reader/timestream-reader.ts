// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { PythonFunction, PythonLayerVersion } from '@aws-cdk/aws-lambda-python-alpha';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

type TimeStreamReaderProps = {
  table: timestream.CfnTable;
};

export class TimeStreamReader extends Construct {
  lamda: PythonFunction;

  constructor(scope: Construct, id: string, props: TimeStreamReaderProps) {
    super(scope, id);
    const { table } = props;

    this.lamda = new PythonFunction(this, 'TimestreamReaderUDQ', {
      entry: 'lib/timestream-reader/lambda',
      runtime: lambda.Runtime.PYTHON_3_7,
      index: 'udq_data_reader.py',
      handler: 'lambda_handler',
      layers: [
        new PythonLayerVersion(this, 'UdqUtilsLayer', {
          entry: 'lib/timestream-reader/layer',
        }),
      ],
      memorySize: 256,
      role: new iam.Role(this, 'TimestreamUdqRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromManagedPolicyArn(this, 'lambdaExecRole', 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'), //TODO: Do we need this ?
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonTimestreamReadOnlyAccess'),
        ],
      }),
      timeout: Duration.minutes(15),
      environment: {
        TIMESTREAM_DATABASE_NAME: `${table.databaseName}`,
        TIMESTREAM_TABLE_NAME: `${table.tableName}`,
      },
    });
  }
}
