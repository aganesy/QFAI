<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

---

name: qfai-tdd-red
title: QFAI TDD Red (Test-first)
description: "Implement fast tests first (unit/component) and stop at RED."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [UnitTestScopeEnforcer, TestEngineer, QAEngineer, CodeReviewer]
mode: test-first

---

# /qfai-tdd-red — Implement Tests First (TDD Red)

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

- You MUST implement tests only. Do NOT implement production logic.
- `implementation-brief.md` MUST exist before execution. If missing, STOP and run `/qfai-sdd-planning`.
- You MUST produce the required evidence file: `.qfai/evidence/tdd-red-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if RED is not reproducible.
- Completion must be approved by a reviewer who did not implement the tests.

## Sub-agent policy (mandatory)

- If subagents are supported, Orchestrator MUST delegate: Test Engineer, Unit Test Scope Enforcer, QA, Reviewer (non-edit).
- Orchestrator must not implement tests directly when delegation is available.
- Evidence must include work orders and reviewer notes.
- If subagents are not supported, simulate role separation with explicit role sections.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ", "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in the user's language. Resolve or explicitly defer; do not leave silent placeholders.
- Smoke check (if applicable): when the prompt produces runnable code/tests/configs, execute the smallest command that proves basic run/start/operate and record evidence. If not applicable, state "not applicable" with a short rationale.

## Goal

Implement fast tests (unit/component) that enforce the spec and provide reproducible RED evidence.

## Scope (TDD Red only)

- In scope: Unit and Component tests.
- Out of scope: E2E/API/Integration (use `/qfai-atdd`).

## Non-goals

- Production code changes beyond testability shims.
- Acceptance/E2E tests.

## Mandatory Outputs

- Unit/Component Coverage Ledger
- Unit/Component test implementations (RED)
- Evidence file: `.qfai/evidence/tdd-red-<spec-id>.md`
- Reviewer notes (non-edit)

## Scope Guardrails (tests-only)

### Mandatory constraints (tests only)

- You MUST implement tests only.
- Do NOT implement or modify production/business logic.

### Allowed changes (ALLOWLIST)

- Unit test files (e.g., `**/*.test.*`, `**/*.spec.*`, or project test directories)
- Test setup/config files (runner config, environment setup)
- Test fixtures and test utilities (only if used exclusively by tests)
- `.gitignore` (only to ignore test-generated artifacts, if they exist)
- Documentation about how to run tests (only if required by project conventions)
- Evidence file: `.qfai/evidence/tdd-red-<spec-id>.md`

### Forbidden changes (DENYLIST)

- Modify production/business logic to "make tests pass"
- Add new features or change runtime behavior
- Add or change API/DB/infra implementation
- Create or modify contracts/specs/scenarios artifacts
- Refactor production code beyond testability needs **unless explicitly approved**

### Narrow exceptions (must justify, minimal only)

- Add exports needed to call existing production code from tests.
- Pure refactors with zero behavior changes, strictly required for testability.
- Never allowed: new features, BR logic, or spec changes.

If you believe a production change beyond the exceptions is unavoidable to enable testability, you must:

1. stop and explain why
2. propose an alternative test approach
3. ask for explicit approval to change production code

Without approval, do not proceed.

If tests cannot proceed because implementation is missing:

- Stop after writing failing tests (RED).
- Instruct the user to run `/qfai-tdd-green` next.
- Record blockers as Open Question / TODO.
- Capture failing test evidence and do not run full repository gates.

## Success Criteria (Definition of Done)

- Unit/Component tests exist, are deterministic, and runnable in CI.
- Coverage Ledger for Unit/Component shows 100% implemented (blocked/skipped require DR + approval).
- Completion is based on executing the unit/component test suite and recording evidence.
- Tests cover core logic and key edge cases derived from spec/scenario.
- Tests fail meaningfully and the failing state is observed (RED evidence).
- All changes stay within the ALLOWLIST.
- Any production-code change includes an explicit exception rationale.
- Repository verification commands PASS unless you are stopped at RED due to missing implementation.
- Evidence file exists: `.qfai/evidence/tdd-red-<spec-id>.md`.
- Completion is approved by a reviewer who did not implement the tests.

## Mandatory checks

- Test scope ledger exists (what must be tested, where).
- RED is reproducible (command + failing output).

## Not-done criteria

- Tests added without mapping to requirements/contracts.
- No reproducible RED.

## Failure handling (mandatory)

- If blocked/unknown, stop and record a DR in delta.md (do not skip).
- If RED cannot be reproduced, fix the test setup or stop and report.

## TDD Coverage Ledger (Unit/Component)

Create a ledger that lists every Scenario (SC) in Unit/Component scope:

- Inputs: `.qfai/specs/**/scenario.feature`
- Scope: `@layer-unit`, `@layer-component`
- Columns: SC ID / layer / target unit or component / test file / status (`done|missing|exception`)
- Rule: **Coverage Ledger must be 100% implemented (blocked/skipped require DR + approval) before completion.**

If a test is not automatable right now, record it as `exception` with a clear reason and a follow-up plan.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/tdd-red-<spec-id>.md`

