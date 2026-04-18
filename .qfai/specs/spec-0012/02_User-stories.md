# 02 User Stories

## US-0012-0001: All-Spec Prototyping

As a developer, I want `/qfai-prototyping` to build minimum runnable skeletons for ALL specs, so that `/qfai-atdd` can proceed without hidden scope gaps.

## US-0012-0002: Spec Auto-Discovery

As a developer, I want the skill to detect changed specs via 4-source diff (branch, local, evidence mtime, delta.md), so that only relevant specs are flagged for attention while all specs remain in scope.

## US-0012-0003: Mode Selection

As a developer, I want to choose between low-cost, standard (default), and full-harness prototyping modes, so that I can balance verification depth with execution time.

## US-0012-0004: Coverage Matrix Generation

As a QA engineer, I want a Coverage Matrix for all specs showing uiRoutes, apiEndpoints, and dbObjects counts, so that scope completeness is visible.

## US-0012-0005: Runtime Gate v2

As a QA engineer, I want UI route, API endpoint, DB object, and mock path checks for all declared items, so that runtime integrity is verified before acceptance testing.

## US-0012-0006: Non-UI Project Handling

As a QFAI user working on a CLI/API project, I want non-UI surfaces to skip UI route checks and visual fidelity gates, so that prototyping obligations match the project surface type.

## US-0012-0007: Full-Harness Workflow

As a developer, I want an opt-in full-harness mode with Planner -> Generator -> Evaluator -> Decision Gate loop, so that runtime-heavy verification can be performed when needed.

## US-0012-0008: Skill-Centered Prototyping Truth

As a QFAI maintainer, I want spec, policies, docs, and code to unanimously agree that `/qfai-prototyping` skill is the sole prototyping interface (no CLI command), so that contributors never encounter contradictory guidance about how to invoke prototyping.

## US-0012-0009: Superseded CLI Reference Elimination

As a QFAI maintainer, I want all active documents that previously referenced `qfai prototyping` CLI command to be archived or corrected, so that no document misleads users into attempting a removed command.

## US-0012-0010: Static-First Mode-Aware Contract Normalization

As a developer, I want the prototyping skill contract to declare static-first as default with mode-aware sections, so that the contract is the single source of truth for mode behavior and consumers need not consult policies.

## US-0012-0011: Prototyping Mode Module

As a QFAI developer, I want a dedicated prototyping mode module (`prototyping/mode.ts`) that resolves the effective prototyping mode through existence-based precedence (user-specified > discussion recommendation > system default), so that mode resolution is deterministic, traceable, and centralized.

## US-0012-0012: Recommendation Artifact Resolution

As a QFAI developer, I want `resolveLatestRecommendationArtifact()` to be the single source of truth for recommendation artifact status (valid/invalid/missing/no-pack), so that report.ts and prototypingEvidence.ts consumers do not duplicate artifact-status logic.

## US-0012-0013: Existence-Based Precedence

As a QFAI user, I want prototyping.yaml mode resolution to use key existence (not value validity) for namespaced vs legacy precedence, so that a malformed namespaced block produces an explicit error instead of silently falling back to legacy.

## US-0012-0014: Prototyping Obligation Matrix

As a QFAI developer, I want `derivePrototypingObligations(surface, mode)` to map (surface, effectiveMode) to the obligation matrix
(requireRuntimeGate, requireUiFidelity, requireRenderBundle, requireBrowserQaBundle, requireFullHarness),
so that obligations are derived programmatically rather than hardcoded in multiple consumers.

## US-0012-0015: Prototyping Calibration Config

As a QFAI user, I want `qfai.config.yaml` to support a `prototyping.calibration` stanza with accept/refine thresholds, maxIterations, plateauDelta, and plateauLookback, so that full-harness calibration can be tuned per project.

## US-0012-0016: Report Prototyping Observability

As a project lead, I want report.ts to collect prototyping data (mode, evidence, harness, render, browserQa, calibration) into a `## Prototyping` section, so that prototyping state is visible in reports even when not yet used as a blocking gate.

## US-0012-0017: Canonical Prototyping Surfaces

As a QFAI user, I want prototyping surfaces to use canonical names (web/mobile/desktop/cli/mixed) without the -ui suffix, so that surface identifiers are concise and consistent across all QFAI modules.

## US-0012-0018: Execution Hard Gates for Invalid Input

As a QFAI developer, I want execution.ts to hard-reject invalid classification, invalid recommendation artifacts, and non-UI packs at the entry gate, so that no prototyping execution proceeds with semantically invalid inputs.

