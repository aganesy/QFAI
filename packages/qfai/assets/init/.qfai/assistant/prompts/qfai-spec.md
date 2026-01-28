<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-spec
title: QFAI Spec (SDD Deliverables: specs + contracts + scenario)
description: "Create SDD artifacts: an atomic spec pack, its delta (decision log), an ATDD skeleton, and required contracts."
argument-hint: "<spec-id-or-name> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles: [Architect, ContractDesigner, TestEngineer, QAEngineer, CodeReviewer, Planner]
mode: approval-gated

---

# /qfai-spec — Create Specification Pack (SDD)

## CRITICAL CONSTRAINTS - Read First / Check Last

- Contracts MUST be completed first; do not write spec/scenario before contracts.
- Do NOT invent technologies, infra, or new contract categories.
- Evidence file is mandatory: `.qfai/evidence/spec-<spec-id>.md`.
- Completion must be approved by a reviewer who did not author the spec pack.

## Purpose

Create/update an **atomic spec pack** that becomes the source of truth for implementation and testing.

This prompt is intentionally strict. If you cannot satisfy the strict rules, you MUST split the work into additional spec packs.

## Hard Constraints (MUST)

### Atomicity / Granularity (quantitative)

- `scenario.feature` MAY contain multiple `Scenario:` / `Scenario Outline:` blocks.
  - Recommended: **1-3 scenarios per spec pack**. If you need more, split into additional spec packs (e.g., `spec-0002`, `spec-0003`, ...).
  - SC tags must be **unique within the file** (no duplicate SC across scenarios).
- Each Scenario MUST include exactly one layer tag and one size tag (`@layer-*`, `@size-*`).
- `spec.md` MUST keep Business Requirements atomic: **1 BR = 1 rule** in the form: `[BR-0001-0001][P0] ...`
  - Keep BR count under a small cap (default max 5). If you need more, split into additional spec packs.
- `spec.md` MUST define **one primary feature slice** (one "thing" to implement). Do not define multiple features.

### Contracts First (Order of Work)

- You MUST complete and fix contracts FIRST, and only then write/update `spec.md` / `scenario.feature` / `delta.md`.
- You MUST NOT reference contracts that are not created yet.
- Before writing `spec.md`, ensure:
  - All contract files referenced exist under `.qfai/contracts/{api,db,ui}/`.
  - All YAML/SQL contracts parse without syntax errors.
  - All `QFAI-CONTRACT-ID:` headers exist in contract files.

### Traceability / Consistency (quantitative)

- Any `.qfai/contracts/**` path referenced in `spec.md` MUST exist (missing references MUST be 0).
- Any Contract IDs referenced in `spec.md` MUST exist in the target contract file header:
  - YAML: `# QFAI-CONTRACT-ID: ...`
  - SQL: `-- QFAI-CONTRACT-ID: ...`
- Do NOT invent technologies, DBs, external APIs, or infrastructure. If needed, create Open Questions and stop.

### Safety / Governance

