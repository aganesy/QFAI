<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-atdd
title: QFAI ATDD (Executable acceptance tests)
description: "Implement automated acceptance tests (E2E/API/Integration) aligned with scenario.feature and specs."
argument-hint: "<spec-id> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [TestEngineer, QAEngineer, BackendEngineer, FrontendEngineer, CodeReviewer, DevOpsCIEngineer]
mode: execution-focused

---

# /qfai-atdd — Implement Automated Acceptance Tests (ATDD)

## CRITICAL CONSTRAINTS (Read First)

- Do NOT declare completion based on unit/component tests.
- Acceptance tests must be runnable and Coverage Ledger must reach `missing=0` (exceptions documented).
- You MUST produce the required evidence file: `.qfai/evidence/atdd-<spec-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if scenarios are left unimplemented without explicit exclusions.
- Completion must be approved by a reviewer who did not implement the tests.

## Goal

Turn `.qfai/specs/spec-XXXX/scenario.feature` into runnable acceptance tests (E2E/API/Integration) in this repository (terminal + CI).

## Scope (ATDD only)

- In scope: E2E, API, Integration.
- Out of scope: Unit and Component (use `/qfai-tdd-red`).

## Success Criteria (Definition of Done)

- Scenario Coverage is 100% for ATDD layers (E2E/API/Integration).
- An ATDD Coverage Ledger exists with `missing=0` and explicit exceptions.
- Acceptance tests exist and are runnable via documented commands.
- Tests are stable (no flakiness) and diagnostic (failures explain why).
- Existing acceptance automation (if any) is reused; no new framework is added without approval.
- QFAI validate passes for ATDD layers (layer-aware traceability).
- Quality checks (lint/typecheck/tests) pass in the repo’s standard way.
- Evidence file exists: `.qfai/evidence/atdd-<spec-id>.md`.
- Completion is approved by a reviewer who did not implement the tests.

## Mandatory checks

- Layer allocation (`@layer`/`@size`) is applied per scenario.
- Coverage ledger includes each scenario and its automation status.
- Runtime evidence exists for each implemented layer.

## Not-done criteria

- Scenarios left unimplemented without explicit "excluded" rationale.
- Tests exist but were never executed.

## ATDD Coverage Ledger (mandatory)

Create a ledger that lists every Scenario (SC) in ATDD scope:

- Inputs: `.qfai/specs/**/scenario.feature`
- Scope: `@layer-e2e`, `@layer-api`, `@layer-integration`
- Columns: SC ID / spec pack / layer / size / test file / run command / status (`done|missing|exception`)
- Rule: **`missing=0` is required before completion.**

If a test is not automatable right now, record it as `exception` with a clear reason and a follow-up plan.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/atdd-<spec-id>.md`

Evidence must include:
- acceptance coverage ledger (SC -> layer -> implemented files -> command)
- execution logs (E2E/API/Integration)

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
# ATDD Evidence: <spec-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Coverage ledger summary

- missing:
- exceptions:

## Acceptance coverage ledger

## Execution logs

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

- Implementation (TestEngineer/Frontend/Backend) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm coverage and missing items before completion approval.

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
- Current coverage ledger status
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

## Step 1 — Locate the spec pack

Read:

- `.qfai/specs/spec-XXXX/spec.md`
- `.qfai/specs/spec-XXXX/scenario.feature`
- any referenced contracts under `.qfai/contracts/**`

## Step 1.5 — Pre-check: Scenario validation (mandatory)

**Before implementing tests, verify the `scenario.feature` file:**

- [ ] Scenario count is within the recommended range (1-3). If larger, the pack should be split.
- [ ] Each scenario has exactly one `@SC-XXXX-XXXX` tag
- [ ] Each scenario has at least one `@BR-XXXX-XXXX` tag
- [ ] SC tags are unique within the file
- [ ] Feature has exactly one `@SPEC-XXXX` tag
- [ ] `# QFAI-CONTRACT-REF:` comment exists

**If the file exceeds the recommended scenario count or has duplicate SC tags:**

- STOP and do not proceed with test implementation.
- Inform the user that the spec pack must be split or fixed.
- Recommend running `/qfai-spec` to adjust the spec packs.

**Rationale:** QFAI validate rules require unique SC tags per file, and large scenario counts should be split to keep traceability clear.

## Step 2 — Choose (or detect) acceptance test harness

Prefer existing project tooling. Determine:

- Where tests live
- Test runner (e.g., Playwright/Cypress/Cucumber/Jest/Vitest/etc)
- CI execution command

If acceptance/E2E automation exists:

- You MUST reuse it.
- Do NOT introduce a new framework.

If none exists:

- Propose defaults by layer:
  - E2E: Playwright Test
  - Integration: Cucumber
  - API: language-default test runner (project standard if any)
- Ask explicitly before adding any new dependencies or runners.
- Proceed only if the user approves. If not approved, stop and report.

## Step 2.5 — Implement Cucumber only when approved

When approval is granted:

- Add minimal dependencies and configuration.
- Implement steps mapped to `scenario.feature`.
- Integrate a single command to run acceptance tests.

## Step 3 — Implement acceptance tests (Test Engineer)

Rules:

- Scenarios must map to executable steps.
- Prioritize Scenario tags that carry @layer-api / @layer-e2e / @layer-integration.
- Keep step definitions reusable but not overly generic.
- Ensure each scenario asserts observable behavior.

### SC evidence rule (mandatory)

Every test MUST provide traceability evidence using **one** of the following:

- Code-based tests: `QFAI:SC-XXXX-XXXX` annotation in the test file
- Cucumber feature tests: `@SC-XXXX-XXXX` tag on the Scenario

Example (TypeScript/JavaScript):

```typescript
// QFAI:SC-0001-0001
test("user can register with valid email", async () => {
  // ...
});
```

Example (Python):

```python
# QFAI:SC-0001-0001
def test_user_can_register_with_valid_email():
    ...
```

Deliverables:

- Step definitions / test code (with SC annotations)
- Any required fixtures/mocks (minimal)
- A “how to run” command

## Step 4 — Integrate with CI / scripts (DevOps/CI Engineer)

- Add/adjust package scripts only if needed.
- Ensure a single command can run the scenario suite.
- Keep changes minimal and well documented.

## Step 4.5 — Handle generated artifacts (mandatory)

If scenario runs generate reports or other frequently updated files:

- Identify output paths.
- Add them to `.gitignore`, or redirect outputs into an already ignored directory.
- Ensure CI runs stay clean (no diff noise).

## Step 5 — QA review + code review

- QA Engineer: scenario coverage, failure cases, observability
- Code Reviewer: maintainability, flakiness risks, unclear assertions

## Step 6 — Record verification evidence

Provide:

- Exact commands run
- Summary of results
- Where logs/artifacts can be found (if applicable)

## Completion Criteria (Final Gate)

**Before declaring tests complete, you MUST verify:**

1. ATDD Coverage Ledger shows `missing=0` for E2E/API/Integration (exceptions documented).

2. Run QFAI validation:

   ```bash
   qfai validate --fail-on error
   ```

3. Run repository standard gates (discover from package.json/CI/docs):
   - format check
   - lint
   - typecheck
   - tests
   - pack/verify (if distributed)

   Record the exact commands and results.

4. All gates must PASS.

If you cannot run these commands (environment limitation):

- Request the user to run them and provide the output.
- Do NOT assume PASS without evidence.

## Output

- Acceptance test implementation files (with SC annotations)
- "Runbook" snippet (copy‑paste command)
- Short verification evidence summary
- Gate results: all PASS

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not implement the tests.