## US-0012-0019: Namespaced-Only prototyping.yaml Schema

As a QFAI user, I want prototyping.yaml to require the namespaced `prototyping:` block exclusively, with legacy top-level keys hard-rejected, so that there is only one valid schema format and no migration ambiguity.

## US-0012-0020: Semantic Invariant Shared Across All Layers

As a QFAI developer, I want the recommended_mode ∈ allowed_modes invariant to be enforced by a single shared helper (recommendationSemantics.ts) at all layers (parser, resolver, execution, CLI, validator, preflight), so that semantic mismatch is never silently accepted at any layer.

## US-0012-0021: Classification-Aware Evidence Obligations

As a QFAI developer, I want obligation derivation to distinguish "discussion UI-bearing" (includes cli) from "visual/browser evidence required" (excludes cli), so that cli-surface packs are not incorrectly required to produce browser screenshots or Playwright-based evidence.

## US-0012-0022: Full-Harness Iteration Protocol

As a developer, I want full-harness mode to execute a multi-iteration improvement loop (Evaluate→Identify→Fix→Re-evaluate) with configurable termination conditions (converged/max-iterations/plateau/manual-stop), so that prototyping quality is iteratively refined rather than accepted in a single pass.

## US-0012-0023: Independent Evaluator Panel

As a developer, I want full-harness evaluation to be performed by an independent 3-layer panel (product-surface-reviewer for design quality, product-experience-architect for product experience, qa-gatekeeper for process audit), so that self-evaluation bias is structurally prevented.

## US-0012-0024: Score Scope Separation

As a developer, I want discussion 3-layer scores (design direction quality) to be explicitly separated from prototyping scoringTrace (implementation fidelity), so that scores from different evaluation contexts are never confused or copied between phases.

## US-0012-0025: Full-Harness Validator Rules

As a QFAI developer, I want prototypingEvidence.ts to include QFAI-PROT-290~294 validator rules checking iteration integrity
(single-iteration convergence, scoringTrace count, terminationReason cross-check, maxIterations cap, score progression),
so that full-harness evidence quality is automatically verified.

## US-0012-0026: Full-Harness Real Convergence (v1.7.15)

As a developer, I want a full-harness run with real reviewer and calibration data to converge only after at least 2 iterations with real panel scoring (weightedTotal = min(L1, L2)), so that single-iteration convergence and zero-seeded scores are structurally impossible.

## US-0012-0027: Missing Evidence Fail-Fast (v1.7.15)

As a developer, I want missing evidence (reviewer identity, commitSha, calibration pack, render evidence, browser QA evidence, ui observation input, spec coverage input) to cause an immediate runtime error without silent fallback, so that the pipeline never produces partially-grounded results.

## US-0012-0028: Evidence Grounding Integrity (v1.7.15)

As a QA engineer, I want specCoverage to be derived from real spec/runtime diffs and uiFidelity to reject synthetic or zero-seeded values (including auto-generated mockPaths.status="pass"), so that evidence artifacts reflect actual implementation state.

## US-0012-0029: Docs-Runtime Reality Sync (v1.7.15)

As a QFAI maintainer, I want docs/SKILL/README claims about full-harness input requirements, reviewer mandatory status, convergence rules, specCoverage measurement, uiFidelity observation-only constraints, and calibration necessity to match the actual runtime failure conditions, so that documentation never overstates or understates what the system enforces.

## US-0012-0030: Pre-Scored Path Elimination (v1.7.15 rev2)

As a developer, I want the runFullHarness() request type to no longer accept pre-scored l1/l2 values, so that all scoring is performed exclusively within the runtime from real evidence and no external bypass is possible.

## US-0012-0031: l2Evidence Real Artifact Derivation (v1.7.15 rev2)

As a developer, I want l2Evidence.ts to build discussion axis inputs, screen contract inputs, and trend alignment inputs from actual discussion artifacts, so that L2 scoring is grounded in real data rather than dummy zero-seeded objects.

## US-0012-0032: CalibrationLoader Fail-Closed (v1.7.15 rev2)

As a developer, I want CalibrationLoader to throw on every misconfiguration (missing pack, invalid YAML, missing version/thresholds/maxIterations/plateauDelta/plateauLookback), so that no full-harness run proceeds with uncalibrated or partially-calibrated settings.

## US-0012-0033: Termination Semantics Truthfulness (v1.7.15 rev2)

As a developer, I want termination conditions to require count >= plateauLookback before any plateau/converged judgment, and the validator to reject violations, so that premature termination is structurally impossible.

