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
roles:
[
RequirementsAnalyst,
Interviewer,
OQHarvester,
OQReviewer,
QAEngineer,
CodeReviewer,
Planner,
]
mode: approval-gated

---

# /qfai-require — Create Requirements Artifact

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

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision Record in delta.md that references the prior DR-ID, states what changed + new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- Keep `require.md` headings in English and follow the template exactly.
- `require.md` MUST include a **Business Flow Coverage Map** tied to BF step IDs.
- You MUST produce the required evidence file: `.qfai/evidence/require-<work-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST create and maintain `.qfai/require/open-questions.md` as the OQ ledger (Open/Answered/Deferred).
- You MUST run OQ Harvester and OQ Reviewer before asking questions and before finalizing requirements.
- You MUST ask OQ questions one at a time with `Question X/Y` and a 3-options + "recommend for me" + free-text format.
- You MUST re-optimize remaining questions after each answer and update the total count.
- You MUST iterate (draft -> harvest -> Q&A -> update -> re-harvest) up to 2 loops.
- You MUST NOT declare completion if any Open items remain. Deferred is allowed only with explicit user approval recorded in evidence.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if requirements are ambiguous or acceptance signals are missing.
- Completion must be approved by a reviewer who did not author the requirements.

## Sub-agent policy (mandatory)

- If subagents are supported, Orchestrator MUST delegate: OQ Harvester, OQ Reviewer, Requirements Analyst, Reviewer (non-edit).
- Orchestrator must not author and approve the same artifact.
- Evidence must include work orders and reviewer notes.
- If subagents are not supported, simulate role separation with explicit role sections.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Turn the Requirements Seed into a reviewable, testable requirements artifact under `.qfai/require/`.

## Non-goals

- Spec/contract authoring (use `/qfai-spec`).
- Implementation work.

## Mandatory Outputs

- `.qfai/require/glossary.md`
- `.qfai/require/actors.md`
- `.qfai/require/business-flows.md`
- `.qfai/require/require.md` (includes **Business Flow Coverage Map**)
- `.qfai/require/open-questions.md` (OQ ledger)
- Evidence file: `.qfai/evidence/require-<work-id>.md`
- Reviewer notes (PASS or concrete rework list)

## Success Criteria (Definition of Done)

- Domain context SSOT exists: `glossary.md`, `actors.md`, `business-flows.md`.
- A requirements document (`require.md`) exists in the requirements directory and is readable by a newcomer.
- Requirements are **testable** (EARS style) and include **NFR** (security/performance/etc).
- Blocking Open Questions are resolved or explicitly deferred with approval.
- An open-questions ledger (`open-questions.md`) exists with **Open=0** (Deferred only by explicit user approval).
- The `require.md` structure and headings remain in English and follow the template exactly.
- The `require.md` includes a **Business Flow Coverage Map** with explicit In/Out scope.
- Evidence file exists: `.qfai/evidence/require-<work-id>.md`.
- Completion is approved by a reviewer who did not author the requirements.

## Mandatory checks

- Each requirement has explicit acceptance signals (what proves it).
- Priority and scope boundary are explicit.
- open-questions.md shows Open=0; Deferred entries include user approval evidence.
- Decision rationale captures adopted vs rejected options for later delta.md Decision Records.

## Not-done criteria

- Ambiguous requirements without escalation.
- Missing acceptance signal for any requirement.
- Any Open item remains in open-questions.md.

## Failure handling (mandatory)

- If blocked/unknown, stop and record a DR in delta.md (do not skip).
- If Open items remain, do not declare completion.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/require-<work-id>.md`
Use `<work-id>` = `spec-XXXX` if known; otherwise use a short slug from the request.

Evidence must include:

- requirements list + acceptance signals
- mapping: requirement -> impacted artifacts
- open-questions ledger summary (Open/Answered/Deferred) with approval evidence for Deferred

### Required sections

- Objective
- Inputs reviewed (files/paths)
- Open questions ledger summary
- OQ resolution notes
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

## Open questions ledger summary

## OQ resolution notes

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Requirements summary

- functional count:
- nfr coverage:
- open questions (blocking/non-blocking):
- open questions ledger (Open/Answered/Deferred):
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

