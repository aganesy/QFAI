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

- `uiux/00_index.md`
- `uiux/10_implementation_strategy.md`
- `uiux/11_design_taste_interview.md`
- `uiux/12_design_system.md`
- `uiux/20_design_eval_invariant.md`
- `uiux/21_design_eval_trend_derived.md`
- `uiux/22_design_eval_product_specific.md`
- `uiux/23_design_eval_aggregate.md`
- `uiux/24_design_eval_dynamic_overrides.md`
- `uiux/30_option_comparison.md`
- `uiux/31_selected_anchor_screen.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`

### Trend Scan SSOT

Trend Scan is **not** a sidecar file. Trend Scan lives at
`04_Sources.md#Trend Scan` (part of the core 15-file discussion pack).
The legacy `uiux/20_trend_scan.md` template was removed; `uiux/20_design_eval_invariant.md`
is a different axis family (design evaluation invariant criteria) and does
not own Trend Scan content. UI-bearing completion checks read Trend Scan
from `04_Sources.md`.