Evidence must include:

- unit/component test ledger
- failing logs (expected failures)

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
# TDD Red Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Coverage ledger summary

- missing:
- exceptions:

## Unit/Component test ledger

## Key failure evidence (summarized)

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

- Facilitator → Interviewer → Requirements Analyst → Planner → Architect → (Contract Designer) → Test Engineer → QA Engineer → Unit Test Scope Enforcer → Code Reviewer → DevOps/CI Engineer

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

- Implementation (TestEngineer) and completion approval (CodeReviewer) must be separate.
- UnitTestScopeEnforcer must verify the ALLOWLIST before completion approval.

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
- Coverage ledger status and ALLOWLIST compliance
- Evidence captured so far and what is missing

## Work Order (hard)

1. Identify the target scope from SPEC/BR/AC/CASE/Scenario.
2. Identify existing test framework and conventions; follow them.
3. Build the Unit/Component Coverage Ledger and list missing items.
4. Implement unit/component tests:
   - prioritize edge/error cases and invariants derived from CASE catalogue
   - ensure tests are deterministic and independent
5. Run unit/component tests.
6. Run repository verification commands and record evidence.

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

## Step 1 — Read relevant artifacts

- `.qfai/specs/spec-XXXX/delta.md` (Decision Records; check rejected)
- `.qfai/specs/spec-XXXX/spec.md`
- `.qfai/specs/spec-XXXX/scenario.feature`
- referenced contracts (if used by logic)

## Blocked States (hard stop)

- If the required test surface is missing and would require new production artifacts, stop and request `/qfai-tdd-green`.
- If production code changes are required for testability without explicit approval, stop and request approval.

## Step 2 — Identify units and boundaries (Test Engineer + Architect mindset)

- What are the smallest meaningful units?
- What should be mocked vs real?
- Where are seams (interfaces) needed to test cleanly?

## Step 3 — Write tests first (RED)

- Add tests that should fail on current code.
- Keep them minimal and focused.

### SC annotation rule (mandatory)

Every test function/block MUST include a traceability annotation linking to the relevant scenario:

```
QFAI:SC-XXXX
```

Where `SC-XXXX` matches the scenario tag from the spec pack.

Example (TypeScript/JavaScript):

```typescript
// QFAI:SC-0001-0001
describe("validateEmail", () => {
  it("rejects invalid format", () => {
    // ...
  });
});
```

Example (Python):

```python
# QFAI:SC-0001-0001
def test_validate_email_rejects_invalid_format():
    ...
```

## Step 4 — Review test quality

- QA Engineer: edge cases, unwanted behavior, observability
- Unit Test Scope Enforcer: ALLOWLIST compliance; block scope drift
- Code Reviewer: brittleness, over-mocking, unclear naming

## Step 5 — Provide run commands + evidence

- Document the exact command(s) to run unit tests.
- Provide summary of pass/fail.

## Completion Criteria (Final Gate)

**Before declaring tests complete, you MUST verify:**

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

## Definition of Done (Mandatory Output)

Include a **DoD** section in your output with:

- List of modified files
- Confirmation that all modified files are within the ALLOWLIST
- Test commands executed and results
- Repository verification commands executed and results

You must not declare completion unless:

- tests pass, and
- the file-change scope constraints are satisfied, and
- verification commands pass

## Output

- Unit test files (with SC annotations)
- Run command snippet
- Evidence summary
- Gate results: all PASS
- DoD section (required)

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
- [ ] Completion approved by a reviewer who did not implement the tests.
