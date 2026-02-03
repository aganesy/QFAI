<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-tdd-refactor
title: QFAI TDD Refactor (Improve structure safely)
description: "Refactor code without behavior change after tests are green."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [ArchitectReviewer, BackendEngineer, FrontendEngineer, QAEngineer, RuntimeGatekeeper, CodeReviewer]
mode: refactor

---

# /qfai-tdd-refactor — Refactor Safely (TDD Refactor)

## FORMAT SSOT (Mandatory)

- **Before writing or editing any `.qfai/**` artifact\*\*, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- **Do NOT copy** templates/samples into this prompt or into other prompt markdown.
- The generated artifacts must match the README-defined structure (headings, ordering, table columns).
- Completion requires a **Format Self-Check** in the evidence: list each artifact and confirm “matches README template”.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/delta.md` (Decision Records; if no spec yet, state "not applicable")
- P4: other artifacts (spec.md, scenario.feature, contracts, evidence)

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- Do NOT change externally visible behavior or specs/contracts.
- Do NOT add new tests here.
- You MUST produce the required evidence file: `.qfai/evidence/tdd-refactor-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST re-run the Runtime Gate (when applicable) and capture evidence.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if refactor risks behavior changes.
- Completion must be approved by a reviewer who did not implement the refactor.

## Sub-agent policy (mandatory)

- If subagents are supported, Orchestrator MUST delegate: implementation (Engineers), QA, Runtime Gatekeeper, Reviewer (non-edit).
- Orchestrator must not implement directly when delegation is available.
- Evidence must include work orders and reviewer notes.
- If subagents are not supported, simulate role separation with explicit role sections.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Refactor the codebase without behavior change after tests are green, preserving spec and contract intent.

## Non-goals

- Adding new features or changing external behavior.
- Writing new tests (use TDD phases).

## Mandatory Outputs

- Refactor diffs with behavior preserved
- Runtime Gate evidence (if applicable)
- Evidence file: `.qfai/evidence/tdd-refactor-<spec-id>.md`
- Reviewer notes (PASS or concrete rework list)

## Guardrails

- Do not invent DB/API/infra. If missing, stop and raise Open Questions.
- Do NOT add new tests here; this step is refactor-only.
- Do NOT change externally visible behavior or specs/contracts.
- Keep refactors minimal and reversible; prefer small, reviewable changes.

## Success Criteria (Definition of Done)

- Behavior remains unchanged and matches the spec and contracts.
- TDD/ATDD tests remain green after refactor.
- Unit/Component Coverage Ledger remains `missing=0` (exceptions documented).
- Repo quality gates pass (lint/type/build/pack as applicable).
- Verification evidence is recorded (commands + results).
- Evidence file exists: `.qfai/evidence/tdd-refactor-<spec-id>.md`.
- Completion is approved by a reviewer who did not implement the refactor.

## Mandatory checks

- Before/after test outputs are recorded.
- Refactor justification is recorded (what risk it reduces).

## Not-done criteria

- Behavior changes without spec update.
- Tests not run after refactor.

## Failure handling (mandatory)

- If blocked/unknown, stop and record a DR in delta.md (do not skip).
- If Runtime Gate fails, fix and re-run before declaring completion.

## Coverage Ledger continuity

- Review the Unit/Component Coverage Ledger from `/qfai-tdd-red`.
- Do not declare completion if the ledger regresses (missing must remain 0).

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/tdd-refactor-<spec-id>.md`

Evidence must include:

- diff summary + tests PASS

### Required sections

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks (must be explicit; "none" is acceptable if justified)
- Final status (PASS/FAIL) + who confirmed

### Template

```md
# TDD Refactor Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Refactor summary

- intent:
- scope:

## Verification evidence (summarized)

## Runtime evidence (if applicable)

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

## Non‑Negotiable Principles (QFAI Articles)

These principles are inspired by “constitution / articles” patterns used by other agent frameworks, but tailored to QFAI.

1. **SDD First (Specification is the source of truth)**  
   If there is a conflict between code and spec, treat the spec as authoritative and either (a) fix code or (b) raise an explicit Open Question to change the spec.

2. **Traceability is mandatory**  
   Every meaningful change must be traceable: **Require → Spec → Scenario → Tests → Code → Verification evidence**.

3. **Evidence over confidence**  
   Prefer observable proof (logs, commands, file diffs, test results). If you cannot verify, say so and record it.

4. **Minimize scope, but never hide gaps**  
   Keep changes minimal, but do not “paper over” missing decisions. If something blocks correctness, stop and ask.

5. **Quality gates are the decision mechanism**  
   Use tests/lint/typecheck/build/pack verification (whatever the repo defines) as the primary guardrail. Fix until PASS.

