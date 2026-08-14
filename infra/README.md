# infra — contact-form backend

CDK (TypeScript) for the `vandyssoftware.com` contact form. One stack:

```
napkin form  ──fetch POST──▶  Lambda Function URL  ──SES SendEmail──▶  your inbox
```

- **Lambda** — Node 24, arm64, one file (`lambda/handler.mjs`). No dependencies:
  the runtime bundles AWS SDK v3, so there is nothing to `pnpm install` or build.
- **Function URL** — public HTTPS, `authType: NONE`. No API Gateway. CORS and
  abuse-filtering (Origin allowlist + honeypot) live in the handler.
- **SES** — root-domain identity with Easy DKIM. `From: forms@vandyssoftware.com`,
  `Reply-To:` the submitter, `To: noah@vandyssoftware.com`.

The site itself is static HTML at the repo root and has no build step. This
directory is the one place that carries a toolchain (`node_modules`, CDK); it is
git-ignored and never ships to GitHub Pages.

## Prerequisites

- AWS account, and the AWS CLI authenticated (`aws sts get-caller-identity`).
- Node 20+.
- `cd infra && pnpm install`.
- Bootstrap the account/region once: `pnpm exec cdk bootstrap aws://<account>/<region>`.

Pick the region deliberately — the SES identity is per-region, and it must be
the same region the Lambda runs in. Set it with `CDK_DEFAULT_REGION` / your CLI
profile; the app falls back to `us-east-1`.

## Deploy

```
cd infra
pnpm install
pnpm exec cdk diff       # read this before every deploy
pnpm exec cdk deploy
```

The deploy prints outputs:

- **`FunctionUrl`** — paste into `../index.html` in place of
  `FORM_ENDPOINT_PLACEHOLDER` (the `data-endpoint` on the tab form).
- **`DkimRecord1..3`** — three `name  CNAME  value` rows. Publish all three at
  the DNS host for `vandyssoftware.com`.

## The DNS / verification step (the actual gate)

The stack creates the SES identity but **cannot send until DKIM verifies**, and
verification waits on DNS you publish by hand (DNS is not on Route 53).

1. Add the three `DkimRecord*` CNAMEs at the DNS host.
2. Wait for SES to flip the identity to *Verified*
   (`aws ses get-identity-verification-attributes --identities vandyssoftware.com`,
   or the SES console). Minutes to a few hours, depending on DNS TTL.
3. **Sandbox:** a new account's SES is sandboxed — it can only send to verified
   addresses. Because this form only mails `noah@vandyssoftware.com` on the same
   verified domain, sandbox is fine and no support ticket is needed. That
   changes the day you want to CC someone or send a confirmation to the
   submitter — then request production access.

> **DNS transfer in flight:** `vandyssoftware.com`'s DNS is moving hosts. DKIM
> records must stay published — if they vanish during the move, SES
> un-verifies the identity and sending stops. Either publish DKIM once at the
> final host after the transfer settles, or re-create the same three CNAMEs at
> the new host immediately on cutover.

## Deliverability

`noah@vandyssoftware.com` is likely on Google Workspace, so mail "from your own
domain" that doesn't originate from Google is judged by DMARC. Easy DKIM signs
as `vandyssoftware.com`, which aligns and passes. No extra work needed; a custom
MAIL FROM subdomain (for SPF alignment too) is a possible later hardening, not a
requirement.

## Teardown

`pnpm exec cdk destroy`. The log group is `RemovalPolicy.DESTROY`, so it goes too. The
SES identity is removed from the stack; DKIM DNS records you added by hand are
yours to delete at the DNS host.
