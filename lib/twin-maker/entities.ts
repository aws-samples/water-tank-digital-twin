// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Construct } from 'constructs';
import * as twinmaker from 'aws-cdk-lib/aws-iottwinmaker';

type EntitiesProps = {
  workspace: twinmaker.CfnWorkspace;
  watertankName: string;
};

export class Entities extends Construct {
  constructor(scope: Construct, id: string, props: EntitiesProps) {
    super(scope, id);
    const { workspace, watertankName } = props;
    this.node.addDependency(workspace);

    const emeaEntity = new twinmaker.CfnEntity(this, 'EMEAEntity', {
      workspaceId: workspace.workspaceId,
      entityId: 'aws-emea',
      entityName: 'AWS EMEA',
    });

    const luxOffice = new twinmaker.CfnEntity(this, 'LuxEntity', {
      workspaceId: workspace.workspaceId,
      parentEntityId: emeaEntity.entityId,
      entityId: 'lux-22',
      entityName: 'LUX-22',
    });
    luxOffice.addDependsOn(emeaEntity);

    const protoLabs = new twinmaker.CfnEntity(this, 'ProtoLabsEntity', {
      workspaceId: workspace.workspaceId,
      parentEntityId: luxOffice.entityId,
      entityId: 'prototyping-labs',
      entityName: 'Prototyping Labs',
      components: {
        SpecSheets: {
          componentTypeId: 'com.amazon.iottwinmaker.documents',
          properties: {
            documents: {
              value: {
                mapValue: {
                  'Org Charts': {
                    stringValue: 'https://phonetool.amazon.com/users/claudp/org',
                  },
                  'Team website': {
                    stringValue: 'https://w.amazon.com/bin/view/AWS_EMEA_Prototyping_Labs/',
                  },
                  WorkDocs: {
                    stringValue:
                      'https://amazon.awsapps.com/workdocs-beta/index.html#/folder/5a952f260fd084ddb98a84774618ce62a0c46a793c8ac80a102b546f1478e593',
                  },
                  Quip: {
                    stringValue: 'https://quip-amazon.com/cMp0OEXxBo6E/EMEA-Prototyping-Labs-Activities',
                  },
                },
              },
            },
          },
        },
      },
    });
    protoLabs.addDependsOn(luxOffice);

    const waterTank = new twinmaker.CfnEntity(this, 'WaterTankEntity', {
      workspaceId: workspace.workspaceId,
      parentEntityId: protoLabs.entityId,
      entityId: watertankName,
      entityName: watertankName,
      components: {
        WaterTank: {
          componentTypeId: 'aws.prototyping.digital-twin.watertank.telemetry',
          properties: {
            telemetryAssetId: {
              value: {
                stringValue: watertankName,
              },
            },
          },
        },
        AlarmComponent: {
          componentTypeId: 'aws.prototyping.digital-twin.alarm',
          properties: {
            alarm_key: {
              value: {
                stringValue: 'alarm_status',
              },
            },
            telemetryAssetId: {
              value: {
                stringValue: watertankName,
              },
            },
          },
        },
        SpecSheets: {
          componentTypeId: 'com.amazon.iottwinmaker.documents',
          properties: {
            documents: {
              value: {
                mapValue: {
                  DigitalTwin_manual: {
                    stringValue: 'https://gitlab.aws.dev/fabirami/digital-twin-nextgen/-/blob/main/README.md',
                  },
                  Manufacturer_page: {
                    stringValue: 'https://w.amazon.com/bin/view/AWS_EMEA_Prototyping_Labs/',
                  },
                  Control_panel: {
                    stringValue: 'https://eu-west-1.console.aws.amazon.com/iot/home?region=eu-west-1#/test',
                  },
                },
              },
            },
          },
        },
      },
    });
    waterTank.addDependsOn(protoLabs);
  }
}
