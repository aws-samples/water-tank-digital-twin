// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { TimeStream } from './time-stream';
import { Grafana } from './grafana/grafana';
import { TwinMaker } from './twin-maker/twin-maker';
import { TimeStreamReader } from './timestream-reader/timestream-reader';
import { IotCore } from './iot/greengrass';
import { VirtualDevice } from './virtual-device';
import { VideoStream } from './video-stream';

interface WaterTankDemoStackProps extends StackProps {
  watertankName: string;
  virtual?: boolean;
}

export class WaterTankDemoStack extends Stack {
  constructor(scope: Construct, id: string, props: WaterTankDemoStackProps) {
    super(scope, id, { description: 'WaterTank Demo (uksb-1tg6b0m68)', ...props });
    const { watertankName, virtual = true } = props;

    const videoStream = new VideoStream(this, 'Camera', { watertankName });

    const timestream = new TimeStream(this, 'TimeStream');
    const timestreamReader = new TimeStreamReader(this, 'TimeStreamReader', { table: timestream.table });
    const twinmaker = new TwinMaker(this, 'TwinMaker', { watertankName, timestreamReaderArn: timestreamReader.lamda.functionArn });
    const grafana = new Grafana(this, 'Grafana', { watertankName, twinmakerId: twinmaker.workspace.workspaceId });
    twinmaker.createScenes(grafana.dashboardUrl);
    const iotCore = new IotCore(this, 'IotCore', { watertankName, virtual });

    if (virtual) new VirtualDevice(this, 'VirtualDevice', { watertankName, subscribeCommand: iotCore.subscribeCommand });
    else
      new CfnOutput(this, 'deviceSubscribeCommand', {
        value: iotCore.subscribeCommand + ' --thing-name ' + watertankName,
        description: 'run this command on device to subscribe and replace with your device thing name',
      });
  }
}