- Do NOT create new contract categories. Allowed: `.qfai/contracts/{api,db,ui}/` only.
- Do NOT create `.qfai/samples/**`.
- Do NOT write Markdown into YAML (`#` comments are allowed; `#` headings and ``` fences are NOT).

### Work Order (non-negotiable)

The following order is mandatory and must not be parallelized or rearranged:

1. Preflight (config/steering convergence)
2. Contracts: create and FIX until complete
3. Case Catalogue (coverage techniques + saturation rule)
4. BR/AC derived from Case Catalogue (no invention)
5. scenario.feature (multiple scenarios allowed; SC tags must be unique)
6. spec.md
7. delta.md (decision log)
8. Verify gates (qfai validate + repo gates)

## Success Criteria (Definition of Done)

- A new directory exists: `.qfai/specs/spec-XXXX/` (or an existing one is updated).
- These files exist and are coherent:
  - `spec.md` (SDD spec; atomic slice; BRs are 1-rule each, within the cap)
  - `case-catalogue.md` (coverage techniques + saturation evidence)
  - `delta.md` (Decision Log; includes candidates + rejected + deferred)
  - `scenario.feature` (ATDD skeleton; multiple scenarios allowed; SC tags must be unique)
  - `traceability-matrix.md` (AC <-> BR <-> CASE <-> Examples)
- Required contracts exist under `.qfai/contracts/` and are parseable (YAML/SQL syntax OK).
- Final gates are executed (or explicitly requested from the user if tools are unavailable):
  - `qfai validate --fail-on error` results in `error=0`
  - repo-defined gates (format/lint/type/test/build etc.) pass
- Evidence file exists: `.qfai/evidence/spec-<spec-id>.md`.
- Completion is approved by a reviewer who did not author the spec pack.

## Evidence File (mandatory)

Create `.qfai/evidence/spec-<spec-id>.md` and fill it before completion.

Template:

```md
# Spec Evidence: <spec-id>

## Contracts summary

- UI:
- API:
- DB:

## Spec pack files

- spec.md:
- scenario.feature:
- delta.md:
- case-catalogue.md:
- traceability-matrix.md:

## Commands executed

- ...

## Key decisions / guardrails

- ...

## Known gaps / Open Questions

- ...

## Completion approval (non-author)

- Reviewer:
- Decision: PASS / FAIL
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

- Spec authoring (Planner/Architect/ContractDesigner) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm traceability, coverage, and guardrails before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Contracts-first status and gate progress
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

## Step 0.4 — Preflight: Config + Steering convergence (mandatory)

QFAI prompt operations are flexible. In some workflows, the user may run **/qfai-spec directly after init** without running /qfai-configure.
Therefore, /qfai-spec MUST converge the workspace into a usable state before writing spec packs.

### Preflight goals

- Ensure `qfai.config.yaml` exists and is schema-valid.
- Ensure `validation.traceability.testFileGlobs` is not empty and not obviously zero-match.
- Ensure `assistant/steering/*` is populated to a usable level.
- Ensure a requirements document exists (create a minimal stub if missing).
- Ensure contracts exist or create minimal contracts first (Contracts First rule).

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

### 0.4-D Requirements preflight

- Check `.qfai/require/` for a requirements document.
- If missing:
  - Create `require.md` with a minimal skeleton (Overview, Scope, Requirements, Non-Functional, Open Questions).
  - Record an Open Question noting that /qfai-require should be run to complete requirements.
- If present:
  - Do not rewrite unless it is clearly unusable; prefer Open Questions.

### 0.4-E Contracts preflight

- Check `.qfai/contracts/` for existing api/db/ui contracts.
- If none exist:
  - Create minimal contracts before writing specs (Contracts First).
  - If contract scope is unknown, record Open Questions and create the smallest viable placeholders.

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

## Step 0.6 — Engineering Posture (mandatory)

Engineering Posture is a hard constraint for design and test scope.

- Extract it from the latest discuss record.
- If missing:
  - Ask in interactive mode, OR
  - In `--auto`, select the most conservative posture and record an Open Question.

Posture rules:

- **MVP / Simple System**: minimize structure; avoid over-abstraction and premature extensibility.
- **Product / Evolving System**: prioritize clear boundaries and sustainable testing.
- **Platform / Large-scale System**: enforce boundaries, security, observability, and governance.

Record posture + trade-offs in the Decision Table.

## Quantitative Guardrails (mandatory)

These constraints ensure spec packs align with QFAI's validate rules and prevent scope creep.

### (A) Spec pack granularity — 1 spec pack = 1 capability (one action slice)

- **One spec pack (`.qfai/specs/spec-XXXX/`)** corresponds to exactly **one user action slice**.
- `scenario.feature` MAY contain multiple `Scenario:` / `Scenario Outline:` blocks.
- Recommended: **1-3 scenarios per spec pack**. If you need more, **split into separate spec packs** (`spec-0002`, `spec-0003`, ...).
- SC tags must be **unique within the file** (no duplicate SC across scenarios).
- Each Scenario MUST include exactly one layer tag and one size tag (`@layer-*`, `@size-*`).

Violation: If you exceed the recommended scenario count or duplicate SC tags, STOP and split/fix before continuing.

### (B) spec.md scope limit (decision criteria)

A spec pack is **too large** if ANY of these are true:

- BR lines exceed the cap (default max 5)
- Any BR bundles multiple rules (use separate BRs instead)
- **Two or more user roles** appear as the subject (e.g., admin AND regular user)
- **Two or more primary user actions (When)** exist (e.g., register AND delete)
- **Multiple external interface groups** are mixed (e.g., 2+ API endpoint families in one spec)

Split rule (simple):

- Separate by user action (register / update / delete / etc.).
- Error flows also require their own spec pack if they add scenarios.
- If BR count exceeds the cap or a BR contains multiple rules, split into additional spec packs.

### (C) ID format (machine-verifiable)

- **Spec ID**: `SPEC-0001` (H1 required, e.g., `# SPEC-0001: <title>`)
- **BR ID**: `BR-0001-0001` (format: `- [BR-0001-0001][P0] ...`, priority P0–P3)
- **AC ID**: `AC-0001-0001` (format: `- [AC-0001-0001] Given/When/Then ...`)
- **CASE ID**: `CASE-0001-0001`
- **SC ID**: `SC-0001-0001` (tag in `scenario.feature`, e.g., `@SC-0001-0001`)
- BR/AC/CASE/SC prefixes must match the SPEC number (SPEC-0001 -> BR-0001-0001).

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

- [ ] Scenario count is within the recommended range (1-3), or the pack is split
- [ ] SC tags are unique within `scenario.feature`
- [ ] Each Scenario has exactly one layer tag and one size tag
- [ ] BRs are 1-rule each and within the cap (default max 5)
- [ ] `case-catalogue.md` exists with coverage + saturation evidence
- [ ] `traceability-matrix.md` exists and links AC <-> BR <-> CASE <-> Examples
- [ ] All referenced `.qfai/contracts/**` files exist (missing = 0)
- [ ] `QFAI-CONTRACT-REF:` present in both `spec.md` and `scenario.feature`
- [ ] `delta.md` has Decision Log with at least 1 row
- [ ] Discuss record was referenced (or OQ raised if missing)
- [ ] H1 follows `# SPEC-XXXX: <title>` format
- [ ] No `.qfai/samples/**` created

## Step 1 — Determine spec pack identity

If the user does not provide an ID:

- Propose the next available `spec-XXXX` and proceed (or ask if interactive).

## Step 1.5 — Contracts First (mandatory)

**Before writing any spec pack files**, you MUST create and validate all required contracts.

### 1.5-A Identify required contracts

Based on the spec slice, determine which contracts are needed:

- UI contracts: if the slice has UI (screens, forms, components)
- API contracts: if the slice has API endpoints
- DB contracts: if the slice has database schema/tables

### 1.5-B Create contracts under `.qfai/contracts/{api,db,ui}/`

- Use YAML for UI/API contracts, SQL for DB contracts.
- Each file MUST have a `QFAI-CONTRACT-ID:` header.
- Keep contracts minimal: define only what the scenario needs.

### 1.5-C Validate contracts (consistency gate)

Before proceeding to Step 2:

- [ ] All contract files parse without syntax errors (YAML/SQL).
- [ ] All `QFAI-CONTRACT-ID:` headers are present.
- [ ] No Markdown syntax in YAML (no `#` headings, no ``` fences).
- [ ] Only allowed categories used: `api/`, `db/`, `ui/` (no `infra/` etc.).

If any check fails, FIX contracts before proceeding.

### 1.5-D Prohibited actions

- Do NOT create `.qfai/contracts/infra/` or any other new category.
- Do NOT invent technologies (DB types, external APIs) not confirmed in steering/require.
- If technology is unclear, use `QFAI-CONTRACT-REF: none` and raise an Open Question.

## Step 2 — Case Catalogue (Coverage Planner)

Build a Case Catalogue before BR/AC. Do not use numeric targets ("at least N").

Required coverage techniques (use all that apply):

- Equivalence partitioning
- Boundary value analysis
- Decision tables (condition combinations)
- State transitions (valid and invalid transitions)
- Error guessing (timeouts, partial failure, invalid data)
- Security abuse cases (auth bypass, injection, over-exposure)
- Concurrency / idempotency / retry (duplicate, ordering, replay)
- Operability / observability (audit logs, metrics, rollback)

Each case MUST include:

- Preconditions (state/data)
- Operation (UI/CLI/API action)
- Expected result (observable)
- Post-conditions (state change)
- Notes (invariants, audit, ops)

### Coverage saturation stop rule

You may stop only when ALL are true:

- Two consecutive reviews add no new equivalence classes, boundaries, states, decision patterns, or abuse vectors.
- For each contract (endpoint/command/operation), coverage includes:
  - Success
  - Invalid input
  - Authorization (allow/deny)
  - Failure/timeout (if applicable)
  - Concurrency/idempotency/retry (if applicable)

Deliverable: `case-catalogue.md` with the cases and saturation evidence.

BR and AC MUST be derived from the Case Catalogue (no invention).

## Step 3 — Create/Update spec pack files

### 3.1 `spec.md` template (Architect)

Use this structure (note: H1 must use `SPEC-XXXX` format):

# SPEC-0001: <title>

QFAI-CONTRACT-REF: <ID list or 'none'>

## 1. Goal

## 2. Non‑Goals

## 3. Background / Context

## 4. Requirements Mapping

Reference requirement IDs from the requirements document (require.md).

## 5. Proposed Behavior

- User flows
- Inputs/outputs
- Error handling
- Observability

## 6. Interfaces & Contracts

List which contracts are used (all contracts MUST already exist from Step 1.5):

- UI contracts: (file paths / IDs)
- API contracts:
- DB contracts:

All listed contracts MUST exist under `.qfai/contracts/`. If a contract is missing, STOP and create it in Step 1.5 first.

## 7. Business Rules

Format each rule as: `- [BR-0001-0001][P0-P3] <rule description>`

- BRs MUST be derived from the Case Catalogue (no invention).
- Priority: P0 (must) to P3 (nice-to-have).

## 8. Acceptance Criteria

Format each AC as: `- [AC-0001-0001] Given/When/Then ... (CASE-0001-0001)`

- ACs MUST be derived from the Case Catalogue.
- Keep ACs testable and traceable.

## 9. Risks & Mitigations

## 10. Open Questions

(only what truly blocks correctness)

### 3.2 `delta.md` template (Planner + QA)

`delta.md` is not only a change log. It is also a **decision log** that prevents accidental implementation of rejected options.

Use this structure:

# Delta

## Summary

## Decision Table

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

### 3.3 `scenario.feature` skeleton (Test Engineer)

Create a minimal but correct Gherkin skeleton aligned with acceptance criteria.

**Critical rule: SC tags must be unique within a file**

- `scenario.feature` MAY contain multiple `Scenario:` / `Scenario Outline:` blocks.
- Recommended: **1-3 scenarios per spec pack**. If you need more, split into separate spec packs.
- Feature must include exactly one `@SPEC-0001` tag.
- Each Scenario must include exactly one `@SC-0001-0001` tag and at least one `@BR-0001-0001` tag.
- Each Scenario must include exactly one `@layer-*` tag and one `@size-*` tag.
- SC tags must be unique across scenarios in the file.

Template:

```gherkin
# QFAI-CONTRACT-REF: <ID list or 'none'>
@SPEC-0001
Feature: <Feature name>

  Background:
    Given <common preconditions>

  @SC-0001-0001 @BR-0001-0001 @layer-api @size-s
  Scenario: <scenario name>
    Given <specific precondition>
    When <user action>
    Then <expected outcome>
```

If your feature requires error scenarios or variations:

- You may add additional `Scenario:` / `Scenario Outline:` blocks in the same file if within the recommended range and SC tags stay unique.
- If it grows beyond the recommended range, create `spec-0002`, `spec-0003`, etc. with their own `scenario.feature` files.

## Step 4 — Contracts Verification (Contract Designer)

**Note:** All contracts should already be created in Step 1.5. This step is for verification only.

Verify that all contracts referenced in `spec.md` and `scenario.feature`:

1. Exist under `.qfai/contracts/{api,db,ui}/`
2. Have valid `QFAI-CONTRACT-ID:` headers
3. Parse without syntax errors (YAML/SQL)

If any contract is missing or invalid, STOP and fix in Step 1.5 before proceeding.

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

## Step 5 — Multi-layer review (mandatory)

Authors:

- BR author: Design Owner
- Scenario author: Test Case Owner

BR review chain:

1. Frontend Engineer Reviewer
2. Backend Engineer Reviewer
3. Architect Reviewer
4. Design Review Lead
5. QA Reviewer
6. QA Lead
7. QA Gatekeeper
8. Project Lead

Scenario review chain:

1. QA Reviewer
2. QA Lead
3. QA Gatekeeper
4. Project Lead

Review principles:

- Assume upstream artifacts have gaps.
- Reject thin evidence; require coverage + traceability proof.
- Never claim coverage by counts; use techniques + saturation.

## Step 6 — Approval gate

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

- `.qfai/specs/spec-XXXX/spec.md`
- `.qfai/specs/spec-XXXX/delta.md`
- `.qfai/specs/spec-XXXX/scenario.feature`
- `.qfai/specs/spec-*/case-catalogue.md`
- `.qfai/specs/spec-*/traceability-matrix.md`
- (If needed) updated `.qfai/contracts/**`
- Validation evidence: command outputs showing PASS
- Next recommended command: /qfai-atdd and/or /qfai-tdd-red

## Final Check - CRITICAL CONSTRAINTS (repeat)

- Contracts MUST be completed first; do not write spec/scenario before contracts.
- Do NOT invent technologies, infra, or new contract categories.
- Evidence file is mandatory: `.qfai/evidence/spec-<spec-id>.md`.
- Completion must be approved by a reviewer who did not author the spec pack.

