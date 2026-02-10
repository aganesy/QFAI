<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-discuss
title: QFAI Discuss (Idea → Clear Requirements)
description: "Socratic discussion to turn a vague idea into a clear, testable set of requirements inputs."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Researcher, Facilitator, Interviewer, RequirementsAnalyst, QAEngineer, Planner]
mode: interactive-by-default

---

# /qfai-discuss — Discussion → Requirements Clarity

## FORMAT SSOT (Mandatory)

- **Before writing or editing any `.qfai/**` artifact\*\*, read and follow the relevant directory README template and sample:
  - `.qfai/discussions/README.md`
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
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion without covering all Required Coverage topics.
- You MUST save a discuss record under `.qfai/discussions/`.
- Before drafting Business Flows, read `.qfai/require/business-flows.md` and follow its template.
- Business Flows in discuss outputs MUST use Mermaid `sequenceDiagram`.
- Every Business Flow message line MUST include a BF step ID (example: `BF-0001-S01`).
- You MUST produce the required evidence file: `.qfai/evidence/discuss-<discuss-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST complete pre-knowledge research before drafting questions (delegate to Researcher when supported; Codex performs this inline).
- You MUST draft the full question set and share the goal/approach before asking any question.
- You MUST ask one question at a time with `Question X/Y` and a 3-options + "recommend for me" format.
- You MUST re-optimize the remaining questions after each answer and update the total count.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if scope remains ambiguous or required inputs are missing.
- Completion must be approved by a reviewer who did not lead the discussion.

## Sub-agent policy (mandatory)

- If subagents are supported, Orchestrator MUST delegate: Researcher, Facilitator/Interviewer, Reviewer (non-edit).
- Orchestrator must not lead and approve the same discussion.
- Evidence must include work orders and reviewer notes.
- If subagents are not supported, simulate role separation with explicit role sections.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Turn a vague idea into explicit, testable requirements and decisions that downstream prompts can implement without guesswork.

## Non-goals

- Writing final requirements/specs (use `/qfai-require` / `/qfai-sdd-refinement`).
- Implementation work.

## Mandatory Outputs

- Requirements Seed
- Draft catalogs (in the discuss record): **Actors (ACT-\*)**, **Business Flows (Mermaid `sequenceDiagram` with BF step IDs)**, **Glossary seeds (TERM-\*)**
- Decision Table (with rejected/deferred options)
- Discuss record: `.qfai/discussions/discuss-XXXX.md`
- Evidence file: `.qfai/evidence/discuss-<discuss-id>.md`
- Reviewer notes (PASS or concrete rework list)

## Success Criteria (Definition of Done)

- A “Requirements Seed” exists: goals, non-goals, constraints, acceptance criteria (high level), and open questions.
- Draft **Actors / Business Flows / Glossary seeds** exist with stable IDs in the discuss record.
- Business Flows are written as Mermaid `sequenceDiagram` with BF step IDs on message lines.
- The output is ready to be fed into **/qfai-require** with minimal further clarification.
- A **discuss record** is saved to `.qfai/discussions/discuss-XXXX.md` with all decisions and candidates.
- Evidence file exists: `.qfai/evidence/discuss-<discuss-id>.md`.
- Completion is approved by a reviewer who did not lead the discussion.

## Mandatory checks

- Decisions are recorded with explicit trade-offs.
- Open risks are not assumed away.
- Required coverage topics are complete.
- Discuss record includes Mermaid `sequenceDiagram` Business Flows with BF step IDs.
- Discuss record is saved with decision table and handoff.
- Pre-knowledge research notes and question design rationale are recorded in evidence.

## Not-done criteria

- "We discussed" without decision and rationale.
- No explicit scope boundary.

## Failure handling (mandatory)

- If blocked/unknown, stop and record a DR in delta.md (do not skip).
- If required coverage remains undecided, do not declare completion.

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

If the user has not decided on any of the above, **propose at least 3 options plus a "recommend for me" option** and ask the user to choose.

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

Pre-knowledge research is mandatory and must be conducted in English sources before drafting questions. If subagents are supported, delegate this to **Researcher** using a structured brief (Codex is the exception: do it inline without subagents).

### If subagents are supported

Delegate to multiple roles and then merge the results. Use a “real‑world workflow” order:

- Researcher → Facilitator → Interviewer → Requirements Analyst → Planner → Architect → (Contract Designer) → Test Engineer → QA Engineer → Code Reviewer → DevOps/CI Engineer

**Pseudo‑invocation pattern** (adjust to your tool):

```text
Task(
  subagent_type="researcher",
  description="Collect pre-knowledge (English sources) and question angles",
  prompt="Context: ...\nKnown facts: ...\nUnknowns: ...\nAngles to research: domain terms, risks, constraints, benchmarks\nReturn: summary + glossary + question cues + open risks"
)

