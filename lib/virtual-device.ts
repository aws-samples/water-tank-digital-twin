// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

type VirtualDeviceProps = {
  subscribeCommand: string;
  watertankName: string;
};

export class VirtualDevice extends Construct {
  constructor(scope: Construct, id: string, props: VirtualDeviceProps) {
    super(scope, id);
    const { subscribeCommand, watertankName } = props;

    const role = new iam.Role(this, 'VirtualDeviceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSIoTThingsRegistration'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iot:CreateKeysAndCertificate', 'iot:Describe*', 'iam:Get*'],
        resources: ['*'],
      }),
    );

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 1 });

    const device = new ec2.Instance(this, 'WaterTankInstance', {
      role,
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['installJava', 'installGreenGrass', 'subscribeDevice'],
        },
        configs: {
          installJava: new ec2.InitConfig([ec2.InitCommand.shellCommand('sudo amazon-linux-extras install java-openjdk11')]),
          installGreenGrass: new ec2.InitConfig([
            ec2.InitCommand.shellCommand(
              'curl -s https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip > greengrass-nucleus-latest.zip && unzip greengrass-nucleus-latest.zip -d GreengrassInstaller',
            ),
          ]),
          subscribeDevice: new ec2.InitConfig([ec2.InitCommand.shellCommand(subscribeCommand + ` --thing-name ${watertankName}`)]),
        },
      }),
    });
  }
}
