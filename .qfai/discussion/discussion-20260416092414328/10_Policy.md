# 10 Policy

## Security Policy

- No new external inputs are introduced by this change. All artifact ref values are derived from internal file paths and existing evidence bundle content within the repository.
- All leaf-field refs must be validated against the concrete-ref grammar before bundle write acceptance. `isConcreteArtifactRef()` in `pathUtils.ts` prevents path traversal by rejecting absolute paths and paths that do not conform to the repo-relative file ref grammar.
- All leaf-field ref values must be normalized (POSIX separator, relative form) before being written to output or compared. This prevents OS-specific path injection in audit artifacts.
- No credentials, tokens, or secrets are referenced or stored in artifact refs.

## Development Policy

- TypeScript strict mode is required. No `any` in new code. No `@ts-ignore`. No `as unknown as T` without explicit justification in a comment.
- New leaf-field validation code in `prototypingEvidence.ts` must be pure (no side effects on shared state, no I/O). It may accumulate issue entries in the issues list but must not mutate the input evidence object.
- `isConcreteArtifactRef()` from `pathUtils.ts` is the single source of truth for concrete-ref grammar. No duplicate patterns may be introduced.
- Existing test patterns in vitest must be followed. Extended test cases use the same import style, describe/it structure, and assertion style as existing files in `packages/qfai/tests/core/`.
- Error messages for new validation errors must be specific: they must identify the field path, the invalid value, and the reason it is invalid.

## Testing Policy

- All 15 new negative test cases (7 + 5 + 3) from WS-3 are mandatory. They are not optional enhancements.
- Existing synthetic token fixtures in `evidenceRefs` must be replaced with concrete artifact refs. A synthetic token fixture after rev9 is a test hygiene violation.
- The production path closure test (`prototypingExecution.productionPath.test.ts`) must include leaf-field strictness assertions. The closure test cannot rely solely on top-level field checks.
- Test coverage for new validator code paths must follow the existing coverage standards for `packages/qfai`.

## Operational Policy

- This change ships as a single PR. All workstreams (WS-1 through WS-4) must be in the same PR; partial shipment is not allowed.
- No migration shim or backward compat alias is provided. Backward compatibility is explicitly abandoned.
- README update is unconditional in rev9: the leaf fields must be enumerated. The conditional update policy from rev8 does not apply here because rev9 explicitly closes the docs/validator mismatch as a DoD condition.