- Facilitator → Requirements Analyst → OQ Harvester → OQ Reviewer → Interviewer → Planner → Architect → (Contract Designer) → Test Engineer → QA Engineer → Code Reviewer → DevOps/CI Engineer

**Pseudo‑invocation pattern** (adjust to your tool):

```text
Task(
  subagent_type="oq-harvester",
  description="Extract undefined/ambiguous items and propose OQ questions",
  prompt="Context: ...\nDraft artifacts: ...\nReturn: OQ list + options + impact + priority"
)

Task(
  subagent_type="oq-reviewer",
  description="Review OQ list for completeness and safe deferral",
  prompt="Context: ...\nOQ list: ...\nReturn: gaps + risk notes + recommended edits"
)

Task(
  subagent_type="planner",
  description="Create an execution plan and DoD",
  prompt="Context: ...\nGoal: ...\nConstraints: ...\nReturn: phases + risks + DoD"
)
```

### If subagents are NOT supported

Simulate roles by running the same sequence yourself:

- Include OQ Harvester and OQ Reviewer outputs, then consolidate into the final deliverable(s).

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
- Create or update `glossary.md`, `actors.md`, `business-flows.md` as the domain context SSOT.
- Create or update `require.md` as the requirements artifact (with coverage map).
- Create or update `open-questions.md` as the OQ ledger.
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

- `REQ-FUNC-0001` for functional requirements
- `REQ-NFR-0001` for non-functional requirements (group with headings or labels)

IDs must be unique and never reused.

## Step 3 — Draft `require.md` (first pass) with this template

If `require.md` does not exist, create it in `.qfai/require/`. If it exists, update it in place while preserving the structure.

Use this exact structure:

Keep headings exactly as shown (English) and only fill content where indicated.

# Requirements

## Metadata

| Key     | Value         |
| ------- | ------------- |
| Product | <name>        |
| Created | <YYYY-MM-DD>  |
| Updated | <YYYY-MM-DD>  |
| Owner   | <role/person> |
| Scope   | <short>       |

## Inputs (SSOT)

- Glossary: `require/glossary.md`
- Actors: `require/actors.md`
- Business flows: `require/business-flows.md`

## Business Flow Coverage Map

> Purpose: ensure every **in-scope** BF step is covered by REQ and/or a SPEC slice.
> If a step is out-of-scope, say so explicitly.

| BF step ID | Step summary | In/Out | Covered by (REQ-*/spec-*/scenario) | Notes |
| --- | --- | --- | --- | --- |
| BF-0001-S01 | <...> | In | REQ-FUNC-0001, spec-0001 | |
| BF-0001-S02 | <...> | Out | - | Reason |

## Functional Requirements (REQ-FUNC)

> Rules:
>
> - One bullet = one requirement.
> - Split if multiple independent clauses exist.

- [REQ-FUNC-0001][P0] <single verifiable statement>.
- [REQ-FUNC-0002][P1] <single verifiable statement>.

## Non-Functional Requirements (REQ-NFR)

- [REQ-NFR-0001][P1] <single verifiable statement>.

## Step 3.5 — OQ Harvest and Resolution Loop (mandatory)

1. Run **OQ Harvester** on the draft `require.md` (and any existing contracts/specs).
2. Run **OQ Reviewer** to validate completeness and deferral safety.
3. Deduplicate and prioritize OQs. Draft the full question list before asking.
4. Ask the user **one question at a time** using `Question X/Y` and:
   - 3 options
   - "recommend for me"
   - free-text option
5. Update `open-questions.md` with status **Open/Answered/Deferred**.
6. Apply answers to `require.md` and re-run OQ Harvester (max 2 loops).

Completion rule:

- **Open must be 0**. Deferred is allowed only with explicit user approval recorded in evidence.
  If `--auto` is used, make conservative assumptions, mark them explicitly, and record them in the ledger.

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

- Updated `glossary.md`, `actors.md`, `business-flows.md`
- Updated `require.md`
- Updated `open-questions.md` (Open/Answered/Deferred)
- Gate results: all PASS
- A short “next command” suggestion (typically /qfai-spec)

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
- [ ] Completion approved by a reviewer who did not author the requirements.
