# R11 devils-advocate

## Verdict: PASS

## Scope checked

- [x] Challenge every assumption, conclusion, and design decision
- [x] Provide concrete alternative for every issue raised

## Findings

### F-11-01: Assumption challenged -- Immediate abolition vs. deprecation (ADVISORY)

**Challenge**: Removing 3 skills with zero deprecation period is aggressive. Users with active workflows using `/qfai-tdd-red` etc. will hit a hard wall with no migration path.

**Counter-argument**: DR-0013 explicitly addresses this. The half-migration state (some users on old, some on new) creates more confusion than a clean break. Since QFAI is a development toolchain (not a production API), and the user base is the authoring team, the blast radius is contained. The CHANGELOG documents the change.

**Alternative if this were FAIL**: Provide a 1-release deprecation period where old skills emit a warning pointing to `/qfai-implement`, then remove in v1.6.1.

**Verdict on this finding**: PASS -- the rationale in DR-0013 is sound for the context (internal toolchain, small user base, clean break preferred).

### F-11-02: Assumption challenged -- Phase 1 validator scope is too narrow (ADVISORY)

**Challenge**: Phase 1 only checks structural integrity (file exists, table exists, columns present, valid enum, TC refs). It does not verify TC coverage completeness, exception DR-ID consistency, or status transition correctness at runtime. A structurally valid but semantically empty test-list.md would pass Phase 1.

**Counter-argument**: DR-0015 explicitly scopes Phase 1 to structural checks, deferring content validation to v1.6.1. This is a deliberate incremental approach. A structurally valid empty test-list.md is a valid initial state (EX-0014-0014 documents this as an informational warning).

**Alternative if this were FAIL**: Include at minimum a "non-empty data rows" hard requirement in Phase 1 to prevent obviously useless test-list.md files from passing.

**Verdict on this finding**: PASS -- incremental validation is a reasonable strategy, and the v1.6.1 roadmap is explicit.

### F-11-03: Assumption challenged -- Serial-by-default execution is too conservative (ADVISORY)

**Challenge**: BR-0014-0009 defaults to serial execution with parallel only for "independent slices." In practice, most TDD items target different test files and could be parallelized. Serial execution could be significantly slower for large specs.

**Counter-argument**: DR-0016 documents that shared state corruption risk justifies the conservative default. For v1.6.0 (initial release), safety over speed is appropriate. The parallel path exists for independent slices, so the option is available. Performance tuning is a v1.6.2 concern (parallel rule hardening).

**Alternative if this were FAIL**: Default to parallel with an explicit `--serial` flag, and require users to annotate shared-state dependencies in test-list.md.

**Verdict on this finding**: PASS -- conservative default for an initial release is sound engineering practice.

### F-11-04: Assumption challenged -- test-list.md location inside spec directory (ADVISORY)

**Challenge**: Placing `tdd/test-list.md` inside `.qfai/specs/spec-XXXX/` means the execution ledger is mixed with specification artifacts. The test-list is a runtime/execution artifact, not a specification artifact.

**Counter-argument**: DR-0014 addresses this directly. The spec directory location maximizes discoverability and simplifies validator access (single path resolution). The `tdd/` subdirectory provides logical separation within the spec directory. The alternative (`.qfai/tdd/spec-XXXX.md`) was explicitly rejected.

**Alternative if this were FAIL**: Place under `.qfai/execution/spec-XXXX/test-list.md` to separate execution state from specification state.

**Verdict on this finding**: PASS -- discoverability and validator simplicity outweigh the conceptual purity of separation.

### F-11-05: Assumption challenged -- No migration tool provided (ADVISORY)

**Challenge**: The spec requires manual deletion of old skill files and manual wrapper updates (Steps 5-7). For a tool-driven project like QFAI, there is no automated migration command (e.g., `qfai migrate v1.6.0`).

**Counter-argument**: The migration is part of the implementation PR itself (Steps 1-8 in the Plan). It is not a user-facing migration -- the implementer performs all changes in a single PR. End users receive the result via `qfai init` which generates the new structure. There is no persistent state that requires user-side migration.

**Alternative if this were FAIL**: Add a `qfai migrate` command that detects old skill structures and automatically updates them.

**Verdict on this finding**: PASS -- the migration is a one-time developer-side change delivered via PR, not a user-facing operation.

## Required fixes

None. All challenges resolved satisfactorily against documented decisions and rationale.
