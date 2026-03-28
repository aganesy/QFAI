# 10 Plan

- Spec: spec-0027
- Parent: CAP-0027

## Implementation Strategy

### Phase overview

The 8-step implementation sequence follows TC-09 from the discussion pack. Each step builds on its predecessors; no step may be started until all of its dependency steps are green (tests passing). All validators follow the established async pattern `(root: string, config: QfaiConfig) => Promise<Issue[]>`.

| Step | Focus                                    | Dependencies | Priority |
| ---- | ---------------------------------------- | ------------ | -------- |
| 1    | UI-bearing detection function            | None         | P0       |
| 2    | Sidecar presence validator               | Step 1       | P0       |
| 3    | Strategy completeness validator          | Step 1       | P0       |
| 4    | Scoring axes + aggregate scoring         | Step 1       | P1       |
| 5    | Option comparison + anchor validator     | Step 1       | P1       |
| 6    | Screen contract + OQ closure validators  | Step 1       | P1       |
| 7    | Migration / stale asset detection        | Steps 1-6    | P1       |
| 8    | UIX-REV semantic reviewer prompts        | Steps 1-6    | P2       |

### Step details

#### Step 1: UI-bearing detection function

- **What**: Single shared function `isUiBearing(root, config)` that returns `boolean`. Evaluates positive signals (`<style>`, `<div>`, Mermaid `stateDiagram`/screen-flow, `uiux/` directory, screen contract YAML) with negative overrides (code fences, inline code).
- **Where**: New file `packages/qfai/src/core/validators/uixDetection.ts`
- **Estimated LOC**: 80-120
- **Key constraints**: Must be deterministic (NFR-0027-0001). Must exclude tags inside fenced code blocks and inline code (AC-0027-0009). Shared by all subsequent steps.

#### Step 2: Sidecar presence validator (UIX-VAL-SIDECAR-MISSING)

- **What**: For UI-bearing packs, verify `uiux/` directory exists. Emit `UIX-VAL-SIDECAR-MISSING` (severity: error) with fix suggestion when absent.
- **Where**: New file `packages/qfai/src/core/validators/uixSidecar.ts`
- **Dependencies**: `isUiBearing` from Step 1
- **Estimated LOC**: 40-60

#### Step 3: Strategy completeness validator (UIX-VAL-STRATEGY-INCOMPLETE)

- **What**: Validate `uiux/10_strategy.md` required fields (approach, rationale, etc.) and enforce 20-char minimum on critical narrative fields.
- **Where**: New file `packages/qfai/src/core/validators/uixStrategy.ts`
- **Dependencies**: `isUiBearing` from Step 1
- **Estimated LOC**: 80-120
- **Key constraints**: Boundary at exactly 20 chars passes; 19 fails (TC-0027-0013, TC-0027-0014).

#### Step 4: Scoring axes + aggregate scoring validators

- **What**: Validate scoring axis files (`uiux/20-23`) for source translation completeness. Validate aggregate scoring for required elements (weights, normalization, threshold).
- **Where**: New file `packages/qfai/src/core/validators/uixScoring.ts`
- **Dependencies**: `isUiBearing` from Step 1
- **Estimated LOC**: 120-160

#### Step 5: Option comparison + anchor validator

- **What**: Validate `uiux/30_comparison.md` contains 2+ options. Validate `uiux/31_anchor.md` has a selection.
- **Where**: New file `packages/qfai/src/core/validators/uixComparison.ts`
- **Dependencies**: `isUiBearing` from Step 1
- **Estimated LOC**: 80-100

#### Step 6: Screen contract + OQ closure validators

- **What**: Validate screen contracts in `uiux/40_contracts.md` have minimum structure (states, outcomes, transitions). Validate OQ closure readiness (no open critical OQs).
- **Where**: New file `packages/qfai/src/core/validators/uixContracts.ts`
- **Dependencies**: `isUiBearing` from Step 1
- **Estimated LOC**: 100-140

#### Step 7: Migration / stale asset detection

- **What**: Detect legacy UI-bearing projects without `uiux/` sidecar and emit migration guidance with step-by-step instructions. Detect stale sidecar assets (outdated template version). Default severity: warning. Config key `uiux.migration.strict: true` escalates to error. 3-phase ratchet: Phase 1 (warning-only, 30 days post-release), Phase 2 (strict opt-in), Phase 3 (strict default).
- **Where**: New file `packages/qfai/src/core/validators/uixMigration.ts`
- **Dependencies**: All Steps 1-6 validators must be stable
- **Estimated LOC**: 120-160

#### Step 8: UIX-REV semantic reviewer prompts

- **What**: Prompt templates for 6 review categories: strategy selection, axis overlap, trend translation adequacy, product-specificity, anchor weakness, generic fallback risk. Output: accept/refine/pivot recommendation with rationale. Templates independently revertable (NFR-0027-0010).
- **Where**: New file `packages/qfai/src/core/validators/uixReviewPrompts.ts`, prompt templates in `packages/qfai/assets/uix-rev/` (one file per category)
- **Dependencies**: Steps 1-6 for context awareness
- **Estimated LOC**: 80-100 (orchestrator) + ~50 per prompt template

