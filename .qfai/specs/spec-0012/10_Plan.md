# 10 Plan

## Implementation Strategy

1. Spec Auto-Discovery: implement 4-source diff detection
2. Mode selection: implement precedence chain (user > discussion > default)
3. Coverage Matrix generator: enumerate all specs with uiRoutes/apiEndpoints/dbObjects
4. Static checks: file existence, route declaration, schema presence
5. Runtime Gate v2: UI/API/DB/mock checks (standard mode: file-based, full-harness: runtime)
6. Full-harness loop: Planner -> Generator -> Evaluator -> Decision Gate
7. Evidence production: markdown + JSON with uiFidelity
8. Non-UI handling: surface detection and obligation skipping

## Test Strategy

- Unit tests: mode selection, auto-discovery, non-UI detection
- Integration tests: Coverage Matrix generation, Runtime Gate checks
- E2E tests: full prototyping workflow across multiple specs

## Dependencies

- Requires: spec artifacts from `/qfai-sdd`, contracts from `/qfai-discussion`
- Consumed by: `/qfai-atdd` as the recommended next step

## Risk

- CLI command removal may break existing workflows referencing `qfai prototyping`
- Mitigation: ensure no code references remain (verify with grep for old command name)

## v1.7.12 Implementation Strategy

- **Phase**: Prototyping truth unification
- **Bundle**: B + D (spec-pack + prototyping alignment)

### Steps

1. Verify SKILL.md is self-contained with mode semantics
2. Remove all `qfai prototyping` CLI command references from active docs/specs/policies
3. Normalize static-first/mode-aware contract in SKILL.md
4. Update skill contract for evidence expectations without CLI dependency

### Test Strategy

- Grep-based scan for stale CLI references
- Skill contract validation

## v1.7.13 Implementation Notes

- Prototyping mode module: `packages/qfai/src/core/prototyping/mode.ts` — mode resolution engine
- Types: `packages/qfai/src/core/prototyping/types.ts` — PrototypingMode, PrototypingSurface, PrototypingObligations
- Recommendation schema: `packages/qfai/src/core/prototyping/recommendationSchema.ts` — key existence checks
- Recommendation artifact: `packages/qfai/src/core/prototyping/recommendationArtifact.ts` — resolveLatestRecommendationArtifact()
- Calibration config: `packages/qfai/src/core/config.ts` — prototyping.calibration stanza
- Evidence integration: `packages/qfai/src/core/validators/prototypingEvidence.ts` — null safety fixes
- Harness status normalization: "accepted"→"converged", "cap-reached"→"max-iterations"
- ModeGuidance alignment: "premium"→"full-harness"
- Status: implemented (v1.7.13 full module)

## v1.7.15 Implementation Strategy

### Scope Boundary

Single-PR: `packages/qfai/**` only. No `.qfai/` root edits.

### Modules Touched (Change Obligation)

| Module | Change Obligation |
|---|---|
| `panelScore.ts` | Implement scoreL1/scoreL2 with real evidence inputs; remove fixed l1/l2={total:0}; computeWeightedTotal = Math.min(l1.total, l2.total) |
| `history.ts` | Enforce reviewerLogs[] append-only accumulation; validate reviewerLogs.length === iterationCount |
| `execution.ts` | Wire CalibrationLoader after loadConfig(); enforce fail-fast on missing evidence (calibration/reviewer/commitSha/render/browserQa/uiObservation/specCoverage); reviewer placeholder gate |
| `termination.ts` | converged requires iterationCount >= 2; plateau requires iterationCount >= 2; max-iterations requires iterationCount === calibration.maxIterations |
| `calibration.ts` | CalibrationLoader schema: plateauLookback >= 2 enforced; packVersion from pack metadata; pack not found/unreadable/schema-invalid -> runtime error |
| `prototypingEvidence.ts` | Validator rules: reviewer placeholder reject, commitSha missing reject, zero-seeded specCoverage reject, synthetic mockPaths reject, calibrationRef mismatch reject, array length consistency |
| `uiFidelityBuilder.ts` | Observation-only: no synthetic mockPaths.status="pass"; evidence not sufficient -> status="insufficient-evidence" |
| `uiObservation.ts` | extractDomLabelsWithJsdom() implementation; extractHtmlLabelsFromString() empty impl removal |
| `commitSha.ts` / `gitRevision.ts` | commitSha mandatory in full-harness; no silent fallback |
| `specCoverageBuilder.ts` | New module: loadDeclaredSpecArtifacts() + collectObservedRuntimeArtifacts() -> buildSpecCoverageSummary(); zero-seeded output rejected |

### Test Layers

| Layer | Location | Coverage Target |
|---|---|---|
| Unit | `tests/unit/` | panelScore, termination, calibration, specCoverageBuilder, uiFidelityBuilder, uiObservation, reviewerIdentity, commitSha |
| Integration | `tests/integration/` | execution.ts full-harness path with real evidence flow, fail-fast on missing evidence, CalibrationLoader wiring |
| ATDD annotation map | `spec-0012/tdd/test-list.md` | TC-0012-0030..TC-0012-0045 mapped to TDD-IDs |

### Docs Sync

| Artifact | Sync Target |
|---|---|
| SKILL.md | Full-harness input requirements, reviewer mandatory, convergence rule, specCoverage real-diff, uiFidelity observation-only, calibration mandatory |
| Evidence README | Evidence schema changes (specCoverage, uiFidelity, commitSha mandatory) |
| Discussion README | Score scope separation note (discussion scores != prototyping scores) |
| Drift diff | Enumerate docs claims vs runtime error conditions for 1:1 correspondence verification |

### Implementation Order (rev2 refined, TC-84 compliant)

Dependency graph order: calibration/history/runtime/types → l2Evidence/measurement/panelInputs/panelScore → execution 結線 → specCoverage/uiObservation/uiFidelityBuilder

1. types.ts — FullHarnessRequest から l1/l2 削除、FullHarnessIteration evidence-driven 再定義、MeasurementResult strict、ScreenObservation 型、evidenceRefs 8 カテゴリ型
2. calibrationLoader.ts — fail-open 全廃（DEFAULT_PACK / version="1.0.0" / thresholds default 削除）
3. history.ts — TerminationContext を CalibrationPack で受ける、count<plateauLookback guard、array length strict
4. l2Evidence.ts（新設）— buildDiscussionAxisInputs / buildScreenContractInputs / buildTrendAlignmentInputs
5. measurement.ts — MeasurementResult に 8 カテゴリ evidenceRefs 同時返却
6. panelInputs.ts — validatePanelInputs 10-check gate 強化
7. panelScore.ts — aggregateScore 0〜1 / trendSourcesChecked===0 reject / fidelityScore===0 with contracts reject
8. execution.ts — pre-scored bypass 削除、scoring pipeline 一元化、L2 dummy 全廃→l2Evidence builder 呼び出し、CalibrationLoader wiring、config fallback 弱体化、fail-fast gates
9. specCoverage.ts — 全 spec 必須化、silent 空返却禁止、DB coverage 二択
10. uiObservation.ts — ScreenObservation array 出力、actionsWired browser QA 由来、mockPath semantics 同期
11. uiFidelityBuilder.ts — screen-level 化、insufficient-evidence 厳格化、auto-pass 廃止
12. bundleWriter.ts — schema v2（8 カテゴリ + 新 iteration 型）
13. prototypingEvidence.ts — validator 14 項目 error 昇格 + rev2 追加ルール
14. docs/SKILL/README — reality sync（独立 evaluator 自動起動主張削除等）
15. tests — normal fixture rev2 clean + error fixture rev2 追加
