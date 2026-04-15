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

| Module                            | Change Obligation                                                                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panelScore.ts`                   | Implement scoreL1/scoreL2 with real evidence inputs; remove fixed l1/l2={total:0}; computeWeightedTotal = Math.min(l1.total, l2.total)                                                        |
| `history.ts`                      | Enforce reviewerLogs[] append-only accumulation; validate reviewerLogs.length === iterationCount                                                                                              |
| `execution.ts`                    | Wire CalibrationLoader after loadConfig(); enforce fail-fast on missing evidence (calibration/reviewer/commitSha/render/browserQa/uiObservation/specCoverage); reviewer placeholder gate      |
| `termination.ts`                  | converged requires iterationCount >= 2; plateau requires iterationCount >= 2; max-iterations requires iterationCount === calibration.maxIterations                                            |
| `calibration.ts`                  | CalibrationLoader schema: plateauLookback >= 2 enforced; packVersion from pack metadata; pack not found/unreadable/schema-invalid -> runtime error                                            |
| `prototypingEvidence.ts`          | Validator rules: reviewer placeholder reject, commitSha missing reject, zero-seeded specCoverage reject, synthetic mockPaths reject, calibrationRef mismatch reject, array length consistency |
| `uiFidelityBuilder.ts`            | Observation-only: no synthetic mockPaths.status="pass"; evidence not sufficient -> status="insufficient-evidence"                                                                             |
| `uiObservation.ts`                | extractDomLabelsWithJsdom() implementation; extractHtmlLabelsFromString() empty impl removal                                                                                                  |
| `commitSha.ts` / `gitRevision.ts` | commitSha mandatory in full-harness; no silent fallback                                                                                                                                       |
| `specCoverageBuilder.ts`          | New module: loadDeclaredSpecArtifacts() + collectObservedRuntimeArtifacts() -> buildSpecCoverageSummary(); zero-seeded output rejected                                                        |

### Test Layers

| Layer               | Location                     | Coverage Target                                                                                                          |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Unit                | `tests/unit/`                | panelScore, termination, calibration, specCoverageBuilder, uiFidelityBuilder, uiObservation, reviewerIdentity, commitSha |
| Integration         | `tests/integration/`         | execution.ts full-harness path with real evidence flow, fail-fast on missing evidence, CalibrationLoader wiring          |
| ATDD annotation map | `spec-0012/tdd/test-list.md` | TC-0012-0030..TC-0012-0045 mapped to TDD-IDs                                                                             |

### Docs Sync

| Artifact          | Sync Target                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| SKILL.md          | Full-harness input requirements, reviewer mandatory, convergence rule, specCoverage real-diff, uiFidelity observation-only, calibration mandatory |
| Evidence README   | Evidence schema changes (specCoverage, uiFidelity, commitSha mandatory)                                                                           |
| Discussion README | Score scope separation note (discussion scores != prototyping scores)                                                                             |
| Drift diff        | Enumerate docs claims vs runtime error conditions for 1:1 correspondence verification                                                             |

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

## v1.7.15 rev4 Implementation Strategy

### Scope Boundary

Single-PR: `packages/qfai/**` only. 5 remaining audit issues across 6 work streams.

### Modules Touched (rev4 Change Obligation)

| Module                     | Change Obligation                                                                                                                  | WS   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `mode.ts`                  | `derivePrototypingObligations()` に cli + full-harness 拒否ガード追加。UI-bearing surface 判定: web/mobile/desktop/mixed のみ許可   | WS-1 |
| `execution.ts`             | `runFullHarness()` に非ビジュアル surface ハードリジェクト追加                                                                      | WS-1 |
| `cli/prototyping.ts`       | cli + full-harness 組み合わせ時の即座エラー終了                                                                                     | WS-1 |
| `screenContracts.ts` (新設)| `40_screen_contracts.md` パーサー。スクリーン一覧を返却する関数を提供                                                                | WS-2 |
| `uiFidelityBuilder.ts`     | `"/primary"` 固定値を廃止し screen contract からターゲットを動的導出。各スクリーン個別のフィデリティ測定ターゲット生成                 | WS-2 |
| `uiObservation.ts`         | フェーズ参照・ファインディング参照の収集。screen-level measurement のエビデンス参照を `runtime.ts` へ提供                             | WS-3 |
| `runtime.ts`               | `iterations[].evidenceRefs.browserQa` への格納。空時ハードフェイル                                                                   | WS-3 |
| `prototypingEvidence.ts`   | サマリーレベルにフェーズ/ファインディング参照を含める。陳腐化 remediation セマンティクス除去                                          | WS-3, WS-6 |
| `runtimeGateBuilder.ts`    | canonical path 正規化処理実装。URL → canonical path 変換                                                                            | WS-4 |
| `specCoverage.ts`          | canonical path 比較。URL をルートとして扱わない。missing_observation レポート                                                        | WS-4 |
| `l2Evidence.ts`            | 20-23 系ファイル・`04_Sources.md`・`40_screen_contracts.md` の構造化パース優先。ヒューリスティック縮小                                | WS-5 |
| `prototypingEvidence.ts`   | バリデータ: cli + full-harness 組み合わせ拒否ルール追加                                                                              | WS-1 |
| docs/SKILL/README          | 陳腐化記述更新。runtime 実体との reality sync                                                                                        | WS-6 |
| tests                      | `skip` → `reject` 変換。URL-as-route → canonical route 変換。`"/primary"` 除去                                                      | WS-6 |

### Implementation Order (rev4, 6-step dependency chain)

WS-1 は独立（並行可能）。WS-2〜WS-6 は直列依存。

1. **Step 1** (WS-2 基盤): `screenContracts.ts` 新設 — `40_screen_contracts.md` パーサー
2. **Step 2** (WS-2): `uiFidelityBuilder.ts` 改修 — screen contract ベースターゲット生成、`"/primary"` 除去
3. **Step 3** (WS-3): `uiObservation.ts` + `runtime.ts` 改修 — エビデンスチェーン完全性、空時ハードフェイル
4. **Step 4** (WS-4): `runtimeGateBuilder.ts` + `specCoverage.ts` 改修 — canonical route semantics
5. **Step 5** (WS-5): `l2Evidence.ts` 改修 — 構造化パース優先
6. **Step 6** (WS-6): `prototypingEvidence.ts` + tests + docs — 陳腐化整理、reality sync
7. **WS-1** (並行): `mode.ts` + `execution.ts` + `cli/prototyping.ts` + `prototypingEvidence.ts` — 4 層 reject

### Test Strategy (rev4)

| Layer       | Location                     | Coverage Target                                                                                           |
| ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| Unit        | `tests/unit/`                | screenContracts parser, canonical route normalization, mode reject guard, evidence chain validation        |
| Integration | `tests/integration/`         | screen contract → Browser QA → evidence chain full path, specCoverage canonical path comparison           |
| Validator   | `tests/validators/`          | QFAI-PROT cli+full-harness reject rule, evidence chain non-empty rule                                     |
| ATDD map    | `spec-0012/tdd/test-list.md` | TC-0012-0092..TC-0012-0120 mapped to TDD-IDs                                                              |

### Docs Sync (rev4)

| Artifact        | Sync Target                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------- |
| SKILL.md        | cli + full-harness 拒否ルール明記、screen contract ベースターゲット、canonical route semantics       |
| Evidence README | evidence chain completeness 要件、structured parse 優先ルール                                       |
| README.md       | 陳腐化記述除去、rev4 変更反映                                                                       |

## v1.7.15 rev5 Implementation Strategy

### Scope Boundary

Single-PR: `packages/qfai/**` only. 6 audit resolution items from discussion-20260415014056471.

### New Files (5 new modules)

| File | WS | Purpose |
|------|-----|---------|
| `runtimeObservation.ts` | WS-2 | ObservedUiRoute + RuntimeObservation types (observed-only ledger) |
| `browserQaPerScreen.ts` | WS-3 | Per-screen Browser QA input generator |
| `actionCoverage.ts` | WS-4 | actionsDeclared/actionsObserved/actionsWired/missingActions calculator |
| `packResolver.ts` | WS-6 | Calibration pack resolution SSOT (shared by runtime + validator) |
| `structuredArtifactReaders.ts` | WS-6 | Structured section parsers for discussion/screen artifacts |

### Modules Touched (rev5 Change Obligation)

| Module | Change Obligation | WS |
|--------|-------------------|-----|
| `mode.ts` / `derivePrototypingObligations()` | Return invalidCombination=true for non-UI surface regardless of mode | WS-1 |
| `execution.ts` | Reject non-UI surface after classification (all modes); pass surface/adapters/screenContracts explicitly to runFullHarness() | WS-1, WS-5 |
| `harness/runtime.ts` | runFullHarness() surface check at entry; make adapters.surface/render/browserQa and screenContracts required | WS-1, WS-5 |
| `cli/commands/prototyping.ts` | Reject non-UI surface at CLI entry point | WS-1 |
| `runtimeGateBuilder.ts` | Remove synthetic status:200 generation | WS-2 |
| `specCoverage.ts` | Use RuntimeObservation as input; set-compare declaredUiRoutes vs observed.ui[].route; remove API/DB coverage | WS-2 |
| `uiObservation.ts` | Remove phaseLevelRefs generic fallback; add observed=false/evidenceMissing=true to UIScreenObservation | WS-3 |
| `runtime.ts` | evidenceRefs.browserQa from runtime only; remove panelInputs.browserQa.evidenceRefs fallback | WS-3 |
| `uiFidelityBuilder.ts` | actionsWired from ActionCoverageResult only; remove finding-count mixing | WS-4 |
| `prototypingEvidence.ts` | Add: non-UI surface error, API/DB coverage error, actionsWired>actionsDeclared error, actionsWired=0+declared>0 error, packResolver-based threshold checks, per-screen browserQa evidence check; remove config calibration validation | WS-1, WS-4, WS-6 |
| `l2Evidence.ts` | Downgrade keyword/bullet fallback to last-resort; use structuredArtifactReaders.ts; fail on unreadable 04_Sources.md | WS-6 |
| docs/README/SKILL | Remove non-UI prototyping language; remove API/DB coverage from contract; add per-screen BrowserQA mandatory; update actionsWired definition; note calibration SSOT is pack | WS-6 |
| tests | Update for new rejection rules, new evidence structure, new coverage semantics | All WS |

### Implementation Order (rev5 dependency chain)

WS-1 is independent (parallel possible). WS-2 is foundation for WS-3/WS-4. WS-6 (packResolver) is independent.

1. **Step 1** (WS-2 base): `runtimeObservation.ts` — ObservedUiRoute + RuntimeObservation types
2. **Step 2** (WS-2): `runtimeGateBuilder.ts` — remove synthetic status:200; `specCoverage.ts` — use RuntimeObservation
3. **Step 3** (WS-3): `browserQaPerScreen.ts` new module; `uiObservation.ts` — remove fallback; `runtime.ts` — per-screen evidence
4. **Step 4** (WS-4): `actionCoverage.ts` new module; `uiObservation.ts` — ActionCoverageResult; `uiFidelityBuilder.ts`
5. **Step 5** (WS-5): `harness/runtime.ts` — required fields; `execution.ts` — explicit pass
6. **Step 6** (WS-6): `packResolver.ts` new module; `structuredArtifactReaders.ts` new module; `l2Evidence.ts` — structured-first; `prototypingEvidence.ts` — pack-based thresholds
7. **WS-1** (parallel): `mode.ts` + `execution.ts` + `cli/commands/prototyping.ts` + `runtime.ts` + `prototypingEvidence.ts` — all-mode reject
8. **Finalize**: docs/README/SKILL sync; test updates

### Test Strategy (rev5)

| Layer | Location | Coverage Target |
|-------|----------|-----------------|
| Unit | `tests/unit/` | runtimeObservation builder, actionCoverage calculator, packResolver, browserQaPerScreen |
| Integration | `tests/integration/` | end-to-end non-UI rejection all modes; per-screen evidence chain; actionsWired semantics |
| Validator | `tests/validators/` | API/DB coverage error, non-UI surface error, actionsWired validator rules |
| ATDD annotation map | `spec-0012/tdd/test-list.md` | TC-0012-0121..TC-0012-0140 mapped to TDD-IDs |

### Acceptance Test Matrix Mapping

| Category | Coverage Target | TC Range |
|----------|-----------------|----------|
| A: Contract rejection | cli/api/backend surface ALL modes reject | TC-0012-0121..0123 |
| B: full-harness strictness | surface/screenContracts/browserQa adapter missing/refs=0 → fail | TC-0012-0124..0127 |
| C: Runtime observation | synthetic observation absent; canonical routes only | TC-0012-0128..0130 |
| D: Multi-screen BrowserQA | per-screen refs; no phase-level generic fallback | TC-0012-0131..0133 |
| E: Action coverage | finding count ≠ actionsWired; wiring condition only | TC-0012-0134..0137 |
| F: Calibration/validator/L2 | runtime+validator use same pack; config override ignored; structured-only L2 | TC-0012-0138..0140 |


## v1.7.15 rev6 Implementation Strategy

### Scope Boundary

Single-PR: `packages/qfai/**` only. 7 workstreams from discussion-20260415161758193.

### New Files (1 new module)

| File | WS | Purpose |
|------|-----|---------|
| `surfacePolicy.ts` | WS-2 | Surface allowlist SSOT (PROTOTYPING_SUPPORTED_SURFACES, isSupportedPrototypingSurface, assertSupportedPrototypingSurface) |

### Modules Touched (rev6 Change Obligation)

| Module | Change Obligation | WS |
|--------|-------------------|-----|
| `cli/commands/prototyping.ts` | Reject --mode standard/low-cost with "full-harness mode only" error; reject --surface cli/api/backend before any I/O | WS-1 |
| `prototyping/execution.ts` | Reject mode !== "full-harness" independently; call assertSupportedPrototypingSurface() from surfacePolicy.ts | WS-1, WS-2 |
| `prototyping/surfacePolicy.ts` (NEW) | Export PROTOTYPING_SUPPORTED_SURFACES=[web,mobile,desktop,mixed], isSupportedPrototypingSurface, assertSupportedPrototypingSurface | WS-2 |
| `harness/runtime.ts` | Remove scalar threshold params from runFullHarness(); accept calibrationRef.packPath; invoke CalibrationLoader internally; throw on missing/unresolvable | WS-3 |
| `runtimeGateBuilder.ts` | Ensure evidenceRefs contains only concrete refs; remove any self-reference generation | WS-4 |
| `specCoverage.ts` | Ensure evidenceRefs contains only concrete refs; remove synthetic string generation | WS-4 |
| `prototypingEvidence.ts` | Validate mode=full-harness; validate surface in PROTOTYPING_SUPPORTED_SURFACES; reject self-refs/synthetic evidenceRefs; enforce reviewerSignoff/terminationReason consistency; hard-error uiContractId in observation | WS-1, WS-2, WS-4, WS-5, WS-6 |
| `prototyping/uiFidelityBuilder.ts` | Replace obs.screenId === screen.uiContractId with obs.screenId === screen.screenId | WS-6 |
| `packages/qfai/assets/**` | Remove standard/low-cost/cli prototyping/mockPaths.status=pass from SKILL.md, evidence/README.md, review/README.md, contracts/ui/README.md | WS-7 |
| `packages/qfai/README.md` | Remove stale mode/surface references | WS-7 |
| `tests/**` | Update fixtures: remove cli+standard, remove approved-for-plateau, add uiContractId hard-error tests, add mode reject tests, add surface reject tests | WS-7 |

### Implementation Order (rev6 dependency chain)

WS-1 and WS-2 are foundational; WS-3, WS-4, WS-5, WS-6 are independent of each other. WS-7 follows all code changes.

1. **Step 1** (WS-2): `surfacePolicy.ts` new module — define constants and functions
2. **Step 2** (WS-1): `cli/commands/prototyping.ts` + `execution.ts` + `harness/runtime.ts` + `prototypingEvidence.ts` — full-harness-only enforcement; surface rejection using surfacePolicy.ts
3. **Step 3** (WS-3): `harness/runtime.ts` — remove scalar params; add calibrationRef.packPath; CalibrationLoader internal resolution
4. **Step 4** (WS-4): `runtimeGateBuilder.ts` + `specCoverage.ts` + `prototypingEvidence.ts` — concrete evidenceRefs; self-ref and synthetic string rejection
5. **Step 5** (WS-5): `harness/runtime.ts` + `prototypingEvidence.ts` — reviewerSignoff status mapping; reviewerLogs verdict vocabulary
6. **Step 6** (WS-6): `prototyping/uiFidelityBuilder.ts` + `prototypingEvidence.ts` — screenId-based matching; uiContractId hard-error
7. **Step 7** (WS-7): docs/assets/tests — stale semantics removal

### Test Strategy (rev6)

| Layer | Location | Coverage Target |
|-------|----------|-----------------|
| Unit | `tests/unit/` | surfacePolicy: isSupportedPrototypingSurface, assertSupportedPrototypingSurface; CalibrationLoader throw-on-missing; uiFidelityBuilder screenId match |
| Integration | `tests/integration/` | end-to-end full-harness-only enforcement (mode/surface reject all layers); concrete evidenceRefs chain; reviewerSignoff consistency |
| Validator | `tests/validators/` | mode reject rule, surface reject rule, self-ref evidenceRef rule, synthetic evidenceRef rule, reviewerSignoff consistency rule, uiContractId hard-error rule |
| ATDD annotation map | `spec-0012/tdd/test-list.md` | TC-0012-0141..TC-0012-0172 mapped to TDD-IDs |

### Acceptance Test Matrix Mapping

| Category | Coverage Target | TC Range |
|----------|-----------------|----------|
| A: Mode rejection | standard/low-cost reject all layers | TC-0012-0141..0145 |
| B: Surface rejection | cli/api/backend reject all layers | TC-0012-0146..0150 |
| C: surfacePolicy.ts module | PROTOTYPING_SUPPORTED_SURFACES, isSupportedPrototypingSurface, assertSupportedPrototypingSurface | TC-0012-0151..0153 |
| D: Calibration pack SSOT | CalibrationLoader internal; throw on missing; packPath in summary | TC-0012-0154..0159 |
| E: Concrete evidenceRefs | no self-refs; no synthetic strings; at least one concrete ref | TC-0012-0160..0163 |
| F: reviewerSignoff + screenId + stale | status/terminationReason consistency; screenId match; uiContractId error; stale docs/tests | TC-0012-0164..0172 |