## US-0012-0034: specCoverage Strict Derivation (v1.7.15 rev2)

As a developer, I want specCoverage to require all declared specs in perSpecMap and reject silent empty returns, with DB coverage following a binary policy (observe or fail), so that coverage evidence is never silently incomplete.

## US-0012-0035: Screen-Level UiObservation (v1.7.15 rev2)

As a developer, I want UiObservation to use ScreenObservation type with per-screen DOM labels, actionsWired from browser QA, and mockPath findings, so that flatten aggregation is eliminated and screen-level insufficient-evidence detection is possible.

## US-0012-0036: ReviewerLog and BundleWriter Integrity (v1.7.15 rev2)

As a developer, I want reviewerLogs to store all 8 evidence categories per iteration, history arrays to maintain strict length equality, and bundleWriter to output schema v2 only, so that iteration integrity is fully traceable and verifiable.

## US-0012-0037: Tests Fixture Rev2 Alignment (v1.7.15 rev2)

As a developer, I want test fixtures to remove l1/l2 direct pass, packVersion:"1.0.0", single-iteration converged, actionsWired=0, and flattened DOM labels from normal paths, and add missing evidence/insufficient observation/per-spec failure to error paths, so that the test suite validates the rev2 runtime contract.

## US-0012-0038: full-harness mode/surface 契約厳格化 (v1.7.15 rev4)

**As a** QFAI パッケージ利用者（CI パイプライン運用者）
**I want** `cli` surface と `full-harness` mode の組み合わせがランタイム・CLI・バリデータすべてで即座に拒否される
**So that** UI を持たない surface で full-harness が誤実行され、無意味なブラウザ QA サイクルが走るリスクを排除できる

- REQ-Refs: REQ-0001〜REQ-0005
- WS: WS-1
- Discussion: discussion-20260414195449523

## US-0012-0039: render/Browser QA ターゲット画面契約準拠 (v1.7.15 rev4)

**As a** QFAI パッケージ利用者
**I want** Browser QA のターゲットが `"/primary"` 固定値ではなく `40_screen_contracts.md` から導出される
**So that** 画面契約に定義された全画面に対して正確にフィデリティ測定が行われ、測定漏れを防止できる

- REQ-Refs: REQ-0006〜REQ-0011
- WS: WS-2
- Discussion: discussion-20260414195449523

## US-0012-0040: Browser QA エビデンスチェーン完全性 (v1.7.15 rev4)

**As a** QFAI パッケージ利用者
**I want** Browser QA のフェーズ参照・ファインディング参照がイテレーション記録に確実に格納される
**So that** エビデンスチェーンが中断せず、監査時に全フェーズ・ファインディングの追跡が可能になる

- REQ-Refs: REQ-0012〜REQ-0016
- WS: WS-3
- Discussion: discussion-20260414195449523

## US-0012-0041: runtimeGate/specCoverage 正規ルート意味論 (v1.7.15 rev4)

**As a** QFAI パッケージ利用者
**I want** `runtimeGate` と `specCoverage` が URL ではなく正規ルート（canonical route）で比較を行う
**So that** クエリパラメータやフラグメントを含む URL が誤って別ルートと判定されるバグを排除できる

- REQ-Refs: REQ-0017〜REQ-0021
- WS: WS-4
- Discussion: discussion-20260414195449523

## US-0012-0042: L2 エビデンス構造化パース優先 (v1.7.15 rev4)

**As a** QFAI パッケージ利用者
**I want** L2 エビデンス収集が構造化セクションのパースを優先する
**So that** ヒューリスティックフォールバックへの依存が最小化され、エビデンスの正確性と再現性が向上する

- REQ-Refs: REQ-0022〜REQ-0027
- WS: WS-5
- Discussion: discussion-20260414195449523

## US-0012-0043: validator/docs/tests 陳腐化セマンティクス整理 (v1.7.15 rev4)

**As a** QFAI パッケージ開発者
**I want** 陳腐化した remediation セマンティクス・URL-as-route テスト期待値・skip フラグが整理される
**So that** テストスイートが現行仕様を正確に反映し、将来の開発者が誤った期待値に惑わされない

- REQ-Refs: REQ-0028〜REQ-0033
- WS: WS-6
- Discussion: discussion-20260414195449523

## US-0012-0044: non-UI surface prototyping 全モード拒否 (v1.7.15 rev5)

**As a** QFAI メンテナー
**I want** cli/api/backend surface が ALL prototyping modes を reject すること
**So that** prototyping contract が明確でテスト可能になる

