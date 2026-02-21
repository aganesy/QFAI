<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-discuss
title: QFAI Discuss (OQ-Driven Interview)
description: "Run structured discuss loops until Open OQ is zero and emit a fixed 9-file discuss pack."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Researcher, Facilitator, Interviewer, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-discuss - OQ-Driven Interview

[DRIFT-PROTOCOL:MANDATORY]

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/discuss/README.md`
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/review-roster.yml`
  - `.qfai/assistant/templates/rcp_footer.md`
- Keep templates as source of truth and preserve file naming/order.

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

- Delegate final completion gate to an independent Reviewer.
- Reviewer must check Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are risk signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discuss/discuss-YYYYMMDDhhmmssSSS/`.
- Timestamp format is fixed to `YYYYMMDDhhmmssSSS` (3-digit milliseconds).
- Legacy `DISCUSS-XXXX` may coexist, but new outputs MUST use timestamp naming.
- Required fixed files:
  - `01_Context.md`
  - `02_Hearing.md`
  - `03_Config-Hearing.md`
  - `04_Deep-Dive.md`
  - `05_OQ-Register.md`
  - `06_OQ-Resolution-Log.md`
  - `07_Deferred.md`
  - `08_Review-Request.md`
  - `09_delta.md`
- Discuss completion requires `Disposition: open` count to be zero in `05_OQ-Register.md`.
- `deferred` is allowed only when required metadata is complete.
- Review roster is fixed by `.qfai/assistant/steering/review-roster.yml` and must be executed in full.
- RCP wording must be sourced from `.qfai/assistant/templates/rcp_footer.md`.
- Discuss artifacts are logs/rationale and must not duplicate spec SSOT.
- If diagrams are written, Mermaid syntax must be in ` ```mermaid ` fences only.
- Do not enforce fixed EX/BR or TC/EX ratios in this phase.
- Example Mapping is mandatory and must be captured as `Example Seeds` sections.

## Goal

Produce a fixed discuss pack with explicit decisions and OQ states so downstream phases start without unresolved blockers.

## Non-goals

- Editing `.qfai/specs/**` directly.
- Writing implementation-level details.
- Leaving open blockers hidden in free text.

## Mandatory Outputs

- `.qfai/discuss/discuss-*/01_Context.md`
- `.qfai/discuss/discuss-*/02_Hearing.md`
- `.qfai/discuss/discuss-*/03_Config-Hearing.md`
- `.qfai/discuss/discuss-*/04_Deep-Dive.md`
- `.qfai/discuss/discuss-*/05_OQ-Register.md`
- `.qfai/discuss/discuss-*/06_OQ-Resolution-Log.md`
- `.qfai/discuss/discuss-*/07_Deferred.md`
- `.qfai/discuss/discuss-*/08_Review-Request.md`
- `.qfai/discuss/discuss-*/09_delta.md`
- review artifacts under `.qfai/review/review-<timestamp>/`
- Evidence file: `.qfai/evidence/discuss-*.md`
- Reviewer notes (`PASS` or `REVISE`)

## Required Process

1. Run the core interview for product concept, scope, and policy.
2. Run config hearing for steering, constraints, and test-layer readiness.
3. Run Example Mapping pass for each BR/AC candidate and capture `Example Seeds` in:
   - `02_Hearing.md` (requirements-oriented seeds)
   - `03_Config-Hearing.md` (constraints/policy-oriented seeds)
4. Run deep dive for risks, boundary conditions, and alternatives.
5. Update `05_OQ-Register.md` with all identified OQs.
6. Run OQ resolution hearing repeatedly until open count is zero.
7. Move deferred items to `07_Deferred.md` with mandatory metadata.
8. Update `06_OQ-Resolution-Log.md`, `08_Review-Request.md`, and `09_delta.md`.
9. Request review and record Reviewer result.

## Example Mapping Perspectives (Mandatory)

