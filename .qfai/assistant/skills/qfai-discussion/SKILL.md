---
name: qfai-discussion
title: QFAI Discussion (Unified Discuss + Require)
description: "Run structured discussion that merges discuss and require into a single 15-file discussion pack with OQ-driven exit."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Researcher, Facilitator, Interviewer, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-discussion - Unified Discuss + Require

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed (e.g., Simulation mode selection, scope confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit choices. The reason for unavailability MUST be stated.

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/discussion/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/review-roster.yml`
  - `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`
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

| Step | Role (sub-agent) | Task title   | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ------------ | ------------ | ------------- | -------------------- |
| 1    | example-role     | example-task | file/path.md | evidence.md   | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent Reviewer.
- Reviewer must check Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are risk signals.
- Do not declare DONE until Reviewer returns `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- Timestamp format is fixed to `YYYYMMDDhhmmssSSS` (3-digit milliseconds).
- Required fixed files (all 15 are mandatory):
  - `01_Context.md`
  - `02_Inception-Deck.md`
  - `03_Story-Workshop.md`
  - `04_Sources.md`
  - `05_Scope.md`
  - `06_REQ.md`
  - `07_NFR.md`
  - `08_Glossary.md`
  - `09_Constraints.md`
  - `10_Policy.md`
  - `11_OQ-Register.md`
  - `12_OQ-Resolution-Log.md`
  - `13_Deferred.md`
  - `14_Review-Request.md`
  - `99_delta.md`
- Discussion completion requires `Disposition: open` count to be zero in `11_OQ-Register.md`.
- `deferred` is allowed only when required metadata is complete in `13_Deferred.md`.
- `02_Inception-Deck.md` MUST contain at least one Mermaid diagram in ` ```mermaid ` fences.
- `03_Story-Workshop.md` MUST contain at least one Mermaid diagram in ` ```mermaid ` fences.
- If UI requirements exist, include an HTML+CSS visual mock in `03_Story-Workshop.md`.
- Review roster is fixed by `.qfai/assistant/steering/review-roster.yml` and must be executed in full.
- RCP wording must be sourced from `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`.
- Discussion artifacts are logs/rationale and must not duplicate spec SSOT.
- If diagrams are written, Mermaid syntax must be in ` ```mermaid ` fences only.
- Do not enforce fixed EX/BR or TC/EX ratios in this phase.
- Example Mapping is mandatory and must be captured as `Example Seeds` sections in `03_Story-Workshop.md`.
- OQ Register must include all mandatory columns: OQ-ID, Title, Gate, Disposition, Owner, Rationale, Options, Recommendation, Next-Decision-Point, Due, Evidence.
- Deferred table must include all mandatory columns: OQ-ID, Title, Gate, Deferred-Reason, Deferred-Until, Owner, Due, Severity, Impact, Mitigation, Evidence.

## Goal

Produce a unified 15-file discussion pack with explicit decisions, requirements, OQ states, and rationale so `/qfai-sdd` starts without unresolved blockers.

## Non-goals

- Editing `.qfai/specs/**` directly.
- Writing implementation-level details.
- Leaving open blockers hidden in free text.

## Mandatory Outputs

- `.qfai/discussion/discussion-*/01_Context.md`
- `.qfai/discussion/discussion-*/02_Inception-Deck.md`
- `.qfai/discussion/discussion-*/03_Story-Workshop.md`
- `.qfai/discussion/discussion-*/04_Sources.md`
- `.qfai/discussion/discussion-*/05_Scope.md`
- `.qfai/discussion/discussion-*/06_REQ.md`
- `.qfai/discussion/discussion-*/07_NFR.md`
- `.qfai/discussion/discussion-*/08_Glossary.md`
- `.qfai/discussion/discussion-*/09_Constraints.md`
- `.qfai/discussion/discussion-*/10_Policy.md`
- `.qfai/discussion/discussion-*/11_OQ-Register.md`
- `.qfai/discussion/discussion-*/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-*/13_Deferred.md`
- `.qfai/discussion/discussion-*/14_Review-Request.md`
- `.qfai/discussion/discussion-*/99_delta.md`
- review artifacts under `.qfai/review/review-YYYYMMDDhhmmssSSS/`
- Evidence file: `.qfai/evidence/discussion-YYYYMMDDhhmmssSSS.md`
- Reviewer notes (`PASS` or `REVISE`)

## Required Process

1. Run the core interview for product concept, scope, stakeholders, and constraints (`01_Context.md`).
2. Run Inception Deck (10 questions) for ambiguity removal and project alignment, and include at least one Mermaid diagram (`02_Inception-Deck.md`).
3. Run Story Workshop to capture user stories, user flows, and at least one Mermaid diagram; add HTML+CSS screen mock when UI requirements exist (`03_Story-Workshop.md`).
4. Register source traceability in `04_Sources.md` with stable `SRC-XXXX` identifiers.
5. Define scope boundaries and success criteria in `05_Scope.md`.
6. Capture functional requirements in `06_REQ.md` with `REQ-0001` format.
7. Capture non-functional requirements in `07_NFR.md` with `NFR-0001` format.
8. Capture domain terms and definitions in `08_Glossary.md`.
9. Capture constraints (technical, operational, legal, budget, deadline) in `09_Constraints.md`.
10. Capture policies (security, compliance, etc.) in `10_Policy.md`.
11. Run Example Mapping pass for each BR/AC candidate and capture `Example Seeds` in `03_Story-Workshop.md`.
12. Update `11_OQ-Register.md` with all identified OQs using all mandatory columns.
13. Run OQ resolution hearing repeatedly until open count is zero.
14. Move deferred items to `13_Deferred.md` with all mandatory metadata columns.
15. Update `12_OQ-Resolution-Log.md`, `14_Review-Request.md`, and `99_delta.md`.
16. Request review and record Reviewer result.

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

`11_OQ-Register.md` must include these fields for each OQ:

- `OQ-ID` (`OQ-0001` format)
- `Title`
- `Gate` (`discussion|sdd|atdd|tdd|ops`)
- `Disposition` (`open|resolved|deferred|rejected`)
- `Owner` (`user|agent|team`)
- `Rationale` (required for deferred/rejected)
- `Options` (at least two alternatives and one recommended option)
- `Recommendation` (explicitly stated recommended option)
- `Next-Decision-Point` (required for deferred)
- `Due` (target date or milestone)
- `Evidence`

## Deferred Metadata Rules (Mandatory)

`13_Deferred.md` must include:

- `OQ-ID`
- `Title`
- `Gate`
- `Deferred-Reason`
- `Deferred-Until`
- `Owner`
- `Due`
- `Severity` (`high|medium|low`)
- `Impact` (spec/tests/implementation/operations)
- `Mitigation`
- `Evidence`

## Drift Protocol (Mandatory)

At any point during discussion, if the user changes direction or scope:

1. Record the drift event in `99_delta.md` with Change Type = `Drift`.
2. Assess impact on all 15 files.
3. Update affected files and re-validate OQ register exit condition.
4. If drift contradicts a previously rejected option, record in `99_delta.md` Rejected section with `Recurrence Prevention`.

## Review Gate Artifacts (RCP)

For each review cycle, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

RCP rules:

- Append-only: create a new review pack for each cycle.
- Apply `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` as the common footer rule set.
- Any `FAIL` requires return/fix/full rerun from the first reviewer.
- Mark fixed only when all reviewers are `PASS` or valid `N/A`.
- `summary.json` `target.kind` must be `"discussion"`.

## RCP Footer Include (MUST)

- Include and follow `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` without rewriting it per skill.
- Roster and loop rules must stay synchronized with the footer SSOT.

## Required Coverage Topics

Before completion, confirm all are covered:

1. product concept and target users
2. scope boundary and anti-goals
3. user stories and user flows (with Mermaid diagrams)
4. functional requirements (REQ) with source traceability
5. non-functional requirements (NFR) with measurable targets
6. performance constraints and SLO assumptions
7. security constraints and risk controls
8. domain glossary consistency
9. technical and operational constraints
10. project policies

## Completion Contract (Shared)

Before declaring completion, you MUST:

- verify all 15 mandatory output files exist and are populated;
- ensure `Disposition: open` count is zero in `11_OQ-Register.md`;
- ensure every deferred item has full metadata in `13_Deferred.md`;
- ensure `02_Inception-Deck.md` includes at least one Mermaid diagram;
- ensure `Example Seeds` sections are present and perspective coverage is explicit in `03_Story-Workshop.md`;
- ensure `03_Story-Workshop.md` includes at least one Mermaid diagram;
- ensure UI-related stories include an HTML+CSS screen mock section in `03_Story-Workshop.md`;
- avoid duplicating finalized spec content in discussion outputs.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/discussion-YYYYMMDDhhmmssSSS.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Interview summary
- Inception Deck summary
- Story Workshop summary
- Requirements summary (REQ count, NFR count)
- OQ register summary
- Deferred summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- generated discussion path (`.qfai/discussion/discussion-*/`)
- open OQ count
- deferred OQ count
- REQ count
- NFR count
- reviewer result
- ready-for-next command (`/qfai-sdd`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] All 15 required discussion files `01..14, 99` were produced.
- [ ] OQ register fields follow the mandatory data model (all 11 columns present).
- [ ] Deferred table fields follow the mandatory data model (all 11 columns present).
- [ ] `Disposition: open` count is zero at completion.
- [ ] Deferred items include required metadata.
- [ ] `02_Inception-Deck.md` includes at least one Mermaid diagram.
- [ ] `03_Story-Workshop.md` includes at least one Mermaid diagram.
- [ ] UI-related stories include HTML+CSS screen mock details in `03_Story-Workshop.md`.
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

- [ ] Review artifacts were generated for each required discussion review cycle.
- [ ] All required reviewers completed their reviews for each review pack.
- [ ] Any feedback triggered return/fix and a new review pack was appended.
- [ ] `summary.json` satisfies the required schema with `target.kind: "discussion"`.

## Completion Message & Next Actions (MUST)

You MUST end the user-facing output with a handoff sentence to `/qfai-sdd` in the active user language.

- Japanese output (use this exact sentence):
  ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。
- Non-Japanese output:
  Use the same meaning in the user's language, and keep `/qfai-sdd` as a literal command token.

- Proceed (recommended): `/qfai-sdd`.
  Action: run preflight on the latest discussion pack and generate shared/spec artifacts.
- Upstream idea is still unclear: rerun `/qfai-discussion`.
  Action: continue discussion loops until OQ states are explicit and complete.
- Need additional risk analysis before SDD:
  Action: update `03_Story-Workshop.md` and `11_OQ-Register.md` with additional findings.