- REQ-Refs: REQ-0001〜REQ-0007
- WS: WS-1
- Discussion: discussion-20260415014056471

## US-0012-0045: 観測済み route のみの runtimeGate/specCoverage (v1.7.15 rev5)

**As a** QFAI メンテナー
**I want** runtimeGate が観測済み route のみを記録すること
**So that** coverage metrics が実際の実行 evidence に基づくものになる

- REQ-Refs: REQ-0008〜REQ-0015
- WS: WS-2
- Discussion: discussion-20260415014056471

## US-0012-0046: Browser QA per-screen 必須化 (v1.7.15 rev5)

**As a** QFAI メンテナー
**I want** 各 screen contract が固有の Browser QA execution と evidence refs を持つこと
**So that** evidence chain が screen 単位で完全になる

- REQ-Refs: REQ-0016〜REQ-0025
- WS: WS-3
- Discussion: discussion-20260415014056471

## US-0012-0047: actionsWired = action coverage セマンティクス (v1.7.15 rev5)

**As a** QFAI メンテナー
**I want** actionsWired が宣言+観測+wired 済みの control のみをカウントすること
**So that** screen fidelity metrics が意味のあるものになる

- REQ-Refs: REQ-0026〜REQ-0032
- WS: WS-4
- Discussion: discussion-20260415014056471

## US-0012-0048: runFullHarness() standalone fail-closed (v1.7.15 rev5)

**As a** QFAI メンテナー
**I want** runFullHarness() が必須 input が不足している場合に即座に fail すること
**So that** 部分的/無効な harness の実行が silent に成功しなくなる

- REQ-Refs: REQ-0033〜REQ-0040
- WS: WS-5
- Discussion: discussion-20260415014056471

## US-0012-0049: calibration/validator/L2/docs SSOT 統合 (v1.7.15 rev5)

**As a** QFAI メンテナー
**I want** runtime と validator が同じ pack から calibration thresholds を読むこと
**So that** calibration が一貫しており、config が pack をオーバーライドできない

- REQ-Refs: REQ-0041〜REQ-0053
- WS: WS-6
- Discussion: discussion-20260415014056471

## US-0012-0050: Reject Non-Full-Harness Mode at All Layers (v1.7.15 rev6)

**As a** package implementor,
**I want** CLI, execution.ts, and prototypingEvidence.ts to reject `standard` and `low-cost` mode with a clear error,
**So that** no user can accidentally run an unsupported mode and receive an unvalidatable result.

- REQ-Refs: REQ-0093
- WS: WS-1
- Discussion: discussion-20260415161758193

## US-0012-0051: Reject Non-UI Surfaces at All Layers (v1.7.15 rev6)

**As a** package implementor,
**I want** `cli`, `api`, and `backend` surfaces to be rejected at CLI, execution, and validator layers,
**So that** stale CLI prototyping references in old configs cannot silently produce a prototyping run.

- REQ-Refs: REQ-0094
- WS: WS-1, WS-2
- Discussion: discussion-20260415161758193

## US-0012-0052: surfacePolicy.ts Standalone Module (v1.7.15 rev6)

**As a** QFAI developer,
**I want** `packages/qfai/src/core/prototyping/surfacePolicy.ts` to be the SSOT for surface allowlist,
**So that** surface policy is independently testable and importable without mode.ts transitive dependencies.

- REQ-Refs: REQ-0095
- WS: WS-2
- Discussion: discussion-20260415161758193

## US-0012-0053: runFullHarness Uses CalibrationLoader Internally (v1.7.15 rev6)

**As a** harness operator,
**I want** `runFullHarness()` to resolve its calibration pack internally from `calibrationRef.packPath`,
**So that** I cannot override thresholds externally and the validator can verify the same pack was used.

- REQ-Refs: REQ-0096
- WS: WS-3
- Discussion: discussion-20260415161758193

## US-0012-0054: runtimeGate and specCoverage Use Concrete evidenceRefs (v1.7.15 rev6)

**As an** auditor,
**I want** `runtimeGate.evidenceRefs` and `specCoverage.evidenceRefs` to point to concrete, resolvable artifacts,
**So that** I can independently verify each ref without relying on self-referential or synthetic pointers.

- REQ-Refs: REQ-0097, REQ-0098
- WS: WS-4
- Discussion: discussion-20260415161758193

## US-0012-0055: reviewerSignoff Semantics, screenId Matching, and Stale Cleanup (v1.7.15 rev6)

**As an** auditor and test engineer,
**I want** `reviewerSignoff.status` to reflect actual outcome, `uiFidelityBuilder` to match by `screenId`, and stale docs/tests to be removed,
**So that** audit trail is unambiguous and test fixtures are not misleading.