6. **Make it runnable**  
   Outputs must be executable in terminal/CI. Provide copy‑paste commands.

7. **User time is expensive**  
   Ask only the questions that are truly blocking. Everything else: make reasonable assumptions and label them clearly.

## README Rule

Do not edit any `.qfai/**/README.md` file; raise an Open Question instead.

- READMEs are reference guides. Follow their structure, templates, and checklists.

## Absolute Rule — Output Language

**All outputs MUST be written in the user’s working language for this session.**

- If the user writes in Japanese, output Japanese.
- If the user writes in English, output English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.  
  This rule overrides all other stylistic preferences.

## Multi‑Role Orchestration (Subagents)

This workflow assumes the environment _may_ support subagents (e.g., Claude Code “Task” tool) or may not.

### If subagents are supported

Delegate to multiple roles and then merge the results. Use a “real‑world workflow” order:

- Facilitator → Interviewer → Requirements Analyst → Planner → Architect → (Contract Designer) → Test Engineer → QA Engineer → Runtime Gatekeeper → Code Reviewer → DevOps/CI Engineer

**Pseudo‑invocation pattern** (adjust to your tool):

```text
Task(
  subagent_type="planner",
  description="Create an execution plan and DoD",
  prompt="Context: ...\nGoal: ...\nConstraints: ...\nReturn: phases + risks + DoD"
)
```

### If subagents are NOT supported

Simulate roles by running the same sequence yourself:

- Write a short “role output” section per role, then consolidate into the final deliverable(s).

## Completion Separation (mandatory)

- Implementation (Frontend/Backend Engineer) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm no behavior change and coverage continuity before approval.

## Stage Gates (Do not skip)

P0: Scope & plan confirmed (Orchestrator)  
P1: Implementation done (Engineers)  
P2: QA coverage/traceability review done (QA)  
P3: Runtime evidence captured (Runtime Gatekeeper / DevOps)  
P4: Repo quality gates PASS (DevOps)  
P5: Completion confirmed (Reviewer)

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Current risk check (behavior change / coverage regression)
- Evidence captured so far and what is missing

## Step 0 — Load Context (always)

1. Read relevant **project steering** (if present):
   - `.qfai/assistant/steering/structure.md`
   - `.qfai/assistant/steering/tech.md`
   - `.qfai/assistant/steering/product.md`
   - any additional files under `.qfai/assistant/steering/`

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/instructions/constitution.md`
   - `.qfai/assistant/instructions/workflow.md` (or equivalent)

3. Read existing artifacts for the current work item (if present):
   - `.qfai/require/`
   - `.qfai/specs/spec-*/`
   - `.qfai/contracts/`

4. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing test patterns (unit/integration/e2e)

## Step 0 — Project Analysis (mandatory)

Before producing any deliverable, **thoroughly analyze the current project** so your outputs fit the repo’s:

- background and goals
- directory structure and conventions
- chosen technologies and versions (runtime, package manager, test runner)
- architecture boundaries (packages, CLI, core modules)
- existing patterns for tests, docs, and CI

### Minimum analysis checklist

- [ ] Read key repo docs: README / CHANGELOG / RELEASE (if present)
- [ ] Inspect `.qfai/` layout and existing SDD/ATDD/TDD artifacts (if present)
- [ ] Inspect `packages/qfai` structure (CLI entrypoints, core modules, validators, assets/init)
- [ ] Identify standard gate commands (format/lint/type/test/verify-pack) and where they are defined
- [ ] Search for existing examples/patterns of similar changes in tests (if available)
- [ ] Note constraints: Node versions, CI matrix, packaging rules, verify-pack expectations

If analysis cannot be performed (missing access), clearly state what could not be verified and proceed with minimal-risk assumptions.

## Step 0.5 — Steering Bootstrap / Refresh (mandatory when incomplete)

QFAI expects `assistant/steering/` to contain **project‑specific facts** so all subsequent design/test/implementation fits this repository.

### What to do

1. Open these files:

- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/tech.md`
- `.qfai/assistant/steering/structure.md`

2. If they are missing, mostly empty, or still have placeholders (e.g., `- ` only), **populate them by analyzing the current repository**:

- derive “what/why/users/success/non-goals” from README/docs/issues (product.md)
- derive runtime/tooling versions + constraints from package.json, CI config, lockfiles (tech.md)
- derive repo layout + key directories + gate commands from the file tree and scripts (structure.md)

3. Do **not** invent facts. If something cannot be verified, write it as:

- `TBD` + what evidence is missing, or
- an Open Question (if it blocks correctness)

