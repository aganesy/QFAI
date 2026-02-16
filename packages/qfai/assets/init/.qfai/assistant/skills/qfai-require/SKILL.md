<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-require
title: QFAI Require (Requirement Index + Evidence)
description: "Capture source traceability and a minimal requirement index for SDD preflight."
argument-hint: "<source-inputs-or-context> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Facilitator, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-require - Requirement Index + Evidence

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/contracts/**/README.md`
- Keep section names and file ordering stable.
- `require/` is an input index, not a detailed requirement SSOT.

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
  - `01_sources.md`
  - `02_requirement-index.md`
  - `03_open-questions.md`
- `require/` must not contain spec-level SSOT documents.
- `require/` must not define Business Flow / User Stories / Acceptance Criteria / Business Rules / Examples / Test Cases.
- `require/` must not contain operational status fields; store status in `.qfai/status/*.json`.
- Do not create legacy files under `require/`:
  - `require.md`, `actors.md`, `glossary.md`, `business-flows.md`
- Do not create new legacy `REQUIRE-XXXX` directories.
- Timestamp format is fixed to `YYYYMMDDhhmmssSSS` (3-digit milliseconds).
- Keep extracted requirement entries short (1-3 lines) and source-linked.
- If diagrams are included, Mermaid syntax must be written in ` ```mermaid ` fences only.
- Do not write Mermaid syntax in ` ```text ` or language-less fences.
- If information is missing, create Open Questions rather than inventing details.

## Goal

Create a minimal requirement index and evidence set so `/qfai-sdd` preflight can start reliably.

## Non-goals

- Authoring `_shared` specs directly.
- Generating full requirement narratives inside `require/`.
- Implementing code or tests.

## Mandatory Outputs

- `.qfai/require/require-*/01_sources.md`
- `.qfai/require/require-*/02_requirement-index.md`
- `.qfai/require/require-*/03_open-questions.md`
- review artifacts under `.qfai/review/require-*/<layer>/attempt-*/`
- Evidence file: `.qfai/evidence/require-*.md`
- Reviewer notes (`PASS` or `REVISE`).

## Required Process

1. Collect source inputs (files, links, pasted text, assumptions).
2. Register sources in `require-*/01_sources.md` with stable `SRC-XXXX` identifiers.
3. Extract minimal requirement index rows in `require-*/02_requirement-index.md` and link each row to source refs.
4. Record missing information and risks in `require-*/03_open-questions.md`.
5. Produce/refresh evidence and request Reviewer gate.

## Review Gate Artifacts (RCP)

For each completed layer gate, create:

- `.qfai/review/require-*/<layer>/attempt-*/review_request.md`
- `.qfai/review/require-*/<layer>/attempt-*/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/require-*/<layer>/attempt-*/summary.json`

Recommended require layer gates:

- `sources` (`01_sources.md`)
- `requirement-index` (`02_requirement-index.md`)
- `open-questions` (`03_open-questions.md`)

RCP rules:

- Start from `attempt-01` and increment attempt on every re-review cycle.
- Store fingerprint (`sha256`) and input file paths in `summary.json`.
- Any feedback means immediate return (`changes_requested`), fix, attempt increment, and full restart of reviewer sequence.
- Mark `summary.json.aggregate.status` as `fixed` only when all reviewers are `pass` and total feedback is `0`.
- Use templates from `.qfai/assistant/skills/qfai-require/templates/review/`.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- verify all mandatory files exist and are non-empty;
- ensure each index item references at least one source ref;
- keep unresolved unknowns explicit in `require-*/03_open-questions.md`;
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
- [ ] `01_sources.md`, `02_requirement-index.md`, `03_open-questions.md` exist.
- [ ] Every indexed requirement references source refs.
- [ ] Mermaid fence rules were satisfied when diagrams were used.
- [ ] `_shared/04_Business-flow.md` includes at least one Mermaid diagram.
- [ ] Every Scenario in `05_Examples.feature` includes `# Parent:`.
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
- [ ] All required reviewers completed their reviews for each attempt.
- [ ] Any feedback triggered return, fix, attempt increment, and full re-review from the first reviewer.
- [ ] `summary.json` is marked `fixed` only when all reviewers passed with zero feedback.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-sdd-refinement` or `/qfai-sdd`.
  Action: run preflight (specs-first / require-indexed / import-lite / interview-start) and produce shared/spec artifacts.
- Import-lite path: `/qfai-sdd` with `import-lite`.
  Action: when only external materials exist, generate minimal spec inputs first and continue SDD.
- Upstream context is still unclear: `/qfai-discuss`.
  Action: clarify objective/scope/constraints, then regenerate index files.
- Require index needs correction: rerun `/qfai-require`.
  Action: fix missing sources/links and update open questions.