- REQ-Refs: REQ-0099, REQ-0100, REQ-0101, REQ-0102
- WS: WS-5, WS-6, WS-7
- Discussion: discussion-20260415161758193

## US-0012-0056: CalibrationPack Upstream Resolution (v1.7.15 rev7)

**As a** package maintainer,
**I want** `runFullHarness()` to receive a resolved `CalibrationPack` object from `execution.ts`,
**So that** `runtime.ts` has no pack resolution responsibility and the API contract is strict.

- REQ-Refs: REQ-0041, REQ-0042, REQ-0043
- WS: WS-1
- Discussion: discussion-20260415203030886

## US-0012-0057: uiFidelity Fail-Closed Guard (v1.7.15 rev7)

**As a** package maintainer,
**I want** execution to fail immediately when uiFidelity is incomplete (status≠completed, missingRequired>0, or missing screen),
**So that** incomplete runs never call `runFullHarness()` or produce misleading summaries.

- REQ-Refs: REQ-0044, REQ-0045, REQ-0046, REQ-0047
- WS: WS-2
- Discussion: discussion-20260415203030886

## US-0012-0058: Concrete-Only evidenceRefs (v1.7.15 rev7)

**As a** package maintainer,
**I want** `specCoverage.evidenceRefs` to contain only concrete artifact refs (spec anchors, renders, screenshots, browser QA artifacts),
**So that** the traceability ledger is auditable and each ref resolves to a real artifact.

- REQ-Refs: REQ-0048, REQ-0049
- WS: WS-3
- Discussion: discussion-20260415203030886

## US-0012-0059: Validator Calibration Metadata Check (v1.7.15 rev7)

**As a** package maintainer,
**I want** the validator to compare `calibrationRef.packPath`, `packVersion`, and `configPath` against the actual pack,
**So that** calibration metadata forgery (mismatched summary) is detected as a validator error.

- REQ-Refs: REQ-0050, REQ-0051, REQ-0052
- WS: WS-4
- Discussion: discussion-20260415203030886

## US-0012-0060: Error Taxonomy (v1.7.15 rev7)

**As a** package maintainer,
**I want** execution failures to have 6 distinct error classes in `prototyping/errors.ts` with narrow catch blocks,
**So that** CI diagnostics are actionable and calibration failures are not confused with fidelity or write failures.

- REQ-Refs: REQ-0053, REQ-0054
- WS: WS-5
- Discussion: discussion-20260415203030886

## US-0012-0061: Config packPath-Only (v1.7.15 rev7)

**As a** package maintainer,
**I want** scalar calibration fields removed from the config schema, shipped template, and README,
**So that** the calibration pack is the only calibration entry point and obsolete config inputs cause an error.

- REQ-Refs: REQ-0055, REQ-0056, REQ-0057
- WS: WS-6
- Discussion: discussion-20260415203030886

## US-0012-0062: surfacePolicy Rejection Message from Constant (v1.7.15 rev7)

**As a** package maintainer,
**I want** `surfacePolicy.ts` rejection message to be generated from `PROTOTYPING_SUPPORTED_SURFACES` constant,
**So that** the message is never stale when the allowed surface list changes.

- REQ-Refs: REQ-0058
- WS: WS-7
- Discussion: discussion-20260415203030886

## US-0012-0063: specCoverage Outputs Only Repo-Relative Concrete Artifact Refs (WS-1) (v1.7.15 rev8)

**As a** package maintainer,
**I want** `specCoverage.ts` to output only repo-root relative concrete artifact refs (not absolute paths),
**So that** the traceability ledger is self-consistent with the validator contract and cross-platform reproducible.

- REQ-Refs: REQ-0059, REQ-0060, REQ-0061, REQ-0062
- WS: WS-1
- Discussion: discussion-20260416023323603

## US-0012-0064: Validator Validates Top-Level runtimeGate.evidenceRefs (WS-2) (v1.7.15 rev8)

**As a** package maintainer,
**I want** `prototypingEvidence.ts` to parse and validate top-level `runtimeGate.evidenceRefs`,
**So that** malformed refs in the summary-level runtimeGate field are detected and rejected with the same strictness as iteration-level refs.

- REQ-Refs: REQ-0063, REQ-0064, REQ-0065, REQ-0066, REQ-0067, REQ-0068
- WS: WS-2
- Discussion: discussion-20260416023323603

## US-0012-0065: All 5 Traceability Ref Sites Use the Same Ref Grammar and Helpers (WS-3) (v1.7.15 rev8)

