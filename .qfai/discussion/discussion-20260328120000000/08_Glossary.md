# 08 Glossary

## Terms

| Term                    | Definition                                                                                                                                                 | Context                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Sidecar                 | A supplementary artifact directory (`uiux/`) generated alongside the core 15-file discussion pack for UI-bearing projects                                  | QFAI discussion                                                                                                                    |
| UI-bearing              | A project classification indicating the target product includes user-facing visual interfaces (web, mobile, desktop)                                       | QFAI classification                                                                                                                |
| Surface Classification  | The categorization of a project's UI surface type (web-ui, mobile-ui, desktop-ui, mixed, non-ui)                                                           | uiux/ sidecar                                                                                                                      |
| Implementation Strategy | A YAML-block-in-Markdown artifact defining the chosen UI/UX implementation approach (framework, component library, design system)                          | uiux/10_strategy.md                                                                                                                |
| Scoring Axes            | Three-layer evaluation framework: invariant (universal UX principles), trend-derived (current design trends), product-specific (project-unique criteria)   | uiux/20_eval_axis_usability.md, uiux/21_eval_axis_consistency.md, uiux/22_eval_axis_accessibility.md, uiux/23_eval_axis_delight.md |
| Aggregate Scoring       | Combined scoring rules that weight and merge the three scoring axes into a single evaluation framework                                                     | uiux/23_eval_axis_delight.md                                                                                                       |
| Anchor Screen           | The selected reference screen design chosen from option comparison as the primary design direction                                                         | uiux/31_anchor.md                                                                                                                  |
| Screen Contract         | A structured Markdown (table) definition of screen-level UI obligations (elements, actions, states, data bindings). May evolve to YAML in a future release | uiux/40_contracts.md                                                                                                               |
| Option Comparison       | A structured comparison of 2+ design alternatives with trade-off analysis                                                                                  | uiux/30_comparison.md                                                                                                              |
| Direct Template         | A discussion template file directly modified in this release (03, 04, 14)                                                                                  | QFAI templates                                                                                                                     |
| Batch A/B Templates     | Core discussion templates indirectly augmented with UX intent cross-references (01, 02, 05-12, 99)                                                         | QFAI templates                                                                                                                     |
| Review Bundle           | A consolidated artifact packaging sidecar outputs for reviewer consumption                                                                                 | uiux/50_review_bundle.md                                                                                                           |
| Critique Loop           | An iterative review artifact tracking design critique cycles and resolutions                                                                               | uiux/60_critique_loop.md                                                                                                           |
| Fallback Demotion       | The process of moving HTML/CSS mock from primary authoring path to secondary/fallback role                                                                 | Template design                                                                                                                    |
| Init Assets             | Template and configuration files distributed via `qfai init` to project repositories                                                                       | QFAI packaging                                                                                                                     |

## Abbreviations

| Abbreviation | Expansion                             |
| ------------ | ------------------------------------- |
| DDS          | Design Direction Summary              |
| DDP          | Design Direction Policy (QFAI-DDP-\*) |
| SDD          | Software Design Document              |
| ATDD         | Acceptance Test-Driven Development    |
| OQ           | Open Question                         |
| RCP          | Review Cycle Pack                     |
| NFR          | Non-Functional Requirement            |
| CON-UI       | UI Contract identifier                |
