<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->
---

id: qfai-discuss
title: QFAI Discuss (Idea → Clear Requirements)
description: "Socratic discussion to turn a vague idea into a clear, testable set of requirements inputs."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Facilitator, Interviewer, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-discuss — Discussion → Requirements Clarity

## FORMAT SSOT (Mandatory)

- **Before writing or editing any `.qfai/**` artifact**, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- **Do NOT copy** templates/samples into this prompt or into other prompt markdown.
- The generated artifacts must match the README-defined structure (headings, ordering, table columns).
- Completion requires a **Format Self-Check** in the evidence: list each artifact and confirm “matches README template”.


## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion without covering all Required Coverage topics.
- You MUST save a discuss record under `.qfai/discussions/`.
- You MUST produce the required evidence file: `.qfai/evidence/discuss-<discuss-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if scope remains ambiguous or required inputs are missing.
- Completion must be approved by a reviewer who did not lead the discussion.

## Goal

Turn a vague idea into explicit, testable requirements and decisions that downstream prompts can implement without guesswork.

## Success Criteria (Definition of Done)

- A “Requirements Seed” exists: goals, non-goals, constraints, acceptance criteria (high level), and open questions.
- The output is ready to be fed into **/qfai-require** with minimal further clarification.
- A **discuss record** is saved to `.qfai/discussions/discuss-XXXX.md` with all decisions and candidates.
- Evidence file exists: `.qfai/evidence/discuss-<discuss-id>.md`.
- Completion is approved by a reviewer who did not lead the discussion.

## Mandatory checks

- Decisions are recorded with explicit trade-offs.
- Open risks are not assumed away.
- Required coverage topics are complete.
- Discuss record is saved with decision table and handoff.

## Not-done criteria

- "We discussed" without decision and rationale.
- No explicit scope boundary.

## Required Coverage (MUST address)

The discussion MUST cover the following topics before completion:

1. **Engineering Posture** — Choose exactly one and explain reasons + trade-offs:
   - MVP / Simple System
   - Product / Evolving System
   - Platform / Large-scale System
2. **Product concept / positioning** — What is the product? Who is it for? What problem does it solve? What value does it provide?
3. **Policy / trade-offs** — What is the product's stance?
   - Examples: Simple & fast vs Feature-rich & expert-oriented vs Governance-focused
   - Examples: API-first vs UI-first; Strict validation vs Lenient defaults
   - Examples: Manual operation acceptable initially vs Full automation from day 1
   - Anti-goals (explicitly out of scope behaviors)
4. **Non-functional requirements (NFR)** — Each of the following MUST be addressed:
   - **Performance**: Response time targets, concurrent users, batch processing limits
   - **Availability / Reliability**: Uptime goals, backup/recovery, failover strategy
   - **Security**: Authentication, authorization, audit logging, PII handling
   - **Operability**: Monitoring, alerting, migration strategy, rollback plan
   - **UX posture**: Accessibility, internationalization, error messaging style
5. **Functional scope / user journeys** — What are the key user actions?
6. **Constraints** — Compatibility, rollout strategy, timeline, platform limits
7. **Scope boundary** — Explicitly state what is OUT of scope for this iteration.

If the user has not decided on any of the above, **propose at least 3 options** and ask the user to choose.

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

- Discussion facilitation (Facilitator/Interviewer) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm coverage and testability before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Required coverage topics already decided vs missing
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

## Step 1 — Frame the discussion (Facilitator)

Produce a short framing first (no more than ~10 lines):

- Problem statement
- Target users / stakeholders
- Expected outcome
- Scope boundary (in / out)
- Constraints (time, platform, compatibility posture)

## Step 2 — Ask only high‑value questions (Interviewer)

Generate questions in **priority order**:

- **Blockers**: must be answered to write requirements
- **Clarifiers**: improve precision but can be assumed temporarily

Use a _Socratic style_:

- Ask one question at a time in interactive mode.
- If `--auto` is provided, make explicit assumptions and mark them.

## Step 3 — Draft the Requirements Seed (Requirements Analyst)

Write a draft in this format:

### Requirements Seed

- **Goal**:
- **Non‑Goals**:
- **Users / Actors**:
- **Engineering Posture**:
- **Key User Journeys** (1–3):
- **Constraints**:
- **Acceptance Criteria (high level)**:
- **Observability** (what evidence proves success):
- **Risks / Edge cases**:
- **Assumptions**:
- **Open Questions (blockers)**:
- **Open Questions (non‑blockers)**:

## Step 3.5 — Decision Table (mandatory)

Record ALL options that were considered during the discussion, including rejected and deferred ones.

Use this format:

### Decision Table

| ID      | Topic               | Candidates | Decision                      | Rationale           |
| ------- | ------------------- | ---------- | ----------------------------- | ------------------- |
| DD-0001 | Engineering posture | A / B / C  | Adopt: A, Reject: B, Defer: C | <why A was chosen>  |
| DD-0002 | Performance goal    | X / Y      | Adopt: X, Reject: Y           | <why X fits better> |

Rules:

- Every topic from "Required Coverage" MUST have at least one DD row.
- Rejected options MUST include "why rejected" in Rationale.
- Deferred options MUST include "conditions to reconsider" in Rationale.

## Step 4 — QA sanity check (QA Engineer)

Validate:

- Acceptance criteria are testable.
- Failure modes are considered.
- Observability is defined (logs/messages/output).

## Step 5 — Produce handoff to /qfai-require (Planner)

Generate the minimal input payload for /qfai-require:

- Short summary
- Confirmed facts
- Remaining questions (if any)
- Proposed requirement ID namespace (optional)

## Step 6 — Save discuss record (mandatory)

Save the complete discussion output to `.qfai/discussions/discuss-XXXX.md`.

### File naming

- Use the next available ID: `discuss-0001.md`, `discuss-0002.md`, etc.
- Check existing files in `.qfai/discussions/` to determine the next number.

### File structure

The saved file MUST include:

1. **Header** with timestamp, topic, and participants (if known)
2. **Requirements Seed** (full content from Step 3)
3. **Decision Table** (full content from Step 3.5)
4. **Handoff summary** for /qfai-require

### Example header

```md
# Discuss-0001: <topic summary>

- Date: YYYY-MM-DD
- Status: Complete / In-progress
- Next: /qfai-require
```

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/discuss-<discuss-id>.md`

Evidence must include:

- decision table (options, pros/cons, recommendation)
- unresolved questions (even if "none")

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
# Discuss Evidence: <discuss-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Gaps / Open risks

## Required coverage checklist

## Discuss record + handoff

## Final status (PASS/FAIL) + who confirmed
```

## Output

1. Requirements Seed (as above)
2. Decision Table (with all candidates, adopted, rejected, deferred)
3. The "/qfai-require input" block (copy‑paste ready)
4. **Saved file**: `.qfai/discussions/discuss-XXXX.md`

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not lead the discussion.