**As a** package maintainer,
**I want** all five traceability ref sites to use the same ref grammar implemented by shared helpers from `pathUtils.ts`,
**So that** future grammar changes propagate consistently and there is no silent divergence between builder output and validator expectations.

- REQ-Refs: REQ-0069, REQ-0070
- WS: WS-3
- Discussion: discussion-20260416023323603

## US-0012-0066: Execution to Validate Closure Regression Test Exists (WS-4) (v1.7.15 rev8)

**As a** package maintainer,
**I want** a production-path regression test that runs `runPrototypingExecution()` and passes the output to `validatePrototypingEvidence()`,
**So that** the class of regression where builders produce output that fails their own validator is permanently covered by the test suite.

- REQ-Refs: REQ-0071, REQ-0072, REQ-0073
- WS: WS-4
- Discussion: discussion-20260416023323603

## US-0012-0067: runtimeGate.ui[] Row-Level Leaf Fields Are Strictly Validated (WS-1) (v1.7.15 rev9)

As a package maintainer, I want `prototypingEvidence.ts` to validate all three leaf fields of each `runtimeGate.ui[]` row as concrete artifact refs, so that screen-level traceability coverage cannot be silently faked with synthetic tokens, missing declarations, or absolute paths.

## US-0012-0068: Axis-Level evidenceRefs[] Are Strictly Validated (WS-1) (v1.7.15 rev9)

As a package maintainer, I want `prototypingEvidence.ts` to validate `fullHarness.iterations[].l1.axes[].evidenceRefs[]` and `l2.axes[].evidenceRefs[]` as non-empty concrete artifact ref arrays, so that axis rationale traceability cannot be faked with synthetic tokens or absent evidence.

## US-0012-0069: reviewerLogs[] evidenceRefs[] Are Strictly Validated (WS-1) (v1.7.15 rev9)

As a package maintainer, I want `prototypingEvidence.ts` to validate `fullHarness.reviewerLogs[].evidenceRefs[]` as non-empty concrete artifact ref arrays, so that reviewer rationale traceability cannot be faked with synthetic tokens or absent evidence.

## US-0012-0070: Bundle Schema and Runtime Output Reflect Strict Leaf Contract (WS-2) (v1.7.15 rev9)

As a package maintainer, I want `bundleWriter.ts` and any runtime builders to treat leaf array fields as required and non-nullable, so that there is no gap between what the validator rejects and what the runtime is allowed to emit.

## US-0012-0071: Leaf-Field Regression Tests Cover All Negative Cases and README Is Complete (WS-3+WS-4) (v1.7.15 rev9)

As a package maintainer, I want `tests/core/` to include negative test cases for every leaf-field malformed ref form and replace all synthetic token fixtures, and I want `README.md` to enumerate all fields under the concrete-ref contract, so that future regressions at leaf level are caught immediately and the documentation is accurate.

## US-0012-0072: Terminal State Machine Enforcement (v1.7.15 rev10, WS-1)

- As a QFAI validator consumer,
- I want the fullHarness outcome fields to be validated against a terminal state machine,
- So that in-progress and completed bundles are structurally unambiguous and validators enforce all field constraints fail-closed.

Parent: CAP-0012
REQ: REQ-0123, REQ-0124, REQ-0125, REQ-0126

## US-0012-0073: Canonical Screen Contract SourceRef (v1.7.15 rev10, WS-2)

- As a QFAI validator consumer,
- I want buildScreenContractInputs() to use readCanonicalScreenContracts() sourceRef directly,
- So that evidence refs point to actual screen contract file locations rather than slug-derived anchors.

Parent: CAP-0012
REQ: REQ-0127

## US-0012-0074: All EvidenceRefs Categories Validated (v1.7.15 rev10, WS-3)

- As a QFAI validator consumer,
- I want all 8 evidenceRefs categories to be validated for non-emptiness and concreteness,
- So that evidence bundles cannot pass validation with empty arrays or placeholder strings in any category.

Parent: CAP-0012
REQ: REQ-0128

## US-0012-0075: DeclaredRef Semantic Validation (v1.7.15 rev10, WS-4)

- As a QFAI validator consumer,
- I want specs[].coverageRefs[].declaredRef to be validated as a .qfai/specs/ path with anchor,
- So that discussion refs, screen contract refs, and bare file paths cannot be used as spec coverage refs.

Parent: CAP-0012
REQ: REQ-0129

## US-0012-0076: Runtime/Validator/Tests/README Sync (v1.7.15 rev10, WS-5)

