# 01 Spec

- Spec: spec-0001
- Parent: CAP-0001
- Status: active
- Superseded-by: -
- Deprecated-at: -

## Consumer View

- Primary SSOT for execution: `spec-0001/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- 本 spec は v1421 layered spec-pack 構造の定義仕様である。実装 SSOT は `packages/qfai/src/core/specLayout.ts` および `packages/qfai/src/core/validators/specPack.ts`

## Scope

- In: v1421 layered spec-pack 構造（9 spec files + 10 \_policies files）、レイアウト検出ロジック、必須ファイルセット、
  ID フォーマットルール（US-XXXX-YYYY, AC-XXXX-YYYY, BR-XXXX-YYYY, EX-XXXX-YYYY, TC-XXXX-YYYY）、
  トレーサビリティ連鎖（discussion → specs → tests → code → verification）、参照方向ルール（upper-to-lower 禁止）、
  Escalation Hook メカニズム、Drift Protocol、Skill オーケストレーション設計契約、Steering & Governance フレームワーク
- Out: 個別 spec-XXXX の実装詳細、discussion-pack 構造（spec-0002）、CLI コマンド仕様、テストランナー実装

## Applicable NFR

- NFR-0101: Spec-SSOT 整合性 — specLayout.ts と specs が矛盾しない
- NFR-0102: Spec 更新容易性 — SSOT 参照先を明記
- NFR-0105: Validate 互換性 — qfai validate error=0
- NFR-0106: トレーサビリティ完全性

## Applicable Policy

- Policy: \_policies/01_Objective.md, \_policies/07_Constraints.md

## Evidence Summary

- Evidence: `qfai validate` による構造検証結果（必須ファイル充足、トレーサビリティエッジ充足、参照方向違反なし）

## Relevant Requirements

- REQ-0001: v1421 Layered Spec 必須ファイルセット定義 — spec-XXXX/ に 9 ファイル（01_Spec ~ 09_delta）+ 10_Plan.md、\_policies/ に 10 ファイル（01_Objective ~ 10_delta）
- REQ-0002: レイアウト検出ロジック — spec-pack / layered(v1416, v1417, v1421) / legacy の自動判別
- REQ-0003: ID フォーマットルール — US-XXXX-YYYY, AC-XXXX-YYYY, BR-XXXX-YYYY, EX-XXXX-YYYY, TC-XXXX-YYYY の形式、衝突禁止
- REQ-0004: トレーサビリティ連鎖定義 — discussion → specs → tests → code → verification の 5 段連鎖
- REQ-0005: 参照方向ルール — \_policies → spec-XXXX 参照禁止、spec-XXXX → \_policies 参照許可
- REQ-0006: Escalation Hook 定義 — Ambiguous / Conflict / Missing / Trade-off の 4 トリガー
- REQ-0007: Drift Protocol — upstream SSOT 保護、Change Request 手順
- REQ-0008: Skill オーケストレーション設計契約 — 9 Skill カタログ、依存関係、完了契約
- REQ-0009: Steering & Governance — Steering/Instructions 文書構造、Review Roster、Constitution、Canonical Workflow Stages

## Entry points

- US range in this spec: US-0001-0001..US-0001-0009
- Primary actors: フレームワーク設計者、spec 作成スキル、`qfai validate` 検証スキル
- Notes: 旧 spec-0007（Skill Orchestration）、spec-0009（Traceability & Spec Architecture）、spec-0010（Steering & Governance）を統合

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: レイアウト検出で複数の候補が存在する場合
- Conflict: 参照方向ルールと既存 spec の慣行が矛盾する場合
- Missing: Drift Protocol で想定外の例外パターンが発生した場合
- Trade-off: 厳密なトレーサビリティ強制と開発生産性のバランス判断

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
