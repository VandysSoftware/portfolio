import {
  Stack,
  StackProps,
  Duration,
  RemovalPolicy,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as path from 'node:path';

// --- Config -----------------------------------------------------------------
// The sending identity is the root domain (decided: root over a `send.`
// subdomain). `From` is always this verified domain; the submitter's address
// goes in Reply-To, never in From — putting it in From fails DMARC.
const DOMAIN = 'vandyssoftware.com';
const MAIL_FROM = `forms@${DOMAIN}`;
const MAIL_TO = 'noah@vandyssoftware.com';

// CORS allowlist. GitHub Pages serves the apex; www redirects to it, but a
// visitor can land mid-redirect, so both are allowed. This is the ONLY place
// CORS is configured — the Function URL's own CORS is left off on purpose, so
// the Access-Control-Allow-Origin header is never emitted twice.
const ALLOWED_ORIGINS = [
  `https://${DOMAIN}`,
  `https://www.${DOMAIN}`,
];

export class ContactFormStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // --- SES identity (Easy DKIM) -----------------------------------------
    // Creates the domain identity and the DKIM key. It does NOT publish the
    // DNS records — that happens by hand at whatever hosts vandyssoftware.com's
    // DNS (currently Northwest Registered Agent). The three CNAMEs are emitted
    // as stack outputs below. Sending stays broken until they resolve and SES
    // marks the identity verified.
    const identity = new ses.EmailIdentity(this, 'DomainIdentity', {
      identity: ses.Identity.domain(DOMAIN),
    });

    // --- Log group --------------------------------------------------------
    // Created explicitly with a 7-day retention. The default is never-expire,
    // which is the line item that quietly bills an otherwise-free function.
    const logGroup = new logs.LogGroup(this, 'HandlerLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // --- Lambda -----------------------------------------------------------
    // Single-file handler. The Node 24 runtime bundles AWS SDK v3, so there is
    // no package.json, no node_modules, and nothing to build — the asset is the
    // one .mjs file. arm64 is cheaper per GB-second than x86 for identical work.
    const handler = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      memorySize: 128,
      timeout: Duration.seconds(10),
      logGroup,
      environment: {
        MAIL_TO,
        MAIL_FROM,
        ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
      },
    });

    // Least privilege: send only, and only through this one identity.
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail'],
        resources: [
          this.formatArn({
            service: 'ses',
            resource: 'identity',
            resourceName: DOMAIN,
          }),
        ],
      }),
    );
    // The policy references the identity; make the dependency explicit so the
    // identity exists before the role that points at it.
    handler.node.addDependency(identity);

    // --- Function URL -----------------------------------------------------
    // Public HTTPS endpoint, no API Gateway. AuthType NONE because the form is
    // anonymous; abuse is filtered in the handler (honeypot + Origin allowlist)
    // rather than with IAM. CORS is deliberately NOT set here — see the note on
    // ALLOWED_ORIGINS above.
    const fnUrl = handler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // --- Outputs ----------------------------------------------------------
    new CfnOutput(this, 'FunctionUrl', {
      value: fnUrl.url,
      description: 'Paste this into index.html as the form endpoint.',
    });

    // The three DKIM CNAMEs to publish at the DNS host. Name and value are the
    // record's host and target; type is CNAME for all three.
    new CfnOutput(this, 'DkimRecord1', {
      value: `${identity.dkimDnsTokenName1}  CNAME  ${identity.dkimDnsTokenValue1}`,
    });
    new CfnOutput(this, 'DkimRecord2', {
      value: `${identity.dkimDnsTokenName2}  CNAME  ${identity.dkimDnsTokenValue2}`,
    });
    new CfnOutput(this, 'DkimRecord3', {
      value: `${identity.dkimDnsTokenName3}  CNAME  ${identity.dkimDnsTokenValue3}`,
    });
  }
}
