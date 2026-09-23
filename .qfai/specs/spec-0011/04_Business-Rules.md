# 04 Business Rules

## BR-0011-0001: Serial-by-Default Processing

- AC-Refs: AC-0011-0001, AC-0011-0005

- Items are processed one test at a time in `test-list.md` order by default.
- Parallel processing requires explicit user approval and delivery-planner authorization.

## BR-0011-0002: Forward-Only Lifecycle

- AC-Refs: AC-0011-0002

- Valid transitions: `todo` -> `red` -> `green` -> `refactor` -> `done`.
- Any active status -> `exception` is allowed.
- Backward transitions are prohibited.

## BR-0011-0003: Test-First Enforcement

- AC-Refs: AC-0011-0003

- A failing test MUST be written before any production code.
- Production code written before a failing test exists is rejected.

## BR-0011-0004: Minimal Code Principle

- AC-Refs: AC-0011-0011

- Write the minimum production code to make the failing test pass.
- Speculative generalization is prohibited.

## BR-0011-0005: Evidence Hard Rules

- AC-Refs: AC-0011-0007

- Status-only evidence is invalid and MUST be rejected.
- Both command and result are required for RED and GREEN phases.
- Stale evidence from previous runs MUST NOT be reused.
- Empty evidence entries are rejected.

## BR-0011-0006: Reviewer Separation

- AC-Refs: AC-0011-0006

- Implementation workers cannot serve as their own reviewers.
- Both completion-reviewer and implementation-reviewer must return PASS before `done`.

## BR-0011-0007: Handoff Schema Closed Field Set

- AC-Refs: AC-0011-0009

- `prototype-handoff.yaml` MUST expose exactly `finalIterIndex`, `finalArtifact`, `extractedDesignSystem`, and `implementationNotes`.
- Legacy fields `mustPreserve` / `mayAdapt` / `mustNotCopy` MUST NOT be relied on by `/qfai-implement` and MUST surface as schema warnings if encountered.

## BR-0011-0008: Design System Input Determinism

- AC-Refs: AC-0011-0010

- `design-system.yaml` is the deterministic mirror of root `DESIGN.md` token tables (color / typography / radius / shadow).
- `/qfai-implement` MUST treat it as input only — it does not regenerate token tables from per-iter HTML.

## BR-0011-0009: Stops, Decisions And Discoveries Go To Existing Homes

- AC-Refs: AC-0011-0012

- A stop is recorded in the row's `Blocked-By`, and resuming the row closes no other record.
- A decision, a consultation and an out-of-scope discovery leave as a Change Request to `/qfai-sdd`. This skill writes neither `07_Decisions.md` nor `08_Open-questions.md`.
- No shipped `/qfai-implement` text directs writing, opening or closing an entry under `.qfai/steering/`.
