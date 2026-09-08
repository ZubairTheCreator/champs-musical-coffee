# Champs Musical Coffee Shop Productions

Five-page site for a coffee shop and mobile coffee catering business in Eerste River, Cape Town.
Static HTML and CSS, no build step. Open `index.html`, or serve the folder to exercise `404.html`.

```bash
python -m http.server 8000     # then http://localhost:8000/
python verify.py               # pre-handoff gate, exit 0 = clean
```

Built to the STB Studios design brief (`../CLAUDE-DESIGN-PROMPT-Champs.md`), Small Business
Package **Plus** tier — the 5-page build with the on-page SEO layer.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home. Hero, three services, catering areas, Google rating, visit CTA |
| `services.html` | Coffee shop, coffee catering, coffee products |
| `gallery.html` | Six real photographs of the coffee |
| `about.html` | Trading since 2015, what they care about, areas served |
| `contact.html` | Phone, address, areas, embedded map, directions. Carries the second JSON-LD block |
| `404.html` | `noindex`. Uses absolute URLs because GitHub Pages serves it from any path |

## Design system

Not negotiable per-client theming. The palette is the client's own three colours mapped to one
ground, one ink, one accent, two neutrals — all in `assets/css/styles.css` as `--*` tokens. No
stray hex anywhere.

| Role | Token | Value |
|---|---|---|
| Ground | `--ground` | `#241610` espresso |
| Ink | `--ink` | `#F7F0E1` cream |
| Accent (CTA / active only) | `--accent` | `#F2C14E` banana |
| Neutral, surfaces | `--coffee` | `#6B4A31` |
| Neutral, small text **on the ground only** | `--taupe` | `#A79683` |

`--taupe` does not pass AA on cream and is never used there.

Type is two families: **Fraunces** display, **Inter** text. The design is driven by scale contrast
— set `h1`/`h2`/`h3` sizes explicitly, never let them fall back to browser defaults.

Motion lives in `assets/js/site.js` and is decorative only. With JavaScript off or
`prefers-reduced-motion: reduce`, every section is already in its final readable state.

## Not shipped, and why

- **No hero photograph.** No photograph of the shop exists yet. The hero runs on flat ground plus a
  real cut-out rather than a stock image of somebody else's cafe. Drop a real hero photo in and add
  a `.band__bg` div to the hero section.
- **No owner bio.** Client details pending.
- **No opening hours, anywhere, including the schema.** See BLOCKERS below.
- **No email address, no contact form, no WhatsApp button.** Phone only, by instruction. Nothing on
  the site implies a form exists.
- **No `aggregateRating` in the JSON-LD.** The 4.8 is verified on the live Google listing; the
  review count is not, and `aggregateRating` needs both. The rating appears as linked text instead.
- **No certifications.** Pending from the client.

## BLOCKERS before this goes to a client domain

1. **Opening hours contradict the Google listing.** The client says 6am–8pm. The live Google
   Business Profile says **Tuesday, 6–8 pm**, and lists no other day. One of them is wrong. Hours
   are omitted from the page and from the schema until this is settled — do not guess, and fix the
   GBP at the same time.
2. **No domain.** Every canonical, `og:url`, `og:image` and `sitemap.xml` entry currently points at
   the GitHub Pages URL, which is real and resolves. When the domain lands, find and replace
   `https://zubairthecreator.github.io/champs-musical-coffee` across all `.html`, `sitemap.xml` and
   `robots.txt`, then resubmit the sitemap.
3. **No website on the Google Business Profile.** Add the URL once the domain is live.
4. **Photography.** Everything in `assets/img/` is a cup of coffee. Nothing of the premises, the
   staff, the owner, a catering setup, or the retail products. The backgrounds are portrait phone
   photographs upscaled into wide bands and they are soft on desktop. This is the single biggest
   improvement available to the site.

## Adding photos later

Drop the file in `assets/img/` with a descriptive, hyphenated filename (never `IMG_1234.jpg`),
compress it first, and set both `src` and a real `alt` describing what the photo actually shows.
Backgrounds go on `.band__bg` as `background-image` with a `background-position` tuned for a wide
crop; foreground cut-outs need a transparent background and go on an `<img class="cutout">`.

## SEO

`on-page-seo-basics` is baked in per page: unique title under 60 characters, unique description
around 150, exactly one `h1`, descriptive filenames and alt text, clean internal links, canonical,
Open Graph and Twitter tags, `robots.txt`, `sitemap.xml`, and `CafeOrCoffeeShop` JSON-LD with the
specific trade type rather than generic `LocalBusiness`. The NAP is byte-identical in every footer
and both schema blocks — `verify.py` fails on drift, so keep it that way.

GA4 is not connected. Every page has a commented slot in `<head>` for the tag.
