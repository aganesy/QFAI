# 01 Spec

- Spec: spec-0012
- Parent: CAP-0012

## Consumer View

- Primary SSOT for execution: `spec-0012/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- NOTE: The CLI command `qfai prototyping` has been REMOVED. This spec covers the SKILL (`/qfai-prototyping`) only.

## Scope

- In:
  - NOTE: v1.7.15 adds runtime truthfulness hardening — panel scoring from real evidence, converged requires iterationCount>=2, reviewer/commitSha mandatory, specCoverage from real diffs, uiFidelity observation-only, CalibrationLoader wired into execution.ts, fail-fast on missing evidence
  - NOTE: v1.7.15 rev4 adds 5 audit resolution items — cli/full-harness 4-layer reject, screen contract-based Browser QA targets ("/primary" removal), Browser QA evidence chain completeness (hard-fail on empty), canonical route semantics for runtimeGate/specCoverage, L2 structured parse priority, stale semantics cleanup
  - NOTE: v1.7.15 rev5 adds 6 audit resolution items (WS-1..WS-6 from discussion-20260415014056471) — all-mode non-UI surface rejection, observed-only ledger (runtimeObservation.ts), per-screen Browser QA mandatory (browserQaPerScreen.ts), action coverage semantics (actionCoverage.ts), runFullHarness() fail-closed (required adapters+screenContracts), calibration pack as SSOT (packResolver.ts, structuredArtifactReaders.ts)
  - NOTE: v1.7.15 rev6 adds 7 workstreams — (WS-1) full-harness-only mode enforcement at CLI/execution/validator, (WS-2) surfacePolicy.ts standalone module with PROTOTYPING_SUPPORTED_SURFACES=[web,mobile,desktop,mixed], (WS-3) runFullHarness() CalibrationLoader internal resolution (scalar params removed), (WS-4) concrete-only evidenceRefs in runtimeGate/specCoverage (self-ref/synthetic banned), (WS-5) reviewerSignoff.status approved/rejected/abandoned mapping + reviewerLogs verdict vocabulary, (WS-6) uiFidelityBuilder screenId-based matching (uiContractId hard-error), (WS-7) stale mode/surface semantics removed from shipped docs/assets/tests
  - NOTE: v1.7.15 rev7 adds 7 workstreams (WS-1 through WS-7) — (WS-1) CalibrationPack upstream resolution: execution.ts resolves before runFullHarness(), runtime.ts has 0 CalibrationLoader imports; (WS-2) uiFidelity fail-closed guard: execution fails before runFullHarness() on status≠completed/missingRequired>0/screen missing; (WS-3) concrete-only evidenceRefs: isConcreteArtifactRef() helper, directory/self-ref/synthetic/extension-less forbidden; (WS-4) validator calibration metadata comparison: packPath/packVersion/configPath compared against actual pack, mismatch=error; (WS-5) error taxonomy: 6 distinct classes in prototyping/errors.ts, narrow catch blocks; (WS-6) config packPath-only: scalar calibration fields removed from schema/template/README, obsolete field causes error; (WS-7) surfacePolicy.ts rejection message from PROTOTYPING_SUPPORTED_SURFACES constant
  - NOTE: v1.7.15 rev8 adds 4 workstreams (WS-1 through WS-4) — (WS-1) new leaf module `pathUtils.ts`: `toRepoRelativeArtifactRef()`, `assertConcreteArtifactRef()`, `isConcreteArtifactRef()` as shared helpers (throws for outside-root, directory path, both line+anchor); (WS-2) `runtimeGate.evidenceRefs` validator contract: `PrototypingEvidence["runtimeGate"]` type gets `evidenceRefs: string[]` required field, absence/empty-array/malformed = validator error; (WS-3) unified ref grammar: all 5 traceability ref sites (runtimeGate.evidenceRefs, iterations[].evidenceRefs.runtimeGate, iterations[].evidenceRefs.specCoverage, specCoverage.evidenceRefs, specs[].coverageRefs[].declaredRef) use same helpers from pathUtils.ts, no parallel grammar implementations; (WS-4) new closure regression test `prototypingExecution.productionPath.test.ts` with ≥1 positive closure test + ≥1 negative injection test
  - NOTE: v1.7.15 rev9 adds 4 workstreams (WS-1 through WS-4) — leaf-field traceability closure: (WS-1) `prototypingEvidence.ts` leaf-field validation: `runtimeGate.ui[].declaredRef` required+concrete, `renderEvidenceRefs[]` non-empty+concrete, `browserQaEvidenceRefs[]` non-empty+concrete, `axes[].evidenceRefs[]` per-axis non-empty+concrete, `reviewerLogs[].evidenceRefs[]` non-empty+concrete — all via `isConcreteArtifactRef()` from `pathUtils.ts`; (WS-2) `bundleWriter.ts` strict schema: `declaredRef` required, all leaf arrays required non-nullable, conditional `runtimeObservation.ts`/`runtimeGateBuilder.ts` null-emission prevention; (WS-3) `tests/core/` fixture replacement: all synthetic token `evidenceRefs` → concrete artifact refs, +15 new negative cases (7 ui[] + 5 axis + 3 reviewer); (WS-4) `README.md` leaf-field enumeration: all fields under concrete-ref contract explicitly listed
  - NOTE: v1.7.15 rev10 adds 4 workstreams (WS-1 through WS-4) — semantic closure hardening: (WS-1) fullHarness terminal state machine: in-progress bundle (terminationReason absent, finalDecision=pending, reviewerSignoff.status=pending) vs completed bundle (terminationReason ∈ {abandoned,max-iterations,plateau}, finalDecision=abandoned, reviewerSignoff.status=abandoned) — all constraints enforced fail-closed by validator; (WS-2) buildScreenContractInputs() uses readCanonicalScreenContracts() sourceRef directly, slug-based anchor generation deleted; (WS-3) all 8 evidenceRefs categories (render/browserQa/uiObservation/discussion/screenContract/trend/runtimeGate/specCoverage) enforced non-empty+concrete via assertConcreteArtifactRefs() in pathUtils.ts; (WS-4) specs[].coverageRefs[].declaredRef must match /^\.qfai\/specs\/.+#(L\d+|\S+)$/ — bare paths, discussion refs, screen contract refs all invalid
  - `/qfai-prototyping` skill workflow (SKILL only, no CLI command) — skill-centered truth: the skill is the sole interface for prototyping
  - All-spec stage: scope is ALL specs from `.qfai/specs/spec-*`
  - Spec Auto-Discovery Protocol (4-source unified diff detection: branch diff, local changes, evidence mtime, delta.md parse)
  - Prototyping modes: low-cost (static only), standard (static + optional light validation, default), full-harness (runtime-heavy, opt-in)
  - Mode selection protocol: user-specified > discussion recommendation > system default (standard)
  - Definition of Done by fidelity level: L1 (skeleton), L2 (interactive, default)
  - Coverage Matrix for all specs (uiRoutes, apiEndpoints, dbObjects)
  - Runtime Interaction Gate v2 (UI route checks, API endpoint checks, DB object checks, mock path checks)
  - Full-harness workflow loop (Planner -> Generator -> Evaluator -> Decision Gate)
  - Non-UI project handling (surface: non-ui skips UI-specific obligations)
  - Visual Review Guard (DDP -> Design Token -> UI Contract -> HTML Mock -> Flow)
  - Evidence production: markdown + JSON artifacts under `.qfai/evidence/`
  - `prototyping.json` with `uiFidelity` for L2 reporting
  - Browser QA 4-phase model（smoke → interaction → visual → accessibility）: `browserQa/runner.ts` が順次実行し `BrowserQaRunResult` を集約
  - Evidence bundling system（`evidence/bundleWriter.ts`, `evidence/fsEvidenceWriter.ts`）: render + Browser QA 結果を `.qfai/evidence/` に JSON バンドルとして永続化
  - Render evidence capture（`evidence/renderRunner.ts`, `evidence/playwrightRenderAdapter.ts`）: Playwright アダプタ経由で PNG + HTML キャプチャ
  - Provider registry pattern（`providers/registry.ts`, `providers/types.ts`）: config → concrete provider の依存逆転
  - Full-harness runtime（`harness/runtime.ts`, `harness/adapters.ts`, `harness/resultWriter.ts`）: Planner→Generator→Evaluator ループの本番パス実装
  - UI fidelity builder（`prototyping/uiFidelityBuilder.ts`）: render evidence + Browser QA から UI fidelity artifact を合成し QFAI-PROT-270/271/272 で欠落を検出
  - Prototyping execution orchestrator（`prototyping/execution.ts`）: mode resolution → evidence → Browser QA → full-harness の本番パスエントリポイント
  - Full-harness iteration protocol: 4-step cycle（Evaluate→Identify→Fix→Re-evaluate）, MIN_ITERATIONS=5, termination conditions（converged/max-iterations/plateau/manual-stop）
  - Independent evaluator panel: product-surface-reviewer (L1: design quality), product-experience-architect (L2: product experience), qa-gatekeeper (L3: process audit)
  - Score scope separation: discussion 3-layer scores（design direction quality）≠ prototyping scoringTrace（implementation fidelity）
  - Evaluation rigor rules: 3-tier rubric（existence_gate/quality_criteria/excellence_criteria）, L1/L2/L1-manual finding classification
  - Asset acquisition strategy: free asset MUST, emoji prohibition, placeholder prohibition, accessibility checklist（WCAG 2.1 AA）
  - Reviewer gate strengthening: 6 full-harness-specific checks, Limitations section obligation
  - Full-harness validator rules: QFAI-PROT-290~294（iteration integrity validators）
  - Full-harness review profile（`review-profiles.yml`）: always_required=[completion-reviewer, product-surface-reviewer, qa-gatekeeper]
  - Agent routing evidence phase: product-experience-architect added to prototyping conditional_agents
  - Prototyping mode module (`prototyping/mode.ts`): mode resolution engine with existence-based precedence
  - Recommendation artifact resolver (`prototyping/recommendationArtifact.ts`): single source of truth for recommendation status
  - Recommendation schema (`prototyping/recommendationSchema.ts`): key existence checks for precedence decisions
  - Prototyping types (`prototyping/types.ts`): canonical type set (PrototypingMode, PrototypingSurface, PrototypingObligations, etc.)
  - prototyping.calibration config block (`qfai.config.yaml` の prototyping stanza)
  - Report prototyping observability integration (mode, obligations, evidence, harness, render, browserQa, calibration)
  - `runtimeObservation.ts` — ObservedUiRoute / RuntimeObservation types (observed-only ledger)
  - `browserQaPerScreen.ts` — per-screen Browser QA input generator
  - `actionCoverage.ts` — actionsDeclared/actionsObserved/actionsWired/missingActions calculator
  - `packResolver.ts` — calibration pack resolution SSOT (shared by runtime + validator)
  - `structuredArtifactReaders.ts` — structured section parser for discussion/screen artifacts
  - Ref grammar helper module (`packages/qfai/src/core/prototyping/pathUtils.ts`): `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, `isConcreteArtifactRef`
