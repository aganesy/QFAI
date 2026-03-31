# 01 Spec

- Spec: spec-0025
- Parent: CAP-0025

## Consumer View

- Primary SSOT for execution: `spec-0025/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: designAudit.ts（7 audit dimension 静的監査）、designSlop.ts（SLP-01〜SLP-06 slop 検知）、designSlopPatterns.json（ルール定義）、config 拡張（audit セクション）、report 拡張（分離グループ表示）、Quality Profile severity 制御、validators/index.ts 登録、テスト追加、ドキュメント更新
- Out: browser QA（console/network/CWV/axe）、screenshot critique、external AI critique adapter、automatic fix / rewrite、visual regression baseline、Figma / Genspark / MCP 依存、render evidence 必須化

## Applicable NFR

- NFR-0025-0001: Audit バリデータ追加による validate 全体の実行時間増加 ≤ 500ms
- NFR-0025-0002: 新規 slop rule の追加が designSlopPatterns.json への JSON 追記のみで完了する
- NFR-0025-0003: style-heuristic rule が非 UI-bearing pack で発火しない
- NFR-0025-0004: designAudit.ts と designSlop.ts が明確に分離され、既存バリデータと重複しない
- NFR-0025-0005: finding ごとに rule ID, why, evidence, guidance が表示される
- NFR-0025-0006: 既存テスト全パス、既存 config 省略時のデフォルト動作が変わらない

## Applicable Policy

- 既存 `qfai validate` を拡張し、新トップレベル command は増やさない
- 構造欠落と審美ヒューリスティックを rule tier で分離する
- 静的監査は render evidence 非依存で成立する
- AI slop detection は「美的好み」ではなく「再現性のある雑さ」に限定する
- QFAI core は tool-agnostic を維持する
- External DB/API/UI contracts are intentionally `0 items`; rationale is fixed in `_policies/05_Contracts.md`
- Constraint refs: `TC-38`, `TC-39`, `TC-40`, `OC-28`

## Evidence Summary

- Discussion: discussion-20260326072322818
- Review: (to be created in SDD review cycle)
- Validate: `.qfai/report/validate.log` (target: `error=0`)
- Coverage: `.qfai/report/specs-coverage/spec-0025.md`

## Relevant Requirements

- REQ-0025-0001: designAudit.ts を新規作成し、7 audit dimension の静的監査を実行する
- REQ-0025-0002: designSlop.ts を新規作成し、designSlopPatterns.json に基づく SLP-01〜SLP-06 検知を行う
- REQ-0025-0003: designSlopPatterns.json を新規作成し、構造化ルール定義を提供する
- REQ-0025-0004: Stable rule ID 体系（QFAI-AUD-XXX / QFAI-SLP-XXX）を使用する
- REQ-0025-0005: 各 finding に ruleId, dimension, severityTier, message, why, evidence[], guidance を持たせる
- REQ-0025-0006: validators/index.ts に validateDesignAudit と validateDesignSlop を登録する
- REQ-0025-0007: QfaiUiuxConfig に audit セクション（enabled, slopDetection, maxPrimaryCtas, maxRawTokenLiteralWarnings, maxDuplicateFindingsPerRule）を追加する
- REQ-0025-0008: qualityProfile に応じて rule tier を severity にマッピングする
- REQ-0025-0009: report に Design Audit Findings / Slop Guardrails Findings の分離セクションを追加する
- REQ-0025-0010: audit.enabled / slopDetection で有効/無効制御する
- REQ-0025-0011: v1.7.0 UI-bearing 判定ロジックを再利用する
- REQ-0025-0012: design tokens 存在時に token drift を検知する
- REQ-0025-0013: DDP anti-pattern ルールの shared slop engine 移行を整理する
- REQ-0025-0014: designAudit.test.ts と designSlop.test.ts を新規作成する

## Entry points

- US range in this spec: US-0025-0001..US-0025-0005
- Primary actors: QFAI ユーザー（CLI/CI 利用者）、validator maintainer、report maintainer
- Notes: This spec introduces static design quality audit and AI slop guardrails as new validation capabilities within the existing `qfai validate` pipeline

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: audit dimension の検出対象が既存バリデータと重複する場合の責務分担
- Conflict: quality profile の severity 設定が既存 v1.7.0 ルールと矛盾する場合
- Missing: 特定の slop パターンの tier 分類が不明確な場合
- Trade-off: false-positive 低減 vs 検出網羅性

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/05_Contracts.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
