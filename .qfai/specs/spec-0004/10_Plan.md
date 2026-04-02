# 10 Plan

- Spec: spec-0004
- Parent: CAP-0004

## 1. Implementation Strategy

### Primary Source Files

| File                                         | Responsibility                                                  |
| -------------------------------------------- | --------------------------------------------------------------- |
| `packages/qfai/src/cli/commands/validate.ts` | CLI entry point. runValidate() with format/failOn/phase routing |
| `packages/qfai/src/core/validate.ts`         | validateProject() orchestrator for all validators               |
| `packages/qfai/src/core/normalize.ts`        | normalizeValidationResult() for relative path conversion        |
| `packages/qfai/src/core/phasePolicy.ts`      | Phase guard logic (buildCiRefinementIssue)                      |
| `packages/qfai/src/core/runLog.ts`           | writeValidateRunLog() for run-\* log creation                   |
| `packages/qfai/src/core/validators/`         | Individual validator implementations (33+)                      |

### Key Functions (implemented)

| Function                      | Responsibility                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| `runValidate()`               | CLI orchestrator: load config, validate, emit output, write JSON |
| `validateProject()`           | Core: execute all validators, collect Issue[]                    |
| `shouldFail()`                | Determine exit code based on failOn setting                      |
| `emitText()` / `emitGitHub()` | Format-specific output emitters                                  |
| `dedupeIssues()`              | Deduplicate issues by composite key                              |

## 2. Test Strategy

Tests are in `packages/qfai/tests/core/` and `packages/qfai/tests/cli/`.

## 3. Dependencies

| Dependency         | Content                                              |
| ------------------ | ---------------------------------------------------- |
| spec-0003 (init)   | init creates the directory structure validate checks |
| spec-0005 (report) | report consumes validate.json as input               |

## 4. Implementation Order

All functionality is already implemented. This spec documents existing behavior.

## v1.7.12 Implementation Strategy

- **Phase**: Validator convergence
- **Bundle**: C (validator/runtime/browser QA convergence)

### Steps

1. Update `uixValidators.ts` to be truthful canonical aggregator (not legacy wrapper)
2. Synchronize validator file expectations with new 3-layer family filenames
3. Update `validate.ts` validator array to route to canonical validators
4. Update render evidence state handling (captured/skipped/failed/missing/not-applicable)
5. Keep minimal truthful browser QA runner

### Test Strategy

- Vitest for validator expectations
- Integration tests for validate pipeline
