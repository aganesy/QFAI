<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-spec
title: QFAI Spec (SDD Deliverables: specs + contracts + scenario skeleton)
description: "Create SDD artifacts: spec pack, delta, scenario.feature skeleton, and required contracts."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Architect, ContractDesigner, TestEngineer, QAEngineer, CodeReviewer, Planner]
mode: approval-gated

---

# /qfai-spec — Create Specification Pack (SDD)

## Purpose

Create/update a **spec pack** that becomes the source of truth for implementation and testing.

## Success Criteria (Definition of Done)

- A new directory exists: `.qfai/specs/spec-XXXX/` (or an existing one is updated).
- At minimum, these files exist and are coherent:
  - `spec.md` (SDD spec)
  - `delta.md` (change log / impact / migration)
  - `scenario.feature` (ATDD skeleton aligned with spec)
- Contracts are added/updated under `.qfai/contracts/` _only when needed_.

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

## Step 0.4 — Preflight: Config + Steering convergence (mandatory)

QFAI prompt operations are flexible. In some workflows, the user may run **/qfai-spec directly after init** without running /qfai-configure.
Therefore, /qfai-spec MUST converge the workspace into a usable state before writing spec packs.

### Preflight goals

- Ensure `qfai.config.yaml` exists and is schema-valid.
- Ensure `validation.traceability.testFileGlobs` is not empty and not obviously zero-match.
- Ensure `assistant/steering/*` is populated to a usable level.

### Steering completion levels (definition)

- L0: files exist
- L1: format skeleton is present (headings / minimum sections)
- L2: evidence-based repo facts are filled
- L3: human-judgment areas are marked as TBD/OQ and impact is reflected in spec outputs
- L4: human-judgment areas are confirmed

Target for /qfai-spec preflight: **L2-L3**.

### 0.4-A Ensure qfai.config.yaml

1. If `qfai.config.yaml` does not exist:

- Create a schema-valid minimal config.
- Derive reasonable `validation.traceability.testFileGlobs` from repo evidence (package.json, test configs, file tree).

2. If it exists:

- Validate the structure (do not invent keys).
- If clearly broken (missing required keys / invalid YAML), do a minimal repair OR record an Open Question and proceed with the safest assumptions.

### 0.4-B Converge traceability globs

- If `validation.traceability.testFileGlobs` is empty OR it matches 0 test files:
  - Run a lightweight "configure" procedure:
    - inspect test runner config and conventions
    - propose 3-10 include globs
    - add exclude globs only when needed
    - update `qfai.config.yaml` with a minimal diff

- Evidence requirement:
  - Always sample 5-15 matched test files and include them in the output.

### 0.4-C Steering bootstrap/refresh

- Open these files:
  - `.qfai/assistant/steering/product.md`
  - `.qfai/assistant/steering/tech.md`
  - `.qfai/assistant/steering/structure.md`

- If missing/empty/placeholder:
  - Fill the evidence-based parts from repo docs and configs.
  - Never invent facts. Use `TBD` + missing evidence, or Open Questions.

### Steering refresh checklist

- [ ] product.md: what we build / users / success / non-goals / release posture
- [ ] tech.md: Node / package manager / TS / test / lint / CI constraints
- [ ] structure.md: repo layout, key packages, entrypoints, standard gate commands, how to run locally

### Preflight output contract

Your final response MUST include:

- Whether preflight changed any files (and which ones)
- Why changes were needed
- Evidence samples (matched test files, referenced repo docs)
- Remaining TBD / Open Questions (blocking vs non-blocking)
- A short "Preflight summary" (max 10 lines), followed by details

## Step 0.5 — Load Discussion Records (mandatory)

Before creating any spec pack, **check for existing discussion records** under `.qfai/discussions/`.

### 0.5-A Locate the latest discuss record

- Look for files matching `.qfai/discussions/discuss-*.md`.
- If any exist, read the **latest** one (by ID or timestamp).

### 0.5-B Extract carry-over decisions

From the discuss record, extract:

- Product concept / positioning
- Policy / trade-off choices
- Non-functional requirements (performance, security, reliability, operability, UX posture)
- Scope decisions (in / out)
- Candidate options that were **rejected or deferred**

### 0.5-C Handle missing discuss record

If no discuss record exists:

