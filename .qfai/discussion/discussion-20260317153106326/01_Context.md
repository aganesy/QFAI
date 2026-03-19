# Context

## Background

QFAI v1.6.0 introduced the **`/qfai-implement` single-entry unification**, consolidating the TDD micro-cycle workflow around a single entry point and establishing `test-list.md` as the execution ledger for tracking test implementation status per spec. While this release delivered Validator Phase 1 (existence, structure, and reference checks), the validation coverage remains insufficient to prevent several classes of process circumvention.

QFAI v1.6.1 is a **guardrail hardening** release that builds directly on the v1.6.0 foundation. It introduces Validator Phase 2 with five new error checks for `test-list.md`, adds coverage visualization to the report output, and updates documentation and init templates to reflect the expanded column requirements (8 required columns: TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence).

## Purpose

Close seven failure modes that allow coverage gaps, ambiguous ledger state, exception abuse, and completion fraud to pass undetected through the current validation pipeline:

| Failure Mode | Description                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-6101**   | TC not in test-list — unit/component test cases exist in `06_Test-Cases.md` but have no corresponding entry in `test-list.md`                                                   |
| **F-6102**   | Exception abuse — `Status=exception` used without a valid DR-ID justification                                                                                                   |
| **F-6103**   | Done without test file — status marked as `green`, `refactor`, or `done` but the referenced test file does not exist on disk                                                    |
| **F-6104**   | Coverage not visible — the report output lacks unit/component coverage visualization, making gaps invisible to reviewers                                                        |
| **F-6105**   | Docs/templates mismatch — documentation and init templates do not reflect the full set of required columns, causing confusion and validator failures on newly initialized specs |
| **F-6106**   | Duplicate TDD-ID — the same TDD-ID appears more than once in a single `test-list.md`, making ledger entries ambiguous                                                           |
| **F-6107**   | Invalid TDD-ID format — malformed TDD-ID values bypass the expected `TDD-NNNN` identifier contract and weaken traceability                                                      |

## Stakeholders

- **QFAI maintainers** — Responsible for implementing, testing, and releasing the validator, report, and template changes.
- **QFAI users (developers)** — Developers using the framework who author and maintain `test-list.md` entries as part of TDD micro-cycles. They will encounter the new error checks and must comply with the expanded column requirements.
- **CI/CD pipelines** — Automated systems consuming validator output for quality gate decisions. The new error codes must be correctly emitted and parseable by downstream tooling.

## Assumptions

1. QFAI v1.6.0 is stable and deployed. All Phase 1 validators are functioning correctly.
2. `test-list.md` is in active use across projects consuming the framework.
3. `06_Test-Cases.md` includes a **Layer** column that classifies test cases (unit, component, etc.). Phase 2 validators rely on this column to determine which TC-\* entries require coverage in `test-list.md`.
4. Test file paths in `test-list.md` are resolved relative to the project root.
5. DR-ID and Evidence are both added to the set of required columns for `test-list.md`.

## Issues

- **Validator Phase 1 is too weak to prevent completion fraud.** A developer can mark a TDD entry as `done` without the referenced test file existing on disk (F-6103), or omit test cases entirely from `test-list.md` without triggering any error (F-6101). Exception status can be used without justification (F-6102).
- **Report lacks coverage visibility.** The current report output does not visualize unit/component coverage, making it impossible for reviewers to assess completeness at a glance (F-6104).
- **Documentation and templates are out of date.** The init template for `test-list.md` defines only 6 columns, while the validator now expects 8 required columns, leading to immediate validation failures on newly initialized specs (F-6105).
- **Identifier quality is not enforced strongly enough.** Duplicate or malformed TDD-IDs make the execution ledger ambiguous and undermine deterministic tracking across validation, reporting, and review flows (F-6106, F-6107).
