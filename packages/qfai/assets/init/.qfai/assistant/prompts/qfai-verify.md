<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-verify
title: QFAI Verify (Quality Gates + Evidence)
description: "Run and document quality gates (repo + qfai validate/report), fix until PASS."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Bash, Write, TodoWrite, Task]
roles: [DevOpsCIEngineer, QAEngineer, CodeReviewer, Planner]
mode: evidence-focused

---

# /qfai-verify — Quality Gates and Evidence

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion without running the defined gates.
- You MUST produce the required evidence file: `.qfai/evidence/verify-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if any gate fails without an actionable fix list.
- Completion must be approved by a reviewer who did not run the gates.

## Goal

Run quality gates and produce evidence that the change is correct and safe.

## Success Criteria (Definition of Done)

- Repo quality gates PASS (format/lint/type/test/build/etc).
- QFAI checks PASS (at minimum: `qfai validate`, and optionally `qfai report`).
- A concise evidence summary exists (copy‑paste for PR).
- Evidence file exists: `.qfai/evidence/verify-<spec-id>.md`.
- Completion is approved by a reviewer who did not run the gates.

## Mandatory checks

- Run listed commands and record outputs.
- If failing, produce an actionable fix list (not vague).

## Not-done criteria

- "Seems ok" without actual command outputs.

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

- Gate execution (DevOpsCIEngineer) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm gate coverage before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Gates already executed vs remaining
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

## Step 1 — Discover project gate commands (DevOps/CI Engineer)

Prefer existing scripts:

- package.json scripts
- Makefile / task runner
- CI config

If unknown, propose defaults and mark assumptions.

## Step 2 — Run QFAI gates

Run (adjust as needed):

- `qfai validate --fail-on error`
- `qfai report` (if used in this repo)

Capture:

- exit codes
- key errors/warnings
- file paths affected

## Step 3 — Run repo gates

Run the repo’s standard pipeline in a stable order:

1. format
2. lint
3. typecheck
4. unit tests
5. scenario/e2e tests
6. build/package (if relevant)

## Step 4 — Fix loop (Code Reviewer + QA)

If anything fails:

- Identify whether it’s spec mismatch, test issue, or implementation defect.
- Fix the root cause (do not silence tests without reason).

## Step 5 — Produce Evidence Summary (Planner)

Output this format:

### Verification Evidence

- QFAI:
  - command:
  - result:
- Repo gates:
  - command:
  - result:
- Notes:
  - assumptions:
  - risks:

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/verify-<spec-id>.md`

Evidence must include:

- command list + pass/fail + next actions

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
# Verify Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

- command:
- result:

## QFAI gates

- command:
- result:

## Repo gates

- command:
- result:

## Next actions (if any)

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

## Completion Criteria (Final Gate)

**All of the following must be verified and PASS:**

1. QFAI validation:

   ```bash
   qfai validate --fail-on error
   ```

2. Repository standard gates (discover from package.json/CI/docs):
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)

   Record the exact commands and results.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Output

- Evidence summary with all gate results
- All gates: PASS confirmed
- Next action suggestion: proceed to PR creation (use your platform workflow)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not run the gates.