- Record an **Open Question** in `spec.md`: "No discuss record found; proceeding with minimal-risk assumptions."
- Proceed with conservative assumptions and document them clearly.
- Do NOT block; complete the spec pack with explicit caveats.

## Quantitative Guardrails (mandatory)

These constraints ensure spec packs align with QFAI's validate rules and prevent scope creep.

### (A) Spec pack granularity — 1 spec pack = 1 action slice

- **One spec pack (`.qfai/specs/spec-XXXX/`)** corresponds to exactly **one user action slice**.
- `scenario.feature` MUST contain **exactly one `Scenario:` or one `Scenario Outline:`** (never 2+).
- If the feature requires multiple scenarios, **split into separate spec packs** (`spec-0002`, `spec-0003`, …).

Violation: If you find yourself writing 2+ `Scenario:` blocks in one file, STOP and split the spec pack.

### (B) spec.md scope limit (decision criteria)

A spec pack is **too large** if ANY of these are true:

- BR lines exceed **5** (max 5; recommended 1–3)
- **Two or more user roles** appear as the subject (e.g., admin AND regular user)
- **Two or more primary user actions (When)** exist (e.g., register AND delete)
- **Multiple external interface groups** are mixed (e.g., 2+ API endpoint families in one spec)

Split rule (simple):

- Separate by user action (register / update / delete / etc.).
- Error flows also require their own spec pack if they add scenarios.

### (C) ID format (machine-verifiable)

- **Spec ID**: `SPEC-0001` (H1 required, e.g., `# SPEC-0001: <title>`)
- **BR ID**: `BR-0001` (format: `- [BR-0001][P0] ...`, priority P0–P3)
- **SC ID**: `SC-0001` (tag in `scenario.feature`, e.g., `@SC-0001`)

### (D) QFAI-CONTRACT-REF required

- `spec.md` MUST include a line: `QFAI-CONTRACT-REF: <ID list or 'none'>`
- `scenario.feature` MUST include a comment: `# QFAI-CONTRACT-REF: <ID list or 'none'>`

Example:

```md
QFAI-CONTRACT-REF: UI-0001, API-0002
```

### (E) delta.md Decision Log required

- `delta.md` MUST contain a **Decision Log** section with a table of candidates → Adopt / Reject / Defer.
- For each rejected option that an implementer could accidentally choose:
  - Add a **Decision Guardrail (DG)** entry
  - Include: why rejected, risk if implemented, explicit "Do NOT implement" statement

### Self-check before output

Before finalizing the spec pack, verify:

- [ ] Only 1 `Scenario:` (or 1 `Scenario Outline:`) in `scenario.feature`
- [ ] BR lines ≤ 5
- [ ] `QFAI-CONTRACT-REF:` present in both `spec.md` and `scenario.feature`
- [ ] `delta.md` has Decision Log with at least 1 row
- [ ] Discuss record was referenced (or OQ raised if missing)
- [ ] H1 follows `# SPEC-XXXX: <title>` format

## Step 1 — Determine spec pack identity

If the user does not provide an ID:

- Propose the next available `spec-XXXX` and proceed (or ask if interactive).

## Step 2 — Create/Update spec pack files

### 2.1 `spec.md` template (Architect)

Use this structure (note: H1 must use `SPEC-XXXX` format):

# SPEC-0001: <title>

QFAI-CONTRACT-REF: <ID list or 'none'>

## 1. Goal

## 2. Non‑Goals

## 3. Background / Context

## 4. Requirements Mapping

Reference the requirement IDs from `.qfai/require/require.md`.

## 5. Proposed Behavior

- User flows
- Inputs/outputs
- Error handling
- Observability

## 6. Interfaces & Contracts

List which contracts are used:

- UI contracts: (file paths / IDs)
- API contracts:
- DB contracts:

If a contract is missing, mark it as “to be created” and create it in Step 3.

## 7. Business Rules

Format each rule as: `- [BR-XXXX][P0-P3] <rule description>`

- Max 5 BR lines per spec pack.
- Priority: P0 (must) to P3 (nice-to-have).

## 8. Acceptance Criteria

Tie each acceptance criterion to scenarios and/or tests.

## 9. Risks & Mitigations

## 10. Open Questions

(only what truly blocks correctness)

### 2.2 `delta.md` template (Planner + QA)

`delta.md` is not only a change log. It is also a **decision log** that prevents accidental implementation of rejected options.

