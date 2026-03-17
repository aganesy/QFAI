# 01 Context

## Background

QFAI's implementation phase has historically relied on three separate TDD skills:

- `/qfai-tdd-red` — Write a failing test
- `/qfai-tdd-green` — Make the test pass
- `/qfai-tdd-refactor` — Refactor while keeping tests green

While conceptually aligned with the Red-Green-Refactor cycle, splitting these into independent skills introduced several problems:

1. **Workflow fragmentation** — Users must manually invoke three separate commands per micro-cycle, breaking the natural TDD rhythm.
2. **State drift** — No shared ledger tracks which items have been implemented, leading to skipped or duplicated work.
3. **Wrapper proliferation** — Each skill requires its own wrapper entry in `.agents`, `.claude`, and `.codex` configurations, tripling maintenance burden.

QFAI v1.6.0 addresses these issues by consolidating all three skills into a single `/qfai-implement` entry point with an embedded TDD micro-cycle and a persistent execution ledger (`test-list.md`).

## Purpose

Unify the implementation entry point to a single `qfai-implement` skill that:

- Embeds the full Red-Green-Refactor micro-cycle within one invocation.
- Introduces `test-list.md` as a structured execution ledger per spec.
- Provides a Phase 1 validator to enforce ledger structure and correctness.
- Eliminates redundant wrapper entries and stale skill references.

## Stakeholders

| Stakeholder | Interest |
|---|---|
| QFAI developers | Maintain and extend the CLI tool; reduced skill surface to manage |
| QFAI end users | AI-assisted development practitioners who invoke skills during coding workflows |

## Assumptions

1. Users will adopt `qfai-implement` as the sole implementation skill without requiring a deprecation grace period.
2. The three old TDD skills have no external dependencies (third-party integrations, published APIs) that prevent immediate removal.
3. Existing spec structures under `.qfai/specs/` can accommodate the new `tdd/test-list.md` path without schema conflicts.
4. Wrapper synchronization across `.agents`, `.claude`, and `.codex` can be completed atomically within a single PR.

## Issues

| ID | Description | Impact |
|---|---|---|
| ISS-01 | Half-migration state — old skills coexist with new concepts in the current codebase | Risk of inconsistent behavior if partially merged |
| ISS-02 | Wrapper sync required across three tool-specific configuration formats | Manual coordination needed; miss one and users see broken skill references |
| ISS-03 | Orphan references to old skill names may persist in documentation, tests, and workflow definitions | Failing tests or misleading docs if not purged |
