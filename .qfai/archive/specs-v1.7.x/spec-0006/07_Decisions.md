# 07 Decisions

## Decisions

| DR-ID   | Title                                                | Adopted Option                                                                          | Source                                 | Rationale                                                                                                                                                                                                              |
| ------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DR-0080 | Static-first as default prototyping mode             | Default mode is low-cost (static-only); runtime-heavy validation is explicit opt-in     | discussion-20260329195516830, REQ-0001 | P0-01 audit finding: the previous runtime-heavy default imposed environment setup overhead on all users. Static-first removes this friction. Runtime validation remains available via --mode standard or full-harness. |
| DR-0081 | Three-tier mode structure for prototyping CLI        | low-cost / standard / full-harness with distinct completion criteria per mode           | discussion-20260329195516830, REQ-0003 | Single undifferentiated mode caused confusion about expected evidence level and runtime requirements. Three tiers give users a clear cost/depth trade-off at the CLI surface.                                          |
| DR-0082 | Full-harness mode routing rather than implementation | `--mode full-harness` in this skill emits routing guidance; implementation in spec-0031 | discussion-20260329195516830, REQ-0003 | Full-harness loop (planner/generator/evaluator) belongs to spec-0031 (CAP-0031). Routing avoids duplication and keeps this skill's scope focused on static-first and standard-path concerns.                           |
| DR-0084 | Default mode override to standard | Default: `standard` (overrides DR-0080). CLI --mode > discussion > system default. | qfai_prototyping_mode_switch_ux_proposal.md, user approval 2026-03-30 | Serves majority use cases; deterministic precedence; DR-0080 via `--mode low-cost`. |

## Rejected Options

| DR-ID   | Rejected Option                               | Reason                                                                                                 |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| DR-0080 | Keep runtime-heavy validation as default      | P0-01 confirmed this blocks users without full environment setup; violates static-first principle      |
| DR-0080 | Auto-detect mode from project configuration   | Implicit mode selection hides the active mode from the user; breaks auditability of prototyping run    |
| DR-0081 | Single mode with granular flags               | Proliferates flags and obscures the cost/depth trade-off; harder to document in skill contract         |
| DR-0082 | Implement full-harness loop within this skill | Would duplicate spec-0031 scope; creates two competing implementations; violates single-responsibility |
| DR-0084 | Keep low-cost as default (maintain DR-0080)   | standard is more appropriate for majority of use cases; low-cost remains available as explicit opt-in  |
| DR-0084 | Ignore discussion artifact recommendation     | Loses artifact-driven mode recommendation; makes mode resolution less intelligent                      |
