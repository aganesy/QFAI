# DESIGN.md Specification

`DESIGN.md` lives at the **consuming-project root** and is the single
source of truth for brand identity. It is generated as a draft by
`/qfai-discussion` and frozen by `/qfai-sdd` Phase 0 into
`.qfai/contracts/design/DESIGN.md.lock.yaml` (sha256 record).

`/qfai-prototyping` reads it as read-only context. The compliance gate
rejects iter HTML that introduces colors, fonts, radii, or shadows
outside this file.

A reference copy is shipped in this skill at
`templates/DESIGN.md.sample`.

## File shape

```
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
    scale: map # xs..3xl
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
`.qfai/assistant/skills/qfai-discussion/references/design-md-brand-catalog.md`:
`minimal | bold | corporate | playful | organic | tech | elegant |
casual`. Read that reference for archetype semantics, do not duplicate
here.

## `accessibility` allowed keys

`accessibility` accepts exactly `contrast_ratio_min` and `motion`. The
list is CLOSED: any other key fails the whole-file parse with
`QFAI-DCON-033`, and the message names the allowed set.

An unknown key is rejected rather than ignored because a dropped
directive would still hash into `DESIGN.md.lock` while the parsed
tokens the iterate and certify stages read would not carry it — the
document and its lock would agree, and neither would match what was
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

## Hash

`hashDesignMd(text)` returns `sha256(text)` over the raw UTF-8 bytes,
including front-matter delimiters. Any change to the file — including
whitespace inside the body — produces a new hash and breaks the lock.