- As a QFAI project maintainer,
- I want all WS-1~WS-4 changes to be consistently reflected in runtime, validators, tests, and README,
- So that the codebase has no stale documentation or divergent behavior.

Parent: CAP-0012
REQ: REQ-0130, REQ-0131

## US-0012-0077: Public API Surface Closure (v1.7.15 rev11, WS-1)

- As a QFAI package consumer,
- I want `runMeasurement` and `validatePanelScore` to be unexported internal helpers (not accessible from `src/core/index.ts`),
- So that only `runFullHarness()` is the public entry point and no caller can bypass panel validation or category ref enforcement.

Parent: CAP-0012
REQ: REQ-0001

## US-0012-0078: runMeasurement Strict Validation (v1.7.15 rev11, WS-1)

- As a QFAI package consumer,
- I want `runMeasurement()` to strictly validate all 8 category ref arrays (renderRefs, browserQaRefs, runtimeGateRefs, uiObservationRefs, specCoverageRefs, discussionRefs, trendRefs, screenContractRefs) for non-emptiness and concrete artifact refs, enforce `screenContractRefs` canonical form, validate `l1.axes`/`l2.axes` are non-empty, and call `validatePanelScore()` before any computation,
- So that measurement can never proceed with missing evidence, synthetic tokens, or structurally invalid panel inputs.

Parent: CAP-0012
REQ: REQ-0002, REQ-0003, REQ-0004, REQ-0005

## US-0012-0079: validatePanelScore Strict Validation (v1.7.15 rev11, WS-1)

- As a QFAI package consumer,
- I want `validatePanelScore()` to reject empty `axes` arrays and require at least one concrete `evidenceRef` per axis,
- So that panel score computation cannot proceed with zero evaluation axes or ungrounded evidence references.

Parent: CAP-0012
REQ: REQ-0006, REQ-0007

## US-0012-0080: specCoverage 01_Spec.md-Only Scan (v1.7.15 rev11, WS-2)

- As a QFAI package consumer,
- I want `buildSpecCoverageSummary()` and `buildPerSpecCoverage()` to read only `01_Spec.md` as the declaration source for each spec (ignoring all other `.md` files in the spec directory),
- So that `notes.md`, `appendix.md`, and other supplementary files cannot inject spurious `declaredRef` entries into the coverage map.

Parent: CAP-0012
REQ: REQ-0008

## US-0012-0081: isSpecDeclarationRef Line-Ref Only Grammar (v1.7.15 rev11, WS-2)

- As a QFAI package consumer,
- I want `isSpecDeclarationRef()` to return `true` only for the pattern `.qfai/specs/<specId>/01_Spec.md#L<positive integer>`, and return `false` for anchor fragments, notes.md/appendix.md paths, discussion refs, screen contract refs, `#L0`, and absolute paths,
- So that spec declaration refs have a single canonical grammar and all off-grammar refs are structurally rejected.

Parent: CAP-0012
REQ: REQ-0009

## US-0012-0082: Harness Test DTO Synchronization (v1.7.15 rev11, WS-3)

- As a QFAI developer,
- I want `measurement.test.ts` and `panelScore.test.ts` to be fully updated to the current DTO shape (removing deleted fields, adding `screenContractRefs` canonical reject cases, adding `evidenceRefs` strict validation cases),
- So that the test suite validates the current rev11 runtime contract and no stale fixture assumptions exist.

Parent: CAP-0012
REQ: REQ-0010, REQ-0011

## US-0012-0083: Prototyping Semantic Boundary Test Coverage (v1.7.15 rev11, WS-3)

- As a QFAI developer,
- I want `specCoverage.test.ts` and `refSemantics.test.ts` to exist (created if absent, extended if present) with comprehensive coverage of the rev11 semantic boundaries (`01_Spec.md`-only scan, `#L<n>`-only grammar, `notes.md`/`appendix.md`/`#anchor`/`#L0`/discussion ref/screen contract ref rejection),
- So that regressions in semantic closure constraints are caught automatically.

Parent: CAP-0012
REQ: REQ-0012, REQ-0013

## US-0012-0084: Delegation Scope Table Routing (v1.7.16, REQ-0123)

- As a Prototyper（AI agent），
- I want prototyping SKILL.md の Delegation Scope Table を読んで UI実装 / スクリーンショット / 評価 L1-L2 / ビルド の 4 カテゴリごとに正しいロール（frontend-engineer, devops-ci-engineer, product-surface-reviewer, product-experience-architect）に作業を振り分け、定義外ロールへの移譲を行わない、
- So that 役割混線と品質低下を防止できる。

