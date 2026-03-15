---
name: qfai-prototyping
title: QFAI Prototyping (All-spec runnable skeleton gate)
description: "Implement a minimum runnable skeleton for ALL specs and block DONE until evidence + validate gate pass."
argument-hint: "[--auto] [--full]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    FullStackEngineer,
    BackendEngineer,
    FrontendEngineer,
    DBEngineer,
    DevOpsCIEngineer,
    QAEngineer,
    RuntimeGatekeeper,
    UIUXReviewer,
    CodeReviewer,
  ]
mode: execution-focused
---

<!-- markdownlint-disable MD033 -->

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed (e.g., implementation scope decisions, runtime environment confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit numbered choices.
  The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
  The reason for unavailability MUST be stated.

Run prototyping as an **all-spec stage**. Scope is fixed to **ALL specs** resolved from `.qfai/specs/spec-*`.

This stage is complete only when all specs pass the minimum runtime contract:

- UI routes are reachable (no dead `#` links for primary flows).
- API endpoints return non-404 statuses.
- DB objects needed for runtime are present (real DB or documented in-memory substitute).
- Evidence is captured and validate can enforce it.

## Definition of Done by fidelity level (Mandatory)

- L1 (`skeleton`):
  - Route-level rendering exists for declared primary screens.
  - Surface shape is visible, but interactions may remain minimally wired.
- L2 (`interactive`, default):
  - Declared primary interactions are wired with mockable behavior.
  - At least one declared mock path is executed and recorded per primary flow set.
  - `uiFidelity` is produced in `prototyping.json`.
- Default target is L2 (`interactive`).
  - If L1 fallback is chosen, record explicit user approval and rationale in evidence.
- Placeholder-only pages (single static string, lorem ipsum, or equivalent) are `REVISE`.

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Do not copy templates/samples into this prompt or into other prompt markdown.
- Generated artifacts must match README-defined structure (headings, ordering, table columns).
- Completion requires a Format Self-Check in evidence.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/spec-*/01_Spec.md` (Primary SSOT / Consumer View)
- P4: `.qfai/contracts/ui/**`, `.qfai/specs/_policies/05_Contracts.md`, and each `spec-*/11_Contracts.md`
- P5: `.qfai/specs/spec-*/09_delta.md` (Decision Records)
- P6: existing evidence

## Preflight Diff Protocol (Compatibility Note)

- Incremental mode is supported for planning efficiency, but `/qfai-prototyping` execution remains full-scope across all specs.
- `--full` MUST trigger explicit all-spec execution.
- Keep Preflight Diff / Diff Context semantics available for incremental planning workflows.
- Keep compatibility with CAP-0011/spec-0011 guidance; do not remove this protocol note without aligned spec/policy updates.

## Read Set Contract (Mandatory)

- Default Mode:
  - `.qfai/specs/spec-*/01_Spec.md`
  - relevant `.qfai/contracts/ui/**`
- Escalation Mode:
  - allowed only when `01_Spec.md` Escalation Hook signals ambiguity / conflict / missing constraint / trade-off
  - read only `.qfai/specs/_policies/01_Objective.md`, `.qfai/specs/_policies/07_Constraints.md`, `.qfai/specs/_policies/08_Decisions.md`
- Do not read `_policies/**` by default.

## Sub-agent Delegation (MANDATORY)

This section is mandatory and overrides conflicting fallback text.

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results to the user.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT serve as Reviewer or skip delegation for convenience.

### Capability Probe (MUST)

1. Run one harmless Probe Task (for example: "reply with ok") once at stage start.
2. If subagents are unavailable, explicitly ask the user for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- Record both in evidence:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - required roles were delegated (no orchestrator self-authoring),
  - evidence + validate gate is present,
  - Drift Protocol was enforced,
  - test-layer obligations match `test-layers.md` and plan,
  - floors and ratios are **signals, not gates**.
- Reviewer returns only `PASS` or `REVISE`.
- **全レビュアー共通: 代替案提示義務**:
  - 全てのレビュアーは FAIL 判定時に具体的な代替案・修正案を必ず提示しなければならない。代替案のないフィードバックは無効とし、再判定を要求する。
- **devils-advocate gate**:
  - devils-advocate の FAIL には具体的代替案が含まれていること。代替案なしの FAIL は再判定を要求する。
  - 3 回連続 FAIL の場合、アドバイザリー降格を記録し、次フェーズへの進行を許可する。
- **pattern-doubler gate**:
  - pattern-doubler が追加提案した各パターンに根拠が付与されていること。
  - ID 付き項目（US/AC/BR/EX/TC）のない成果物の場合は N/A とする。

### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol
- must: verify plan/test-layer adherence (`test-layers.md` + plan)
- must: verify `qfai validate --fail-on error` evidence
- must_not: accept floor/ratio as hard gate
Output format:
- <headings / bullet schema>
Quality bar:
- PASS if ...
- REVISE if ...
```

### Reviewer response template

```text
Result: PASS | REVISE
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```

## Stage 0 - Steering completion refresh (mandatory)

Before implementation, refresh and verify:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

If facts are missing, record Open Questions and ask the user.

## Delta Rejected Guard (Mandatory)

- Do not reintroduce options marked as rejected in 09_delta.md.
- If reconsideration is needed, create a `[RE-OPEN]` Decision Record with explicit approval.

## CRITICAL CONSTRAINTS (Read First)

- Scope is ALL specs from `.qfai/specs/spec-*`; do not shrink to one spec.
- Contracts are strict inputs in this stage.
- Do not create new files under `.qfai/contracts/**`.
- If any spec has zero resolved contracts, STOP and route back to `/qfai-discussion`.
- Do not add ATDD/TDD automation in this stage.
- You MUST produce both prototyping evidence artifacts in `.qfai/evidence/`.
- You MUST run runtime checks and capture evidence.
- DONE is forbidden when Coverage Matrix is incomplete or API checks include status 404.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- resolve or explicitly defer ambiguous items,
- verify every required artifact exists and is complete,
- scan outputs for placeholders (TBD/TODO/OPEN QUESTION and equivalents),
- run the smallest executable smoke proof and record outcomes.

## Goal

Build the minimum runnable vertical slice for **all specs** so `/qfai-atdd` can proceed without hidden scope gaps.

## Non-goals

- Acceptance test automation (`/qfai-atdd`).
- Unit/component tests (TDD phases).
- Contract redesign during prototyping.

## Mandatory Outputs

- Updated runnable skeleton implementation.
- Coverage Matrix for all specs.
- Runtime Gate v2 log for declared UI routes and API endpoints.
- Prototyping evidence artifacts (markdown + json) under `.qfai/evidence/`.
- `prototyping.json` includes `uiFidelity` for L2 reporting.
- Reviewer result (`PASS` or actionable `REVISE`).

## Scope SSOT (ALL contracts -> ALL specs)

1. Enumerate all specs from `.qfai/specs/spec-*`.
2. Resolve each spec's contracts via `_policies/05_Contracts.md` and/or `spec-*/11_Contracts.md`.
3. Do not declare completion while any spec lacks contract assignment.

## Preflight (required)

- Build spec list first and create Coverage Matrix rows for every spec.
- Resolve declared counts per spec:
  - `uiRoutes`
  - `apiEndpoints`
  - `dbObjects`
- Stop conditions:
  - any spec has zero contract assignment,
  - UI primary flow is undefined for a spec,
  - evidence schema cannot represent all specs.

## Execution (required)

Process specs in dependency order (foundation first, then business modules):

- UI: primary route renders (stub data is acceptable).
- API: declared endpoints return non-404 status (stub handler is acceptable).
- DB: minimum schema/store exists so runtime does not crash.
- UI quality floor: avoid placeholder-only pages; this must be marked `REVISE`.

## Runtime Interaction Gate v2 (required)

Check the **full declared list** from preflight and record all results:

- UI routes: HTTP GET / route navigation checks.
- API endpoints: runtime calls with status capture (`404` is forbidden).
- DB objects: presence checks against schema or temporary store.
- Mock paths: record at least one pass path for interactive flows when L2 is targeted.

If any check fails, completion is blocked.

## Evidence (MANDATORY)

Create/update both artifacts in `.qfai/evidence/`:

1. Markdown evidence with sections:
   - Coverage Matrix
   - Runtime Gate Log
   - Deviations / Exceptions
   - Work Orders Summary
   - Format Self-Check
2. JSON evidence with minimum fields:
   - `specs[]` with `specId`, `declared`, `checked`, `missing`
   - `runtimeGate.ui[]` and `runtimeGate.api[]`
   - `uiFidelity.version`, `uiFidelity.mode`, `uiFidelity.screens[]` for L2
   - `meta.generatedAt`, `meta.toolVersion`, `meta.commands[]`

`uiFidelity` is a stage DoD requirement in this skill.
Validator compatibility remains backward-compatible: existing required fields stay unchanged.

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- referenced instructions/steering/spec inputs,
- DR-IDs checked and rejected-option result,
- confirmation that evidence and validate gate both passed.

## FINAL CHECKLIST (Check Last)

- [ ] ALL specs from `.qfai/specs/spec-*` are covered in Coverage Matrix.
- [ ] Every spec satisfies UI/API/DB minimum runtime conditions.
- [ ] API runtime gate has zero 404 results.
- [ ] Prototyping evidence artifacts are updated.
- [ ] `prototyping.json` includes `uiFidelity` for L2 output.
- [ ] Placeholder-only pages are not accepted (marked `REVISE` if present).
- [ ] `qfai validate --fail-on error` passes.
- [ ] Independent Reviewer returned PASS.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated.
- [ ] Open questions were logged when needed.
- [ ] Completion message was presented to the user.
- [ ] Next actions were enumerated.

## Completion Message & Next Actions (MUST)

When complete, provide a final user-facing completion message and list actions.

- Proceed (recommended): `/qfai-atdd`.
  Action: implement acceptance tests against the all-spec prototype runtime behavior.
- Quality gate run: `/qfai-verify`.
  Action: run full validation/report flow and publish gate evidence.
- Rework prototyping: rerun `/qfai-prototyping`.
  Action: fix missing matrix rows, 404 findings, or unresolved contract mapping gaps.
