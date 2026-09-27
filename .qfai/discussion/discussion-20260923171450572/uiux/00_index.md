# uiux/ Sidecar Index

## Purpose

Manifest of all UI/UX sidecar artifacts produced during a UI-bearing discussion.

This pack is **cli-only**: `ui_bearing: true`, `primary_surface: cli`, `secondary_surfaces: []` (`../01_Context.md` `## UI-bearing Classification`). Its surface is what the operator and the harness see in the terminal: the free-text entry and its questions in the host, the `npx qfai workflow` commands, and the `npx qfai init` report.

## File Inventory

Brand-level intent (product intent, brand signals, anti-goals,
reference pool framed as deviate-from inputs) is recorded in
`04_Sources.md`, not in this sidecar family. `/qfai-sdd` Phase 0 turns
that record into root `DESIGN.md` — on a visual-prototyping surface
(`web`, `mobile`, `desktop`, `mixed`) only. A cli-only pack has no
brand-level intent layer at all.

| File                      | Purpose                                  | Required |
| ------------------------- | ---------------------------------------- | -------- |
| 00_index.md               | This manifest                            | Yes      |
| 40_screen_contracts.md    | Screen interaction contracts (11 fields) | Yes      |
| 50_review_input_bundle.md | Review input bundle                      | Yes      |

## Screen Inventory

| Screen  | Route                                                                              | Requirements                                                           |
| ------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SCR-001 | `host: free-text change request`                                                   | REQ-0001 to REQ-0006, REQ-0009, REQ-0011, REQ-0059                     |
| SCR-002 | `host: qfai-run question — create a new capability`                                | REQ-0018, REQ-0042 to REQ-0044                                         |
| SCR-003 | `host: qfai-run question — the decision or fact the run needs`                     | REQ-0008, REQ-0009, REQ-0012, REQ-0018, REQ-0042                       |
| SCR-004 | `host: qfai-run notice — run halted (blocked, fail-closed, stopped or failed)`     | REQ-0026, REQ-0031 to REQ-0033, REQ-0037, REQ-0040, REQ-0058, REQ-0059 |
| SCR-005 | `host: qfai-run report — after npx qfai workflow finish`                           | REQ-0010, REQ-0021, REQ-0037, REQ-0061                                 |
| SCR-006 | `host: free-text request → a stage skill selected by the host, with no work order` | REQ-0050, REQ-0051, REQ-0053                                           |
| SCR-007 | `npx qfai workflow start`                                                          | REQ-0015, REQ-0024, REQ-0025, REQ-0027, REQ-0068                       |
| SCR-008 | `npx qfai workflow next`                                                           | REQ-0013, REQ-0016, REQ-0026, REQ-0034                                 |
| SCR-009 | `npx qfai workflow resume`                                                         | REQ-0020, REQ-0029, REQ-0030                                           |
| SCR-010 | `npx qfai workflow accept`                                                         | REQ-0017, REQ-0028, REQ-0035, REQ-0037, REQ-0045, REQ-0047             |
| SCR-011 | `npx qfai workflow decision`                                                       | REQ-0018, REQ-0028, REQ-0032, REQ-0033, REQ-0041                       |
| SCR-012 | `npx qfai workflow status`                                                         | REQ-0019, REQ-0021, NFR-0012                                           |
| SCR-013 | `npx qfai workflow finish`                                                         | REQ-0060 to REQ-0063                                                   |
| SCR-014 | `npx qfai init (fresh install and upgrade)`                                        | REQ-0024, REQ-0059, REQ-0064, REQ-0065                                 |

The rules every `npx qfai workflow` screen shares (JSON on stdout, logs on stderr, what exit 0 means) are stated once, in the section of `40_screen_contracts.md` headed "Rules Shared by the npx qfai workflow Screens".

## Completeness Rule

All three required files above MUST be present for every UI-bearing pack.
Partial generation is not permitted.

Root `DESIGN.md` is not one of them. `/qfai-sdd` Phase 0 authors it, and only
on a visual-prototyping surface (`web`, `mobile`, `desktop`, `mixed`). A
cli-only pack — `primary_surface: cli` with no visual surface in
`secondary_surfaces` — never gets one: Phase 0 skips the freeze, and
`/qfai-prototyping` does not run on `cli`. Do not report any pack as
incomplete for a missing `DESIGN.md`.

This pack has all three files, no `DESIGN.md` and no `prototyping.yaml`.

## Forbidden Legacy Files

The following files are NOT part of the canonical family and must NOT be created in new packs:

- `10_implementation_strategy.md` — discussion carries directions unranked, so it selects no strategy
- `11_design_taste_interview.md` — brand signals are recorded in `04_Sources.md`
- `12_design_system.md` — replaced by root `DESIGN.md` and the design contracts under `.qfai/contracts/design/`
- the `20`–`24` design-evaluation family — the evaluator axes are fixed by the CLI, not authored here
- `30_option_comparison.md` — replaced by root `DESIGN.md`
- `31_selected_anchor_screen.md` — replaced by root `DESIGN.md`
- `33_exploration_rubric.md` — replaced by the fixed evaluator axes (`.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`)
- `34_evaluator_calibration.md` — replaced by the fixed evaluator axes (`.qfai/assistant/skills/qfai-prototyping/references/reviewer-prompt.md`)
- `40_contracts.md` — replaced by `40_screen_contracts.md`
- `50_review_bundle.md` — replaced by `50_review_input_bundle.md`
- `60_critique_loop.md` — removed (critique integrated into review bundle)
