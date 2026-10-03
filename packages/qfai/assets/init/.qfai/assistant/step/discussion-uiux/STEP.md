---
name: discussion-uiux
owner: qfai-discussion
purpose: "Write the screen-level sidecars of a UI-bearing discussion pack."
requires: []
roles: [product-experience-architect, product-surface-reviewer]
routing-profile: ui-bearing
---

# discussion-uiux

Writes the exploration-first sidecar family `/qfai-sdd` and `/qfai-prototyping`
read, without forcing an early visual direction.

## Precondition

The same as `discussion-pack`: this run's stage evidence holds the
`## Grilling Session` row, its `Ended at` is written, and `Ended` is
`confirmed`, `user-closed` or `no-question`. Without that row, or with
`Ended: stopped`, write nothing and stop.

## Reads

- `.qfai/assistant/skill/qfai-discussion/references/ui-bearing-playbook.md` for
  the surface mapping and the cli-only carve-out.
- `.qfai/assistant/skill/qfai-discussion/references/design-dna-intake.md`.
- `.qfai/assistant/skill/qfai-discussion/references/ui_ux_best_practices.md`
  for the durable decision rules. Open only the `ui_ux/` appendix the current
  task needs.
- The templates under `.qfai/assistant/skill/qfai-discussion/templates/uiux/`.

## Writes

In the pack under work, the whole sidecar family, on every UI-bearing surface
including `cli`:

- `uiux/00_index.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`

## Procedure

1. Write `40_screen_contracts.md` with every screen contract in the template's
   schema. On `cli`, a contract's `route:` names the command invocation, not a
   web path.
2. Write `50_review_input_bundle.md` with the review inputs for downstream
   skills.
3. Write `00_index.md` last, listing the family.

Behavior obligations are primary; an HTML+CSS mock is an optional fallback only.
Evaluation axes are global constants (4-step ordinal: weak / acceptable /
strong / exceptional) and are not authored as discussion sidecars.

## Passes when

Read first: the target's surface classification, judged with the playbook
above. The step passes when the target is not UI-bearing. The pass names the
classification it read.

## Gate

The reviewer confirms:

- the three sidecars exist, and every screen contract carries the full template
  schema;
- exploration directions are carried unranked;
- no forbidden legacy sidecar exists under `uiux/` (see
  `.qfai/assistant/skill/qfai-discussion/templates/uiux/00_index.md#forbidden-legacy-files`).
