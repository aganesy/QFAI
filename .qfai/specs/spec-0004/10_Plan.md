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

## v1.7.13 Implementation Notes

- Canonical/legacy separation: `packages/qfai/src/core/validators/index.ts` — removed DDP, added canonical UIX + prototypingRecommendation
- Production entrypoint: `packages/qfai/src/core/validators/uix/canonical.ts` — runCanonicalUixValidators()
- Legacy namespace: `packages/qfai/src/core/validators/legacy/` — ddpCompatibility.ts, uixCompatibility.ts
- IssueCategory: `packages/qfai/src/core/types.ts` — added "canonical"
- prototypingRecommendation: `packages/qfai/src/core/validators/prototypingRecommendation.ts`
- Implemented in v1.7.13-18..22.

## v1.7.15 Validator Rules Plan

### File Touchpoints

| File                                                              | Changes                                                                                                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/qfai/src/validators/uix/prototypingEvidence.ts`         | 12 new rule functions (PROT-295..306, PROT-308..309); severity upgrade for PROT-290..292 from warning to error |
| `packages/qfai/src/cli/commands/validate.ts`                      | Add PROT-295..309 descriptions to issue code description map                                                   |
| `packages/qfai/tests/unit/validators/prototypingEvidence.test.ts` | 24+ new test cases (positive + negative for each rule)                                                         |

### Implementation Notes

- No new validator file creation; all rules added to existing `prototypingEvidence.ts` aggregator
- PROT-290..292 severity change is in-place edit (warning→error)
- PROT-295..306 are new rule functions appended to the fullHarness validation section
- PROT-308..309 are supplementary checks (converged min-iteration, iteration-level reviewer)
- All new rules follow existing `issue()` helper pattern with category="canonical"
- Test strategy: each rule gets at least 1 positive (pass) + 1 negative (reject) test case

### v1.7.15 rev2 Validator Rules Plan

#### New Rules (semantic changes → new rule IDs)

| Rule     | Check                                               | Severity |
| -------- | --------------------------------------------------- | -------- |
| (new ID) | discussion.evidenceRefs.length === 0                | error    |
| (new ID) | screenContract.evidenceRefs.length === 0            | error    |
| (new ID) | trend.evidenceRefs.length === 0                     | error    |
| (new ID) | declared DB > 0 && observed DB === 0                | error    |
| (new ID) | uiFidelity.status=completed && no screen-level data | error    |
| (new ID) | iteration[i].evidenceRefs missing required category | error    |
| (new ID) | evidence contains request.l1/l2 old schema field    | error    |

#### Test Fixture Policy

- Normal-path fixtures: remove l1/l2 direct pass, packVersion:"1.0.0", single-iteration converged, actionsWired=0
- Error-path fixtures: add missing discussion/trend/screenContract evidence, unobserved DB, insufficient UI observation
- Each new rule: at least 1 positive + 1 negative test case

## v1.7.17 Validator Plan (How-only)

### File Touchpoints

| File | Changes |
| ---- | ------- |
| `packages/qfai/src/core/validators/uix/trendScan.ts` | add `design_guideline_research` category recognition and UIX-VAL-T05 warning logic |
| `packages/qfai/src/core/validators/uix/scoringReady.ts` | add quantitative-proxy detection for `score_anchors.low/mid/high` and emit UIX-VAL-T06 warning |
| `packages/qfai/src/core/validators/uix/canonical.ts` | no new ownership layer; continue to call existing modules |
| `packages/qfai/tests/validators/trendScan.test.ts` | TC-0004-0063, TC-0004-0064 |
| `packages/qfai/tests/validators/scoringReady.test.ts` | TC-0004-0065, TC-0004-0066 |

### Implementation Notes

- T05 and T06 are warning-first by decision DR-0004-0011.
- T05 should report the missing category or missing `rule_refs` / `local_translation` fields directly in the message.
- T06 should inspect anchor text heuristically for quantitative proxy markers (`px`, `%`, ratio pattern, `WCAG`, token/class/default naming).
