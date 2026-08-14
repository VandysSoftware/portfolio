// Contact-form handler for vandyssoftware.com.
//
// Function URL (payload format 2.0) invokes this on every request, including
// the CORS preflight, because auth is NONE. The flow: answer OPTIONS, reject
// anything but POST, filter on Origin + honeypot, validate, then SES SendEmail.
//
// `@aws-sdk/client-sesv2` is bundled into the Node 24 runtime — nothing is
// installed here. AWS recommends bundling the SDK yourself for version control,
// and if a future runtime trims it out that's a `npm i` + zip, not a rewrite.
// See the workspace note knowledge/technologies/aws/lambda.md.
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});

const MAIL_TO = process.env.MAIL_TO;
const MAIL_FROM = process.env.MAIL_FROM;
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// CORS headers. Access-Control-Allow-Origin is reflected only for an allowed
// origin — an origin we don't recognise gets no ACAO, so the browser blocks the
// response. `Vary: Origin` keeps a CDN from caching one origin's answer for
// another.
function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && ALLOWED.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function reply(status, origin, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
    body: JSON.stringify(body),
  };
}

export const handler = async (event) => {
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin;
  const method = event.requestContext?.http?.method || 'POST';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }
  if (method !== 'POST') {
    return reply(405, origin, { ok: false, error: 'Method not allowed.' });
  }

  // Origin allowlist. A real browser can't spoof this, so it stops cross-site
  // abuse and casual scripts. It is NOT security against a determined caller —
  // curl can send any Origin it likes — which is why the honeypot and field
  // validation below still matter.
  if (!origin || !ALLOWED.includes(origin)) {
    return reply(403, origin, { ok: false, error: 'Forbidden.' });
  }

  let data;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';
    data = JSON.parse(raw);
  } catch {
    return reply(400, origin, { ok: false, error: 'Could not read your message.' });
  }

  // Honeypot: a bot fills the hidden field, a human never sees it. Answer 200
  // so the bot thinks it worked, and send nothing.
  if (data._gotcha) {
    return reply(200, origin, { ok: true });
  }

  const first = String(data.first || '').trim();
  const last = String(data.last || '').trim();
  const email = String(data.email || '').trim();
  const idea = String(data.idea || '').trim();

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (
    !first || !last || !idea || !emailOk ||
    first.length > 100 || last.length > 100 ||
    email.length > 254 || idea.length > 5000
  ) {
    return reply(400, origin, {
      ok: false,
      error: 'Please fill in every field with a valid email.',
    });
  }

  const name = `${first} ${last}`;
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: MAIL_FROM,
        Destination: { ToAddresses: [MAIL_TO] },
        // Reply in your mail client and you're addressing the submitter, while
        // the message itself is authenticated as coming from your own domain.
        ReplyToAddresses: [email],
        Content: {
          Simple: {
            Subject: { Data: `New tab: ${name}` },
            Body: {
              Text: {
                Data: `${name} <${email}> wrote:\n\n${idea}\n`,
              },
            },
          },
        },
      }),
    );
  } catch (err) {
    // Log the full provider error (identity, region, account posture) but never
    // return it to the browser — give the visitor something they can act on.
    console.error('SES SendEmail failed:', err);
    return reply(502, origin, {
      ok: false,
      error: 'Something went wrong sending your message. Try again, or email me directly.',
    });
  }

  return reply(200, origin, { ok: true });
};
