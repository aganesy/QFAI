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
- `uiux/20..24`
- `uiux/30_option_comparison.md`
- `uiux/31_selected_anchor_screen.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`
