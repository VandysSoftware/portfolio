# Vandy's Software Solutions — site

The marketing site for Vandy's Software Solutions, a one-person software
consultancy in Kansas City. Three static pages at the repo root, no build step,
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
| `faq.html` | The FAQ — "Ask the bartender," a single-column accordion list (native `<details>`, so answers stay in the HTML while collapsed) with a "still need help" contact prompt up top. Carries the site's `FAQPage` schema; `index.html` teases and links here rather than repeating it. |
| `styles.css` | Shared foundation: theme palette, base reset, page chrome, closer/footer. |
| `snackbar.html` | Living style guide (unlisted, `noindex`): the theme tokens + components rendered off the real `styles.css`. Open it to see the whole system at a glance and flip the toggle for both palettes. |
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

**The design system — see `snackbar.html`.** `snackbar.html` is a living style
guide: an unlisted (`noindex`) page that renders the real tokens and every
component off the actual `styles.css`. It's the reference — open it to see the
whole theme at a glance, flip the toggle for both palettes, and keep it current
when the system changes.

The palette is organized as **roles**, so re-tinting the site is a couple of
values per theme, not a find-and-replace:

- **Brand:** `--primary` (CTAs and important highlights) and `--secondary`
  (small accents — rules, tags, status). Change these two per `[data-theme]`
  block; `--accent`/`--accent2` alias them and the components follow.
- **Text:** `--heading` (titles), `--text` (body), `--muted` (kickers/eyebrows,
  captions).
- **Display:** `--script` — the Yellowtail neon, for the sign and closers only.

Rules that are deliberate, not accidents — don't quietly undo them:

- **No amber.** The old amber accent was removed on purpose; the palette is
  cream + red + cyan over the dark bar photo.
- **Body text stays `--text`** — never an accent color. A statement line
  (`.lead`) may take `--secondary` (cyan in dark) for a pop, but running copy
  stays readable ink.
- **`--primary` is for CTAs and highlights only.** That discipline is what makes
  the red draw the eye to the thing worth clicking.
- **Light is red-forward:** in light, `--heading` uses `--primary` (red menu
  headers); dark keeps headings neutral cream. Intentional asymmetry.
- **Fonts:** Oswald (all signage — headers, eyebrows, buttons, labels, tags),
  Lora (body and form fields), Yellowtail (the neon script), Caveat (the napkin
  note), Pixelify Sans (sparingly). Loaded per page via the Google Fonts `<link>`.
- **Component and type CSS lives inline in `index.html`**, not `styles.css`, so
  `snackbar.html` *mirrors* those rules with a "source of truth is index.html"
  note. Restyle a component there and update the mirror too — or lift the shared
  CSS into `styles.css` so the guide renders it for free.

**The background & the button glow.** The dark theme sits on a darkened
stickerbomb wall (`assets/stickerbomb-bg.jpg`) painted on a fixed `body::before`, dimmed by
`--bg-veil` (dark theme only). The base color lives on `<html>` and the `body`
is transparent so the photo shows behind the content — **don't put an opaque
background back on `body`** or it covers the photo. On hover/focus the solid
`.btn` "switches on" like the sign: the fill drops out and a neon outline + glow
(`--glow-btn` / `--glow-btn-text`) lights up; those glow vars are `none` in the
light theme, where it degrades to a filled → outline color change.

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
the neon stops buzzing). The decorative sign rig is `aria-hidden`; the real
`<h1>` on `index.html` is now the visible hero headline (`.hero-title`) in the
intro, not a hidden one (`about.html` still uses a visually-hidden `<h1>`).

**Reaching out.** Every `Pull up a stool` CTA — the home-page intro button and
the `about` / `house-rules` closers — anchors to the "start a tab" napkin form at
the foot of `index.html` (`#tab`). Live scheduling (a Google Calendar embed) is
**tabled**; the old scheduler URL is parked in a comment beside the intro button
for a one-line restore if that changes.

**The contact form.** The "start a tab" form on `index.html` reaches
`noah@vandyssoftware.com`. It POSTs (via `fetch`) to a Lambda Function URL that
sends the message through SES — there is no third-party form service. That
backend lives entirely in `infra/` (CDK); its endpoint gets pasted into
`index.html`'s `data-endpoint`. Until it is deployed, the form shows a "not live
yet" note that names the email, and the "rather write" mailto under the form is
the static fallback for anyone without JS. See `infra/README.md`.

## Before this goes live

- [ ] Deploy `infra/` and paste the `FunctionUrl` output into `index.html` in
      place of `FORM_ENDPOINT_PLACEHOLDER` — then publish the DKIM records
- [ ] Replace the two placeholder testimonials in "The regulars"
