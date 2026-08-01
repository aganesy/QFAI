# UI-bearing Playbook

Use this file when `/qfai-discussion` needs the full UI-bearing decision logic.

## Classification Rule

- Classify by surface type, not by interaction complexity.

## Surface Mapping

| Surface | UI-bearing | Result                            |
| ------- | ---------- | --------------------------------- |
| web     | Yes        | Generate full uiux sidecar family |
| mobile  | Yes        | Generate full uiux sidecar family |
| desktop | Yes        | Generate full uiux sidecar family |
| cli     | Yes        | Generate full uiux sidecar family |
| mixed   | Yes        | Generate full uiux sidecar family |
| non-ui  | No         | Skip uiux sidecars                |

## Detection Signals

- Explicit classification in `01_Context.md`
- UI-oriented stories in `03_Story-Workshop.md`
- Mermaid screen flows
- HTML or visual structure hints as supporting signals only

## Sidecar Family SSOT

For UI-bearing packs the brand SSOT is root `DESIGN.md` (drafted by
`/qfai-discussion` and frozen by `/qfai-sdd` Phase 0 into
`.qfai/contracts/design/DESIGN.md.lock.yaml`). The remaining sidecars are
the screen-level UX inputs:

- `uiux/00_index.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`

### Trend Scan SSOT

Trend Scan is **not** a sidecar file. Trend Scan lives at
`04_Sources.md#Trend Scan` (part of the core 15-file discussion pack).
The legacy `uiux/20_trend_scan.md` template and the whole `uiux/20-24`
design-evaluation family were removed; evaluation axes are now global
constants and are not authored as discussion sidecars. UI-bearing
completion checks read Trend Scan from `04_Sources.md`.
