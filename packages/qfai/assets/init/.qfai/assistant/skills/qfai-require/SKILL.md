<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-require
title: QFAI Require (Require Pack + Evidence)
description: "Create a mandatory 9-file require-pack with source traceability, constraints, and non-blocking OQ."
argument-hint: "<source-inputs-or-context> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Facilitator, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-require - Require Pack + Evidence

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/assistant/steering/review-roster.yml`
  - `.qfai/assistant/templates/rcp_footer.md`
- Keep section names and file ordering stable.
- `require/` stores intake artifacts for SDD preflight and must be complete before `/qfai-sdd`.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator only creates work orders, delegates tasks, integrates outputs, and presents to the user.
- Orchestrator MUST NOT author the primary artifact first draft.
- Orchestrator MUST NOT self-approve.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, ask for explicit Simulation mode approval.
3. Without approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final gate to an independent Reviewer.
- Reviewer must verify Drift Protocol compliance and check alignment with `.qfai/assistant/steering/test-layers.md`.
- For quality signals, floors/ratios are not gates; they are risk signals.
- Continue only when Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Output path for each run is fixed to `.qfai/require/require-YYYYMMDDhhmmssSSS/` (Asia/Tokyo).
- `.qfai/require/README.md` remains at the root as structure SSOT.
- Required files are fixed:
  - `01_Sources.md`
  - `02_Scope.md`
  - `03_REQ.md`
  - `04_NFR.md`
  - `05_Glossary.md`
  - `06_Constraints.md`
  - `07_Policy.md`
  - `08_OQ.md`
  - `09_delta.md`
- `require/` must not contain spec-level SSOT documents.
- `require/` must not define Business Flow / User Stories / Acceptance Criteria / Business Rules / Examples / Test Cases.
- `require/` must not contain operational status fields; store status in `.qfai/status/*.json`.
- Do not create legacy files under `require/`:
  - `require.md`, `actors.md`, `glossary.md`, `business-flows.md`
- Do not create new legacy `REQUIRE-XXXX` directories.
- Timestamp format is fixed to `YYYYMMDDhhmmssSSS` (3-digit milliseconds).
- Keep extracted requirements concise and source-linked.
- If diagrams are included, Mermaid syntax must be written in ` ```mermaid ` fences only.
- Do not write Mermaid syntax in ` ```text ` or language-less fences.
- `Disposition: open` with `Gate: discuss|require|sdd` is blocking and must not remain.
- If information is missing, record OQ as `deferred` with required metadata.
- Review roster is fixed by `.qfai/assistant/steering/review-roster.yml` and must be executed in full.
- RCP wording must be sourced from `.qfai/assistant/templates/rcp_footer.md`.

## Goal

Create a complete require-pack so `/qfai-sdd` can pass preflight without blocking errors.

## Non-goals

- Authoring `_shared` specs directly.
- Generating full requirement narratives inside `require/`.
- Implementing code or tests.

## Mandatory Outputs

- `.qfai/require/require-*/01_Sources.md`
- `.qfai/require/require-*/02_Scope.md`
- `.qfai/require/require-*/03_REQ.md`
- `.qfai/require/require-*/04_NFR.md`
- `.qfai/require/require-*/05_Glossary.md`
- `.qfai/require/require-*/06_Constraints.md`
- `.qfai/require/require-*/07_Policy.md`
- `.qfai/require/require-*/08_OQ.md`
- `.qfai/require/require-*/09_delta.md`
- review artifacts under `.qfai/review/review-<timestamp>/`
- Evidence file: `.qfai/evidence/require-*.md`
- Reviewer notes (`PASS` or `REVISE`).

## Required Process

1. Collect source inputs (files, links, pasted text, assumptions).
2. Register source traceability in `require-*/01_Sources.md` with stable `SRC-XXXX` identifiers.
3. Define scope and requirements in `02_Scope.md` and `03_REQ.md`.
4. Capture NFR, glossary, constraints, and policy in `04_NFR.md` to `07_Policy.md`.
5. Record unresolved decisions in `08_OQ.md` using `deferred` (no blocking `open`).
6. Update `09_delta.md` with change and rejection rationale.
7. Produce/refresh evidence and request Reviewer gate.

## Review Gate Artifacts (RCP)

For each completed layer gate, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

Recommended require layer gates:

- `sources` (`01_Sources.md`)
- `requirements` (`03_REQ.md`)
- `constraints` (`06_Constraints.md`)
- `open-questions` (`08_OQ.md`)

RCP rules:

- Append-only: create a new `review-<timestamp>` directory for each review cycle.
- Apply `.qfai/assistant/templates/rcp_footer.md` as the common footer rule set.
- `summary.json` must satisfy the minimum schema (`version`, `created_at`, `target`, `roster`, `overall_status`).
- Keep `R\\d+_*.md` reviewer files at least one.
- Use templates from `.qfai/assistant/skills/qfai-require/templates/review/`.

## RCP Footer Include (MUST)

- Include and follow `.qfai/assistant/templates/rcp_footer.md` without rewriting it per skill.
- Roster and loop rules must stay synchronized with the footer SSOT.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- verify all mandatory files exist and are non-empty;
- ensure each requirement item references at least one source ref;
- keep unresolved unknowns explicit in `require-*/08_OQ.md` as `deferred`;
- avoid duplicating lower-level spec content in `require/`.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/require-*.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Sources indexed (count + IDs)
- Requirement index summary (count + notable gaps)
- Open questions summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- generated files under `.qfai/require/require-*/`
- source count and indexed requirement count
- unresolved OQ count
- reviewer result
- ready-for-next command (`/qfai-sdd-refinement` or `/qfai-sdd`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `01_Sources.md`..`09_delta.md` exist.
- [ ] Every requirement entry references source refs.
- [ ] Mermaid fence rules were satisfied when diagrams were used.
- [ ] `_shared/04_Business-Flow.md` includes at least one Mermaid diagram.
- [ ] Every row in `05_Examples.md` includes `BR-Ref`.
- [ ] Unknowns were logged as Open Questions.
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

- [ ] Review artifacts were generated for each reviewed require layer.
- [ ] All required reviewers completed their reviews for each review pack.
- [ ] Any feedback triggered return/fix and a new review pack was appended.
- [ ] `summary.json` satisfies the minimum schema.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-sdd`.
  Action: run preflight on the latest require-pack and generate shared/spec artifacts.
- Upstream context is still unclear: `/qfai-discuss`.
  Action: clarify objective/scope/constraints, then regenerate require-pack files.
- Require-pack needs correction: rerun `/qfai-require`.
  Action: fix missing sources/links, update OQ dispositions, and refresh delta.
