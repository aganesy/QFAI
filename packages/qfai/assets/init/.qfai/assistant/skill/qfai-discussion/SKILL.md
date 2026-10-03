---
name: qfai-discussion
title: QFAI Discussion (Exploration Planner)
description: "Use when invoked by name or handed a QFAI work order. Its subject is a product idea or problem whose scope is not settled yet."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    discovery-analyst,
    requirements-analyst,
    solution-architect,
    product-experience-architect,
    requirements-reviewer,
    architecture-reviewer,
    product-surface-reviewer,
  ]
steps: [discussion-research, discussion-interview, discussion-pack, discussion-oq, discussion-uiux]
requires: [common-review-cycle, common-gate-run]
mode: interactive-by-default
---

## /qfai-discussion - Exploration Planner

[DRIFT-PROTOCOL:MANDATORY]

Run the entry check of
`.qfai/assistant/rule/shared-skill-operating-baseline.md#workflow-run-entry-check-mandatory`
first.

Produces the nine-file discussion pack at
`.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`, plus the exploration-first UI
sidecars, so `/qfai-sdd` and `/qfai-prototyping` can work without an early
visual direction decision.

Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it, and non-ui discussion packs typically omit it.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

## Inputs Priority

When unsure, read inputs in this order:

- P1: `.qfai/assistant/rule/*`, and `.qfai/assistant/skill/qfai-grilling/SKILL.md` before the interview
- P2: `.qfai/assistant/rule/agent-selection.md`, the routed cards under `.qfai/assistant/agent/`, and project context under `<paths.specsDir>/01_policy/**` and `<paths.specsDir>/03_contract/**`
- P3: the pack under work — `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/**`
- P4: what the project already settled (`qfai.config.yaml`, `<paths.specsDir>/01_policy/**`, `<paths.specsDir>/02_business-flow/**`, and `<paths.contractsDir>/**`)

## Steps

Run the steps in this order, as
`.qfai/assistant/rule/shared-skill-operating-baseline.md#a-parent-skill-invoked-by-name`
states: read `.qfai/assistant/step/<id>/STEP.md` for the current step only, run
it, then move to the next. A work order runs the steps it names, as
`.qfai/assistant/rule/shared-skill-operating-baseline.md#a-work-orders-steps`
states.

| Step                   | File                                                | Runs                                                  |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `discussion-research`  | `.qfai/assistant/step/discussion-research/STEP.md`  | Always, first                                         |
| `discussion-interview` | `.qfai/assistant/step/discussion-interview/STEP.md` | Always: concept, scope, stakeholders, and constraints |
| `discussion-pack`      | `.qfai/assistant/step/discussion-pack/STEP.md`      | Once the interview ends with an ending that allows it |
| `discussion-oq`        | `.qfai/assistant/step/discussion-oq/STEP.md`        | After `discussion-pack`                               |
| `discussion-uiux`      | `.qfai/assistant/step/discussion-uiux/STEP.md`      | Only for a UI-bearing target                          |

An interview that ends `stopped` ends the run: no later step runs, and every
open decision is reported as open. Integrate a delegated output only after
checking pack completeness.

## UI-bearing Canonical Sidecar Family

Decide whether the target is UI-bearing with `references/ui-bearing-playbook.md`
before running `discussion-uiux`.

Every UI-bearing pack carries `uiux/00_index.md`, `uiux/40_screen_contracts.md`
and `uiux/50_review_input_bundle.md`. That is the whole family, on every
UI-bearing surface including `cli`.

A **cli-only** pack (`primary_surface: cli`, no visual `secondary_surfaces`
entry) keeps all three sidecars, but the brand questions do not apply to it:
`/qfai-prototyping` rejects `cli`, so nothing downstream reads a `visual.*`
token tree, and `/qfai-sdd`'s `common-design-md` step writes no `DESIGN.md`. The test is
the whole classified surface set — `primary_surface` **and** every
`secondary_surfaces` entry.

## Review

After the last step, run one review of the pack under work with
`.qfai/assistant/step/common-review-cycle/STEP.md`: the specification review,
by `requirements-reviewer`, joined by `product-surface-reviewer` when
`discussion-uiux` ran and by `architecture-reviewer` when the pack records an
architecture-affecting decision. Roles are selected under
`.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

### Reviewer Gate (MUST)

The reviewers check each `## Gate` section of the steps that ran.

## Completion

The full logic, including the UI-bearing conditions, is
`references/discussion-completion-matrix.md`. Completion requires all of these:

- All nine mandatory pack files exist and are populated, and the UI sidecar family
  is complete when the target is UI-bearing.
- The open count is zero: no `Disposition: open` row is left in
  `11_OQ-Register.md`.
- `npx qfai validate --profile discussion --fail-on error`, run and recorded
  with `.qfai/assistant/step/common-gate-run/STEP.md`, passes with no
  discussion-owned finding. Repair a failure under
  `.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`.
- Every finding of the one review is fixed or answered.

## Completion Message & Next Actions (MUST)

End the turn with a question listing the next actions, `/qfai-sdd` recommended, as `.agents/rules/user-questions.md` § 6 sets out. Under a no-question mode, list them in the report instead.

## Default Autopilot Policy

- ask-user:
  - every decision the interview puts on the frontier, over every topic in `references/discussion-coverage-checklist.md`. Running the interview is what this skill performs, so these are its own operations
  - the confirmation that closes the session
- hard-required:
  - a usable requirement source
  - an identifiable affected BF or an explicit decision to create one

project_memory:

- The nine-file mandatory output set is fixed; the UI-bearing sidecar family (00_index.md + 40_screen_contracts.md + 50_review_input_bundle.md) is required whenever the target is UI-bearing, cli included. Root DESIGN.md is not a discussion output: `/qfai-sdd`'s `common-design-md` step authors it from this pack.
- Discussion is planner-first: never pick a single visual winner; carry exploration references as deviate-from inputs, not imitate-this.
- Completion requires Disposition: open count = 0 in 11_OQ-Register.md; each deferred row there records its Resolution and names when and by what signal it is reopened.
