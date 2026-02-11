<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-tdd-green
title: QFAI TDD Green (Implement to pass tests)
description: "Implement production code to make TDD RED tests pass, then keep gates green."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [BackendEngineer, FrontendEngineer, UIUXReviewer, QAEngineer, RuntimeGatekeeper, CodeReviewer, DevOpsCIEngineer]
mode: iterative

---

# /qfai-tdd-green — Implement to Green (TDD)
[DRIFT-PROTOCOL:MANDATORY]
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

- Delegate: Implementer, Integrator create first drafts of minimal implementation and integration notes.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - Required roles were delegated (no orchestrator self-authoring).
  - DoD satisfied (coverage ledger, gates, evidence, DR-IDs).
  - **Drift Protocol enforced**:
    - No upstream artifact edits were made without an explicit user-approved Change Request.
    - If upstream changes exist, the correct owner skill was re-run after approval; downstream did not patch upstream directly.
  - **Test-layer policy enforced**:
    - E2E/API/Integration coverage aligns with `steering/test-layers.md` and the project’s plan.
    - Do not use pyramid ratios as a gate; use floors/ratios only as signals. Coverage obligations are the gate.
- Do not declare DONE or handoff until Reviewer returns `PASS`.


### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol (no upstream edits without user approval + CR)
- must: verify plan/test-layer adherence (`steering/test-layers.md` + plan)
- must: check Coverage Ledger is 100% unless approved exception
- must_not: accept test-volume ratios/floors as a hard gate
- must_not: accept upstream edits made directly by downstream phase
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

## Change Type (Mandatory)

Before updating `delta.md`, declare the Change Type and record it in:

- `delta.md` Change Log (latest CL entry)
- PR description (Change Type section)

Allowed values:

- Primary: `Initial | Behavior | Structural | Ops`
- Tags (optional): `@ui @api @db @nfr @docs @test`

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

