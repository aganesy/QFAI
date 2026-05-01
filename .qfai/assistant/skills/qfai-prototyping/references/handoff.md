# Handoff (post-loop)

## Inputs

`.qfai/prototypes/iter-<final>/index.html` — the final accepted iteration HTML. The "final" iter is whichever iteration was the latest when `qfai prototyping iterate` returned exit 64 (convergence) or 65 (max-iterations).

## Outputs

### `.qfai/prototypes/final/index.html`

A copy (not a symlink) of the latest accepted iter. `/qfai-implement` reads this as a read-only artifact.

### `.qfai/contracts/design/design-system.yaml` (output contract)

Extracted deterministically from the final iter's HTML:

- color tokens: top-N most-used CSS variables / hex values
- typography scale: declared `font-family` / `size` / `weight` / `line-height`
- spacing scale: most-used `padding` / `margin` / `gap` values
- radii: distinct `border-radius` values
- shadows: distinct `box-shadow` values

LLM assistance is allowed for naming (primary / surface / accent etc.).

### `.qfai/contracts/design/prototype-handoff.yaml`

```yaml
schemaVersion: "2.0"
finalIterIndex: <number>
finalArtifact: ".qfai/prototypes/final/index.html"
extractedDesignSystem: ".qfai/contracts/design/design-system.yaml"
implementationNotes: |
  Plain prose. Visual identity summary, key interaction patterns,
  what makes this artifact distinct from generic AI defaults.
```

The v1.x preserve / adapt / copy three-category split is removed. The artifact itself is the SSOT.

## Cert

Run `qfai prototyping certify` to produce `.qfai/evidence/prototyping/completion-certificate.json` (`schemaVersion: "2.0"`). Use `certify --check` to verify digests.
