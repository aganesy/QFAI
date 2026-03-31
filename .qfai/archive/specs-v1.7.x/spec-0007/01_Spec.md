# 01 Spec

- Spec: spec-0007
- Parent: CAP-0007

## Consumer View

- Primary SSOT for execution: `.qfai/assistant/skills/` 配下の各 SKILL.md
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- 本 spec はフレームワーク設計仕様であり、CLI コマンド仕様ではない。Skill の設計契約を文書化する

## Scope

- In: 9 つの Skill（discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor）のカタログ定義、依存関係、完了契約、Evidence 要件
- Out: 各 Skill の内部実装詳細、CLI コマンド仕様、SKILL.md の逐語的内容（SSOT は SKILL.md 自体）

## Applicable NFR

- NFR-0101: Spec-SSOT 整合性 — SKILL.md と specs が矛盾しない
- NFR-0102: Spec 更新容易性 — SSOT 参照先を明記
- NFR-0105: Validate 互換性 — qfai validate error=0
- NFR-0106: トレーサビリティ完全性

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: Skill カタログ構造検証結果、依存関係グラフ整合性、完了契約定義完全性

## Relevant Requirements

- REQ-0001: Skill カタログ定義 — 9 つの Skill の名前・目的・引数ヒント・ロール・必須出力を spec-0007 で定義する
- REQ-0002: Skill 依存関係定義 — Skill 間の依存関係（discussion→sdd→prototyping→atdd→verify）と実行順序制約を定義する
- REQ-0003: Skill 完了契約定義 — 各 Skill の Completion Contract（必須成果物、OQ exit 条件、Gate pass 条件）を定義する
- REQ-0004: Skill Evidence 要件定義 — 各 Skill が生成すべき Evidence（パス命名、必須セクション、gitignore ポリシー）を定義する
- REQ-0005: AskUserQuestion Protocol 定義 — 全 9 SSOT スキルの SKILL.md に AskUserQuestion Protocol セクションを追加し、優先使用・構造化選択肢・フォールバック・スキル固有例・統一配置を定義する

## Entry points

- US range in this spec: US-0007-0001..US-0007-0005
- Primary actors: QFAI フレームワーク設計者、AI エージェント
- Notes: 本 spec は Skill オーケストレーションの設計契約を定義する。ランタイム SSOT は各 SKILL.md に存在する

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
