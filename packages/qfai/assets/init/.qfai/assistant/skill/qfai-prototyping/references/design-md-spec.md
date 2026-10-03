# DESIGN.md Specification

`DESIGN.md` lives at the **consuming-project root** and is the single
source of truth for brand identity. `/qfai-sdd`'s `common-design-md` step authors it when
the project has none, and validates it.

`/qfai-prototyping` reads it as read-only context. Its reviewer reports
every color, font, radius or shadow an iteration uses outside this file.

A reference copy is shipped in this skill at
`templates/DESIGN.md.sample`.

## File shape

```markdown
---
<YAML front-matter: brand, audience, visual, accessibility>
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
accessibility:
  contrast_ratio_min: number
  motion: string
```

## `brand.archetype` allowed values

The 8-archetype catalog is the SSOT in
`.qfai/assistant/skill/qfai-sdd/references/design-md-brand-catalog.md`:
`minimal | bold | corporate | playful | organic | tech | elegant |
casual`. Read that reference for archetype semantics, do not duplicate
here.

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

## Validation rules

- `accessibility`: only `contrast_ratio_min` and `motion` (see above).
  `contrast_ratio_min` must be a finite number and `motion` a string;
  a present-but-wrong-typed value is rejected, not coerced.
- `visual.colors.*` (except `overlay`): must be a 6-digit or 8-digit
  hex (`#RRGGBB` or `#RRGGBBAA`). 3-digit shorthand (`#abc`) is
  rejected so the gate can do strict equality comparison.
- `visual.colors.overlay`: must be an `rgba(...)` value.
- All token strings reject leading/trailing whitespace.
- Unknown keys at any level are rejected.
- All 12 color keys, 3 font families, 4 radius keys, and 3 shadow keys
  listed above are required.

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
