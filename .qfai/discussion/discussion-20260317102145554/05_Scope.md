# 05 Scope

## In Scope

The following items are within the boundary of QFAI v1.6.0:

1. **`qfai-implement` skill creation** — New unified implementation skill embedding the full TDD micro-cycle (Red, Green, Refactor) in a single entry point.
2. **Old skill removal** — Complete abolition of `/qfai-tdd-red`, `/qfai-tdd-green`, and `/qfai-tdd-refactor` from skill bodies, wrappers, tests, and documentation.
3. **`test-list.md` introduction** — Execution ledger file at `.qfai/specs/spec-XXXX/tdd/test-list.md` tracking implementation queue and progress.
4. **Phase 1 validator** — Validator for `test-list.md` covering: file existence, markdown table structure, required columns, status enum values, and TC reference validation.
5. **Wrapper synchronization** — Update `.agents`, `.claude`, and `.codex` wrapper configurations to register `qfai-implement` and remove old skill entries.
6. **Orphan reference cleanup** — Purge all remaining references to the three old skill names from docs, tests, workflow definitions, and wrappers.

## Out of Scope (Anti-Goals)

The following items are explicitly deferred to future versions:

| Item | Target Version | Rationale |
|---|---|---|
| TC coverage hardening | v1.6.1 | Requires stable test-list.md foundation first |
| Exception + DR-ID hardening | v1.6.1 | Depends on finalized error taxonomy |
| Sub-agent roster formalization | v1.6.2 | Design policy established in v1.6.0; formal roster deferred |
| Evidence contract hardening | v1.6.2 | Needs real-world usage data from v1.6.0 |
| Parallel rule hardening | v1.6.2 | Serial-by-default policy set in v1.6.0; advanced parallel rules deferred |

## Success Criteria

| Criterion | Verification Method |
|---|---|
| `qfai-implement` is the sole implementation entry point | No other implementation skill exists in skill registry or wrappers |
| All tests pass | `verify-pack` completes with zero failures |
| No old skill references remain | Text search for `qfai-tdd-red`, `qfai-tdd-green`, `qfai-tdd-refactor` returns zero hits across the repository |
| `test-list.md` validator enforces structure | Phase 1 validator unit tests cover existence, table format, columns, status enum, and TC ref checks |
| Single PR contains all changes | Git history shows one merge commit for the entire v1.6.0 scope |