Use this structure:

# Delta

## Summary

## Decision Table (検討テーブル)

Record the options that were considered during spec discussion.

Rules:

- For each important design decision, list at least:
  - the chosen option (Adopt)
  - one plausible alternative (Reject or Defer)
- If ambiguity remains, explicitly mark it as `Defer` and raise an Open Question.
- For any rejected option that an implementer could accidentally pick, add a corresponding Decision Guardrail entry below.

Template:

| ID      | Topic   | Options     | Decision                            | Rationale | Implementation note         |
| ------- | ------- | ----------- | ----------------------------------- | --------- | --------------------------- |
| DT-0001 | <topic> | <A / B / C> | Adopt: <X>, Reject: <Y>, Defer: <Z> | <why>     | <do / do not / constraints> |

## Decision Guardrails

Convert critical `Reject` / `Defer` items into short, machine-extractable guardrails.

Format (one entry per `### DG-` heading):

```md
### DG-0001: <title>

- Type: non-goal | not-now | trade-off
- Scope: <optional>
- Guardrail: <1 sentence. What must NOT be done / must be deferred>
- Reason: <1-3 sentences>
- Reconsider: <never or explicit condition>
- Related: <optional links/IDs>
- Keywords: <comma or space separated>
```

## User-visible changes

## Backward compatibility / migration notes

## Affected areas

## Verification plan (commands + expected results)

## Rollback / recovery notes

## Known limitations

### 2.3 `scenario.feature` skeleton (Test Engineer)

Create a minimal but correct Gherkin skeleton aligned with acceptance criteria.

**Critical rule: 1 file = 1 scenario**

- `scenario.feature` MUST contain **exactly one `Scenario:` or one `Scenario Outline:`**.
- Do NOT write 2+ scenarios in a single file (violates QFAI validate rules).
- If multiple scenarios are needed, split into separate spec packs.

Template:

```gherkin
# QFAI-CONTRACT-REF: <ID list or 'none'>
@SC-0001
Feature: <Feature name>

  Background:
    Given <common preconditions>

  Scenario: <single scenario name>
    Given <specific precondition>
    When <user action>
    Then <expected outcome>
```

If your feature requires error scenarios or variations:

- Create `spec-0002`, `spec-0003`, etc. with their own `scenario.feature` files.
- Each file still contains only 1 `Scenario:` or `Scenario Outline:`.

## Step 3 — Contracts (Contract Designer)

Only create contracts when the spec requires a stable interface definition.

- Place under:
  - `.qfai/contracts/ui/`
  - `.qfai/contracts/api/`
  - `.qfai/contracts/db/`
- Keep them minimal and aligned with what tests will validate.

If your repo defines contract schema or naming rules, follow them. Otherwise:

- **UI / API contracts:** write **YAML** and include “Purpose / Fields / Constraints / Examples” as YAML comments.
- **DB contracts:** write **SQL (`.sql`)** and include a small header comment block, then representative DDL/schema notes.

DB contract default conventions (unless your repo defines others):

- Filename: `db-0001-<slug>.sql`
- Header (must):
  ```sql
  -- QFAI-CONTRACT-ID: DB-0001
  -- Purpose: <what this schema contract guarantees>
  -- Constraints: <keys, nullability, ranges, invariants>
  -- Examples: <optional example rows or queries>
  ```
- Body: DDL or schema notes that tests/scenarios can validate (minimal, spec-driven).

## Step 4 — QA + Review

- QA Engineer checks acceptance criteria ↔ scenario consistency.
- Code Reviewer checks naming, contradictions, missing impact notes.
- Planner ensures next steps are explicit and minimal.

## Step 5 — Approval gate

If interactive:

- Ask approval before proceeding to test implementation.
  If `--auto`:
- Proceed with explicit assumptions flagged.

## Completion Criteria (Final Gate)

**Before declaring the spec pack complete, you MUST verify:**

1. Run validation:

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

- `.qfai/specs/spec-XXXX/spec.md`
- `.qfai/specs/spec-XXXX/delta.md`
- `.qfai/specs/spec-XXXX/scenario.feature`
- (If needed) updated `.qfai/contracts/**`
- Validation evidence: command outputs showing PASS
- Next recommended command: /qfai-scenario-test and/or /qfai-unit-test
