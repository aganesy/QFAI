# 08 Glossary

## Domain Terms

| Term | Definition |
|---|---|
| qfai-implement | New unified implementation skill introduced in v1.6.0, replacing the three separate TDD skills (`qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor`). Embeds the full TDD micro-cycle within a single invocation. |
| test-list.md | Execution ledger file located at `.qfai/specs/spec-XXXX/tdd/test-list.md`. Tracks the progress of each unit/component implementation item through the TDD micro-cycle. Structured as a markdown table with required columns and status enums. |
| TDD micro-cycle | The Red-Green-Refactor loop applied to one test at a time. Red: write a failing test. Green: write minimal code to pass. Refactor: improve code while keeping tests green. |
| execution ledger | A file that tracks the unit/component implementation queue and progress for a given spec. In v1.6.0, this role is fulfilled by `test-list.md`. |
| SUT | System Under Test. The code unit or component being exercised by a test case. |
| Phase 1 validator | The initial validator for `test-list.md` introduced in v1.6.0. Checks file existence, markdown table structure, required columns, status enum correctness, and TC reference validity. Further hardening is deferred to later versions. |
| wrapper | Tool-specific thin routing file (`.agents`, `.claude`, `.codex`) that points to a canonical skill body. Each supported tool platform has its own wrapper format, but all reference the same underlying skill definition. |
| canonical assets | Source-of-truth skill files located under `packages/qfai/assets/init/`. Wrappers and runtime skill resolution ultimately point back to these files. |
| orphan reference | A stale reference to an abolished skill name (e.g., `qfai-tdd-red`) that persists in documentation, tests, or wrapper configurations after the skill has been removed. Must be purged as part of the migration. |
