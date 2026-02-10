<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-sdd-refinement
title: QFAI SDD Refinement (Why/What/Examples/Rules)
description: "Create upstream SDD artifacts and remove ambiguity before planning/implementation."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, RequirementsAnalyst, OQHarvester, OQReviewer, OptionExplorer, OptionReviewer, Interviewer, QAEngineer, CodeReviewer]
mode: approval-gated

---

# /qfai-sdd-refinement — Build Upstream SDD Artifacts

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- Do NOT copy templates into this workflow markdown.
- Completion requires a format self-check in evidence.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/delta.md` (if present)
- P4: other artifacts (require/specs/contracts/evidence)

## Sub-agent Delegation (MANDATORY)

This section is mandatory and overrides any conflicting fallback text in this file.

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results to the user.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT serve as Reviewer or skip delegation for convenience.

### Capability Probe (MUST)

1. Run one harmless Probe Task (for example: "reply with ok") once at stage start.
2. If subagents are unavailable, explicitly ask the user for Simulation mode approval.
3. Without explicit approval, stop the stage and do not continue.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- When used, record both of the following in outputs/evidence:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

### Work Orders Summary (MANDATORY evidence)

Every major artifact in this stage MUST include a `## Work Orders Summary` section with this fixed table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

- `Output (refs)` must point to in-file anchors or relative evidence file paths.

### Stage Minimum Roles (MUST)

- Delegate: SpecWriter, TraceabilityBuilder create first drafts of spec pack drafts (spec/rules/examples/traceability).
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks: required roles delegated, DoD satisfied, and no sign of orchestrator self-authoring.
- Do not declare DONE or handoff until Reviewer returns `PASS`.

### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: ...
- must_not: ...
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

## Stage 0 — Steering completion refresh (mandatory)

Before moving forward in this stage, refresh these files:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

Rules:

- Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, stale facts).
- Fill what is verifiable from repository evidence (tree, docs, require/spec artifacts, package.json, CI definitions).
- If something cannot be verified, record it as an Open Question and ask the user.
- Even if steering is already complete, update it when new facts are discovered in this stage.

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, add a `[RE-OPEN]` decision record with explicit approval evidence.

## CRITICAL CONSTRAINTS (Read First)

- This phase defines Why/What/Examples/Rules. It MUST NOT lock implementation details.
- `implementation-brief.md` MUST NOT be created in this phase.
- `case-catalogue.md` MUST use category-based Markdown tables (not bullet lists).
- `case-catalogue.md` rows MUST keep all legacy information (no-loss), including a dedicated `Case title` column.
- Ambiguity is forbidden:
  - Ask the user when a decision is not at least 95% certain.
  - If uncertainty remains, convert it to a documented Spike (timebox, success criteria, deliverable).
- You MUST produce the required evidence file: `.qfai/evidence/sdd-refinement-<spec-id>.md`.
- You MUST run the refinement gate:
  - `qfai validate --phase refinement --fail-on error`
- The refinement gate is local-stage validation. CI pipelines MUST use default/full validation (`qfai validate --fail-on error`).
- Waivers may only suppress `warning` / `info` findings; never use waivers to suppress `error` findings.
- Completion must be approved by a reviewer who did not author the artifacts.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: resolve ambiguities or explicitly defer with rationale and approval evidence.
- Deliverable completeness: verify all required artifacts and sections are present.
- OQ / placeholder scan: remove unresolved placeholders (`TBD`, `TODO`, `???`, `OPEN QUESTION`, etc.) unless explicitly deferred.
- Smoke check (if applicable): run the smallest command that proves artifacts are machine-checkable.

## Goal

Create or update an SDD spec pack that is clear, testable, and ready for planning.

## Non-goals

- Writing production code or tests.
- Creating `implementation-brief.md` (belongs to planning).
- Bypassing unresolved ambiguity.

## Mandatory Outputs

- `.qfai/specs/spec-XXXX/spec.md`
- `.qfai/specs/spec-XXXX/delta.md`
- `.qfai/specs/spec-XXXX/scenario.feature`
- `.qfai/specs/spec-XXXX/case-catalogue.md`
- `.qfai/specs/spec-XXXX/traceability-matrix.md`
- Updated contracts under `.qfai/contracts/**` (when required)
- `.qfai/require/open-questions.md`
- Evidence file: `.qfai/evidence/sdd-refinement-<spec-id>.md`

## Required Process

1. Analyze repository context, existing artifacts, and constraints.
2. Harvest open questions and classify:
   - Must-Ask
   - Can-Decide
   - Spike
3. Resolve questions in loop (ask one at a time when interactive).
4. Build/update contracts first when contracts are in scope.
5. Produce or refine spec pack artifacts.
6. Update delta decisions and rejected options.
7. Run refinement gate and record outputs.

## Refinement Quality Gate

Run:

```bash
qfai validate --phase refinement --fail-on error
```

Interpretation:

- This gate validates upstream consistency.
- How-specific checks and SC-to-Test enforcement are intentionally relaxed in this phase.
- This gate is for local refinement iterations, not for CI.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/sdd-refinement-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Open questions summary (Open/Answered/Deferred)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs and spec-id
- Decision record IDs touched
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Refinement gate result

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `implementation-brief.md` was NOT created in this phase.
- [ ] `case-catalogue.md` uses category-based tables with `Case title` and no information loss.
- [ ] OQ ambiguity is resolved or deferred with explicit approval evidence.
- [ ] Refinement gate passed (`qfai validate --phase refinement --fail-on error`).
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.