Parent: CAP-0012
REQ: REQ-0123

## US-0012-0085: Full-Harness Iteration Gate Enforcement (v1.7.16, REQ-0124)

- As a Prototyper（AI agent），
- I want full-harness 実行時に `iterationCount === 1 && converged === true` が ERROR として拒否され、最低 2 反復が強制される、
- So that 1 反復目の偶発的収束による品質誤認を防ぎ、評価厳格性を担保できる。

Parent: CAP-0012
REQ: REQ-0124

## US-0012-0086: Step 0 Execution Plan MUST (v1.7.16, REQ-0125)

- As a Prototyper（AI agent），
- I want 反復に入る前に Step 0 で `executionPlan`（targetIterations / evaluationAxesSource / delegationMap / plannedAt）を `prototyping.json` に記録し、full-harness では欠落時にバリデーションが失敗する、
- So that 実行計画が事後的でなく事前に固定され、後続フェーズがその前提で走れる。

Parent: CAP-0012
REQ: REQ-0125

## US-0012-0087: Shared Screenshot Capture Script (v1.7.16, REQ-0127)

- As a Prototyper（AI agent），
- I want QFAI パッケージに配置された `capture-screenshots.js` を使って URL/port と出力ディレクトリからタイムスタンプ付きファイル名のスクリーンショット一覧を取得する、
- So that 反復ごとのスクリーンショット取得がプロジェクト横断で一貫した手法になる。

Parent: CAP-0012
REQ: REQ-0127

## US-0012-0088: 5-Step Iteration Cycle (v1.7.16, REQ-0128)

- As a Prototyper（AI agent），
- I want 反復サイクルを Capture → Evaluate → Identify → Fix → Re-evaluate の 5 ステップで回し、各反復の `scoringTrace[].screenshotDir` に使用ディレクトリを記録する、
- So that 各反復でどのスクリーンショット集合を評価対象としたかが事後追跡可能になる。

Parent: CAP-0012
REQ: REQ-0128

## US-0012-0089: Evaluator Input Preparation Protocol (v1.7.16, REQ-0129)

- As a Prototyper（AI agent），
- I want L1/L2 評価者（サブエージェント）を起動する前に、(a) スクリーンショットパス / (b) 評価軸定義テキスト / (c) 前回スコア / (d) DESIGN.md 準拠チェックリスト の 4 要素を MUST 入力として準備する、
- So that 評価者が欠落した前提のまま採点するゆらぎを排除できる。

Parent: CAP-0012
REQ: REQ-0129

## US-0012-0090: Visual Quality Structural Checklist (v1.7.16, REQ-0130)

- As a Reviewer（product-surface-reviewer），
- I want カラー / タイポグラフィ / スペーシング / 角丸 / シャドウ / Do's&Don'ts の 6 カテゴリからなる Visual Quality Structural Checklist を SKILL.md から参照できる、
- So that ビジュアル品質レビュー観点が属人化せず横断的に統一される。

Parent: CAP-0012
REQ: REQ-0130

## US-0012-0091: Lighthouse MUST for Full-Harness + Web Surface (v1.7.16, REQ-0130)

- As a Prototyper（AI agent），
- I want full-harness かつ web surface の場合に Lighthouse Gate が MUST として扱われ、実行・記録・reviewer 検証の対象になる、
- So that Web Surface の完了証跡が Lighthouse 未実行で流れてしまうことを防げる。

Parent: CAP-0012
REQ: REQ-0130

## US-0012-0092: designSystemCompliance Evaluate Check (v1.7.16, REQ-0131)

- As a Prototyper（AI agent），
- I want Evaluate ステップで `uiux/12_design_system.md` が存在する場合に CSS 実装値と design system 仕様値の一致率を `designSystemCompliance` スコアとして算出し、80% 未満を L1 finding（即時修正対象）とする、
- So that DESIGN.md が規定されているプロジェクトで逸脱を定量的に検出し反復 fix にフィードできる。

Parent: CAP-0012
REQ: REQ-0131

## US-0012-0093: Project-Side Calibration Overrides (v1.7.16, REQ-0126)

- As a QFAI user（project maintainer），
- I want `qfai.config.yaml` の `prototyping.calibration.overrides` に `perAxisMinimum` / `maxIterationsByMode` を記述してプロジェクト側で system default を上書きできる、
- So that プロジェクト固有の評価厳格度と反復上限を破壊的変更なしに調整できる。

Parent: CAP-0012
REQ: REQ-0126
