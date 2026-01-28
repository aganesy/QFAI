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

## CRITICAL CONSTRAINTS (Read First)

- Keep `require.md` headings in English and follow the template exactly.
- You MUST produce the required evidence file: `.qfai/evidence/require-<work-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if requirements are ambiguous or acceptance signals are missing.
- Completion must be approved by a reviewer who did not author the requirements.

## Goal

Turn the Requirements Seed into a reviewable, testable requirements artifact under `.qfai/require/`.

## Success Criteria (Definition of Done)

- A requirements document (`require.md`) exists in the requirements directory and is readable by a newcomer.
- Requirements are **testable** (EARS style) and include **NFR** (security/performance/etc).
- Blocking Open Questions are explicitly listed with requested answers.
- The `require.md` structure and headings remain in English and follow the template exactly.
- Evidence file exists: `.qfai/evidence/require-<work-id>.md`.
- Completion is approved by a reviewer who did not author the requirements.

## Mandatory checks

- Each requirement has explicit acceptance signals (what proves it).
- Priority and scope boundary are explicit.

## Not-done criteria

- Ambiguous requirements without escalation.
- Missing acceptance signal for any requirement.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/require-<work-id>.md`
Use `<work-id>` = `spec-XXXX` if known; otherwise use a short slug from the request.

Evidence must include:
- requirements list + acceptance signals
- mapping: requirement -> impacted artifacts

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
# Requirements Evidence: <work-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Requirements summary

- functional count:
- nfr coverage:
- open questions (blocking/non-blocking):
- acceptance signals captured:
- impacted artifacts mapped:

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

**Body text MUST be written in the user’s working language for this session.**
**The `require.md` structure and headings MUST remain in English and follow the template exactly.**

- If the user writes in Japanese, write body text in Japanese.
- If the user writes in English, write body text in English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.  
  This rule overrides other stylistic preferences for body text.

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

## Completion Separation (mandatory)

- Requirements authoring (RequirementsAnalyst) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm testability and NFR coverage before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Template compliance and open-question status
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

## Step 1 — Ensure repository location

- Ensure the requirements directory exists under `.qfai/require/`.
- Create or update `require.md` as the single requirements artifact.
- Do not edit README files; raise an Open Question if guidance is missing.

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

If `require.md` does not exist, create it in `.qfai/require/`. If it exists, update it in place while preserving the structure.

Use this exact structure:

Keep headings exactly as shown (English) and only fill content where indicated.

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

2. Run repository standard gates (discover from package.json/CI/docs):
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)

   Record the exact commands and results.

3. All gates must PASS.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Output

- Updated `require.md`
- Gate results: all PASS
- A short “next command” suggestion (typically /qfai-spec)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not author the requirements.
