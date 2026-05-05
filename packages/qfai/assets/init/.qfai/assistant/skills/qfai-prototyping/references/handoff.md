# Handoff (post-loop)

## Inputs

`.qfai/prototypes/iter-<final>/index.html` — the final accepted
iteration HTML. The "final" iter is whichever iteration was the latest
when `qfai prototyping iterate` returned exit 64 (convergence) or 65
(max-iterations).

`DESIGN.md` (root) and `.qfai/contracts/design/DESIGN.md.lock.yaml`
remain the brand SSOT through handoff.

## Outputs

### `.qfai/prototypes/final/index.html`

A copy (not a symlink) of the latest accepted iter. `/qfai-implement`
reads this as a read-only artifact.

### `.qfai/contracts/design/design-system.yaml` (output contract)

A deterministic, machine-generated **mirror of DESIGN.md tokens**. The
loop does not extract values from the final HTML — that path is
removed because it allowed drift from the SSOT.

The mirror copies these keys verbatim from `DESIGN.md`:

- `visual.colors` (all 12 keys)
- `visual.typography.family_sans` / `family_display` / `family_mono`
- `visual.typography.scale` and `weight`
- `visual.spacing`
- `visual.radius` (all 4 keys)
- `visual.shadow` (all 3 keys)

The mirror also records `source: DESIGN.md` and the
`DESIGN.md.lock.yaml` sha256 so downstream tooling can detect drift.
LLM assistance is not used here; the mirror is byte-deterministic.

### `.qfai/contracts/design/prototype-handoff.yaml`

```yaml
finalIterIndex: <number>
finalArtifact: ".qfai/prototypes/final/index.html"
designMdPath: "DESIGN.md"
designMdSha256: "<hex from DESIGN.md.lock.yaml>"
designSystemMirror: ".qfai/contracts/design/design-system.yaml"
implementationNotes: |
  Plain prose. Information-architecture summary, navigation patterns,
  state coverage, and any usability decisions worth carrying into
  /qfai-implement. Do not restate brand identity — read DESIGN.md.
```

The artifact itself is the SSOT for component structure. DESIGN.md is
the SSOT for brand identity. There is no preserve / adapt / copy split.

## Cert

Run `qfai prototyping certify` to produce
`.qfai/evidence/prototyping/completion-certificate.json`. The
certificate includes `designMdPath` + `designMdSha256` for the locked
brand identity. Use `certify --check` to verify digests.
