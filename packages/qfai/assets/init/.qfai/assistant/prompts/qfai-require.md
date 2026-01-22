<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-require
title: QFAI Require (Create Requirements Artifact)
description: "Generate a concrete requirements artifact (EARS + NFR) as a project deliverable."
argument-hint: "<work-item-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task]
roles: [RequirementsAnalyst, Interviewer, QAEngineer, CodeReviewer, Planner]
mode: approval-gated

---

# /qfai-require — Create Requirements Artifact

## Purpose

Turn the Requirements Seed (from /qfai-discuss or user input) into a **versioned, reviewable requirements artifact** under `.qfai/require/`.

## Success Criteria (Definition of Done)

- `.qfai/require/require.md` exists and is readable by a newcomer.
- Requirements are **testable** (EARS style) and include **NFR** (security/performance/etc).
- Blocking Open Questions are explicitly listed with requested answers.

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

- `.qfai/**/README.md` is a reference guide. Do NOT edit README files.
- If you find a gap or inconsistency in a README, do NOT modify it. Instead, record an **Open Question**.
- Before starting work, read the README of the target directory and follow its structure, templates, and checklist.

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

## Step 1 — Ensure repository location

Create (or update) these files:

- `.qfai/require/README.md` — what this folder is, how to use it
- `.qfai/require/require.md` — the requirements artifact (single-file SSOT)

## Step 2 — Requirements format: EARS (Requirements Analyst)

Use EARS patterns (inspired by SDD frameworks):

- **Ubiquitous**: “The system shall …”
- **Event‑driven**: “When <event>, the system shall …”
- **State‑driven**: “While <state>, the system shall …”
- **Unwanted behavior**: “If <undesired>, the system shall …”
- **Optional feature**: “Where <feature>, the system shall …”

### Requirement ID scheme

Use stable IDs:

- `REQ-FUNC-###` for functional requirements
- `REQ-NFR-SEC-###`, `REQ-NFR-PERF-###`, `REQ-NFR-REL-###` etc for non-functional

IDs must be unique and never reused.

## Step 3 — Write `require.md` with this template

Use this exact structure:

# Requirements

## 1. Overview

- Problem / opportunity
- Target users
- Success definition (business + technical)

## 2. Scope

### In scope

### Out of scope

## 3. Constraints & Assumptions

- Constraints
- Assumptions (explicit)

## 4. Glossary (optional but recommended)

## 5. Functional Requirements (EARS)

### REQ-FUNC-001: <title>

- Statement (EARS)
- Rationale
- Acceptance criteria (testable)
- Notes / edge cases

(repeat)

## 6. Non‑Functional Requirements

### Security

### Performance

### Reliability / Availability

### Observability

### Compliance / Privacy (if relevant)

## 7. Acceptance Criteria (summary)

A bullet list of what must be true to accept the change.

## 8. Open Questions

### Blocking

### Non‑blocking

## Step 4 — Review cycle (QA + Code Reviewer)

- QA Engineer checks testability and missing failure cases.
- Code Reviewer checks ambiguity, contradictions, and “non‑testable language”.

## Step 5 — Approval gate

If interactive mode:

- Ask the user for approval: “Approve requirements? (yes/no)”
- If no: update and repeat.
  If `--auto`:
- Proceed, but highlight assumptions and warn about rework risk.

## Completion Criteria (Final Gate)

**Before declaring requirements complete, you MUST verify:**

1. Run QFAI validation:

   ```bash
   qfai validate --fail-on error
   ```

2. Run repository standard gates (example commands; adjust to repo):

   ```bash
   pnpm format:check
   pnpm lint
   pnpm check-types
   pnpm -C packages/qfai test
   pnpm test:assets
   pnpm verify:pack
   pnpm publish -r --dry-run
   ```

3. All gates must PASS.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Output

- Updated `.qfai/require/README.md`
- Updated `.qfai/require/require.md`
- Gate results: all PASS
- A short “next command” suggestion (typically /qfai-spec)