### Steering refresh checklist

- [ ] product.md: what we build / users / success / non-goals / release posture
- [ ] tech.md: Node / package manager / TS / test / lint / CI constraints
- [ ] structure.md: repo layout, key packages, entrypoints, standard gate commands, how to run locally

## Step 1 — Confirm prerequisites

### 1.1 Read delta decision log (mandatory)

Before implementing, read `.qfai/specs/spec-XXXX/delta.md` and treat it as authoritative for:

- what options were considered (Decision Table)
- what options were rejected or deferred (Decision Guardrails)

Hard rule:

- Do not implement rejected/deferred options unless the spec/delta is explicitly updated.
- If you need an exception, raise an Open Question and propose a spec change first.

Must exist:

- `.qfai/specs/spec-XXXX/spec.md`
- `.qfai/specs/spec-XXXX/delta.md`
- `.qfai/specs/spec-XXXX/scenario.feature`
  If missing, stop and request /qfai-spec.

## Step 2 — Plan the implementation (Planner + Architect)

Create a short plan:

- Tasks (ordered)
- Files likely affected
- Risks + mitigations
- Definition of Done (commands that must pass)

If tool supports TodoWrite, record tasks.

## Step 3 — Implement in small increments (Engineers)

Rules:

- Prefer small, reviewable commits (even if local).
- Keep changes minimal and aligned with spec.
- If spec is ambiguous, do not guess silently: record an Open Question and/or propose a spec update.

## Step 4 — Keep tests aligned (Test Engineer)

- Do NOT write new tests here. If tests are missing or need coverage, run `/qfai-tdd-red` first.
- For acceptance tests, use `/qfai-atdd` instead of adding them here.
- Exception: if existing tests are broken and gates cannot pass, apply the minimal fix. Avoid creating new tests.

## Step 5 — Review & QA checks

- Code Reviewer reviews diffs for maintainability and risk.
- QA Engineer checks acceptance criteria coverage and failure handling.

## Runtime Evidence (MANDATORY)

Determine project type and provide evidence accordingly:

### CLI tool

- command executes without crash
- expected outputs observed for at least:
  - normal case
  - invalid input case

### Web/API service

- service boots successfully
- at least one contract path is exercised (local run or integration test)
- request/response matches contract (status codes, schemas)

### Library

- build succeeds
- a small integration "smoke usage" exists (example test or minimal consumer snippet)
- public API compiles and behaves per acceptance criteria

You must record:

- exact commands executed
- expected vs observed outcomes

## Prohibited "done" criteria

You must NOT declare completion based on:

- code compilation only
- unit tests only
- spec text satisfaction without runtime run
- mocked acceptance tests presented as real runtime (unless explicitly approved)

## Step 6 — Integration checks (DevOps/CI Engineer)

- ensure compilation/type checks pass
- ensure runtime wiring exists (entrypoints, configuration)

## Step 7 — Runtime evidence (Runtime Gatekeeper)

- execute the runtime evidence commands above
- capture expected vs observed outcomes

## Step 8 — Run quality gates (DevOps/CI Engineer)

Run the repo’s standard commands. At minimum:

- formatting
- lint
- typecheck (if applicable)
- unit tests
- scenario tests (if applicable)

Record:

- commands
- outputs (summary)
- PASS/FAIL

## Step 9 — If any gate fails: fix loop

Iterate until all gates pass, prioritizing:

1. correctness vs spec
2. test determinism
3. maintainability

## Completion Criteria (Final Gate)

**Before declaring implementation complete, you MUST verify:**

1. Unit/Component Coverage Ledger shows `missing=0` (exceptions documented).

2. Runtime evidence commands executed and outcomes recorded.

3. Run QFAI validation:

   ```bash
   qfai validate --fail-on error
   ```

4. Run repository standard gates (discover from package.json/CI/docs):
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)

   Record the exact commands and results.

5. All gates must PASS.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Definition of Done (Mandatory Output)

Include a **DoD** section with:

- Commands executed (format/lint/type/unit/integration/verify-pack/dry-run as applicable)
- Runtime evidence commands and results
- A note on any mocks/stubs and why they are acceptable

All must pass; otherwise, report as not complete.

## Output

- Implementation diffs
- Updated tests (if needed)
- Verification evidence (commands + results)
- Runtime evidence summary (commands + outcomes)
- DoD section (required)
- Gate results: all PASS
- Suggested next command: /qfai-verify (if not already done)

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions/steering and the delta.md spec-id
- DR-IDs referenced (or "none" + propose adding a Decision Record)
- Confirmation that no rejected options were reintroduced (or list RE-OPEN DR-IDs)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not implement the refactor.