- Out:
  - CLI command `qfai prototyping` (REMOVED — no active document may reference it as a valid interface)
  - Acceptance test automation (belongs to `/qfai-atdd`)
  - Unit/component tests (belongs to `/qfai-implement`)
  - Contract redesign during prototyping

## Applicable NFR

- NFR-0001: All-spec coverage -- every spec from `.qfai/specs/spec-*` must be covered in Coverage Matrix
- NFR-0002: Static-first default -- standard mode requires no browser or server process
- NFR-0003: API runtime gate -- zero 404 results in API endpoint checks
- NFR-0004: No placeholder pages -- placeholder-only pages are marked REVISE, not accepted
- NFR-0005: L2 fidelity default -- declared primary interactions wired with mockable behavior
- NFR-0006 (rev4): surface/mode バリデーション 10ms 以内
- NFR-0007 (rev4): `40_screen_contracts.md` パース 100 画面で 500ms 以内
- NFR-0008 (rev4): canonical path 比較 1000 ルートで 200ms 以内
- NFR-0009 (rev4): surface/mode 拒否ガード 3 層一貫動作
- NFR-0010 (rev4): Browser QA 空エビデンス時のフェイル率 100%
- NFR-0011 (rev4): canonical path 正規化 trailing slash 一貫性
- NFR-0012 (rev4): canonical route 導出ロジック WS-2/WS-4 共有（重複実装なし）
- NFR-0013 (rev4): 型安全性維持（新規 any / @ts-ignore 追加 0 件）
- NFR-0014 (rev4): 拒否エラーメッセージに原因+対処方法含む
- NFR-0015 (rev4): 公開 API 破壊的変更なし
- NFR-0016 (rev5): runFullHarness fail-closed — 必須入力不足時は常にthrowし、silent successは0件
- NFR-0017 (rev5): single-PR CI green — pnpm format:check && pnpm lint && pnpm check-types && vitest run 全pass
- NFR-0018 (rev5): error messages actionable — 欠落フィールド・無効surface・証拠不足screenを特定できる内容
- NFR-0019 (rev5): acceptance test matrix A~F 全件PASS
- NFR-0020 (rev5): no silent failures — 6 WS いずれもsilentなfailure/silent-continueは0件
- NFR-0021 (rev5): SSOT consistency — runtime+validatorが同一calibration packから同一threshold
- NFR-0022 (rev5): per-screen evidence completeness — N screen contract → N個の固有browserQaEvidenceRefs
- NFR-0023 (rev5, Should): no deprecated contract remnants — runtimeGate.api/db / synthetic-200 / actionsWired=findingCount / config-calibrationが全ソースから消えること
- NFR-0024 (rev6): deterministic rejection — mode/surface rejections fail-closed; 0 silent pass-through for invalid input
- NFR-0025 (rev6): calibration pack fail-fast — runFullHarness() throws before iteration on missing/unresolvable packPath
- NFR-0026 (rev6): evidenceRefs resolvability — 0 self-refs or synthetic strings in runtimeGate.evidenceRefs / specCoverage.evidenceRefs
- NFR-0027 (rev6): TypeScript strict compliance — 0 @ts-ignore, bare as casts, any types in new/modified files; pnpm check-types exits 0
- NFR-0028 (rev6): test suite pass rate — all 5 vitest suites pass (pnpm test exits 0) after rev6 changes
- NFR-0029 (rev6): reviewerSignoff auditability — terminationReason/status inconsistency count = 0
- NFR-0030 (rev7): execution failure distinguishability — 6 distinct error classes; 0 catch blocks misclassify phase errors
- NFR-0031 (rev7): pack resolution failure latency — CalibrationLoader failure propagates within 100ms
- NFR-0032 (rev7): validator calibration check overhead < 50ms
- NFR-0033 (rev7): TypeScript strict compliance — 0 @ts-ignore, bare as casts; pnpm check-types exits 0
- NFR-0034 (rev7): all vitest suites pass — pnpm test exits 0 after rev7 changes
- NFR-0035 (rev7): shipped config template has 0 scalar calibration fields
- NFR-0036 (rev7): surfacePolicy rejection message auto-updates when PROTOTYPING_SUPPORTED_SURFACES changes
- NFR-0037 (rev8): 100% line coverage for pathUtils.ts helpers — zero uncovered branches in `toRepoRelativeArtifactRef`, `assertConcreteArtifactRef`, `isConcreteArtifactRef`; verified by `pnpm vitest run --project core --coverage`
- NFR-0038 (rev8): validator rejects ALL malformed ref forms with zero false-negatives — 0 false-negatives in `isConcreteArtifactRef` check; all 5 malformed forms (absolute path, self-ref, synthetic token, directory, empty string) rejected
- NFR-0039 (rev8): no duplicate ref grammar implementation — 0 parallel implementations of concrete-ref grammar check outside `pathUtils.ts` in `packages/qfai/src`
- NFR-0040 (rev8): execution→validate closure test in production path test file — 1 positive closure test + ≥1 negative injection test in `prototypingExecution.productionPath.test.ts`; `pnpm vitest run --project core` passes
- NFR-0041 (rev9): zero false-negatives for leaf-field malformed ref forms — validatePrototypingEvidence() rejects 100% of malformed inputs across all 15 new negative test cases (7 ui[] + 5 axis + 3 reviewer); `pnpm vitest run --project validators --project core` passes
- NFR-0042 (rev9): no parallel concrete-ref grammar implementation — 0 independent regex or pattern definitions outside pathUtils.ts in packages/qfai/src after WS-1
- NFR-0043 (rev9): no optional/nullable mismatch between bundle schema and validator — 0 fields required by validator but marked optional/nullable in bundleWriter.ts schema; pnpm check-types exits 0
- NFR-0044 (rev9): production closure test asserts leaf concreteness — prototypingExecution.productionPath.test.ts has ≥1 positive closure + ≥1 negative injection asserting leaf refs
- NFR-0045 (rev9): zero synthetic token fixtures in tests/core/ — 0 occurrences of "a", "b", "reviewer:1" or similar as evidenceRefs values after WS-3

