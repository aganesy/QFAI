# DESIGN.md Specification

`DESIGN.md` lives at the **consuming-project root** and is the single
source of truth for brand identity. `/qfai-sdd`'s `common-design-md` step authors it when
the project has none, and validates it.

`/qfai-prototyping` reads it as read-only context. Its reviewer reports
every color, font, radius or shadow an iteration uses outside this file.

A reference copy is shipped in this skill at
`templates/DESIGN.md.sample`.

## Contents

- File shape
- Front-matter schema
- `brand.archetype` allowed values
- `brand.theme`
- `visual.layout`
- `accessibility` allowed keys
- `data_display`
- Validation rules
- Issue shape

## File shape

```markdown
---
<YAML front-matter: brand, audience, visual, accessibility, data_display>
---

# Brand Philosophy

<markdown body: voice, do/don't, audience cues>
```

## Front-matter schema

```yaml
brand:
  name: string # display name
  archetype: enum # see below
  voice: string[] # 1..N short trait words
  theme: string # optional; the published theme the token values came from
audience:
  emotion: string[] # what users should feel
  do_not_look_like: string[] # negative references
visual:
  colors:
    primary: string # 6/8-digit hex
    secondary: string # 6/8-digit hex
    accent: string # 6/8-digit hex
    surface: string # 6/8-digit hex
    surface_muted: string # 6/8-digit hex
    text: string # 6/8-digit hex
    text_muted: string # 6/8-digit hex
    danger: string # 6/8-digit hex
    warning: string # 6/8-digit hex
    success: string # 6/8-digit hex
    border: string # 6/8-digit hex
    overlay: string # rgba(...) only
  typography:
    family_sans: string # CSS font stack
    family_display: string # CSS font stack
    family_mono: string # CSS font stack
    scale: map # xs..3xl; 2xl and 3xl are keys, so keys can contain digits
    weight: map # regular/medium/bold
  spacing:
    base: string # rem
    scale: number[]
  radius:
    sm: string
    md: string
    lg: string
    full: string
  shadow:
    sm: string
    md: string
    lg: string
  layout: # optional
    breakpoints: map # sm/md/lg/xl, CSS lengths
    content_max_width: map # reading/app/form, CSS lengths
    target_min_px: number # at least 24 (WCAG 2.5.8)
    table_narrow: enum # stack | scroll
accessibility:
  contrast_ratio_min: number
  motion: string
data_display: # optional
  locale: string # e.g. "ja-JP"
  currency: string # how money is written
  number: string # how numbers are written
  date: string # how dates are written
```

## `brand.archetype` allowed values

The 8-archetype catalog is the SSOT in the brand catalog that
`/qfai-sdd`'s `common-design-md` step names: `minimal | bold | corporate |
playful | organic | tech | elegant | casual`. Read the catalog for
archetype semantics, do not duplicate here.

## `brand.theme`

Names the published theme the values below it came from, in a form a
reader can install: the design system and the theme within it.

It is optional because a project that authored its own `DESIGN.md`
before this field existed is not wrong — it just does not say. A file
`/qfai-sdd`'s `common-design-md` step writes names its theme and takes the token
values from that theme rather than composing them.

Everything downstream treats these numbers as exact: every literal in
every prototype is checked against them. Without this field there was nothing underneath
the exactness.

## `visual.layout`

The responsive values, in one place a check can read: the breakpoints, the
content width of a reading page, an app page and a form, the minimum tap
target, and how a table behaves at a narrow width (`stack` into cards, or
`scroll` inside its own container). The section is optional, so a file written
before it existed still parses. `target_min_px` is at least 24, the WCAG 2.5.8
floor; the project's own minimum may be higher. Like the other `visual` values,
these come from the adopted theme where it defines them. Each level is closed:
an unknown key fails the parse. `qfai catalog design` writes each breakpoint and
content width, and `target_min_px` in `px`, into the token file and the theme;
`table_narrow` describes behaviour, so it stays out of both.

## `accessibility` allowed keys

`accessibility` accepts exactly `contrast_ratio_min` and `motion`. The
list is CLOSED: any other key fails the whole-file parse with
`QFAI-DCON-033`, and the message names the allowed set.

An unknown key is rejected rather than ignored because a dropped
directive would stay in the file while the parsed tokens every reader
uses would not carry it, so what is read would not match what was
authored.

A new accessibility obligation does not go here. Put it in the
`# Brand Philosophy` body, or in a screen contract's
`observable_outcome`, where it is prose a reviewer reads rather than a
token the gate compares.

## `data_display`

An optional, closed section: `locale`, `currency`, `number` and `date`, each a non-empty string
saying how that value is written on screen. `qfai catalog design` writes them as text on the token
file's `data-display` group; no CSS variable carries them.

## Validation rules

- `accessibility`: only `contrast_ratio_min` and `motion` (see above).
  `contrast_ratio_min` must be a finite number and `motion` a string;
  a present-but-wrong-typed value is rejected, not coerced.
- `visual.colors.*` (except `overlay`): must be a 6-digit or 8-digit
  hex (`#RRGGBB` or `#RRGGBBAA`). 3-digit shorthand (`#abc`) is
  rejected so the gate can do strict equality comparison.
- `visual.colors.overlay`: must be an `rgba(...)` value.
- All token strings reject leading/trailing whitespace.
- No colour, font family stack, `typography.scale` size, `spacing.base`,
  radius, shadow, breakpoint or content width may hold `;`, `{`, `}`, `/*`
  or `*/`, or leave a parenthesis, bracket or quote open: `qfai catalog
design` writes each into a CSS declaration of the theme, where one would
  end it or swallow what follows.
- `visual.typography.weight.*`: a number from 1 to 1000, the font weights the
  Design Tokens Community Group 2025.10 format states.
- Unknown keys at any level are rejected.
- All 12 color keys, 3 font families, 4 radius keys, and 3 shadow keys
  listed above are required.
- `visual.layout` is optional. Its lengths are strings taken verbatim;
  `target_min_px` is a number of at least 24; `table_narrow` is `stack` or
  `scroll`.

## Issue shape

`validateDesignMd(text)` returns issues of the form:

```ts
type DesignMdIssue = {
  path: string; // dotted path, e.g. "visual.colors.primary"
  code: string; // stable machine-readable code
  message: string; // human-readable explanation
};
```

Validators emit `code` values in stable categories: `missing-key`,
`unknown-key`, `invalid-hex`, `invalid-rgba`, `whitespace`,
`invalid-archetype`, `invalid-font-stack`, `invalid-shadow`,
`invalid-radius`.
