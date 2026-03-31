---
name: qfai-prototyping
title: QFAI Prototyping (All-spec runnable skeleton gate)
description: "Implement a minimum runnable skeleton for ALL specs and block DONE until evidence + validate gate pass."
argument-hint: "[--auto]"
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

- When a question to the user is needed (e.g., implementation scope decisions, runtime environment confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit numbered choices.
  The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
  The reason for unavailability MUST be stated.

Run prototyping as an **all-spec stage**. Scope is fixed to **ALL specs** resolved from `.qfai/specs/spec-*`.

This stage is complete only when all specs pass the minimum contract:

- Static checks confirm declared routes, endpoints, and schema objects exist in code.
- Evidence is captured and validate can enforce it.
- Runtime verification (browser, live API) is reserved for full-harness mode only.

## Spec Auto-Discovery Protocol

When invoked without explicit spec selection, the agent MUST perform automatic spec detection.

### 4-Source Unified Diff Detection

Detect changed specs by integrating these sources (union logic: `changed_specs = A ∪ B ∪ C ∪ D`):

| Source                | Method                                                             | Fallback                 |
| --------------------- | ------------------------------------------------------------------ | ------------------------ |
| **A: Branch Diff**    | `git diff --name-only <baseBranch>..HEAD` (default: `origin/main`) | Skip if git unavailable  |
| **B: Local Changes**  | `git diff --name-only` + `git diff --name-only --staged`           | Skip if git unavailable  |
| **C: Evidence Mtime** | Compare evidence file mtime vs spec file mtime                     | Skip if no evidence file |
| **D: delta.md Parse** | Extract change context from `spec-*/09_delta.md`                   | Skip if no delta.md      |

Extract spec-IDs from paths matching `.qfai/specs/spec-*/` in the diff output.

### User Confirmation Flow

1. Display detected specs with status and source attribution
2. Present prioritized list: `changed` > `stale` > `unchanged`
3. If user confirms scope, proceed with all-spec prototyping
4. Zero specs detected: trigger full-scan fallback

### Fallback Behavior

- **git unavailable**: Use Sources C + D only; log fallback reason
- **Zero specs detected**: Present full spec list for manual selection
- **Policy changes detected** (`.qfai/specs/_policies/**` modified): Flag all specs as potentially impacted; require user confirmation

## Visual Review Guard

- Review rendered output, screenshot captures, or generated HTML for every UI-affecting slice; code-only inspection is insufficient.
- Read the DDP (Design Direction Pack) first before comparing visuals or wiring critique outcomes into implementation.
- Read order: DDP -> Design Token -> UI Contract -> HTML Mock -> Flow.
- If rendered/HTML evidence disagrees with code intent, fix the rendered result before declaring completion.

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

## Prototyping Modes

This skill is **static-first**: validation relies on static checks and file-based analysis by default.
No runtime execution (browser, live API, DB connection) is required unless full-harness mode is activated.

### Low-cost

- Static checks only: file existence, route declaration, schema presence.
- Suitable for L1 fidelity targets.
- No browser or server process needed.

### Standard

- Static checks plus optional light validation (mock data, stub handlers).
- Suitable for L2 fidelity targets (default).
- Runtime verification is NOT required; evidence is file-based.

### Full-harness

- Runtime-heavy obligations: API non-404, DB existence, UI route reachability.
- Suitable for L3–L5 fidelity targets.
- Must be explicitly opted in by the user (never auto-activated).

#### Full-harness Workflow Loop

The full-harness iteration loop proceeds through four phases per cycle:

##### Planner Phase

- Generate strategy from spec constraints, budget, and prior iteration feedback.
- Produce a ranked plan with target dimensions, expected quality floor, and cost estimate.
- Constraints propagated from discussion artifact recommendation.

##### Generator Phase

- Execute prototyping output production based on planner strategy.
- Incorporate refinement notes from prior evaluator feedback.
- Produce render evidence, test results, and validator output as artifacts.

##### Evaluator Phase

- Apply weighted scoring across configured dimensions (floor enforcement).
- Decision gate: converge, refine, or pivot based on scoring-ready schema.
- Record scoring trace with dimension-level breakdown for auditability.

##### Decision Gate

- Convergence criteria: all dimension floors met AND aggregate score above threshold.
- Refinement: loop back to generator with evaluator feedback.
- Pivot: loop back to planner with strategic reassessment.
- Termination: max iterations reached OR convergence achieved.

#### Full-harness Evidence

Every full-harness run MUST produce:

- Render evidence with `captured / skipped / failed` status (3-state vocabulary).
- Iteration history (planner input → generator output → evaluator score per cycle).
- Scoring trace with dimension-level breakdown.
- Termination reason (converged / max-iterations / manual-stop).
- Validator output from `qfai validate` at each iteration.

#### Full-harness Calibration

- Scoring-ready schema defines dimension weights and floor thresholds.
- Calibration config is read from `qfai.config.yaml` under `prototyping.calibration`.
- Threshold adjustments are logged in iteration history for traceability.

#### Full-harness Reviewer

- Generate review summary at convergence or termination.
- Review findings must reference iteration history and scoring trace.
- Reviewer sign-off is a required gate before evidence is finalized.
- Reviewer checks: evidence completeness, iteration history integrity, scoring trace auditability, calibration adherence.

## Non-UI Projects

For projects with `surface: non-ui`, prototyping obligations are n/a.
Non-UI surfaces skip UI route checks, screen rendering, and visual fidelity gates.
Evidence should record `surface: non-ui` and mark UI-specific rows as n/a in the Coverage Matrix.

## Mode Selection Protocol

Mode selection follows this precedence:

1. User explicitly specifies a mode → use that mode.
2. Discussion pack contains `prototyping.yaml` with `recommended_mode` → propose the recommended mode to the user for confirmation.
3. Neither of the above → use `standard` mode (default).

After mode determination, record in evidence:

- `mode_source`: how the mode was selected (user-specified / discussion-recommendation / default).
- `effective_mode`: the mode in effect (low-cost / standard / full-harness).
- `rationale`: why this mode was chosen.

### Three-Mode Summary

| Mode             | Scope                                   | Evidence Expectations |
| ---------------- | --------------------------------------- | --------------------- |
| **low-cost**     | Static checks only (L1/L2)              | L1/L2                 |
| **standard**     | Static + optional light runtime (L2/L3) | L2/L3                 |
| **full-harness** | Static + runtime-heavy (L3/L4/L5)       | L3/L4/L5              |

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
- **All reviewers: alternative proposal obligation**:
  - Every reviewer MUST provide a concrete alternative or fix proposal when returning FAIL. Feedback without a concrete alternative is invalid and triggers re-judgment.
- **devils-advocate gate**:
  - devils-advocate FAIL must include a concrete alternative proposal. Bare negation FAIL triggers re-judgment.
  - 3 consecutive FAILs trigger advisory demotion and allow progression to the next phase.
- **pattern-doubler gate**:
  - Each pattern proposed by pattern-doubler must include rationale.
  - Artifacts with no ID-bearing items (US/AC/BR/EX/TC) are marked N/A.

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
- You MUST produce evidence via static checks and file-based validation.
- DONE is forbidden when Coverage Matrix is incomplete or static analysis detects missing endpoints.

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
  Action: fix missing matrix rows, 404 findings, or unresolved contract mapping gaps. Specify `--mode full-harness` if runtime-heavy verification is needed.