## Applicable Policy

- Policy: Drift Protocol mandatory
- Contracts are strict inputs; do not create new files under `.qfai/contracts/**`
- Full-harness mode must be explicitly opted in (never auto-activated)

## Evidence Summary

- Evidence: SKILL.md at `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`
- Consolidates: old spec-0006 (prototyping CLI), spec-0024 (render evidence), spec-0028-0033 (runtime/harness), spec-0035 (canonical), spec-0036 (foundation)
- NOTE: CLI command `qfai prototyping` has been removed from codebase

## Relevant Requirements

- REQ-0001: All-spec prototyping -- scope fixed to ALL specs from `.qfai/specs/spec-*`
- REQ-0002: Spec Auto-Discovery -- 4-source unified diff detection (branch, local, evidence mtime, delta.md)
- REQ-0003: Mode definitions -- low-cost (static), standard (default), full-harness (opt-in)
- REQ-0004: Mode selection protocol -- user > discussion recommendation > system default
- REQ-0005: L1/L2 fidelity DoD -- skeleton (L1) vs interactive (L2 default)
- REQ-0006: Coverage Matrix -- uiRoutes, apiEndpoints, dbObjects per spec
- REQ-0007: Runtime Gate v2 -- UI/API/DB/mock path checks
- REQ-0008: Full-harness loop -- Planner -> Generator -> Evaluator -> Decision Gate
- REQ-0009: Non-UI handling -- non-ui surface skips UI obligations
- REQ-0010: Evidence artifacts -- markdown + JSON with uiFidelity for L2
- REQ-0011: Visual Review Guard -- DDP-first reading for UI-affecting slices
- REQ-0012: Resolve prototyping truth -- spec, policies, docs, code must agree skill is the only interface (v1.7.12, from D-003)
- REQ-0013: Archive/label superseded spec content that references CLI command (v1.7.12)
- REQ-0014: Eliminate responsibility leakage between skill and CLI (v1.7.12)
- REQ-0015: Normalize static-first/mode-aware prototyping contract (v1.7.12)
- REQ-0016: Prototyping Mode Module — `prototyping/mode.ts` に mode resolution engine を実装。parseDiscussionModeRecommendationWithWarnings(), resolvePrototypingMode(), derivePrototypingObligations(), inferSurfaceFromRecommendationAndEvidence() を提供
- REQ-0017: Existence-Based Precedence (D-5) — prototyping.yaml 内の `prototyping` key の存在自体で namespaced contract を権威的とする。値の妥当性ではなく key の有無で判定し、legacy fallback を防止
- REQ-0018: Recommendation Artifact Resolver — `resolveLatestRecommendationArtifact()` が recommendation artifact の status（valid/invalid/missing/no-pack）を一元管理。report.ts と prototypingEvidence.ts が共有
- REQ-0019: Recommendation Schema Validation — `validatePrototypingRecommendation()` が prototyping.yaml の schema を検証（必須フィールド、mode 妥当性、allowed_modes 整合性）し、SDD preflight blocker として機能
- REQ-0020: Prototyping Calibration Config — `qfai.config.yaml` に prototyping.calibration stanza を追加。accept: 0.8, refine: 0.5, maxIterations: 15 のデフォルト値。プロジェクト固有のチューニング可能
- REQ-0021: Report Prototyping Integration — report.ts に ReportPrototypingSummary 型で prototyping data を収集。recommendationArtifact, mode, evidence, fullHarness, render, browserQa, calibration を含む。v1.7.13 では foundation-only
- REQ-0022: Browser QA 4-Phase Model — `browserQa/runner.ts` が smoke→interaction→visual→accessibility の 4 フェーズを順次実行。各フェーズは独立した `BrowserQaPhaseResult` を返し、runner が `BrowserQaRunResult` に集約。Playwright provider 経由で実行
- REQ-0023: Evidence Bundle Persistence — `evidence/bundleWriter.ts` が render capture + Browser QA 結果 + prototyping summary を `.qfai/evidence/` に JSON バンドルとして永続化。full-harness correlation ID を含む
- REQ-0024: Render Evidence Capture — `evidence/renderRunner.ts` が `RenderCaptureAdapter`（Playwright 実装: `playwrightRenderAdapter.ts`）経由で各 route の PNG + HTML をキャプチャ。キャプチャ結果は `RenderRunnerResult` 型で返却
- REQ-0025: Provider Registry — `providers/registry.ts` が `QfaiPrototypingConfig` から concrete provider（Playwright/custom）を解決。依存逆転パターンで harness・runner が provider 実装に依存しない
- REQ-0026: UI Fidelity Builder — `prototyping/uiFidelityBuilder.ts` が render evidence + Browser QA 結果から UI fidelity artifact を合成。required evidence 欠落時は QFAI-PROT-270（render missing）, QFAI-PROT-271（browserQa missing）, QFAI-PROT-272（both missing）を emit
- REQ-0027: Prototyping Execution Orchestrator — `prototyping/execution.ts` が mode resolution → evidence capture → Browser QA → full-harness の本番パスを統合実行。mode=low-cost/standard/full-harness の各パスを mode.ts の obligation matrix に基づいて制御
- REQ-0028: Canonical Prototyping Surfaces (v1.7.14, DR-0109) — PrototypingSurface を web/mobile/desktop/cli/mixed の 5 値に正規化。旧 web-ui/mobile-ui/desktop-ui の -ui suffix を廃止。"non-ui" は prototyping surface 外の分類として明示的に分離
- REQ-0029: Execution Hard Gates (v1.7.14, DR-0111) — execution.ts が readValidatedClassification() を使用し、invalid/矛盾した classification を即座に reject。non-UI classification は「prototyping execution の対象外」として明示的に拒否。invalid recommendation artifact も hard error
- REQ-0030: Namespaced-Only Schema (v1.7.14, DR-0112) — prototyping.yaml の legacy top-level recommendation keys の存在を hard error とする。namespaced `prototyping:` ブロックのみを受け付け、legacy keys との共存を禁止
- REQ-0031: Semantic Invariant SSOT (v1.7.14, DR-0113) — validateRecommendationSemantics() を recommendationSemantics.ts に集約し、recommended_mode ∈ allowed_modes の不変条件を parser/resolver/execution/CLI/validator/preflight の全レイヤーで共有
- REQ-0032: Classification Separation (v1.7.14, DR-0110) — "discussion UI-bearing"（web/mobile/desktop/cli/mixed）と "visual/browser evidence required"（web/mobile/desktop/mixed、cli 除外）を独立した判定関数に分離。derivePrototypingObligations() は後者のみで evidence 義務を判定
- REQ-0033: Surface Inference Nullable (v1.7.14) — inferSurfaceFromRecommendationAndEvidence() が surface 推定不能時に null を返す（旧: "non-ui" デフォルト）。明示的な surface 指定を促進し、silent default を排除
- REQ-0034: Full-Harness Iteration Protocol (v1.7.14) — full-harness mode を単一パス evidence 生成から反復改善ループに拡張。4-step cycle（Evaluate→Identify→Fix→Re-evaluate）を定義。MIN_ITERATIONS=5, 終了条件テーブル（converged/max-iterations/plateau/manual-stop）。calibration config 参照で閾値を外部化
- REQ-0035: Independent Evaluator Panel (v1.7.14) — full-harness の自己評価バイアスを防止するため、3 層独立評価パネルを導入。L1: product-surface-reviewer（UI/UX 品質）、L2: product-experience-architect（プロダクト体験）、L3: qa-gatekeeper（プロセス監査）。L1/L2 は `task` tool の `background` mode で個別コンテキスト起動必須。イテレーションの weightedTotal は L1/L2 の最小値
- REQ-0036: Score Scope Separation (v1.7.14) — discussion 3-layer scores（design direction quality）と prototyping scoringTrace（implementation fidelity）を明確に分離。discussion aggregate scores の scoringTrace へのコピーを禁止。SKILL.md と aggregate テンプレートに score scope limitation を明記
- REQ-0037: Evaluation Rigor Rules (v1.7.14) — 3-tier rubric（existence_gate 0-0.3, quality_criteria 0.3-0.7, excellence_criteria 0.7-1.0）を全評価軸に義務化。L1/L2/L1-manual の finding 分類体系。Lighthouse automated gate（SHOULD: scores <70 = L1 finding）
- REQ-0038: Asset Acquisition Strategy (v1.7.14) — full-harness mode で professional-quality visual assets を必須化。free asset sources MUST, emoji prohibition（U+1F000–U+1FAFF, U+2600–U+27BF）, placeholder prohibition,
  accessibility checklist（WCAG 2.1 AA）, trust signal checklist（SHOULD）, dev server management protocol