- Do NOT declare completion based on tests alone.
- `plan.md` is the primary How SSOT for execution phases.
- If only legacy `implementation-brief.md` exists, continue with warning and create a migration task to `plan.md`.
- If both `plan.md` and legacy `implementation-brief.md` are missing, STOP and run `/qfai-sdd-planning`.
- If contracts exist, implement the required API/DB/UI and keep runtime evidence.
- If UI contracts exist for web/ERP, show a screen interaction as runtime smoke.
- You MUST pass the Runtime Interaction Gate (boot + access + interaction) and check UI layout sanity when UI exists.
- You MUST produce the required evidence file: `.qfai/evidence/tdd-green-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outputs.
- You MUST stop and escalate if runtime evidence or quality gates are missing.
- Completion must be approved by a reviewer who did not implement the code.

## Sub-agent policy (mandatory)

Follow `Sub-agent Delegation (MANDATORY)` first.

### Stage Minimum Roles (MUST)

- Delegate: Implementer, Integrator create first drafts of minimal implementation and integration notes.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

- If subagents are unavailable, request explicit user approval for `Simulation mode allowed`; without approval, stop.
- Evidence must include delegated work orders and reviewer result (`PASS` or `REVISE`).

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Orchestrate production implementation according to spec + contracts + scenario so RED tests pass and the green quality gate is reached.

## Non-goals

- Writing new tests (use `/qfai-tdd-red` or `/qfai-atdd`).
- Re-implementing rejected options without a RE-OPEN DR.

## Mandatory Outputs

- Implementation changes that make RED tests pass
- Runtime Interaction Gate evidence
- Evidence file: `.qfai/evidence/tdd-green-<spec-id>.md`
- Reviewer notes (PASS or concrete rework list)

## Guardrails

- You are the orchestrator. Do not implement directly; delegate to engineer roles.
- Do not invent DB/API/infra. If missing, return to Contracts and fix them.
- Do not mark "done" without runtime evidence.
- Do NOT write new tests here; delegate to `/qfai-tdd-red` (fast tests) or `/qfai-atdd` (acceptance tests).
- Stubs/mocks are allowed only for clearly defined external dependencies and must be documented as such.

## UI layout guardrails (mandatory when UI exists)

- Do NOT make primary buttons full-width by default; use a separate block variant when needed.
- Header rows: title and primary action stay on one line (no overflow or wrap).
- Search rows: input uses flex-grow; buttons are fixed width (shrink-0) so inputs do not collapse.
- If using Tailwind/@apply: define component classes in `@layer components` and avoid width in base button classes (separate `btn` vs `btn-block`).
- Empty/error states must be readable and not visually broken.

## Success Criteria (Definition of Done)

- Implementation matches the spec and contracts.
- TDD tests pass (and ATDD tests pass when applicable).
- Unit/Component Coverage Ledger shows 100% implemented (blocked/skipped require DR + approval).
- Repo quality gates pass (lint/type/build/pack as applicable).
- Verification evidence is recorded (commands + results).
- Program is runnable; runtime evidence is recorded and meets project-type expectations.
- Evidence file exists: `.qfai/evidence/tdd-green-<spec-id>.md`.
- Completion is approved by a reviewer who did not implement the code.

## Mandatory checks

- Implementation Scope Table from contracts exists.
- Runtime Interaction Gate evidence exists (boot/access/interaction when applicable).
- UI layout guardrails are checked when UI exists.
- Completion separation is enforced (no self-approval).

## Not-done criteria

- "Tests passed" without runtime evidence.
- Completion without reviewer sign-off.

## Failure handling (mandatory)

- If blocked/unknown, stop and record a DR in delta.md (do not skip).
- If Runtime Interaction Gate fails, fix and re-run before declaring completion.

## Coverage Ledger continuity

- Review the Unit/Component Coverage Ledger from `/qfai-tdd-red`.
- Do not declare completion until Coverage Ledger is 100% implemented (blocked/skipped require DR + approval).

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

Only with explicit user approval (`Simulation mode allowed`), simulate roles by running the same sequence yourself:

- Write a short “role output” section per role, then consolidate into the final deliverable(s).

## Orchestrator-only Mode (mandatory)

- The main agent acts as an orchestrator only and must not implement code directly.
- You MUST involve roles in this order (can be simulated if tools do not support subagents):
  1. FrontendEngineer / BackendEngineer (implementation)
  2. QAEngineer (coverage and gaps)
  3. UIUXReviewer (layout sanity check)
  4. RuntimeGatekeeper (runtime evidence)
  5. CodeReviewer (completion approval)

## Stage Gates (mandatory milestones)

You must not advance to the next phase until the current gate is PASS.

| Phase                | Owner                            | Gate output                                                                  |
| -------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| P0: Scope Derivation | Orchestrator                     | Implementation Scope Table completed                                         |
| P1: Implementation   | FrontendEngineer/BackendEngineer | Contract-to-implementation mapping with TODOs resolved                       |
| P2: QA Review        | QAEngineer                       | Coverage/gap check (100% implemented; blocked/skipped require DR + approval) |
| P2.5: UI/UX Review   | UIUXReviewer                     | Layout sanity check (guardrails satisfied)                                   |
| P3: Runtime Evidence | RuntimeGatekeeper                | Boot + contract path run + UI interaction (if applicable)                    |
| P4: Quality Gates    | DevOpsCIEngineer                 | Repo-defined gates PASS                                                      |
| P5: Completion       | CodeReviewer                     | DoD PASS declared by non-implementer                                         |

Optional (strongly recommended): run a Devil's Advocate check right before completion to look for hidden gaps.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Current gate status (P0-P5)
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

## Step 0.1 — Implementation Scope Table (mandatory)

After reading `.qfai/contracts/**`, you MUST build this table and complete every cell before proceeding:

| Layer | Contract files                    | What must exist in repo after Green     | Evidence required         |
| ----- | --------------------------------- | --------------------------------------- | ------------------------- |
| UI    | `.qfai/contracts/ui/**`           | screens/routing/components/build wiring | boot + screen interaction |
| API   | `.qfai/contracts/api/**`          | server + endpoints                      | boot + contract path run  |
| DB    | `.qfai/contracts/db/**`           | DB connection + repository              | boot log + CRUD example   |
| Logic | (derive from spec/scenario/tests) | business logic implementation           | tests PASS                |

Rules:

- If a contract file exists, corresponding implementation is REQUIRED.
- "No tests exist" is not a valid reason to skip implementation.
- If any scope is explicitly excluded, document it as a scope exclusion with rationale in the evidence file. Do not hide it as an Open Question.

## Step 0.2 — Project Analysis (mandatory)

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

## Step 0.3 — Steering Bootstrap / Refresh (mandatory when incomplete)

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
  If missing, stop and request /qfai-sdd-refinement followed by /qfai-sdd-planning.

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

- Do NOT write new tests here. If fast tests are missing or need coverage, run `/qfai-tdd-red` first.
- For acceptance tests, use `/qfai-atdd` instead of adding them here.
- Exception: if existing tests are broken and gates cannot pass, apply the minimal fix. Avoid creating new tests.

## Step 5 — Review & QA checks

- Code Reviewer reviews diffs for maintainability and risk.
- QA Engineer checks acceptance criteria coverage and failure handling.
- UIUXReviewer checks layout guardrails and interaction sanity for UI flows.

## Runtime Evidence (MANDATORY)

### Runtime Interaction Gate (mandatory)

- Boot: `pnpm dev` (or equivalent) starts without errors.
- Access: main URL(s) render without runtime errors.
- Interaction: at least one user interaction succeeds (click/input/submit/navigation).
- Optional (recommended): Playwright smoke (`@smoke`) if available.

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

### Web/ERP with UI contracts (mandatory)

If any UI contracts exist, runtime evidence MUST include a real screen interaction:

- boot command and boot log (port listening, no errors)
- open the UI and perform at least one state-changing action (create/update/search/delete)
- confirm the action reaches API/DB when those contracts exist
- confirm UI layout guardrails are satisfied (no oversized buttons; header/search rows intact)

Preferred: a single Playwright smoke (`@smoke`) run. If no E2E exists, run `/qfai-atdd` first. If impossible, add one minimal smoke test and document why.

### Library

- build succeeds
- a small integration "smoke usage" exists (example test or minimal consumer snippet)
- public API compiles and behaves per acceptance criteria

You must record:

- exact commands executed
- expected vs observed outcomes

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/tdd-green-<spec-id>.md`

Evidence must include:

- scope table + runtime + smoke + CI outputs

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
# TDD Green Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Scope

- Spec: <spec-id>
- Contracts scanned: <ui/api/db>

## Phase log

- P0 Scope Derivation:
- P1 Implementation:
- P2 QA Review:
- P3 Runtime Evidence:
- P4 Quality Gates:
- P5 Completion:

## Key logs (summarized)

## UI runtime evidence (if UI contracts exist)

- URL:
- Action:
- Result:
- Layout sanity:

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

## Not-done criteria

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

1. Unit/Component Coverage Ledger shows 100% implemented (blocked/skipped require DR + approval).

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
- Suggested next command: /qfai-tdd-refactor (then /qfai-verify)

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
- [ ] Completion approved by a reviewer who did not implement the code.
