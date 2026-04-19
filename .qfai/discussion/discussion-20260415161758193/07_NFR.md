# 07 Non-Functional Requirements

## NFR Table

| NFR-ID | Title | Description | Metric | Source | Priority | Status |
|--------|-------|-------------|--------|--------|----------|--------|
| NFR-0001 | Deterministic rejection | All mode/surface rejections must be deterministic and fail-closed (not fail-open). No undefined behavior or silent pass-through on invalid input. | 100% of invalid mode/surface combinations produce an Error throw with no silent pass-through | SRC-0001 §3-1 | must | draft |
| NFR-0002 | Calibration pack fail-fast | `runFullHarness()` with missing or unresolvable `packPath` must throw synchronously before any iteration begins. | Time-to-fail < 100ms for pack resolution failure; 0 partial iteration records in output on failure | SRC-0001 §3-3 | must | draft |
| NFR-0003 | evidenceRefs resolvability | Every string in `runtimeGate.evidenceRefs` and `specCoverage.evidenceRefs` must be resolvable to an existing file, JSON pointer, or section anchor at validation time. | 0 unresolvable refs in valid output; validator rejects all self-refs and synthetic strings | SRC-0001 §3-4 | must | draft |
| NFR-0004 | TypeScript strict compliance | All new and modified TypeScript files must compile under `strict: true` with no `@ts-ignore`, bare `as` casts, or `any` types. | 0 TypeScript errors (`pnpm check-types` exits 0); 0 suppression annotations added | SRC-0002 | must | draft |
| NFR-0005 | Test suite pass rate | All vitest test suites (core, validators, integration, e2e, cli) must pass with 0 failures after changes. | `pnpm test` exits 0; no skipped tests that were previously passing | SRC-0001 §9 | must | draft |
| NFR-0006 | Auditability of review outcome | `reviewerSignoff.status` and `terminationReason` must always be derivable independently from the harness execution log. They must not be ambiguous or contradictory. | Validator check: terminationReason XOR signoff status inconsistency count = 0; test asserts this for all 3 terminationReason values | SRC-0001 §3-5 | must | draft |

## NFR-to-Constraint Mapping

| NFR-ID | Related Technical Constraint | Notes |
|--------|------------------------------|-------|
| NFR-0001 | TC-03, TC-04 | Mode and surface rejection must be synchronous and unconditional |
| NFR-0002 | TC-05 | Scalar params removal enforces pack-path-only path; eliminates bypass |
| NFR-0003 | — | Enforced by validator; not a constraint on implementation but on output quality |
| NFR-0004 | TC-06 | TypeScript strict is both an NFR and a technical constraint |
| NFR-0005 | OC-01 | Single PR; all test suites must pass together |
| NFR-0006 | TC-03 | Mode rejection at every layer supports auditability |
