---
name: qfai-discussion
title: QFAI Discussion (Exploration Planner)
description: "Run structured discussion that defines exploration conditions, evaluation rubric, and anti-goals for downstream prototyping."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    discovery-analyst,
    requirements-analyst,
    solution-architect,
    product-experience-architect,
    completion-reviewer,
    requirements-reviewer,
    architecture-reviewer,
    product-surface-reviewer,
  ]
routing-profile: requirements-heavy
mode: interactive-by-default
---

## /qfai-discussion - Exploration Planner

[DRIFT-PROTOCOL:MANDATORY]

## Goal

Produce a unified 15-file discussion pack plus exploration-first UI sidecars so `/qfai-sdd` and `/qfai-prototyping` can operate without forcing an early visual direction decision.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- Required fixed files (all 15 are mandatory) remain unchanged.
- UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.
- Discussion completion requires `Disposition: open` count to be zero in `11_OQ-Register.md`.
- If UI requirements exist, behavior obligations are primary and HTML+CSS mock is optional fallback only.
- Discussion is planner-first: do not select a single visual winner and do not finalize the design system here.
- Use artifact files, not conversational summaries, as the downstream handoff.

## UI-bearing Canonical Sidecar Family

UI-bearing packs must produce the following sidecars as primary truth:

- `uiux/30_exploration_brief.md`
- `uiux/31_reference_pool.md`
- `uiux/32_design_anti_goals.md`
- `uiux/33_exploration_rubric.md`
- `uiux/34_evaluator_calibration.md`
- `uiux/40_screen_contracts.md`
- `uiux/50_review_input_bundle.md`

## Required Process

1. Run the core interview for concept, scope, stakeholders, and constraints.
2. Run Inception Deck and include at least one Mermaid diagram.
3. Run Story Workshop, capture user stories and user flows, and keep HTML+CSS mock as optional fallback only.
4. Register source traceability and reference research in `04_Sources.md`.
5. Capture scope, REQ, NFR, glossary, constraints, and policies.
6. Run Example Mapping and capture `Example Seeds`.
7. Update `11_OQ-Register.md`, resolve OQs until open count is zero, and move deferred items to `13_Deferred.md`.
8. Generate the exploration-first sidecar family for UI-bearing targets.
9. Generate `prototyping.yaml` only when the latest discussion pack is UI-bearing and an explicit prototyping recommendation is useful.
10. Request review and record the Reviewer result.

## UI-bearing Authoring Requirements

- `30_exploration_brief.md` must define product intent, must-preserve interactions, brand signals, and differentiation targets.
- `31_reference_pool.md` must define exploration references, adopted points, rejected points, and local translation.
- `32_design_anti_goals.md` must contain explicit anti-goals and recurrence prevention notes.
- `33_exploration_rubric.md` must define design quality, originality, craft, and functionality grading criteria.
- `34_evaluator_calibration.md` must include good critique examples, too-lenient examples, blandness-fail examples, and originality-fail examples.
- `50_review_input_bundle.md` must document best-of-history handling so later iterations are not automatically preferred.

## Completion Contract (Shared)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

Before declaring completion, you MUST:

- verify all 15 mandatory output files exist and are populated;
- ensure `Disposition: open` count is zero in `11_OQ-Register.md`;
- ensure every deferred item has full metadata in `13_Deferred.md`;
- ensure `02_Inception-Deck.md` and `03_Story-Workshop.md` include Mermaid diagrams;
- ensure the UI-bearing sidecar family is complete;
- run `qfai validate --profile discussion --fail-on error` and fix discussion-owned findings;
- avoid selecting a single visual winner in discussion artifacts.

### Reviewer Gate (MUST)

Reviewer checks must confirm:

- the 15-file discussion pack is complete
- `Disposition: open` count is zero in `11_OQ-Register.md`
- the UI-bearing sidecar family is complete when the pack is UI-bearing
- discussion stayed planner-first and did not choose a single visual winner
- Drift Protocol is enforced
- review policy is checked against `.qfai/assistant/steering/test-layers.md`
- planning and coverage heuristics are signals, not gates
- review findings end with `Status (PASS/REVISE)`
- Reviewer result is explicit as `PASS` or `REVISE`

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- do not self-approve
- use artifact files as the handoff surface
- integrate delegated outputs only after checking pack completeness

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE)` column, reviewer response `Result: PASS | REVISE`).

## Completion Message & Next Actions (MUST)

You MUST end the user-facing output with a handoff sentence to `/qfai-sdd` in the active user language.

- Japanese output (use this exact sentence):
  ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。
