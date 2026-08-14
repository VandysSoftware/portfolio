#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ContactFormStack } from '../lib/contact-form-stack';

const app = new cdk.App();

// SES and Lambda live in the same region. Pick it with the AWS CLI profile /
// CDK_DEFAULT_REGION when you deploy; us-east-1 is the fallback. The SES
// identity is per-region, so this is also the region you verify the domain in.
new ContactFormStack(app, 'VandysContactForm', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'Contact form for vandyssoftware.com — Lambda Function URL + SES.',
});
