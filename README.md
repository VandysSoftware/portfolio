# Vandy's Software Solutions — site

The marketing site for Vandy's Software Solutions, a one-person software
consultancy in Kansas City. Two static pages, no build step, no dependencies.

Everything runs on a bar metaphor: the hero is a neon sign hanging on chains,
services are "what's on tap," testimonials are "the regulars," work is "on the
shelf," the FAQ is "ask the bartender," and the closing CTA is "start a tab."
Copy changes should keep that voice.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page. Hero sign, services, testimonials, work, FAQ. |
| `house-rules.html` | How an engagement runs — process, terms, plain-english glossary. |
| `styles.css` | Shared foundation: theme palette, base reset, page chrome, closer/footer. |

Page-specific CSS stays inline in the page that uses it — the hanging sign and
cross-stitch sampler on the home page, the steps and rules lists on house rules.
Only genuinely shared rules belong in `styles.css`, so a change there is a change
to both pages.

## Running it

Open either file in a browser. There is nothing to install and nothing to build.

## How it's put together

**Theming.** Both pages support a dark ("bar at night") and light ("printed
menu") theme, driven entirely by CSS custom properties. The toggle sits fixed in
the top-right and seeds itself from `prefers-color-scheme`. To retheme, change
the two `[data-theme]` blocks at the top of `styles.css` — never hardcode a color
further down.

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

## Before this goes live

- [ ] Replace `mailto:hello@example.com` — it appears on the primary CTA of
      **both** pages
- [ ] Replace the two placeholder testimonials in "The regulars"
- [ ] `Alfa Slab One` is requested from Google Fonts in `index.html` but never
      used in any rule — drop it from the font URL or start using it
