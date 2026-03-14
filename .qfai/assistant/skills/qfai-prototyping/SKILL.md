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

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-prototyping

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed (e.g., fidelity level selection, scope confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit choices. The reason for unavailability MUST be stated.

Run prototyping as an **all-spec stage**. Scope is fixed to **ALL specs** resolved from `.qfai/specs/spec-*`.

When evidence with Diff Context exists from a previous run, **incremental mode** is the default: only changed specs receive full skeleton updates, while unchanged specs receive Runtime Gate checks only. Use `--full` to force full processing of all specs.

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

## Read Set Contract (Mandatory)

- Default Mode:
  - `.qfai/specs/spec-*/01_Spec.md`
  - relevant `.qfai/contracts/ui/**`
- Escalation Mode:
  - allowed only when `01_Spec.md` Escalation Hook signals ambiguity / conflict / missing constraint / trade-off
  - read only `.qfai/specs/_policies/01_Objective.md`, `.qfai/specs/_policies/07_Constraints.md`, `.qfai/specs/_policies/08_Decisions.md`
- Do not read `_policies/**` by default.

## Preflight Diff Protocol (CAP-0011 / spec-0011)

This protocol determines which specs have changed since the last execution and enables incremental processing. It runs automatically before the main workflow when evidence with Diff Context exists.

### Trigger Conditions

- **Automatic**: When a previous evidence file contains a `## Diff Context` section, Preflight Diff runs automatically at execution start.
- **Skip (full mode)**: When `--full` flag is passed, skip Preflight Diff entirely and process all specs in full scan mode (`execution_mode=full`).
- **Fallback (full mode)**: When no evidence file exists, or evidence lacks a `## Diff Context` section (legacy format), fall back to full scan mode without error.

### 3-Source Change Detection

Detect changed specs from three independent sources and merge:

**Source A — git diff (spec file changes):**

1. Read `last_commit_sha` from the previous evidence Diff Context.
2. Run: `git diff --name-only {last_commit_sha}..HEAD -- .qfai/specs/`
3. Extract unique `spec-XXXX` directory names from changed file paths.
4. If any path matches `_policies/*`, treat ALL specs as changed and present a confirmation message to the user: "Policy changes detected; all specs will be targeted. Do you want to continue?"
5. If git is unavailable (no `.git` directory or command fails), skip Source A with a warning log and continue with Source B only. This is NOT an error.

**Source B — timestamp comparison (file modification times):**

1. Read `last_run_timestamp` from the previous evidence Diff Context.
2. For each `spec-XXXX` directory, compare the `last_run_timestamp` against the mtime of spec files (`01_Spec.md`, `03_Acceptance-Criteria.md`, `05_Examples.md`, `06_Test-Cases.md`, `09_delta.md`).
3. If any file's mtime is newer than `last_run_timestamp`, mark that spec as changed.

**Source C — delta.md context (change rationale):**

1. For each spec in changed_specs (from A or B), read `spec-XXXX/09_delta.md`.
2. Extract change summary entries as `change_context` metadata.
3. `change_context` is supplemental information for downstream processing, not a source of changed_specs membership.

### Union Logic

```
changed_specs  = union(Source_A, Source_B)
change_context = Source_C   (keyed by spec-id)
```

Any spec detected by either Source A or Source B is included in `changed_specs`. This ensures zero missed changes (NFR-0001).

### Diff Summary Output

After computing `changed_specs`, display a human-readable summary:

```
=== Preflight Diff Summary ===
Changed specs (N):
  - spec-0001  [Source: A+B]  delta: "Added AC for US-0001-0003"
  - spec-0003  [Source: B]    delta: (none)
Unchanged specs (M):
  - spec-0002, spec-0004, ...
Execution mode: incremental
===============================
```

### Idempotency

Running Preflight Diff multiple times with the same inputs produces the same `changed_specs` result.

## Implementation State Analysis (ISA)

After Preflight Diff determines `changed_specs`, classify each spec into one of 4 states:

### Annotation Scan

Scan skeleton/implementation files and test files for QFAI traceability annotations (`QFAI:SPEC-XXXX:US-YYYY`, `QFAI:SPEC-XXXX:TC-YYYY`, `QFAI:CON-API-XXXX`). Collect annotation coverage per spec.

### 4-State Classification

| State         | Condition                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `implemented` | Spec has corresponding skeleton/code with valid annotations AND code is up-to-date with spec changes |
| `missing`     | Spec has no corresponding skeleton or annotations are absent                                       |
| `stale`       | Spec is in `changed_specs`, has existing skeleton, BUT skeleton was last modified before spec changes. **Only applies when spec Primary = Behavior or Primary = Initial** (DR-0010). Specs with Primary = Contract or other types are NOT marked stale even if code timestamps are older. |
| `unchanged`   | Spec is NOT in `changed_specs` and has up-to-date skeleton                                         |

### Stale Detection Rule (DR-0010)

Stale classification is limited to specs whose Primary change category is `Behavior` or `Initial`. This prevents excessive skeleton regeneration for structural-only spec changes.

## Incremental Mode (Prototyping-Specific Routing)

When Preflight Diff produces a non-empty `changed_specs` list and `execution_mode=incremental`:

| ISA State     | Prototyping Action                                                                   |
| ------------- | ------------------------------------------------------------------------------------ |
| `missing`     | Generate new skeleton for this spec (full creation)                                  |
| `stale`       | Update existing skeleton to match the changed spec                                   |
| `changed`     | Full skeleton update; **Tags scoping**: only Tags related to this spec are regenerated |
| `unchanged`   | **Runtime Gate check only** — verify compile/startup, do NOT regenerate skeleton      |
| `implemented` | Runtime Gate check only — skeleton is current                                        |

### Tags Scoping (changed specs only)

In incremental mode, when processing a changed spec, only the Tags (UI routes, API endpoints, DB objects) directly associated with that spec are included in skeleton generation. Tags from unchanged specs are not regenerated.

### Runtime Gate for Unchanged Specs

Unchanged specs still receive a Runtime Gate v2 check (compile, startup, route reachability) to confirm they are not broken by changes in other specs. This is a verification-only pass with no code generation.

When `execution_mode=full` (no evidence, `--full` flag, or fallback):

- Process ALL specs with full skeleton generation (traditional all-spec behavior).

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

| Step | Role (sub-agent) | Task title   | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ------------ | ------------ | ------------- | -------------------- |
| 1    | example-role     | example-task | file/path.md | evidence.md   | PASS/REVISE          |

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - required roles were delegated (no orchestrator self-authoring),
  - evidence + validate gate is present,
  - Drift Protocol was enforced,
  - test-layer obligations match `test-layers.md` and plan,
  - floors and ratios are **signals, not gates**.
- Reviewer returns only `PASS` or `REVISE`.

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
- **Incremental mode is default** when evidence with Diff Context exists. Use `--full` to force full scan.
- `/qfai-verify` does NOT use Preflight Diff Protocol and always runs full scan (DR-0007). This skill (`/qfai-prototyping`) is an incremental-capable skill.

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

## Evidence Diff Context (CAP-0011 / spec-0011)

Every prototyping evidence file (both markdown and JSON) MUST include Diff Context upon skill completion. This enables the next incremental run.

### Required Fields (Markdown)

| Field                | Format                  | Description                                        |
| -------------------- | ----------------------- | -------------------------------------------------- |
| `last_commit_sha`    | git SHA (40 hex chars)  | `git rev-parse HEAD` at execution completion       |
| `last_run_timestamp` | ISO 8601 with timezone  | Timestamp when skill execution completed           |
| `changed_specs`      | comma-separated list    | Spec IDs processed in this run                     |
| `execution_mode`     | `incremental` or `full` | Whether this run was incremental or full scan       |

### Markdown Example

```markdown
## Diff Context

- last_commit_sha: a1b2c3d4e5f6...
- last_run_timestamp: 2026-03-14T09:30:00Z
- changed_specs: spec-0001, spec-0003
- execution_mode: incremental
```

### JSON Evidence Extension

Add a `diffContext` object to `prototyping.json`:

```json
{
  "diffContext": {
    "last_commit_sha": "a1b2c3d4e5f6...",
    "last_run_timestamp": "2026-03-14T09:30:00Z",
    "changed_specs": ["spec-0001", "spec-0003"],
    "execution_mode": "incremental"
  }
}
```

### Backward Compatibility

If a previous evidence file does not contain a `## Diff Context` section or `diffContext` JSON field (legacy format), this is NOT an error. The next run will fall back to full scan mode automatically.

## Evidence (MANDATORY)

Create/update both artifacts in `.qfai/evidence/`:

1. Markdown evidence with sections:
   - Coverage Matrix
   - Runtime Gate Log
   - Deviations / Exceptions
   - Work Orders Summary
   - Format Self-Check
   - **Diff Context** (last_commit_sha, last_run_timestamp, changed_specs, execution_mode)
2. JSON evidence with minimum fields:
   - `specs[]` with `specId`, `declared`, `checked`, `missing`
   - `runtimeGate.ui[]` and `runtimeGate.api[]`
   - `uiFidelity.version`, `uiFidelity.mode`, `uiFidelity.screens[]` for L2
   - `meta.generatedAt`, `meta.toolVersion`, `meta.commands[]`
   - **`diffContext`** with `last_commit_sha`, `last_run_timestamp`, `changed_specs[]`, `execution_mode`

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
- [ ] Prototyping evidence artifacts are updated (including Diff Context section).
- [ ] `prototyping.json` includes `uiFidelity` for L2 output and `diffContext` for incremental support.
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