## File Impact Analysis

### New files

| File                                                      | Purpose                                   |
| --------------------------------------------------------- | ----------------------------------------- |
| `packages/qfai/src/core/validators/uixDetection.ts`      | Shared UI-bearing detection function      |
| `packages/qfai/src/core/validators/uixSidecar.ts`        | UIX-VAL-SIDECAR-MISSING validator         |
| `packages/qfai/src/core/validators/uixStrategy.ts`       | UIX-VAL-STRATEGY-INCOMPLETE validator     |
| `packages/qfai/src/core/validators/uixScoring.ts`        | Scoring axes + aggregate scoring          |
| `packages/qfai/src/core/validators/uixComparison.ts`     | Option comparison + anchor validation     |
| `packages/qfai/src/core/validators/uixContracts.ts`      | Screen contracts + OQ closure             |
| `packages/qfai/src/core/validators/uixMigration.ts`      | Migration + stale asset detection         |
| `packages/qfai/src/core/validators/uixReviewPrompts.ts`  | UIX-REV prompt orchestrator               |
| `packages/qfai/assets/uix-rev/*.md`                      | 6 prompt templates (one per category)     |
| `packages/qfai/tests/core/uixDetection.test.ts`          | UI-bearing detection unit tests           |
| `packages/qfai/tests/core/uixSidecar.test.ts`            | Sidecar validator unit tests              |
| `packages/qfai/tests/core/uixStrategy.test.ts`           | Strategy validator unit tests             |
| `packages/qfai/tests/core/uixScoring.test.ts`            | Scoring validator unit tests              |
| `packages/qfai/tests/core/uixComparison.test.ts`         | Comparison validator unit tests           |
| `packages/qfai/tests/core/uixContracts.test.ts`          | Contract + OQ validator unit tests        |
| `packages/qfai/tests/core/uixMigration.test.ts`          | Migration validator unit tests            |
| `packages/qfai/tests/core/uixReviewPrompts.test.ts`      | UIX-REV prompt structure tests            |
| `packages/qfai/tests/core/uixValidatorsIntegration.test.ts` | Integration: full UIX-VAL group        |

### Modified files

| File                                                      | Change                                                   |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `packages/qfai/src/core/validators/index.ts`             | Add exports for all new UIX-VAL validators               |
| `packages/qfai/src/core/validate.ts`                     | Register new validators in `uiuxValidators` Promise.all  |
| `packages/qfai/src/core/config.ts`                       | Add `migration` sub-config to `QfaiUiuxConfig`           |
| `CHANGELOG.md`                                            | v1.7.4 entry + v1.7.3 test count correction (25->26)    |

## Test Strategy

### Test layers

| Layer       | Scope                                                  | Location                                        | Count (est.) |
| ----------- | ------------------------------------------------------ | ----------------------------------------------- | ------------ |
| Unit        | Each validator function in isolation                   | `packages/qfai/tests/core/uix*.test.ts`         | ~50          |
| Integration | Full UIX-VAL group via validate.ts orchestrator        | `packages/qfai/tests/core/uixValidatorsIntegration.test.ts` | ~10  |
| E2E         | Verify-pack end-to-end (sidecar creation -> validate)  | `packages/qfai/tests/core/` (ATDD-annotated)    | ~6           |
| NFR         | Determinism (10-run), performance (2000ms budget)      | `packages/qfai/tests/core/uixValidatorsIntegration.test.ts` | 2    |

### Fixture plan

Each UIX-VAL rule requires a minimum of 1 pass + 1 fail fixture. Fixtures use temp directories (mkdtemp) following the existing pattern in `uiuxValidators.test.ts`.

| Rule ID                        | Pass fixture                                           | Fail fixture                                     | TC-Refs                      |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------ | ---------------------------- |
| UI-bearing detection           | Pack with `<style>` outside code fence                 | Pack with `<style>` inside code fence only       | TC-0027-0001..TC-0027-0008   |
| UIX-VAL-SIDECAR-MISSING        | UI-bearing pack with `uiux/` present                  | UI-bearing pack without `uiux/`                  | TC-0027-0009, TC-0027-0010   |
| UIX-VAL-STRATEGY-INCOMPLETE    | Strategy with 20-char rationale                        | Strategy with 19-char rationale                  | TC-0027-0011..TC-0027-0014, TC-0027-0045 |
| UIX-VAL-SCORING-*              | Scoring axis with translation, aggregate with 3 elems | Axis missing translation, aggregate missing threshold | TC-0027-0015..TC-0027-0018 |
| UIX-VAL-COMPARISON-*           | 3 options + anchor selected                            | 1 option only; anchor unselected                 | TC-0027-0019..TC-0027-0021   |
| UIX-VAL-CONTRACT-*             | Screen contract with all 3 fields                      | Contract missing transitions                     | TC-0027-0022, TC-0027-0023   |
| UIX-VAL-OQ-*                   | 0 open critical OQs                                    | 2 open critical OQs                              | TC-0027-0024, TC-0027-0025   |
| Non-UI zero noise              | CLI tool project (no UI signals)                       | N/A (pass-only)                                  | TC-0027-0026, TC-0027-0027   |
| Report schema                  | Issue with all 5 fields                                | N/A (structural assert)                          | TC-0027-0028                 |
| Migration                      | Legacy project, default config -> warning              | Legacy project, strict config -> error           | TC-0027-0033..TC-0027-0035   |
| Stale asset                    | Current template version                               | Outdated template version                        | TC-0027-0036, TC-0027-0037   |

