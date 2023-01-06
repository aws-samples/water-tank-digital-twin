// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

type Config = {
  datasourceId: string;
  watertankName: string;
};

export default (config: Config) => ({
  dashboard: {
    title: 'Overview',
    refresh: false,
    schemaVersion: 35,
    style: 'dark',
    tags: [],
    time: {
      from: 'now-5m',
      to: 'now',
    },
    timepicker: {},
    timezone: '',
    weekStart: '',
    annotations: {
      list: [
        {
          builtIn: 1,
          datasource: '-- Grafana --',
          enable: true,
          hide: true,
          iconColor: 'rgba(0, 211, 255, 1)',
          name: 'Annotations & Alerts',
          target: {
            limit: 100,
            matchAny: false,
            tags: [],
            type: 'dashboard',
          },
          type: 'dashboard',
        },
      ],
    },
    description: '',
    editable: true,
    fiscalYearStartMonth: 0,
    graphTooltip: 0,
    iteration: 1660500669335,
    links: [],
    liveNow: false,
    panels: [
      {
        gridPos: {
          h: 11,
          w: 21,
          x: 0,
          y: 0,
        },
        id: 6,
        options: {
          customSelCompVarName: '${sel_comp}',
          customSelEntityVarName: '${sel_entity}',
          datasource: config.datasourceId,
          sceneId: 'WaterTankDetailed',
        },
        targets: [
          {
            componentTypeId: 'aws.prototyping.digital-twin.alarm',
            properties: ['alarm_status'],
            queryType: 'ComponentHistory',
            refId: 'A',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['flow_meter_1'],
            queryType: 'EntityHistory',
            refId: 'B',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['flow_meter_2'],
            queryType: 'EntityHistory',
            refId: 'C',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['amps_meter_1'],
            queryType: 'EntityHistory',
            refId: 'D',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['amps_meter_2'],
            queryType: 'EntityHistory',
            refId: 'E',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['volume_level'],
            queryType: 'EntityHistory',
            refId: 'F',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['ohms_meter'],
            queryType: 'EntityHistory',
            refId: 'G',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            hide: false,
            properties: ['temperature'],
            queryType: 'EntityHistory',
            refId: 'H',
          },
        ],
        title: 'Scene Viewer',
        type: 'grafana-iot-twinmaker-sceneviewer-panel',
      },
      {
        collapsed: false,
        gridPos: {
          h: 1,
          w: 24,
          x: 0,
          y: 11,
        },
        id: 52,
        panels: [],
        title: 'Alarms',
        type: 'row',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'thresholds',
            },
            custom: {
              align: 'auto',
              displayMode: 'auto',
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [],
        },
        gridPos: {
          h: 4,
          w: 13,
          x: 0,
          y: 12,
        },
        id: 41,
        options: {
          footer: {
            fields: '',
            reducer: ['sum'],
            show: false,
          },
          showHeader: true,
          sortBy: [],
        },
        pluginVersion: '8.4.7',
        targets: [
          {
            componentName: 'AlarmComponent',
            datasource: {
              type: 'grafana-iot-twinmaker-datasource',
              id: config.datasourceId,
            },
            entityId: '${sel_entity}',
            properties: ['alarm_status'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
        ],
        title: 'Alarm List',
        transformations: [
          {
            id: 'twinmaker-register-links',
            options: {
              addSelectionField: false,
              vars: [
                {
                  fieldName: 'entityName',
                  name: '${sel_entity_name}',
                },
                {
                  fieldName: 'entityId',
                  name: '${sel_entity}',
                },
                {
                  fieldName: 'alarmName',
                  name: '${sel_comp}',
                },
              ],
            },
          },
        ],
        type: 'table',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'thresholds',
            },
            custom: {
              fillOpacity: 70,
              lineWidth: 0,
              spanNulls: false,
            },
            displayName: '${sel_entity_name}',
            mappings: [
              {
                options: {
                  IDLE: {
                    color: 'blue',
                    index: 2,
                    text: 'IDLE',
                  },
                  LEAK: {
                    color: 'red',
                    index: 1,
                    text: 'LEAK',
                  },
                  RUN: {
                    color: 'green',
                    index: 0,
                    text: 'RUN',
                  },
                },
                type: 'value',
              },
            ],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
              ],
            },
          },
          overrides: [],
        },
        gridPos: {
          h: 4,
          w: 8,
          x: 13,
          y: 12,
        },
        id: 4,
        options: {
          alignValue: 'left',
          legend: {
            displayMode: 'list',
            placement: 'bottom',
          },
          mergeValues: true,
          rowHeight: 0.9,
          showValue: 'auto',
          tooltip: {
            mode: 'single',
            sort: 'none',
          },
        },
        targets: [
          {
            componentName: 'AlarmComponent',
            entityId: '${sel_entity}',
            filter: [],
            properties: ['alarm_status'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
        ],
        title: 'Selected Alarm History',
        type: 'state-timeline',
      },
      {
        collapsed: false,
        gridPos: {
          h: 1,
          w: 24,
          x: 0,
          y: 16,
        },
        id: 47,
        panels: [],
        title: 'Prototyping Lab Telemetry',
        type: 'row',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'palette-classic',
            },
            custom: {
              axisLabel: '',
              axisPlacement: 'auto',
              barAlignment: 0,
              drawStyle: 'line',
              fillOpacity: 21,
              gradientMode: 'opacity',
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false,
              },
              lineInterpolation: 'smooth',
              lineWidth: 2,
              pointSize: 5,
              scaleDistribution: {
                type: 'linear',
              },
              showPoints: 'auto',
              spanNulls: false,
              stacking: {
                group: 'A',
                mode: 'none',
              },
              thresholdsStyle: {
                mode: 'off',
              },
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [],
        },
        gridPos: {
          h: 10,
          w: 11,
          x: 0,
          y: 17,
        },
        id: 37,
        options: {
          legend: {
            calcs: [],
            displayMode: 'list',
            placement: 'bottom',
          },
          tooltip: {
            mode: 'multi',
            sort: 'none',
          },
        },
        pluginVersion: '8.2.0',
        targets: [
          {
            componentName: 'WaterTank',
            datasource: {
              type: 'grafana-iot-twinmaker-datasource',
              id: config.datasourceId,
            },
            entityId: '${sel_entity}',
            properties: ['flow_meter_1'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
          {
            componentName: 'WaterTank',
            datasource: {
              type: 'grafana-iot-twinmaker-datasource',
              id: config.datasourceId,
            },
            entityId: '${sel_entity}',
            hide: false,
            properties: ['flow_meter_2'],
            queryType: 'EntityHistory',
            refId: 'B',
          },
        ],
        title: 'Flow meters',
        transformations: [],
        transparent: true,
        type: 'timeseries',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'palette-classic',
            },
            custom: {
              axisLabel: '',
              axisPlacement: 'auto',
              barAlignment: 0,
              drawStyle: 'line',
              fillOpacity: 19,
              gradientMode: 'none',
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false,
              },
              lineInterpolation: 'smooth',
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: 'linear',
              },
              showPoints: 'auto',
              spanNulls: false,
              stacking: {
                group: 'A',
                mode: 'none',
              },
              thresholdsStyle: {
                mode: 'off',
              },
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [
            {
              matcher: {
                id: 'byName',
                options: 'amps_meter_1 {componentName="WaterTank", entityId="${sel_entity}"}',
              },
              properties: [
                {
                  id: 'color',
                  value: {
                    fixedColor: 'red',
                    mode: 'fixed',
                  },
                },
              ],
            },
            {
              matcher: {
                id: 'byName',
                options: 'amps_meter_2 {componentName="WaterTank", entityId="watertank"}',
              },
              properties: [
                {
                  id: 'color',
                  value: {
                    fixedColor: 'green',
                    mode: 'fixed',
                  },
                },
              ],
            },
          ],
        },
        gridPos: {
          h: 10,
          w: 11,
          x: 11,
          y: 17,
        },
        id: 38,
        options: {
          legend: {
            calcs: [],
            displayMode: 'table',
            placement: 'bottom',
          },
          tooltip: {
            mode: 'multi',
            sort: 'none',
          },
        },
        pluginVersion: '8.2.0',
        repeat: 'sel_entity_name',
        repeatDirection: 'v',
        targets: [
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            filter: [],
            hide: false,
            properties: ['amps_meter_1'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            filter: [],
            hide: false,
            properties: ['amps_meter_2'],
            queryType: 'EntityHistory',
            refId: 'B',
          },
        ],
        title: 'Amper-meters',
        transformations: [],
        transparent: true,
        type: 'timeseries',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'palette-classic',
            },
            custom: {
              axisLabel: '',
              axisPlacement: 'auto',
              barAlignment: 0,
              drawStyle: 'line',
              fillOpacity: 0,
              gradientMode: 'none',
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false,
              },
              lineInterpolation: 'linear',
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: 'linear',
              },
              showPoints: 'auto',
              spanNulls: false,
              stacking: {
                group: 'A',
                mode: 'none',
              },
              thresholdsStyle: {
                mode: 'off',
              },
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [],
        },
        gridPos: {
          h: 7,
          w: 11,
          x: 0,
          y: 27,
        },
        id: 54,
        options: {
          legend: {
            calcs: [],
            displayMode: 'list',
            placement: 'bottom',
          },
          tooltip: {
            mode: 'single',
            sort: 'none',
          },
        },
        targets: [
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            properties: ['volume_level'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
        ],
        title: 'Volume level',
        type: 'timeseries',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'palette-classic',
            },
            custom: {
              axisLabel: '',
              axisPlacement: 'auto',
              barAlignment: 0,
              drawStyle: 'line',
              fillOpacity: 0,
              gradientMode: 'none',
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false,
              },
              lineInterpolation: 'linear',
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: 'linear',
              },
              showPoints: 'auto',
              spanNulls: false,
              stacking: {
                group: 'A',
                mode: 'none',
              },
              thresholdsStyle: {
                mode: 'off',
              },
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [],
        },
        gridPos: {
          h: 7,
          w: 10,
          x: 11,
          y: 27,
        },
        id: 56,
        options: {
          legend: {
            calcs: [],
            displayMode: 'list',
            placement: 'bottom',
          },
          tooltip: {
            mode: 'single',
            sort: 'none',
          },
        },
        targets: [
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            properties: ['ohms_meter'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
        ],
        title: 'Ohms meter',
        type: 'timeseries',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'continuous-RdYlGr',
              seriesBy: 'max',
            },
            custom: {
              axisGridShow: false,
              axisLabel: '',
              axisPlacement: 'auto',
              barAlignment: 0,
              drawStyle: 'line',
              fillOpacity: 47,
              gradientMode: 'hue',
              hideFrom: {
                legend: false,
                tooltip: false,
                viz: false,
              },
              lineInterpolation: 'linear',
              lineStyle: {
                fill: 'solid',
              },
              lineWidth: 1,
              pointSize: 5,
              scaleDistribution: {
                type: 'linear',
              },
              showPoints: 'auto',
              spanNulls: false,
              stacking: {
                group: 'A',
                mode: 'none',
              },
              thresholdsStyle: {
                mode: 'line',
              },
            },
            mappings: [],
            thresholds: {
              mode: 'percentage',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [
            {
              matcher: {
                id: 'byName',
                options: 'temperature {componentName="WaterTank", entityId="${sel_entity}"}',
              },
              properties: [
                {
                  id: 'color',
                  value: {
                    fixedColor: 'semi-dark-red',
                    mode: 'continuous-RdYlGr',
                    seriesBy: 'last',
                  },
                },
              ],
            },
          ],
        },
        gridPos: {
          h: 9,
          w: 11,
          x: 0,
          y: 34,
        },
        id: 50,
        options: {
          legend: {
            calcs: [],
            displayMode: 'list',
            placement: 'bottom',
          },
          tooltip: {
            mode: 'single',
            sort: 'none',
          },
        },
        pluginVersion: '8.2.0',
        repeatDirection: 'v',
        targets: [
          {
            componentName: 'WaterTank',
            entityId: '${sel_entity}',
            filter: [],
            hide: false,
            properties: ['temperature'],
            queryType: 'EntityHistory',
            refId: 'A',
          },
        ],
        title: 'temperature',
        transformations: [
          {
            id: 'concatenate',
            options: {
              frameNameLabel: 'frame',
              frameNameMode: 'drop',
            },
          },
        ],
        transparent: true,
        type: 'timeseries',
      },
      {
        gridPos: {
          h: 15,
          w: 10,
          x: 11,
          y: 34,
        },
        id: 58,
        options: {
          componentName: '',
          datasource: '',
          entityId: '',
          kvsStreamName: '${sel_entity}',
        },
        title: 'Camera',
        type: 'grafana-iot-twinmaker-videoplayer-panel',
      },
      {
        fieldConfig: {
          defaults: {
            color: {
              mode: 'thresholds',
            },
            custom: {
              align: 'auto',
              displayMode: 'auto',
            },
            mappings: [],
            thresholds: {
              mode: 'absolute',
              steps: [
                {
                  color: 'green',
                  value: null,
                },
                {
                  color: 'red',
                  value: 80,
                },
              ],
            },
          },
          overrides: [],
        },
        gridPos: {
          h: 6,
          w: 17,
          x: 0,
          y: 82,
        },
        id: 34,
        options: {
          footer: {
            fields: '',
            reducer: ['sum'],
            show: false,
          },
          showHeader: true,
        },
        pluginVersion: '8.4.7',
        targets: [
          {
            componentName: 'SpecSheets',
            entityId: '${sel_entity}',
            properties: ['documents'],
            queryType: 'GetPropertyValue',
            refId: 'A',
          },
        ],
        title: 'Asset Specification Documents',
        type: 'table',
      },
    ],
    templating: {
      list: [
        {
          current: {
            selected: false,
            text: config.watertankName,
            value: config.watertankName,
          },
          hide: 2,
          name: 'sel_entity_name',
          options: [
            {
              selected: true,
              text: config.watertankName,
              value: config.watertankName,
            },
          ],
          query: 'watertank',
          skipUrlSync: false,
          type: 'textbox',
        },
        {
          current: {
            selected: true,
            text: config.watertankName,
            value: config.watertankName,
          },
          hide: 0,
          name: 'sel_entity',
          options: [
            {
              selected: true,
              text: config.watertankName,
              value: config.watertankName,
            },
          ],
          query: 'watertank',
          skipUrlSync: false,
          type: 'textbox',
        },
        {
          current: {
            selected: false,
            text: 'WaterTank',
            value: 'WaterTank',
          },
          hide: 2,
          name: 'sel_comp',
          options: [
            {
              selected: true,
              text: 'WaterTank',
              value: 'WaterTank',
            },
          ],
          query: 'WaterTank',
          skipUrlSync: false,
          type: 'textbox',
        },
      ],
    },
  },
});
