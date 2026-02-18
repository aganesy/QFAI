<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-refinement
title: QFAI SDD Refinement (Preflight + Shared/Slice Bootstrapping)
description: "Run SDD preflight and produce shared/slice artifacts from require-pack inputs."
argument-hint: "<spec-id-or-topic> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, RequirementsAnalyst, SpecWriter, TraceabilityBuilder, QAEngineer]
mode: approval-gated

---

# /qfai-sdd-refinement - Preflight + Shared/Slice Bootstrapping

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Use skill-local templates as SSOT:
  - `.qfai/assistant/skills/qfai-sdd/templates/specs/`
  - `.qfai/assistant/skills/qfai-sdd/templates/contracts/`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/report/preflight_summary.md`
  - `.qfai/assistant/skills/qfai-sdd-refinement/templates/specs/`

## Inputs Priority (Preflight)

Determine preflight input in this exact order:

1. Latest `.qfai/require/require-*/` pack (lexicographically largest)
2. Validate require-pack readiness (required files, minimum contents, blocking OQ)
3. If validation fails, stop refinement and guide to:
   - `/qfai-require` to regenerate/fix require-pack
   - `/qfai-discuss` to resolve blocking OQ

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT self-approve.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer must check Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are risk signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Keep the current layered spec layout unchanged (`_shared + spec-XXXX`, required edges preserved).
- `require/` is input traceability only; specs remain detailed SSOT.
- Keep `specs/` definition-only. Do not write operational status fields (`release_candidate`, progress, runtime risk state) in specs; place status in `.qfai/status/*.json`.
- Always write `.qfai/report/preflight_summary.md` before generating shared/spec artifacts.
- Require-pack is always mandatory. If latest require-pack is missing/incomplete or contains blocking OQ, stop and route to `/qfai-require` or `/qfai-discuss`.
- `.qfai/specs/_shared/04_Business-Flow.md` must be Markdown and include at least one ` ```mermaid ` block with `flowchart` or `sequenceDiagram`.
- Business Flow must not be authored as Gherkin (`*Business-flow*.feature` is deprecated).
- If diagrams are written in discuss/require/spec/evidence artifacts, Mermaid syntax must be inside ` ```mermaid ` fences only.
- Missing mandatory inputs must be recorded as OQ in `.qfai/require/require-*/08_OQ.md`.
- BR/Examples/Test-cases density must be explicit:
  - BR should decompose AC into decision-level rules.
  - Examples should concretize BR.
  - Test-cases should realize Examples.
  - If counts are intentionally sparse, document reason and completion plan.

## Goal

Start SDD safely from a validated require-pack and produce shared/slice artifacts without hidden assumptions.

## Non-goals

- Final plan lock (`10_Plan.md`) when slice grounding is incomplete.
- Production code implementation.

## Mandatory Outputs

- `.qfai/specs/_shared/01_Objective.md`
- `.qfai/specs/_shared/02_Initiative.md`
- `.qfai/specs/_shared/03_Capabilities.md`
- `.qfai/specs/_shared/04_Business-Flow.md`
- `.qfai/specs/_shared/05_Contracts.md`
- `.qfai/specs/_shared/06_Glossary.md`
- `.qfai/specs/_shared/07_Constraints.md`
- `.qfai/specs/_shared/08_Decisions.md`
- `.qfai/specs/_shared/09_Open-questions.md`
- `.qfai/specs/_shared/10_delta.md`
- `.qfai/specs/spec-XXXX/01_Spec.md`
- `.qfai/specs/spec-XXXX/02_User-stories.md`
- `.qfai/specs/spec-XXXX/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-XXXX/04_Business-Rules.md`
- `.qfai/specs/spec-XXXX/05_Examples.md`
- `.qfai/specs/spec-XXXX/06_Test-Cases.md`
- `.qfai/specs/spec-XXXX/07_Decisions.md`
- `.qfai/specs/spec-XXXX/08_Open-questions.md`
- `.qfai/specs/spec-XXXX/09_delta.md` (or `*_delta.md`)
- `.qfai/report/preflight_summary.md`
- review artifacts under `.qfai/review/review-<timestamp>/`
- Evidence file: `.qfai/evidence/sdd-refinement-<spec-id>.md`

## Required Process

1. Resolve latest require-pack and run readiness checks.
2. If readiness fails, stop and guide to `/qfai-require` or `/qfai-discuss`.
3. Write `.qfai/report/preflight_summary.md` from `templates/report/preflight_summary.md`.
4. Build/update `_shared` layer with explicit source linkage.
5. Build at least one grounded spec slice (`01..06`) for target capability.
6. Record unresolved inputs as Open Questions.
7. Request Reviewer gate and record result.

## Review Gate Artifacts (RCP)

For each completed layer gate, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

RCP rules:

- Keep review directories append-only (add a new `review-<timestamp>` directory each cycle; never overwrite existing packs).
- `summary.json` must satisfy the minimum schema (`version`, `created_at`, `target`, `roster`, `overall_status`).
- Keep one or more `R\\d+_*.md` files.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- report require-pack preflight result and blockers/no-blockers;
- confirm `.qfai/report/preflight_summary.md` is generated;
- confirm shared and slice mandatory outputs exist;
- ensure unresolved gaps are represented as OQ (no silent assumptions);
- confirm required traceability edges can be derived from produced artifacts.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/sdd-refinement-<spec-id>.md`

Required sections:

- Objective
- Require-pack preflight result and rationale
- Inputs reviewed (files/paths)
- Generated/updated artifacts
- Open questions summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- require-pack preflight result
- generated shared/slice artifact paths
- unresolved OQ count
- reviewer result
- ready-for-next command (`/qfai-sdd-planning`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Require-pack preflight result was determined and recorded.
- [ ] `.qfai/report/preflight_summary.md` was generated before spec authoring.
- [ ] Shared and slice mandatory outputs exist.
- [ ] specs contain definitions only; runtime status fields are not mixed into specs.
- [ ] BR/Examples/Test-cases density and sparse-case rationale are documented.
- [ ] `_shared/04_Business-Flow.md` uses Markdown + Mermaid and includes `flowchart` or `sequenceDiagram`.
- [ ] Mermaid syntax was not written in ` ```text ` or language-less fences.
- [ ] `05_Examples.md` includes `EX-ID` and `BR-Ref` mappings.
- [ ] Missing inputs were logged in `.qfai/require/require-*/08_OQ.md`.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Diagram artifacts follow Mermaid fence rules (if diagrams were used).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Review Cycle Checklist (MUST)

- [ ] Review artifacts were generated for every required layer gate completed in this run.
- [ ] All required reviewers completed their reviews for each attempt.
- [ ] Any feedback triggered return, fix, attempt increment, and full re-review from the first reviewer.
- [ ] `summary.json` is marked `fixed` only when all reviewers passed with zero feedback.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-sdd-planning`.
  Action: finalize `spec-XXXX/10_Plan.md` (How-only) on top of grounded slices.
- Need more upstream clarification: `/qfai-discuss`.
  Action: resolve missing objective/scope/constraints and rerun refinement.
- Require index correction needed: `/qfai-require`.
  Action: refresh sources/index and update OQ before rerunning refinement.