### Annotations

- **E2E tests**: `QFAI:SPEC-0027:US-YYYY` (e.g., `QFAI:SPEC-0027:US-0027-0001`)
- **Integration tests**: `QFAI:SPEC-0027:TC-YYYY` (e.g., `QFAI:SPEC-0027:TC-0027-0009`)
- Each test must reference at least one TC-ID from `06_Test-Cases.md`
- Verify-pack tests annotated with both US-ref (for traceability) and TC-ref (for coverage)

## Migration / Backward Compatibility

### Config additions

Add optional `migration` sub-config to `QfaiUiuxConfig`:

```typescript
export type QfaiUiuxMigrationConfig = {
  strict?: boolean;        // default: false (warning severity)
  phase1EndDate?: string;  // ISO date; during Phase 1, strict is ignored
};

export type QfaiUiuxConfig = {
  // ... existing fields ...
  migration?: QfaiUiuxMigrationConfig;
};
```

### Backward compatibility guarantees

1. All new config keys are optional with safe defaults; existing `qfai.config.yaml` files remain valid without changes.
2. Non-UI projects produce zero UIX-VAL/UIX-REV issues (empty array, not suppressed) -- no behavioral change for existing users.
3. New validators are added to the existing `uiuxValidators` Promise.all group in `validate.ts`, preserving the existing performance budget enforcement.
4. No existing validator output or test suite is affected (NFR-0027-0004).
5. Migration checks default to warning severity; pipelines are not blocked unless `uiux.migration.strict: true` is explicitly set.

### 3-phase migration ratchet

| Phase   | Trigger                         | Behavior                                     |
| ------- | ------------------------------- | -------------------------------------------- |
| Phase 1 | v1.7.4 release + 30 days       | Warning-only regardless of config (TC-0027-0047) |
| Phase 2 | After Phase 1 ends             | Warning default, `strict: true` -> error     |
| Phase 3 | Future release (TBD)           | Error default, `strict: false` -> warning    |

## Risk Mitigation

### Performance budget (2000ms)

- All UIX-VAL validators join the existing `uiuxValidators` Promise.all group, running in parallel.
- Individual validators must not perform network or filesystem-heavy scans; they read only files within the pack directory.
- Integration test TC-0027-0042 asserts combined time < 2000ms on standard fixture.
- If budget is exceeded, the existing `QFAI-UIUX-PERF` warning mechanism fires.

### Determinism guarantee (NFR-0027-0001)

- No LLM calls, no random, no Date.now() in UIX-VAL validators.
- TC-0027-0041 runs 10 identical passes and asserts bitwise-identical issue sets.
- Issue ordering is deterministic (sorted by file path, then rule ID).

### Static/runtime boundary (AC-0027-0018)

- TC-0027-0040 inspects source imports and asserts zero browser/network/rendering dependencies.
- UIX-VAL validators operate solely on filesystem artifacts (markdown, YAML).

### No new runtime dependencies (TC-34 from discussion)

- Implementation uses only Node.js built-ins (`fs`, `path`) and existing project dependencies (`yaml` parser already in use).
- No new `dependencies` entries in `package.json`.

## Dependencies

### Internal module dependencies

| Module                              | Used by           | Purpose                           |
| ----------------------------------- | ----------------- | --------------------------------- |
| `config.ts` (QfaiConfig, QfaiUiuxConfig) | All validators | Config access, migration settings |
| `types.ts` (Issue)                  | All validators    | Issue type contract               |
| `validate.ts`                       | Registration      | Promise.all orchestration         |
| `validators/index.ts`              | Re-export          | Barrel export                     |
| `validators/platformDetection.ts`  | Step 1 (optional) | Existing platform detection ref   |

### External dependencies

None. All implementation uses existing runtime dependencies only (Node.js built-ins + `yaml` parser).

## Rollback Plan

### Feature-level disable

1. **Config toggle**: Each UIX-VAL rule can be individually disabled via config (NFR-0027-0009). Implementation: `uiux.disabledRules: string[]` array in config.
2. **UIX-REV independence**: UIX-REV prompt templates are independently revertable without affecting UIX-VAL validators (NFR-0027-0010). Removing or emptying `packages/qfai/assets/uix-rev/` disables all semantic reviews.

### Code-level revert

1. **Git revert**: All new code is in new files (`uixDetection.ts`, `uixSidecar.ts`, etc.). Reverting the commit removes all UIX-VAL/UIX-REV functionality.
2. **Minimal touchpoints**: Only 3 existing files are modified (`index.ts`, `validate.ts`, `config.ts`). Changes are additive (new exports, new array entries, new optional type fields) -- revert is clean.
3. **No schema migration**: No database or persistent state changes. Rollback requires no data migration.
