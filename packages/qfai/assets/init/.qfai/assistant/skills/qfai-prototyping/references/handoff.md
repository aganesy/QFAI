# Handoff (post-loop)

## Inputs

`.qfai/prototypes/iter-<final>/index.html` — the final accepted
iteration HTML. The "final" iter is whichever iteration was the latest
when `qfai prototyping iterate` returned exit 64 (convergence) or 65
(max-iterations).

This is the **authoring** artifact — one self-contained file with one
client-side route per declared screen, written by the generator. It is
a distinct tree from the **capture** artifacts at
`.qfai/evidence/prototyping/iter-<final>/<screenId>.{html,png}`, which
`qfai prototyping iterate --capture` fans out one pair per declared
screen. Handoff mirrors the authoring artifact; `qfai prototyping
certify` gates on the capture artifacts and never opens the
`prototypes/` tree. Both must exist before handoff can complete: see
"Output layout" in `references/generator-prompt.md`.

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

- `visual.colors` (all 12 keys, required)
- `visual.typography.family_sans` / `family_display` / `family_mono` (required)
- `visual.typography.scale` and `weight` (optional in `DESIGN.md`,
  copied verbatim when present)
- `visual.spacing` (optional in `DESIGN.md`, copied verbatim when
  present)
- `visual.radius` (all 4 keys, required)
- `visual.shadow` (all 3 keys, required)

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

Order is load-bearing: `qfai prototyping certify` requires
`.qfai/output/validate.json` (with `counts.error === 0`) and
`.qfai/output/verify.json` (with `status === "PASS"`) to be present
on disk before it will seal the certificate. Run the gates in this
order, every time:

1. `qfai validate --profile prototyping --fail-on error` — writes
   `.qfai/output/validate.json`.
2. `/qfai-verify` — writes `.qfai/output/verify.json` with
   `status: "PASS"` and `scope: "prototyping"`. Certify accepts no
   other scope: `atdd` / `implement` / `full` are refused by the
   option-B phase-isolation contract, and a `full` run at this point
   necessarily fails the stage-5 ATDD traceability rules
   (`QFAI-ATDD-111/112/113`). The field list and the `scope` enum are
   specified under "Verify Output Contract" in
   `.qfai/assistant/skills/qfai-verify/SKILL.md`.
3. `qfai prototyping certify` — produces
   `.qfai/evidence/prototyping/completion-certificate.json`. The
   certificate includes `designMdPath` + `designMdSha256` for the
   locked brand identity. Use `certify --check` to verify digests
   against later edits.

Reversing this order makes step 3 fail with "validate.json missing"
or "verify.json status not PASS" — those are the certify
preconditions, not assertions about a separate state.
