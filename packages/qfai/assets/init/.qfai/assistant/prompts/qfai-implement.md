<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-implement
title: QFAI Implement (Spec-driven implementation)
description: "Implement the program feature according to specs/contracts/scenario; includes tests, review, and full quality gate."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Planner, Architect, BackendEngineer, FrontendEngineer, TestEngineer, QAEngineer, CodeReviewer, DevOpsCIEngineer]
mode: iterative

---

# /qfai-implement — Implement Feature (Spec‑Driven)

## Purpose

Implement the required feature/changes according to **spec + contracts + scenario**, then reach a **green quality gate**.

## Success Criteria (Definition of Done)

- Implementation matches the spec and contracts.
- Scenario tests + unit tests pass.
- Repo quality gates pass (lint/type/build/pack as applicable).
- Verification evidence is recorded (commands + results).

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

- Facilitator → Interviewer → Requirements Analyst → Planner → Architect → (Contract Designer) → Test Engineer → QA Engineer → Code Reviewer → DevOps/CI Engineer

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

## Step 4 — Keep tests in lockstep (Test Engineer)

- If tests exist, update them only when spec changes.
- If tests are missing, add the minimal tests needed to enforce the spec.

## Step 5 — Review & QA checks

- Code Reviewer reviews diffs for maintainability and risk.
- QA Engineer checks acceptance criteria coverage and failure handling.

## Step 6 — Run quality gates (DevOps/CI Engineer)

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

## Step 7 — If any gate fails: fix loop

Iterate until all gates pass, prioritizing:

1. correctness vs spec
2. test determinism
3. maintainability

## Output

- Implementation diffs
- Updated tests (if needed)
- Verification evidence (commands + results)
- Suggested next command: /qfai-verify (if not already done)
