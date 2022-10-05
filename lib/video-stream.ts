import { Construct } from 'constructs';
import * as kinesisvideo from 'aws-cdk-lib/aws-kinesisvideo';

type VideoStreamProps = {
  watertankName: string;
};

export class VideoStream extends Construct {
  constructor(scope: Construct, id: string, props: VideoStreamProps) {
    super(scope, id);
    const { watertankName } = props;

    new kinesisvideo.CfnStream(this, 'CameraStream', {
      deviceName: watertankName,
      dataRetentionInHours: 1,
    });
  }
}
