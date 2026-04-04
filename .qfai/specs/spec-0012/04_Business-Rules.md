# 04 Business Rules

## BR-0012-0001: CLI Command Removed

- AC-Refs: AC-0012-0001

- The CLI command `qfai prototyping` has been REMOVED from the codebase.
- This spec covers the `/qfai-prototyping` SKILL only.

## BR-0012-0002: All-Spec Scope

- AC-Refs: AC-0012-0002

- Scope is fixed to ALL specs from `.qfai/specs/spec-*`; do not shrink to one spec.

## BR-0012-0003: Contracts Are Strict Inputs

- AC-Refs: AC-0012-0003

- Contracts are strict inputs in this stage. Do not create new files under `.qfai/contracts/**`.
- If any spec has zero resolved contracts, STOP and route back to `/qfai-discussion`.

## BR-0012-0004: Mode Precedence

- AC-Refs: AC-0012-0004

- Mode selection follows: user-specified > discussion recommendation > system default (standard).
- Full-harness is never auto-activated.

## BR-0012-0005: Fidelity DoD

- AC-Refs: AC-0012-0005

- L1 (skeleton): route-level rendering exists for declared primary screens.
- L2 (interactive, default): declared primary interactions wired with mockable behavior; mock path recorded.

## BR-0012-0006: Evidence Dual Artifacts

- AC-Refs: AC-0012-0006

- Both markdown and JSON evidence artifacts are mandatory under `.qfai/evidence/`.
- JSON must include `uiFidelity` for L2 reporting.

## BR-0012-0007: No ATDD/TDD in This Stage

- AC-Refs: AC-0012-0007

- Do not add ATDD or TDD automation in this stage.

## BR-0012-0008: No CLI Command References in Active Documents

- AC-Refs: AC-0012-0010

- No active document (spec, policy, README, SKILL.md, CHANGELOG) may reference `qfai prototyping` as a valid CLI command.
- Superseded content that mentions the CLI command must be clearly labelled as archived/superseded (e.g., `[SUPERSEDED v1.7.12]`).
- If a reference is found during review, it must be corrected before the spec is marked DONE.

## BR-0012-0009: Skill Contract Is SSOT

- AC-Refs: AC-0012-0011

- The prototyping skill contract (`SKILL.md`) is the single source of truth for the prototyping interface.
- No other document may define an alternative invocation path (CLI command, direct script, etc.) for prototyping.
- Responsibility boundary: the skill contract owns interface definition; policies own quality gates and NFRs.

## BR-0012-0010: Static-First Mode-Aware Contract

- AC-Refs: AC-0012-0012

- The skill contract must declare static-first (standard) as the default mode.
- All three modes (low-cost, standard, full-harness) must be documented in the contract with their obligations and triggers.
- Mode definitions must not be split across policies; the contract is self-contained for mode behavior.

## BR-0012-0011: Mode Resolution Precedence

- AC-Refs: AC-0012-0013

- Mode resolution follows strict precedence: explicit user request > discussion-pack recommendation > system default (standard)
- resolvePrototypingMode() implements this precedence chain
- If mode is outside allowed_modes, QFAI-PROT-236 warning is emitted but mode is still applied

## BR-0012-0012: Existence-Based Precedence (D-5)

- AC-Refs: AC-0012-0014

- If the `prototyping` key exists at any level in prototyping.yaml (even as a scalar), the namespaced contract is authoritative
- hasNamespacedRecommendationBlock() checks key existence only, not value validity
- Non-object namespaced block is a hard error with no legacy fallback
- Deprecated top-level schema emits QFAI-PROT-231 (warning)
- Namespaced vs top-level conflict emits QFAI-PROT-232 (warning)

## BR-0012-0013: Recommendation Artifact Resolution

- AC-Refs: AC-0012-0015

- resolveLatestRecommendationArtifact() returns { status, path, recommendation, warnings }
- status values: "valid" (parseable + required fields), "invalid" (exists but malformed), "missing" (pack exists but no file), "no-pack" (no discussion-pack)
- All consumers (report.ts, prototypingEvidence.ts) MUST use this resolver

## BR-0012-0014: Obligation Matrix Derivation

- AC-Refs: AC-0012-0016, AC-0012-0017

- derivePrototypingObligations(surface, mode) maps to boolean flags
- Non-UI surfaces skip: requireUiFidelity=false, requireRenderBundle=false, requireBrowserQaBundle=false
- Full-harness mode adds: requireFullHarness=true
- Low-cost mode reduces: requireRuntimeGate=false (static only)

## BR-0012-0015: Calibration Config Normalization

- AC-Refs: AC-0012-0018

- normalizePrototypingCalibration() provides defaults for all fields
- readRatio() for accept/refine (0.0-1.0), readPositiveInt() for maxIterations, readNonNegativeNumber() for plateauDelta/plateauLookback
- Invalid values are replaced with defaults (not errors)

## BR-0012-0016: fullHarness Schema Contract

- AC-Refs: AC-0012-0019

- fullHarness セクションは以下の 8 フィールドスキーマに準拠する:
  - enabled: boolean（mode が full-harness か）
  - available: boolean（full-harness infrastructure が利用可能か）
  - runId: string | null（一意の実行識別子）
  - iterationCount: number（実行された反復回数）
  - bestIteration: number | null（最高スコアの反復）
  - terminationReason: "converged" | "max-iterations" | null（v1.7.13 で正規化。旧 "accepted" / "cap-reached" は使用禁止）
  - reviewerSignoff: boolean（レビュアー承認済みか）
  - scoringTrace: boolean（キャリブレーション用スコアリングトレースが利用可能か）

## BR-0012-0017: Calibration Config Schema Fields

- AC-Refs: AC-0012-0018

- prototyping.calibration config の完全フィールドスキーマ:
  - packPath: string（デフォルト: ".qfai/evidence/calibration.yaml"）
  - thresholds.accept: number 0.0-1.0（デフォルト: 0.8）— accept 判定の閾値
  - thresholds.refine: number 0.0-1.0（デフォルト: 0.5）— refine 判定の閾値
  - maxIterations: positive integer（デフォルト: 15）— full-harness loop の最大反復回数
  - plateauDelta: non-negative number（デフォルト: 0.02）— plateau 検出の差分閾値
  - plateauLookback: non-negative number（デフォルト: 3）— plateau 検出の lookback 反復数
- 不正値は silent にデフォルト値で置換（エラーではない）
- readRatio() は 0.0-1.0 範囲チェック、readPositiveInt() は正整数チェック

## BR-0012-0018: Mode Provenance Tracking

- AC-Refs: AC-0012-0013

- mode resolution の結果は以下のフィールドで追跡される:
  - requested: ユーザー指定 mode（null if unspecified）
  - effective: 最終適用 mode
  - source: "explicit-request" | "discussion-recommendation" | "system-default"
  - rationale: discussion-pack の推奨理由テキスト
  - discussionRecommendation: discussion-pack からの完全な推奨オブジェクト
  - sourceSchema: "namespaced" | "top-level" | null（prototyping.yaml のスキーマ形式）
- この追跡情報は report.ts と evidence 双方で利用される

## BR-0012-0019: Surface Inference from Evidence

- AC-Refs: AC-0012-0016, AC-0012-0017

- inferSurfaceFromRecommendationAndEvidence() は以下の優先順位で surface を推定する:
  1. prototyping.yaml の surface フィールド（明示的）
  2. Evidence signals（uiRoutes > 0 → web 推定、等）
  3. デフォルト: "non-ui"
- 推定結果は obligation matrix の入力として使用される
