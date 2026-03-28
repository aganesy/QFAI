# 01 Spec

- Spec: spec-0027
- Parent: CAP-0027

## Consumer View

- Primary SSOT for execution: `spec-0027/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: UIX-VAL deterministic validators, UIX-REV semantic reviewers, verify-pack tests, migration/upgrade support, CHANGELOG test count correction (25->26)
- Out: browser/runtime evidence (v1.8), render capture (v1.8), external critique adapters (v1.8), full-harness orchestration (v1.8), taste judgment as hard gate

## Applicable NFR

- NFR-0027-0001: UIX-VAL-\* validators は同一入力に対し同一出力を保証する (must)
- NFR-0027-0002: 全 UIX-VAL-\* validators の合計実行時間が 2000ms 以内 (must)
- NFR-0027-0003: 全 validation issue に rule ID, severity, file path, description, fix suggestion を含む (must)
- NFR-0027-0004: UIX-VAL-\* 追加が既存 validator 出力・テストスイートに影響しない (must)
- NFR-0027-0005: Migration チェックはデフォルト warning、config で error 昇格可能 (must)
- NFR-0027-0006: エラーメッセージは自己完結的で expected vs actual を含む (should)
- NFR-0027-0007: 各 UIX-VAL-\* validator は独立テスト可能 (must)
- NFR-0027-0008: 非 UI プロジェクトは UIX-VAL-_/UIX-REV-_ から zero issues (must)
- NFR-0027-0009: 個別 UIX-VAL-\* ルールを config で無効化可能 (should)
- NFR-0027-0010: `UIX-REV-*` プロンプトテンプレートは `UIX-VAL-*` に影響なく独立リバート可能 (should)

## Applicable Policy

- UIX-VAL validators は deterministic (no LLM)、async pattern `(root, config) => Promise<Issue[]>`
- UIX-REV reviewers は prompt templates 経由で accept/refine/pivot 推奨を生成
- UI-bearing 検出は positive signals + negative overrides
- Semantic rule IDs: `UIX-VAL-SIDECAR-MISSING`, `UIX-VAL-STRATEGY-INCOMPLETE` 等
- Migration チェックは warning デフォルト、`uiux.migration.strict` で error 昇格
- 20-char minimum content threshold for critical narrative fields
- 非 UI プロジェクトは全 UIX-VAL/UIX-REV チェックをスキップ

## Evidence Summary

- Discussion: discussion-20260329120000000
- Review: (to be created in SDD review cycle)
- Validate: `.qfai/report/validate.log` (target: `error=0`)
- Coverage: `.qfai/report/specs-coverage/spec-0027.md`

## Relevant Requirements

- REQ-0027-0001: UIX-VAL-\* validator family を validate.ts に async pattern で登録する
- REQ-0027-0002: 全 UIX-VAL-\* で共有される deterministic UI-bearing 検出関数を実装する
- REQ-0027-0003: UI-bearing packs の uiux/ sidecar presence を検証し UIX-VAL-SIDECAR-MISSING を発行する
- REQ-0027-0004: Implementation strategy の required fields と 20-char threshold を検証し UIX-VAL-STRATEGY-INCOMPLETE を発行する
- REQ-0027-0005: Scoring axes の source translation completeness を検証する
- REQ-0027-0006: Aggregate scoring rules の completeness (weights, normalization, threshold) を検証する
- REQ-0027-0007: Option comparison (2+ options) と anchor presence を検証する
- REQ-0027-0008: Screen contracts の minimum structure (states, outcomes, transitions) を検証する
- REQ-0027-0009: OQ closure readiness を検証し blocking OQ でエラーを発行する
- REQ-0027-0010: Prototyping mode declaration consistency を検証する
- REQ-0027-0011: Visual-review backend expectation declaration を検証する
- REQ-0027-0012: UIX-VAL-\* が runtime-dependent checks を含まないことを保証する
- REQ-0027-0013: UIX-REV-\* semantic review prompt templates を提供する
- REQ-0027-0014: UIX-REV-\* から accept/refine/pivot recommendations を生成する
- REQ-0027-0015: 各 UIX-VAL-\* ルールに pass/fail fixture tests を含める
- REQ-0027-0016: Stale sidecar assets を検出し migration guidance 付き warning を発行する
- REQ-0027-0017: 非 UI プロジェクトで全 UIX-VAL-_/UIX-REV-_ チェックをスキップする
- REQ-0027-0018: 全 validation issue に rule ID, file path, severity, description, fix suggestion を含める
- REQ-0027-0019: Verify-pack tests で sidecar creation から validation までの end-to-end パスを検証する
- REQ-0027-0020: Legacy projects の missing uiux/ sidecar を検出し step-by-step migration guidance を提供する
- REQ-0027-0021: Pre-v1.7.3 から v1.7.4 への upgrade sequence を定義する
- REQ-0027-0022: Reviewer prompt template の structure-level tests を含める
- REQ-0027-0023: CHANGELOG v1.7.3 のテストカウントを 25 から 26 に修正する

## Entry points

- US range in this spec: US-0027-0001..US-0027-0006
- Primary actors: QFAI ユーザー (qfai validate 実行者), CI/CD パイプライン
- Notes: This spec implements deterministic UIX-VAL validators and semantic UIX-REV reviewers for UI/UX artifact validation, building on the sidecar artifacts introduced in spec-0026

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: UI-bearing 検出の positive signal と negative override の境界が不明確な場合
- Conflict: UIX-VAL ルールが既存 DDS validator と矛盾する場合
- Missing: 特定の semantic review category のプロンプトテンプレートが未定義の場合
- Trade-off: Migration softness (warning) vs strictness (error) のバランス

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/05_Contracts.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
