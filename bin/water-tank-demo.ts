#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WaterTankDemoStack } from '../lib/water-tank-demo-stack';
import { CicdStack } from '../lib/cicd-stack';

const app = new cdk.App();

new WaterTankDemoStack(app, 'WaterTankDemoStack');
new CicdStack(app, 'CicdStack');
