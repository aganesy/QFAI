# 10 Policy

## Security Policy

- No new external inputs are introduced by this change. All artifact ref values are derived from internal file paths within the repository.
- Artifact refs must be validated against the concrete-ref grammar before use. This prevents path traversal: `toRepoRelativeArtifactRef()` throws if `absolutePath` is outside `repoRoot`, and `isConcreteArtifactRef()` rejects paths that do not conform to the repo-relative file ref grammar.
- All input paths must be normalized (POSIX separator, relative form) before being written to output or compared. This prevents OS-specific path injection in audit artifacts.
- No credentials, tokens, or secrets are referenced or stored in artifact refs.

## Development Policy

- TypeScript strict mode is required. No `any` in new code. No `@ts-ignore`. No `as unknown as T` without explicit justification in a comment.
- Helper functions in `pathUtils.ts` must be pure (no side effects, no I/O, no global state). They may throw on invalid input.
- Existing test patterns in vitest must be followed. New test files use the same import style and test structure as existing files in `packages/qfai/tests/core/`.
- Error messages must be specific: they must name the invalid value and the reason it is invalid (e.g., "absolute path is not allowed in artifact refs").
- `pathUtils.ts` must be a leaf module: it must not import from `execution.ts` or any module that transitively imports `execution.ts`.

## Testing Policy

- New unit tests must be written for each new helper function (`toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, `isConcreteArtifactRef`).
- New negative test cases must be added for each error condition (absolute path, self-ref, synthetic token, directory path, empty string, absent field, empty array).
- The production path closure test (`prototypingExecution.productionPath.test.ts`) is mandatory. It must include at least one positive closure test and at least one negative injection test.
- Test coverage for `pathUtils.ts` must be 100% line coverage (NFR-0001).

## Operational Policy

- This change ships as a single PR. All workstreams (WS-1 through WS-4) must be in the same PR; partial shipment is not allowed.
- README update is conditional: update only if the current README contains an obsolete or absent description of the ref grammar or the `runtimeGate.evidenceRefs` validator contract (design doc §7-8).
- No migration shim or backward compat alias is provided. Backward compatibility is explicitly abandoned.
