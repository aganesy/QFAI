# 01 Spec

- Spec: spec-0038
- Parent: CAP-0038

## Consumer View

- Primary SSOT for execution: `spec-0038/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: 4ソース統合差分検出TypeScript実装（specDiffDetector）、トレーサビリティ整合性バリデータ（traceabilityValidator）、qfai validate拡張、SKILL.md Spec Auto-Discovery Protocolセクション追加、Evidence Diff Contextスキーマ、--fullフラグ、ベースブランチ設定
- Out: /qfai-verifyインクリメンタル対応、delta.mdパーサー根本改修、CI/CDパイプライン変更、完全セマンティック解析、/qfai-atddインクリメンタル対応

## Applicable NFR

- NFR-0001: 差分検出の漏れ防止 — 4ソース統合による変更検出で漏れゼロを保証（reliability, must）
- NFR-0002: SKILL.mdとTypeScriptの分離 — SKILL.mdはプロンプト定義、TypeScriptは検出ロジック（maintainability, must）
- NFR-0003: フォールバック動作 — evidence不在・git不可時はフルスキャンにフォールバック（reliability, must）
- NFR-0004: 後方互換性 — 既存evidenceファイルにDiff Contextセクションがなくても正常動作（maintainability, must）
- NFR-0005: Diff Summaryの可読性 — テーブル形式で一目把握可能（usability, should）
- NFR-0006: 差分検出の実行時間 — 100spec規模で5秒以内（performance, should）
- NFR-0007: トレーサビリティ検証の精度 — ファイルレベルdiffチェックで偽陰性最小化（reliability, must）
- NFR-0008: 拡張性 — 将来のセマンティック解析への拡張を阻害しないモジュール設計（maintainability, should）

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: TypeScriptモジュール実装、SKILL.md diff、validate出力、ユニットテスト結果

## Relevant Requirements

- REQ-0001: Spec Auto-Discovery Protocol 共通定義
- REQ-0002: Source A — git diff origin/main..HEAD による変更spec検出
- REQ-0003: Source B — git diff / git diff --staged によるローカル変更検出
- REQ-0004: Source C — evidence mtime vs spec mtime によるstale検出
- REQ-0005: Source D — 09_delta.md パースによる変更コンテキスト取得
- REQ-0006: 統合判定ロジック — changed_specs = A ∪ B ∪ C ∪ D、分類: implemented/missing/stale/unchanged
- REQ-0007: /qfai-prototyping Spec Auto-Discovery統合
- REQ-0008: /qfai-implement Spec Auto-Discovery統合
- REQ-0009: Traceability Integrity Validator — spec BR/AC変更と実装ファイル差分の整合性チェック
- REQ-0010: Evidence Diff Context記録
- REQ-0011: --full フラグサポート
- REQ-0012: Policy変更時の影響波及
- REQ-0013: フォールバック動作
- REQ-0014: ベースブランチ設定（origin/main デフォルト、config カスタマイズ可能）

## Entry points

- US range in this spec: US-0038-0001..US-0038-0004
- Primary actors: QFAI利用開発者、AIコーディングエージェント（Claude Code / Copilot / Codex）
- Notes: spec-0011（SKILL.mdプロンプト改修）の範囲外をTypeScript実装・validate拡張として独立

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