- REQ-0039: Reviewer Gate Strengthening (v1.7.14) — full-harness 専用の 6 項目検証（iterationCount>1, scoringTrace count 一致, score progression, terminationReason 整合, 独立評価者実行確認, limitations セクション存在）。Limitations section の full-harness MUST 義務化
- REQ-0040: Full-Harness Validator Rules QFAI-PROT-290~294 (v1.7.14) — 5 つの新規 validator rule を prototypingEvidence.ts に追加。PROT-290（iterationCount=1+converged warning）、PROT-291（scoringTrace count mismatch warning）、
  PROT-292（terminationReason cross-check warning）、PROT-293（maxIterations 超過 warning）、PROT-294（non-increasing scoringTrace info）
- REQ-0041: Panel scoring L1 実 evidence 算出 (v1.7.15; discussion REQ-0001) — scoreL1(inputs) は runtime gate / render coverage / browser QA blocking findings / screen contract coverage / spec coverage を必須入力とし、実 evidence から L1 total を算出する。l1: { total: 0, axes: [] } の固定値生成を禁止
- REQ-0042: Panel scoring L2 実 evidence 算出 (v1.7.15; discussion REQ-0002) — scoreL2(inputs) は discussion 3-layer axes / screen contract fidelity / trend translation consistency / visual findings / browser QA experience findings を必須入力とし、実 evidence から L2 total を算出する
- REQ-0043: weightedTotal = min(l1.total, l2.total) (v1.7.15; discussion REQ-0003) — computeWeightedTotal(l1, l2) は常に Math.min(l1.total, l2.total) を返す。pre-scored 値の流用を禁止
- REQ-0044: converged 判定: iterationCount >= 2 必須 (v1.7.15; discussion REQ-0004) — converged は iterationCount >= 2 かつ weightedTotal >= acceptThreshold かつ plateau 条件を満たす場合のみ成立。1 iteration 目 accept でも converged にしない
- REQ-0045: plateau 判定 (v1.7.15; discussion REQ-0005) — plateau は iterationCount >= 2 かつ plateau 条件成立だが accept threshold 未達の場合に設定
- REQ-0046: max-iterations 判定 (v1.7.15; discussion REQ-0006) — terminationReason = max-iterations は iterationCount === calibration.maxIterations の場合のみ設定
- REQ-0047: reviewerLogs[] append-only 累積 (v1.7.15; discussion REQ-0007) — reviewerLogs[] は iteration ごとに append-only で累積。既存ログの上書き・単一要素置換を禁止
- REQ-0048: reviewer CLI 引数必須・placeholder 拒否 (v1.7.15; discussion REQ-0008) — reviewerId は CLI 引数で必須。placeholder 値 (qfai, default, auto, system, unknown, 空文字) を reject。resolvedReviewer ?? "qfai" フォールバックを禁止
- REQ-0049: commitSha full-harness 必須 (v1.7.15; discussion REQ-0009) — full-harness 実行時に commit SHA 取得失敗を許可しない。取得不能時は runtime error で失敗
- REQ-0050: specCoverage 実測導出 (v1.7.15; discussion REQ-0010) — specCoverage は loadDeclaredSpecArtifacts() と collectObservedRuntimeArtifacts() の実差分から buildSpecCoverageSummary() で生成。zero-seeded 固定出力を禁止
- REQ-0051: uiFidelity observation-only 化 (v1.7.15; discussion REQ-0011) — uiFidelity は DOM parse (jsdom) / browser QA / render evidence からのみ構成。mockPaths.status = "pass" の自動生成を禁止。evidence 不足時は status = "insufficient-evidence"
- REQ-0052: extractHtmlLabelsFromString 空実装廃止 (v1.7.15; discussion REQ-0012) — extractHtmlLabelsFromString() の空実装を削除し、uiObservation.ts の extractDomLabelsWithJsdom() へ責務移管
- REQ-0053: CalibrationLoader execution path 本接続 (v1.7.15; discussion REQ-0013) — CalibrationLoader を execution.ts で loadConfig() 後に呼び出し、full-harness の実行パスに接続。pack 不在・読取不可・schema 不整合時は失敗
- REQ-0054: packVersion pack metadata 解決 (v1.7.15; discussion REQ-0014) — packVersion は CalibrationLoader 経由で pack metadata から動的に取得。packVersion: "1.0.0" のハードコードを禁止
- REQ-0055: Docs / SKILL / README reality sync (v1.7.15; discussion REQ-0025) — docs の主張が runtime 実体を超えないこと。full-harness 入力要件、reviewer 必須、convergence rule、specCoverage 実測要件、uiFidelity observation-only rule、calibration 必須性を runtime と一致させる
- REQ-0056: missing evidence fail-fast (v1.7.15; discussion REQ-0026) — full-harness で calibration pack / reviewer / commit SHA / render evidence / browser QA evidence / ui observation input / spec coverage input が欠けた場合、補完せず runtime error で失敗
- REQ-0057: runFullHarness 契約から pre-scored l1/l2 削除 (v1.7.15 rev2; discussion REQ-0027) — request 型から l1/l2 を削除。panelInputs 欠如時は即 throw
- REQ-0058: scoring runtime 内一元実行 (v1.7.15 rev2; discussion REQ-0028) — validatePanelInputs → scorePanelsFromInputs → determineDecision を必ず直列実行。外部 pre-scored 値の採用経路を削除
- REQ-0059: FullHarnessIteration evidence-driven 再定義 (v1.7.15 rev2; discussion REQ-0029) — l1/l2/weightedTotal/commitSha/reviewerId/limitations/evidenceRefs を必須化
- REQ-0060: MeasurementResult strict 再定義 (v1.7.15 rev2; discussion REQ-0030) — panelInputs と 8 カテゴリ evidenceRefs を同時に返す。空カテゴリ許容 NG
- REQ-0061: evidenceRefs 8 カテゴリ必須化 (v1.7.15 rev2; discussion REQ-0031) — runtimeGate/render/browserQa/uiObservation/specCoverage/discussion/screenContract/trend の 8 カテゴリを必ず非空で保持
- REQ-0062: validatePanelInputs 欠落チェック強化 (v1.7.15 rev2; discussion REQ-0032) — 10 種類の silent pass を error に昇格
- REQ-0063: l2Evidence.ts 新設 (v1.7.15 rev2; discussion REQ-0033) — buildDiscussionAxisInputs(root) で実 discussion artifact から軸数を抽出。artifact 内評価値の再利用禁止
- REQ-0064: buildScreenContractInputs (v1.7.15 rev2; discussion REQ-0034) — totalContracts/coveredContracts/fidelityScore を算出。fidelityScore の 0 初期化禁止
- REQ-0065: buildTrendAlignmentInputs (v1.7.15 rev2; discussion REQ-0035) — trendSourcesChecked===0 で必ず失敗
- REQ-0066: execution.ts L2 dummy object 全廃 (v1.7.15 rev2; discussion REQ-0036) — 0 埋め literal を削除し l2Evidence builder 呼び出しに差し替え
- REQ-0067: panelScore 二重防御 (v1.7.15 rev2; discussion REQ-0037) — aggregateScore 0〜1 必須、trendSourcesChecked===0 reject、fidelityScore===0 with contracts reject
- REQ-0068: CalibrationLoader fail-open 全廃 (v1.7.15 rev2; discussion REQ-0038) — pack 不在/YAML 不正/version 欠落/thresholds 欠落/maxIterations 欠落で throw。DEFAULT_PACK fallback 削除
- REQ-0069: calibrationConfig fallback 弱体化 (v1.7.15 rev2; discussion REQ-0039) — config 側は packPath 解決用のみ。thresholds/maxIterations/plateauDelta/plateauLookback を config から補う処理を削除
- REQ-0070: TerminationContext を CalibrationPack で受ける (v1.7.15 rev2; discussion REQ-0040) — history.ts が CalibrationPack のみ受け入れる
- REQ-0071: count<plateauLookback で terminal にしない (v1.7.15 rev2; discussion REQ-0041) — status="in-progress", terminationReason: undefined を返す
- REQ-0072: validator termination 条件同期 (v1.7.15 rev2; discussion REQ-0042) — plateau/converged + iterationCount<plateauLookback を error
- REQ-0073: specCoverage 全 spec 必須化 (v1.7.15 rev2; discussion REQ-0043) — specNames にある spec が perSpecMap に無い場合は error
- REQ-0074: specCoverage.ts silent 空返却禁止 (v1.7.15 rev2; discussion REQ-0044) — 宣言抽出結果完全空/evidenceRefs 作れない/DB 未実装通過を error 化
- REQ-0075: DB coverage 二択ポリシー (v1.7.15 rev2; discussion REQ-0045) — 実 DB 観測 or full-harness failure。missing 続行禁止
- REQ-0076: UiObservationSummary screen-level 再構築 (v1.7.15 rev2; discussion REQ-0046) — ScreenObservation 型導入。flatten 廃止
- REQ-0077: actionsWired browser QA 由来 (v1.7.15 rev2; discussion REQ-0047) — 0 固定廃止。観測不能は unknown
- REQ-0078: mockPath findings semantics 同期 (v1.7.15 rev2; discussion REQ-0048) — pass は明示的成功導線観測のみ
- REQ-0079: uiFidelityBuilder screen-level 化 (v1.7.15 rev2; discussion REQ-0049) — screen 共通 DOM labels 流用廃止
- REQ-0080: uiFidelity insufficient-evidence 厳格化 (v1.7.15 rev2; discussion REQ-0050) — html capture 無し/render evidence 無し/browser QA 無し/action 観測不可で insufficient-evidence or error
- REQ-0081: uiFidelity auto-pass 完全廃止 (v1.7.15 rev2; discussion REQ-0051) — mockPaths status=pass 自動生成禁止
- REQ-0082: reviewerLog 8 カテゴリ evidenceRefs 保存 (v1.7.15 rev2; discussion REQ-0052) — render/browserQa のみでは不可
- REQ-0083: history 整合性 strict (v1.7.15 rev2; discussion REQ-0053) — iterations.length===iterationCount===scoringTrace.length===reviewerLogs.length。ズレで throw
- REQ-0084: bundleWriter schema v2 追随 (v1.7.15 rev2; discussion REQ-0054) — 8 カテゴリ evidenceRefs + FullHarnessIteration 新型。v1 非並存
- REQ-0085: docs/SKILL/README reality sync rev2 (v1.7.15 rev2; discussion REQ-0056) — 独立 evaluator 自動複数起動/Evaluate→Fix loop 内包/evidence 自動補完の主張を削除
- REQ-0086: tests fixture rev2 改定 (v1.7.15 rev2; discussion REQ-0057) — 正常系から旧前提を削除し異常系に新 fixture 追加
- REQ-0087: cli/full-harness 4-layer reject (v1.7.15 rev4; WS-1) — derivePrototypingObligations / runFullHarness / CLI / validator の 4 層で cli + full-harness を拒否。UI-bearing surface は web/mobile/desktop/mixed
- REQ-0088: screen contract-based Browser QA targets (v1.7.15 rev4; WS-2) — "/primary" 除去。screenContracts.ts パーサー新設。各スクリーン個別のフィデリティ測定ターゲットとエビデンス生成
- REQ-0089: Browser QA evidence chain completeness (v1.7.15 rev4; WS-3) — iterations[].evidenceRefs.browserQa にフェーズ参照・ファインディング参照を格納。空の場合ハードフェイル
- REQ-0090: canonical route semantics (v1.7.15 rev4; WS-4) — specCoverage / runtimeGateBuilder で canonical path 比較。URL をルートとして扱わない。missing_observation レポート
- REQ-0091: L2 structured parse priority (v1.7.15 rev4; WS-5) — 正規アーティファクト（20-23 系、04_Sources.md、40_screen_contracts.md）必須。構造化パース優先。ヒューリスティック縮小
- REQ-0092: stale semantics cleanup (v1.7.15 rev4; WS-6) — prototypingEvidence.ts 陳腐化 remediation 除去。skip→reject 変換。URL-as-route→canonical route。"/primary" 除去。README/SKILL/evidence README 更新
- REQ-0093 (v1.7.15 rev6; WS-1): Reject non-full-harness prototyping modes — CLI, execution.ts, and prototypingEvidence.ts must reject `standard` and `low-cost` mode with error stating only `full-harness` is supported
- REQ-0094 (v1.7.15 rev6; WS-1): Reject non-UI prototyping surfaces — CLI, execution.ts, and prototypingEvidence.ts must reject `cli`, `api`, `backend`, and any surface not in PROTOTYPING_SUPPORTED_SURFACES; error must name the rejected surface
- REQ-0095 (v1.7.15 rev6; WS-2): surfacePolicy.ts standalone module — `packages/qfai/src/core/prototyping/surfacePolicy.ts` exports `PROTOTYPING_SUPPORTED_SURFACES`, `isSupportedPrototypingSurface(surface)`, `assertSupportedPrototypingSurface(surface)` as SSOT
- REQ-0096 (v1.7.15 rev6; WS-3): runFullHarness calibration pack SSOT — `runFullHarness()` accepts `calibrationRef.packPath`; resolves pack internally via `CalibrationLoader`; missing/unresolvable packPath throws immediately
- REQ-0097 (v1.7.15 rev6; WS-4): runtimeGate concrete evidenceRefs — `runtimeGate.evidenceRefs` contains only concrete artifact refs; self-references and synthetic strings forbidden
- REQ-0098 (v1.7.15 rev6; WS-4): specCoverage concrete evidenceRefs — `specCoverage.evidenceRefs` contains only concrete spec refs and observation artifact refs; synthetic string refs forbidden
- REQ-0099 (v1.7.15 rev6; WS-5): reviewerSignoff and reviewerLogs semantics — `reviewerSignoff.status` in {approved,rejected,abandoned}; `reviewerLogs[].verdict` in {approve,revise,reject,abandon}; isCompleted alone must not produce `approved`
- REQ-0100 (v1.7.15 rev6; WS-6): uiFidelityBuilder screenId matching — matching uses `obs.screenId === screen.screenId`; old `screen.uiContractId` matching removed; uiContractId in observation = hard-error
- REQ-0101 (v1.7.15 rev6; WS-7): Remove stale mode/surface semantics from shipped docs and assets — SKILL.md, evidence/README.md, review/README.md, contracts/ui/README.md, packages/qfai/README.md must not contain `standard`, `low-cost`, `cli prototyping`, or `mockPaths.status=pass`
- REQ-0102 (v1.7.15 rev6; WS-7): Remove stale test fixtures — no fixture allows `cli + standard` prototyping, assumes optional evidence for `standard`, allows `mockPaths.status=pass`, or asserts `approved` for plateau/maxIterations termination
- REQ-0041 (rev7): execution.ts resolves CalibrationPack before runFullHarness
- REQ-0042 (rev7): FullHarnessRequest includes calibrationPack object
- REQ-0043 (rev7): runtime.ts does not import CalibrationLoader
- REQ-0044 (rev7): uiFidelity.status !== "completed" causes execution failure
- REQ-0045 (rev7): missingRequiredEvidence.length > 0 causes execution failure
- REQ-0046 (rev7): missing required screens causes execution failure
- REQ-0047 (rev7): runFullHarness not called when uiFidelity incomplete
- REQ-0048 (rev7): specCoverage.evidenceRefs accepts only concrete artifact refs
- REQ-0049 (rev7): prototypingEvidence.ts rejects directory/self/synthetic/extension-less refs
- REQ-0050 (rev7): validator resolves calibrationRef.packPath and compares metadata
- REQ-0051 (rev7): calibration metadata mismatch is validator error (not warning)
- REQ-0052 (rev7): hardcoded "1.0.0" heuristic removed from validator
- REQ-0053 (rev7): 6 distinct error classes in prototyping/errors.ts
- REQ-0054 (rev7): catch-all CalibrationResolutionError for non-calibration failures removed
- REQ-0055 (rev7): scalar calibration config fields removed from schema
- REQ-0056 (rev7): obsolete scalar calibration fields in config cause error
- REQ-0057 (rev7): shipped config template uses packPath-only
- REQ-0058 (rev7): surfacePolicy.ts rejection message matches PROTOTYPING_SUPPORTED_SURFACES
- REQ-0059 (rev8; WS-1): toRepoRelativeArtifactRef() helper in pathUtils.ts — `toRepoRelativeArtifactRef({ repoRoot, absolutePath, line?, anchor? }): string`; throws for outside-root path, directory path (no file extension), both line+anchor specified; returns POSIX repo-relative path
- REQ-0060 (rev8; WS-1): parseSpecDeclaration() and extractUiRouteDeclarations() use normalizer — all declaredRef values produced by these functions pass through toRepoRelativeArtifactRef(); raw absolute paths not returned
- REQ-0061 (rev8; WS-1): buildSpecCoverageSummary() outputs only concrete artifact refs — no directory paths accepted as ref source; all evidenceRefs in output are concrete artifact refs
- REQ-0062 (rev8; WS-1): buildPerSpecCoverage() outputs concrete artifact refs in coverageRefs[].declaredRef — same grammar (same helper) as summary evidenceRefs; absolute paths must not appear
- REQ-0063 (rev8; WS-2): PrototypingEvidence["runtimeGate"] type includes evidenceRefs: string[] — formal required field in type definition used by both parser and validator
- REQ-0064 (rev8; WS-2): parseEvidence() reads and type-checks runtimeGate.evidenceRefs — non-array value is parse error; absence detectable for subsequent validation
- REQ-0065 (rev8; WS-2): validator applies isConcreteArtifactRef() to runtimeGate.evidenceRefs entries — same or stricter checks as iterations[].evidenceRefs.runtimeGate
- REQ-0066 (rev8; WS-2): runtimeGate.evidenceRefs absence is a validator error — field must not be silently skipped
- REQ-0067 (rev8; WS-2): runtimeGate.evidenceRefs empty array is a validator error — empty array is not a valid evidenceRefs value for full-harness UI-only output
- REQ-0068 (rev8; WS-2): each malformed form in runtimeGate.evidenceRefs is a validator error — absolute path, self-ref (prototyping.json#/...), synthetic token, empty string, directory path (no extension) each produce individual validator error
- REQ-0069 (rev8; WS-3): single shared helpers for ref grammar across all layers — toRepoRelativeArtifactRef, assertConcreteArtifactRef, isConcreteArtifactRef are the single SSOT; no separate parallel implementations
- REQ-0070 (rev8; WS-3): all 5 traceability ref sites use the same grammar — runtimeGate.evidenceRefs, iterations[].evidenceRefs.runtimeGate, iterations[].evidenceRefs.specCoverage, specCoverage.evidenceRefs, specs[].coverageRefs[].declaredRef
- REQ-0071 (rev8; WS-4): specCoverage.test.ts includes negative cases for ref normalization — absolute path → repo-relative output test; outside-root path → throw test; directory path → throw test; coverageRefs[].declaredRef format verified as concrete artifact ref
- REQ-0072 (rev8; WS-4): prototypingEvidence.test.ts includes runtimeGate.evidenceRefs cases — absolute path → error; self-ref → error; synthetic token → error; field absent → error; empty array → error
- REQ-0073 (rev8; WS-4): prototypingExecution.productionPath.test.ts contains closure test — ≥1 positive closure (runPrototypingExecution() output passes validatePrototypingEvidence() with 0 errors); ≥1 negative injection (absolute path in specCoverage or runtimeGate causes validate error)
- REQ-0103 (rev9; WS-1): runtimeGate.ui[].declaredRef is required — validatePrototypingEvidence() must produce error if any runtimeGate.ui[] row is missing declaredRef
- REQ-0104 (rev9; WS-1): runtimeGate.ui[].declaredRef must be a concrete artifact ref — apply isConcreteArtifactRef() to declaredRef; absolute path, self-ref, synthetic token, bare filename, directory path, Windows separator each produce error
- REQ-0105 (rev9; WS-1): runtimeGate.ui[].renderEvidenceRefs[] is required and non-empty — error if absent or empty on any ui[] row
- REQ-0106 (rev9; WS-1): each runtimeGate.ui[].renderEvidenceRefs[i] must be a concrete artifact ref — apply isConcreteArtifactRef() to each entry; any malformed entry is a validator error
- REQ-0107 (rev9; WS-1): runtimeGate.ui[].browserQaEvidenceRefs[] is required and non-empty — error if absent or empty on any ui[] row
- REQ-0108 (rev9; WS-1): each runtimeGate.ui[].browserQaEvidenceRefs[i] must be a concrete artifact ref — apply isConcreteArtifactRef() to each entry
- REQ-0109 (rev9; WS-1): fullHarness.iterations[].l1.axes[].evidenceRefs[] is required and non-empty — for each axis in l1.axes[], evidenceRefs[] must be present and non-empty; any axis with empty or absent evidenceRefs is a validator error
- REQ-0110 (rev9; WS-1): each fullHarness.iterations[].l1.axes[].evidenceRefs[i] must be a concrete artifact ref — apply isConcreteArtifactRef() to every entry; synthetic tokens, absolute paths, self-refs, empty strings are errors
- REQ-0111 (rev9; WS-1): fullHarness.iterations[].l2.axes[].evidenceRefs[] is required and non-empty — same rules as REQ-0109 for l2.axes[]
- REQ-0112 (rev9; WS-1): each fullHarness.iterations[].l2.axes[].evidenceRefs[i] must be a concrete artifact ref — same grammar as REQ-0110 for l2.axes[]
- REQ-0113 (rev9; WS-1): fullHarness.reviewerLogs[].evidenceRefs[] is required and non-empty — for each entry in reviewerLogs[], evidenceRefs[] must be present and non-empty; any entry with empty or absent evidenceRefs is a validator error
- REQ-0114 (rev9; WS-1): each fullHarness.reviewerLogs[].evidenceRefs[i] must be a concrete artifact ref — apply isConcreteArtifactRef() to every entry; synthetic tokens (e.g. "reviewer:1"), absolute paths, self-refs are errors
- REQ-0115 (rev9; WS-1): leaf validation reuses isConcreteArtifactRef() from pathUtils.ts — all new leaf-field validation in REQ-0103..REQ-0114 must use isConcreteArtifactRef() from pathUtils.ts; no parallel concrete-ref grammar implementation may be introduced in prototypingEvidence.ts
- REQ-0116 (rev9; WS-2): bundleWriter.ts marks runtimeGate.ui[].declaredRef as required — TypeScript type must mark declaredRef as required (not declaredRef?: string); omitting it must be a TypeScript type error
- REQ-0117 (rev9; WS-2): bundleWriter.ts prohibits null or omit for all leaf array fields — renderEvidenceRefs[], browserQaEvidenceRefs[], l1/l2.axes[].evidenceRefs[], reviewerLogs[].evidenceRefs[] must be typed as required non-nullable arrays
- REQ-0118 (rev9; WS-2): runtime builders produce concrete leaf refs — if runtimeObservation.ts or runtimeGateBuilder.ts can emit null, undefined, or omitted values for any leaf array field, they must be updated to prevent this; validator cannot compensate for missing builder output
- REQ-0119 (rev9; WS-3): prototypingEvidence.test.ts includes all required leaf-field negative cases — (a) all 7 runtimeGate.ui[] negative cases; (b) all 5 axis-level evidenceRefs negative cases; (c) all 3 reviewer-level evidenceRefs negative cases
- REQ-0120 (rev9; WS-3): existing tests/core/ fixtures replace all synthetic token evidenceRefs — all fixtures using synthetic tokens ("a", "b", "reviewer:1") as evidenceRefs values must be replaced with repo-root relative concrete artifact refs
- REQ-0121 (rev9; WS-3): production closure test asserts leaf field concreteness — prototypingExecution.productionPath.test.ts must include assertions verifying leaf fields contain only concrete artifact refs, plus at least one negative injection test
- REQ-0122 (rev9; WS-4): README enumerates all concrete-ref leaf fields — packages/qfai/README.md must list all fields under concrete artifact ref contract including rev9 leaf fields; must not imply only top-level fields are validated

## Entry points

- US range in this spec: US-0012-0001..US-0012-0071
- Primary actors: Developer, AI Agent (FullStackEngineer, RuntimeGatekeeper), CI/CD pipeline
- Notes: No CLI command exists. This is a skill-only spec for `/qfai-prototyping`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: fidelity depth vs execution speed must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