For each BR/AC candidate, enumerate concrete example seeds with these perspectives:

1. Happy path
2. Negative path
3. Edge / boundary
4. Permission / role
5. State transition (if stateful)
6. Idempotency / retry (if external I/O exists)

Rules:

- Use perspective coverage as the gate, not raw case counts.
- Mark intentionally skipped perspectives with reason and follow-up.
- Feed unresolved seeds into OQ items with owner and decision point.

## OQ Data Model (Mandatory)

`05_OQ-Register.md` must include these fields for each OQ:

- `OQ-ID` (`OQ-0001` format)
- `Title`
- `Gate` (`discuss|require|sdd`)
- `Disposition` (`open|resolved|deferred|rejected`)
- `Owner` (`user|agent|team`)
- `Rationale` (required for deferred/rejected)
- `Options` (at least two alternatives and one recommended option)
- `Next-Decision-Point` (required for deferred)
- `Evidence`

## Deferred Metadata Rules (Mandatory)

`07_Deferred.md` must include:

- `Rationale`
- `Owner`
- `Options` (minimum two + recommended)
- `Next-Decision-Point`
- `Impact` (spec/tests/implementation/operations)
- `Mitigation`
- `Evidence`

## Review Gate Artifacts (RCP)

For each review cycle, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

RCP rules:

- Append-only: create a new review pack for each cycle.
- Apply `.qfai/assistant/templates/rcp_footer.md` as the common footer rule set.
- Any `FAIL` requires return/fix/full rerun from the first reviewer.
- Mark fixed only when all reviewers are `PASS` or valid `N/A`.

## RCP Footer Include (MUST)

- Include and follow `.qfai/assistant/templates/rcp_footer.md` without rewriting it per skill.
- Roster and loop rules must stay synchronized with the footer SSOT.

## Required Coverage Topics

Before completion, confirm all are covered:

1. product concept and target users
2. scope boundary and anti-goals
3. non-functional requirements (NFR)
4. performance constraints and SLO assumptions
5. security constraints and risk controls

## Completion Contract (Shared)

Before declaring completion, you MUST:

- verify all mandatory output files exist and are populated;
- ensure `Disposition: open` count is zero;
- ensure every deferred item has full metadata;
- ensure `Example Seeds` sections are present and perspective coverage is explicit;
- avoid duplicating finalized spec content in discuss outputs.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/discuss-*.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Interview summary
- OQ register summary
- Deferred summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- generated discuss path (`.qfai/discuss/discuss-*/`)
- open OQ count
- deferred OQ count
- reviewer result
- ready-for-next command (`/qfai-require`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Required discuss files `01..09` were produced.
- [ ] OQ register fields follow the mandatory data model.
- [ ] `Disposition: open` count is zero at completion.
- [ ] Deferred items include required metadata (`Impact`, `Mitigation`, etc.).
- [ ] Mermaid fence rules were satisfied when diagrams were used.
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

- [ ] Review artifacts were generated for each required discuss review cycle.
- [ ] All required reviewers completed their reviews for each review pack.
- [ ] Any feedback triggered return/fix and a new review pack was appended.
- [ ] `summary.json` satisfies the required schema.

## Completion Message & Next Actions (MUST)

You MUST end the user-facing output with a handoff sentence to `/qfai-require` in the active user language.

- Japanese output (use this exact sentence):
  質問が完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-require』と入力してください。
- Non-Japanese output:
  Use the same meaning in the user's language, and keep `/qfai-require` as a literal command token.

- Proceed (recommended): `/qfai-require`.
  Action: convert discuss outputs into a require-pack with source-linked requirements.
- Upstream idea is still unclear: rerun `/qfai-discuss`.
  Action: continue hearing loops until OQ states are explicit and complete.
- Need additional risk analysis before require:
  Action: add additional deep-dive findings to `04_Deep-Dive.md` and update OQ decisions.
