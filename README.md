# Vandy's Software Solutions — site

The marketing site for Vandy's Software Solutions, a one-person software
consultancy in Kansas City. Four static pages at the repo root, no build step,
no dependencies. The one exception is `infra/` — the CDK backend for the
contact form — which carries its own toolchain and never ships to GitHub Pages.

Everything runs on a bar metaphor: the hero is a neon sign hanging on chains,
services are "what's on tap," testimonials are "the regulars," work is "on the
shelf," the FAQ is "ask the bartender," and the closing CTA is "start a tab."
Copy changes should keep that voice.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page. Hero sign, services, testimonials, work, FAQ. |
| `about.html` | Bio page. "Who's pouring," who I work with, the long way around, passing it on, off the clock. |
| `house-rules.html` | How an engagement runs — process, terms, plain-english glossary. |
| `contact.html` | Book-a-call page. Google Calendar scheduler, with a direct-email option under it. |
| `styles.css` | Shared foundation: theme palette, base reset, page chrome, closer/footer. |
| `infra/` | CDK backend for the contact form — Lambda Function URL + SES. Self-contained; see `infra/README.md`. |

Page-specific CSS stays inline in the page that uses it — the hanging sign and
cross-stitch sampler on the home page, the bio sections on about, the steps and
rules lists on house rules.
Only genuinely shared rules belong in `styles.css`, so a change there is a change
to all three pages.

## Running it

Open either file in a browser. There is nothing to install and nothing to build.

## How it's put together

**Theming.** All three pages support a dark ("bar at night") and light ("printed
menu") theme, driven entirely by CSS custom properties. Every page opens dark
regardless of `prefers-color-scheme` — the lit sign is the first impression, and
a light-mode visitor would otherwise land on the painted version and never know
there was neon. The toggle sits fixed in the top-right, and a click is
remembered in `localStorage` under `vandys-theme` so the choice survives
navigation. Reading it back happens in an inline `<script>` in each page's
`<head>`, before first paint — move it and the other theme flashes on every
page load. To retheme, change the two `[data-theme]` blocks at the top of
`styles.css` — never hardcode a color further down.

**The hanging sign.** The hero is a fixed-position rig that swings on scroll with
spring physics and tilts toward the cursor. Its moving parts are CSS custom
properties written by a `requestAnimationFrame` loop at the bottom of
`index.html`:

- `--drop` — chain length. The sign hangs from the top of the viewport rather
  than being translated down the page, which is what keeps the chains touching
  the ceiling at every scroll position. It is divided by the current scale before
  being written, so its value means on-screen pixels.
- `--s` — scale, interpolating from full size to docked.
- `--swing`, `--tiltX`, `--tiltY` — pendulum angle and cursor tilt.

The dock scale and the hero runway height are **measured**, not hardcoded — the
script reads the rendered panel's height and derives both. This is necessary
because the sign is sized in viewport units, so it has no single correct dock
scale. Measurement re-runs on resize and on `document.fonts.ready`, since the
panel's height changes when the script face loads.

**Responsive.** The layout is mobile-first. Desktop treatments live in a single
`@media (min-width:900px)` block in `index.html`, above every existing
breakpoint (560/520/480px), so the phone rendering is untouched by anything in
it. Below 900px the page is one 680px column; above it the column widens to
1040px and the services, testimonials, work, and FAQ sections go two-up.

`house-rules.html` deliberately does *not* widen — it is prose, and a 1040px
line length is too long to read comfortably.

**Accessibility.** Honors `prefers-reduced-motion` (the sign stops swinging and
the neon stops buzzing). The decorative sign rig is `aria-hidden`, with a real
`<h1>` provided visually-hidden.

**The contact form.** The "start a tab" form on `index.html` and the emailable
address on `contact.html` both reach `noah@vandyssoftware.com`. The form POSTs
(via `fetch`) to a Lambda Function URL that sends the message through SES —
there is no third-party form service. That backend lives entirely in `infra/`
(CDK); its endpoint gets pasted into `index.html`'s `data-endpoint`. Until it is
deployed, the form shows a "not live yet" note and points at the email. See
`infra/README.md`.

## Before this goes live

- [ ] Deploy `infra/` and paste the `FunctionUrl` output into `index.html` in
      place of `FORM_ENDPOINT_PLACEHOLDER` — then publish the DKIM records
- [ ] Replace the two placeholder testimonials in "The regulars"