Task(
  subagent_type="planner",
  description="Create an execution plan and DoD",
  prompt="Context: ...\nGoal: ...\nConstraints: ...\nReturn: phases + risks + DoD"
)
```

### If subagents are NOT supported

Simulate roles by running the same sequence yourself:

- Start with a short Researcher section (English pre-knowledge + question cues), then proceed role by role.
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

## Step 0.5 — Pre-knowledge research (Researcher)

Before drafting questions, collect background knowledge using **English sources** (or explicitly state if external research is not possible) and summarize findings in the user's language. Focus on:

- domain terminology and glossary
- typical constraints, benchmarks, and risks
- regulatory/compliance considerations (if relevant)
- common failure modes and user expectations

Deliver:

- concise research memo
- glossary of key terms
- list of unknowns and assumptions
- candidate question angles mapped to Required Coverage topics

Record the research memo and question design rationale in the evidence file.

## Step 1 — Frame the discussion (Facilitator)

Produce a short framing first (no more than ~10 lines):

- Problem statement
- Target users / stakeholders
- Expected outcome
- Scope boundary (in / out)
- Constraints (time, platform, compatibility posture)

Also share the discussion approach:

- confirm pre-knowledge research is complete
- state that a full question draft will be shown before Q&A
- state that questions will be asked one at a time with counts (Question X/Y)

## Step 2 — Build the full question draft (Interviewer)

Draft the **entire question set** before asking anything. Questions must be in **priority order**:

- **Blockers**: must be answered to write requirements
- **Clarifiers**: improve precision but can be assumed temporarily

For each question, include:

- purpose and the decision it unlocks
- default assumption if unanswered
- answer format: **3 options + "recommend for me"**

Share the full draft list (numbered, with total count) before Q&A begins.

## Step 3 — Ask one question at a time (Interviewer)

Use a _Socratic style_:

- Ask one question at a time in interactive mode.
- Prefix with `Question X/Y` and show the total count.
- Present 3 options plus a "recommend for me" option.
- After each answer, re-optimize the remaining list; if the list changes, state the new total and what changed.
- If `--auto` is provided, make explicit assumptions and mark them.

## Step 4 — Draft the Requirements Seed (Requirements Analyst)

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

## Step 4.5 — Decision Table (mandatory)

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
- Decision Table entries MUST be transferable into delta.md Decision Records (selected + rejected) without losing rejected context.

## Step 5 — QA sanity check (QA Engineer)

Validate:

- Acceptance criteria are testable.
- Failure modes are considered.
- Observability is defined (logs/messages/output).

## Step 6 — Produce handoff to /qfai-require (Planner)

Generate the minimal input payload for /qfai-require:

- Short summary
- Confirmed facts
- Remaining questions (if any)
- Proposed requirement ID namespace (optional)

## Step 7 — Save discuss record (mandatory)

Save the complete discussion output to `.qfai/discussions/discuss-XXXX.md`.

### File naming

- Use the next available ID: `discuss-0001.md`, `discuss-0002.md`, etc.
- Check existing files in `.qfai/discussions/` to determine the next number.

### File structure

The saved file MUST include:

1. **Header** with timestamp, topic, and participants (if known)
2. **Requirements Seed** (full content from Step 4)
3. **Decision Table** (full content from Step 4.5)
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

- pre-knowledge research memo (English sources or stated limits)
- question draft and rationale (including changes after answers)
- decision table (options, pros/cons, recommendation)
- unresolved questions (even if "none")

### Required sections

- Objective
- Inputs reviewed (files/paths)
- Pre-knowledge research summary
- Question design rationale
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

## Pre-knowledge research summary

## Question design rationale

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
- [ ] Business Flows are Mermaid `sequenceDiagram` with BF step IDs.
- [ ] Completion approved by a reviewer who did not lead the discussion.
