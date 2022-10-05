// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {
  aws_greengrassv2 as greengrassv2,
  aws_iot as iot,
  aws_s3_assets,
  custom_resources as cr,
  aws_iam as iam,
  CustomResource,
  aws_lambda_nodejs as lambda,
  Names,
  Stack,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

type IotCoreProps = {
  virtual?: boolean;
  watertankName: string;
};

export class IotCore extends Construct {
  public readonly subscribeCommand: string;
  private versionProvider: cr.Provider;

  constructor(scope: Construct, id: string, props: IotCoreProps) {
    super(scope, id);
    const { virtual = true, watertankName } = props;
    const region = Stack.of(this).region;
    const thingGroupName = Names.uniqueId(this) + '-watertank';

    const role = new iam.Role(this, 'GreengrassRole', {
      assumedBy: new iam.ServicePrincipal('credentials.iot.amazonaws.com'),
      managedPolicies: [
        // iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        // iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSAppRunnerServicePolicyForECRAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
    });

    // const policy = new iam.ManagedPolicy(this, 'GreenGrassPolicy', {
    //   managedPolicyName: role.roleName + 'Access',
    //   roles: [role],
    //   statements: [
    //     new iam.PolicyStatement({
    //       actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams'],
    //       resources: ['*'],
    //     }),
    //   ],
    // });

    const roleAlias = new iot.CfnRoleAlias(this, 'RoleAliasName', {
      roleAlias: role.roleName + 'Alias',
      roleArn: role.roleArn,
    });

    this.subscribeCommand = `sudo -E java -Droot="/greengrass/v2" -Dlog.store=FILE -jar ./GreengrassInstaller/lib/Greengrass.jar --aws-region ${region} --thing-group-name ${thingGroupName} --component-default-user ggc_user:ggc_group --provision true --tes-role-name ${role.roleName} --tes-role-alias-name ${roleAlias.roleAlias} --setup-system-service true --deploy-dev-tools true`;

    this.versionProvider = new cr.Provider(this, 'VersionProvider', {
      onEventHandler: new lambda.NodejsFunction(this, 'versioning', {
        initialPolicy: [
          new iam.PolicyStatement({
            actions: ['ssm:*'],
            resources: ['*'],
          }),
        ],
      }),
    });

    const components = this.createComponents(watertankName, virtual);
    this.createDeployment(components, thingGroupName);
  }

  createComponents(watertankName: string, virtual = true) {
    const prod = virtual ? 0 : 1;
    const components = [
      this.createComponent('kvs', {}, true),
      // this.createComponent('amper_meter', {
      //   amps_activity_threshold: '610',
      //   avg_size: '3',
      //   frequency: '1',
      //   ipc_in_prefix: 'raw/',
      //   ipc_out_prefix: 'state/',
      //   sensors: ['amps_meter_1', 'amps_meter_2'],
      // }),
      // this.createComponent('compute_status', {
      //   amps_activity_threshold: '610',
      //   capacity: '5',
      //   computes: ['volume_level', 'pump_1_active', 'pump_2_active', 'leak'],
      //   flow_activity_threshold: '5',
      //   frequency: '1',
      //   ipc_in_prefix: 'state/',
      //   ipc_out_prefix: 'compute/',
      //   leak_delta: '8',
      //   ohms_max_level: '520',
      //   ohms_min_level: '571',
      //   sensors: ['flow_meter_1', 'flow_meter_2', 'amps_meter_1', 'amps_meter_2', 'ohms_meter'],
      //   state_switch_threshold: '1',
      // }),
      // this.createComponent('data_generator', {
      //   controls: ['leak', 'pump_1', 'pump_2'],
      //   frequency: '1',
      //   mqtts_cmd_prefix: 'WaterTank_13/simulation/cmd/',
      //   sensors: ['ohms', 'amps_1', 'amps_2', 'flow_1', 'flow_2'],
      //   serial_simulation_ipc_topic: 'raw/serial',
      //   temperature_simulation_ipc_topic: 'raw/temperature',
      // }),
      // this.createComponent('flow_meter', {
      //   avg_size: '3',
      //   flow_activity_threshold: '615',
      //   frequency: '1',
      //   ipc_in_prefix: 'raw/',
      //   ipc_out_prefix: 'state/',
      //   sensors: ['flow_meter_1', 'flow_meter_2'],
      // }),
      // this.createComponent('lcd_manager', {
      //   frequency: '1',
      //   ipc_flow_meter: 'state/flow_meter_2',
      //   ipc_temperature: 'state/temperature',
      //   ipc_volume_level: 'compute/volume_level',
      // }),
      // this.createComponent('led_manager', {
      //   frequency: '1',
      //   ipc_in_prefix: 'compute/',
      //   ipc_out_prefix: 'command/',
      //   sensors: ['pump_1_active', 'pump_2_active', 'pump_1_overright', 'pump_2_overright', 'leak_overright', 'leak'],
      // }),
      // this.createComponent('ohms_meter', {
      //   avg_size: '3',
      //   frequency: '1',
      //   ipc_in_prefix: 'raw/',
      //   ipc_out_prefix: 'state/',
      //   sensors: ['ohms_meter'],
      // }),
      // this.createComponent('remote_control', {
      //   actuators: ['pump_1', 'pump_2', 'leak', 'demo'],
      //   default_state_leak: 0,
      //   default_state_pump_1: 1,
      //   default_state_pump_2: 1,
      //   demo_drain_time: 28,
      //   demo_leak_time: 15,
      //   demo_recovery_time: 2,
      //   demo_regular_operation_time: 10,
      //   frequency: '1',
      //   ipc_out_prefix: 'compute/',
      //   leak_pin: '23',
      //   mqtts_in_prefix: watertankName + '/',
      //   relay_pump_1_pin: '17',
      //   relay_pump_2_pin: '12',
      // }),
      // this.createComponent('serial_split', {
      //   frequency: '1',
      //   ipc_led_control: 'command/led_manager',
      //   ipc_out_prefix: 'raw/',
      //   ipc_serial_simulation: 'raw/serial',
      //   prod,
      //   sensors: ['ohms_meter', 'amps_meter_1', 'amps_meter_2', 'flow_meter_1', 'flow_meter_2'],
      //   serial_port: '/dev/ttyS0',
      //   serial_speed: '9600',
      // }),
      // this.createComponent('temperature', {
      //   avg_size: '3',
      //   frequency: '1',
      //   ipc_in_prefix: 'raw/',
      //   ipc_out_prefix: 'state/',
      //   prod,
      //   sensors: ['temperature'],
      //   temperature_base_dir: '/sys/bus/w1/devices/28*',
      // }),
      // this.createComponent('timestream_sync', {
      //   alarm_asset_type: 'Alarm',
      //   alarm_key_id: watertankName,
      //   alarms: ['leak'],
      //   computes: ['volume_level', 'pump_1_active', 'pump_2_active', 'leak'],
      //   default_reporting_state: 1,
      //   frequency: '1',
      //   ipc_compute_prefix: 'compute/',
      //   ipc_in_prefix: 'state/',
      //   mqtts_comm_control_topic: watertankName + '/control/send_data',
      //   mqtts_out_alarm: watertankName + '/state/alarm',
      //   mqtts_out_status: watertankName + '/state/status',
      //   mqtts_out_telemetry: watertankName + '/state/telemetry',
      //   sensors: ['ohms_meter', 'amps_meter_1', 'amps_meter_2', 'flow_meter_1', 'flow_meter_2', 'temperature'],
      //   status: ['leak'],
      //   status_asset_type: 'Status',
      //   status_key_id: watertankName,
      //   telemetry_asset_id: watertankName,
      //   telemetry_asset_type: 'Telemetry',
      // }),
    ];
    for (let i = 1; i < components.length; i++) components[i].component.addDependsOn(components[i - 1].component);
    for (let i = 1; i < components.length; i++) components[i].versionCr.node.addDependency(components[i - 1].versionCr);

    const customComponents = components.reduce(
      (acc, { component }) => ({
        ...acc,
        [component.attrComponentName]: {
          componentVersion: component.attrComponentVersion,
          configurationUpdate: {
            reset: [''],
            merge: generateMergeConfig(component.attrComponentName),
          },
        },
      }),
      {}
    );

    const awsComponents = {
      'aws.greengrass.Cli': {
        componentVersion: '2.7.0',
      },
      'aws.greengrass.Nucleus': {
        componentVersion: '2.7.0',
        configurationUpdate: {
          merge: JSON.stringify({
            deploymentPollingFrequency: '60',
            logging: {
              level: 'INFO',
              format: 'TEXT',
              outputType: 'FILE',
              fileSizeKB: '1024',
            },
          }),
        },
      },
      'aws.greengrass.LogManager': {
        componentVersion: '2.2.6',
        configurationUpdate: {
          merge: JSON.stringify({
            logsUploaderConfiguration: {
              systemLogsConfiguration: {
                uploadToCloudWatch: 'true',
                minimumLogLevel: 'INFO',
                diskSpaceLimit: '10',
                diskSpaceLimitUnit: 'MB',
                deleteLogFileAfterCloudUpload: 'true',
              },
              componentLogsConfiguration: components.map(({ component }) => ({
                componentName: component.attrComponentName,
                deleteLogFileAfterCloudUpload: 'true',
                diskSpaceLimit: '10',
                diskSpaceLimitUnit: 'MB',
                minimumLogLevel: 'INFO',
              })),
            },
            periodicUploadIntervalSec: '60',
          }),
        },
      },
      'aws.greengrass.TokenExchangeService': {
        componentVersion: '2.0.3',
      },
      'aws.greengrass.DockerApplicationManager': {
        componentVersion: '2.0.6',
      },
    };

    return {
      ...awsComponents,
      ...customComponents,
    };
  }

  createDeployment(components: any, thingGroupName: string) {
    const thingGroupCr = new cr.AwsCustomResource(this, 'CreateThingGroup', {
      onCreate: {
        service: 'Iot',
        action: 'createThingGroup',
        parameters: {
          thingGroupName,
        },
        physicalResourceId: cr.PhysicalResourceId.fromResponse('thingGroupId'),
      },
      onDelete: {
        service: 'Iot',
        action: 'deleteThingGroup',
        parameters: {
          thingGroupName,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    const thingGroupArn = thingGroupCr.getResponseField('thingGroupArn');

    new cr.AwsCustomResource(this, 'CreateDeployment', {
      onUpdate: {
        service: 'GreengrassV2',
        action: 'createDeployment',
        parameters: {
          targetArn: thingGroupArn,
          components,
        },
        physicalResourceId: cr.PhysicalResourceId.of(Names.uniqueId(this) + '-deployment'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['greengrass:*', 'iot:*'],
          resources: ['*'],
        }),
      ]),
    });
  }

  createComponent(name: string, configs: any = {}, docker = false) {
    const uniqueName = Names.uniqueId(this) + '-' + name;

    const { assetHash, s3ObjectKey, s3ObjectUrl } = new aws_s3_assets.Asset(this, name + 'Asset', {
      path: 'lib/iot/src/' + name,
    });

    const componentParams = {
      name: uniqueName,
      assetFolder: s3ObjectKey.replace('.zip', ''),
      assetUrl: s3ObjectUrl,
      configs,
      docker,
    };

    const recipe = generateRecipe(componentParams);

    const versionCr = new CustomResource(this, name + 'VersioningCr', {
      properties: {
        name: uniqueName,
        assetHash,
        content: { ...componentParams, recipe },
      },
      serviceToken: this.versionProvider.serviceToken,
    });
    const version = versionCr.getAttString('version');

    const component = new greengrassv2.CfnComponentVersion(this, name + 'Component', {
      inlineRecipe: JSON.stringify({
        ...recipe,
        ComponentVersion: version,
      }),
    });

    return { component, versionCr };
  }
}

const generateMergeConfig = (componentName: string) =>
  JSON.stringify({
    accessControl: {
      'aws.greengrass.ipc.mqttproxy': {
        [`${componentName}:mqttproxy:1`]: {
          policyDescription: 'Allows access to publish/subscribe to all topics.',
          operations: ['aws.greengrass#PublishToIoTCore', 'aws.greengrass#SubscribeToIoTCore'],
          resources: ['*'],
        },
      },
      'aws.greengrass.DockerApplicationManager': {
        [`${componentName}:aaa`]: {
          operations: ['*'],
          resources: ['*'],
        },
      },
      'aws.greengrass.TokenExchangeService': {
        [`${componentName}:bbb`]: {
          operations: ['*'],
          resources: ['*'],
        },
      },
      'aws.greengrass.Nucleus': {
        [`${componentName}:ccc`]: {
          operations: ['*'],
          resources: ['*'],
        },
      },
      'aws.greengrass.ipc.pubsub': {
        [`${componentName}:pubsub:1`]: {
          operations: ['aws.greengrass#PublishToTopic', 'aws.greengrass#SubscribeToTopic'],
          policyDescription: 'Allows access to shadow to write to topics',
          resources: ['*'],
        },
        [`${componentName}:pubsub:2`]: {
          operations: ['aws.greengrass#PublishToTopic', 'aws.greengrass#SubscribeToTopic'],
          policyDescription: 'Allows access to shadow to write to topics',
          resources: ['*'],
        },
      },
    },
  });

type RecipeArgs = {
  name: string;
  assetFolder: string;
  assetUrl: string;
  dependencies?: any;
  configs?: any;
  docker?: boolean;
};

const generateRecipe = ({ name, configs = {}, assetFolder, assetUrl, docker = false }: RecipeArgs) => ({
  RecipeFormatVersion: '2020-01-25',
  ComponentName: name,
  ComponentPublisher: 'Amazon Web Services, Inc.',
  ComponentDependencies: {
    'aws.greengrass.Nucleus': {
      VersionRequirement: '>=2.5.0',
      DependencyType: 'HARD',
    },
    'aws.greengrass.DockerApplicationManager': {
      VersionRequirement: '~2.0.0',
      DependencyType: 'HARD',
    },
    'aws.greengrass.TokenExchangeService': {
      VersionRequirement: '~2.0.0',
      DependencyType: 'HARD',
    },
  },
  ComponentConfiguration: {
    DefaultConfiguration: {
      log_level: 'DEBUG',
      ...configs,
    },
  },
  Manifests: [
    {
      Platform: {
        os: 'linux',
      },
      Lifecycle: {
        Setenv: {
          PYTHONPATH: '.',
          COMPONENT_NAME: name,
          AWS_ACCESS_KEY_ID: 'ASIAQY2QZXQCRAKISZH7',
          AWS_SECRET_ACCESS_KEY: 'BduG5a0yMXgcdYe+LkyIhkRyOKuw7+HpIyUgGGRW',
          AWS_SESSION_TOKEN:
            'IQoJb3JpZ2luX2VjEB0aCXVzLWVhc3QtMSJGMEQCIGZPW/d3M/jGFATNcg0ctHxoMp4VIdHJ5oB9CPVSF4CNAiAzx2F55lpOF1j2QXkkkZqVzE+FDcadZWEB+radhghJ/yqoAgjW//////////8BEAIaDDA1MzMxOTY3ODk4MSIMaBJTFJ30yltIl4QAKvwB/E9ra7JoIUAxMi/tNhwc14nQgyRMIi2k2uiQ4aahx2FbSBPRN2B84HKmADZzltCXWi1dDGxq/z3d9tEuYGORppo4fHcyd0eVFZH1Y6fw16lyBwuIF2HQ4wHvC/nU5CemCU8S+4DDz0hVTpGQTaNx6CrUpNhf9K+QeButWr3kxoCRYu3PEhzOS0p5gzyudtpA/r7txz7/RDdF+z3+0ZuC9woPYDwbKiHZiW0vZSpiErh6rIL3LtTDVFPkZcPTbOKjLGoAezw6ovPlJwiGBhuL57LqH0qQ94mKgzD10EiXVUD70/xJ8omKI4DVmUGvhCa8AX66GfnVnGz+UmghMMOB9pkGOp4BQOgzgw1l99yBy9InrmhU0STRNjaqJYJNyrAn1sG5zK5capaHI9JkZnExdVtUHuYKyhtaLeGSbYMZA/ixIKhFwK55hm8P37UqBKOiP87GOzt1hB2wV7IzJXElfDxSwWJCaNfMJIzPpYvsqjNdX4jj2gF/yjRkkG6spkW8bXO6vEOtjMujuYuZy8IiMdchaYYKbvh+aPn9SCCvDVhgjGw=',
          AWS_DEFAULT_REGION: 'eu-west-1',
        },
        Install: {
          RequiresPrivilege: true,
          Timeout: 300,
          Script:
            `rm -rf * && cp -r {artifacts:decompressedPath}/* . && cd ${assetFolder} && ` +
            (docker
              ? `aws ecr get-login-password --region us-west-2 | docker login -u AWS --password-stdin https://546150905175.dkr.ecr.us-west-2.amazonaws.com && docker pull 546150905175.dkr.ecr.us-west-2.amazonaws.com/kinesis-video-producer-sdk-cpp-raspberry-pi:latest`
              : `pip3 install -r requirements.txt`),
        },
        Run: {
          RequiresPrivilege: true,
          Script:
            `echo '###### 44444 running' && cd ${assetFolder} && ` +
            (docker
              ? `docker run --rm --device=/dev/video0 --device=/dev/vchiq -v /opt/vc:/opt/vc -e $AWS_ACCESS_KEY_ID -e $AWS_SECRET_ACCESS_KEY -e $AWS_SESSION_TOKEN -e $AWS_DEFAULT_REGION --entrypoint sh 546150905175.dkr.ecr.us-west-2.amazonaws.com/kinesis-video-producer-sdk-cpp-raspberry-pi -c "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION gst-launch-1.0 v4l2src do-timestamp=TRUE device=/dev/video0 ! videoconvert ! video/x-raw,format=I420,width=640,height=480,framerate=30/1 ! x264enc ! h264parse ! video/x-h264,stream-format=avc,alignment=au,width=640,height=480,framerate=30/1,profile=baseline ! kvssink stream-name='CameraCameraStream8A6F06B3-gnFPhH2pekZK'"`
              : `python3 -u index.py {configuration:/log_level}`),
        },
      },
      Artifacts: [
        {
          URI: assetUrl,
          Unarchive: 'ZIP',
        },
      ],
    },
  ],
});
