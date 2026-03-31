# 01 Spec

- Spec: spec-0009
- Parent: CAP-0009

## Consumer View

- Primary SSOT for execution: `spec-0009/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: トレーサビリティ連鎖定義、Layered Spec Architecture設計、参照方向ルール、Escalation Hook、Drift Protocol体系化
- Out: 個別 spec-XXXX の実装詳細、テストランナー実装、CI/CD パイプライン設定

## Applicable NFR

- (フレームワーク設計 spec のため、直接適用する NFR はない。本 spec は他の spec が遵守すべき構造ルールを定義する)

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/02_Initiative.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: `qfai validate` による構造検証結果（トレーサビリティエッジ充足、参照方向違反なし）

## Relevant Requirements

- REQ-0009: トレーサビリティ連鎖定義 - discussion → specs → tests → code → verification の5段連鎖と各段の成果物
- REQ-0010: Layered Spec Architecture定義 - \_policies/（共有ポリシー層）+ spec-XXXX/（Capability固有層）の2層構造、1 CAP = 1 spec directory
- REQ-0011: 参照方向ルール定義 - upper-to-lower禁止、lower-to-upper許可
- REQ-0012: Escalation Hook定義 - spec-XXXX/01_Spec.mdから\_policiesへの参照委譲メカニズム
- REQ-0013: Drift Protocol体系化 - upstream SSOT保護、Change Request手順、owner skill rerun、allowed exceptions

## Entry points

- US range in this spec: US-0009-0001..US-0009-0005
- Primary actors: フレームワーク設計者、spec 作成スキル、`qfai validate` 検証スキル
- Notes: 本 spec は QFAI フレームワーク自体のアーキテクチャ設計を文書化する。実装ではなく設計哲学と構造ルールを定義する

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: トレーサビリティエッジの要否判断が曖昧な場合
- Conflict: 参照方向ルールと既存 spec の慣行が矛盾する場合
- Missing: Drift Protocol で想定外の例外パターンが発生した場合
- Trade-off: 厳密なトレーサビリティ強制と開発生産性のバランス判断

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
