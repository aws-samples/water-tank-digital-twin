#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CicdStack } from '../lib/cicd-stack';

const app = new cdk.App();
const region = app.node.tryGetContext('region');
new CicdStack(app, 'CicdStack', { env: { region } });
