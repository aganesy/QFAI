# 09 Delta

## Change Summary

- Change ID: DELTA-0001-0001
- Date: 2026-04-01
- Primary: spec-0001 統合初回作成
- Tags: spec-pack, traceability, governance, consolidation
- Summary: 旧 spec-0007（Skill Orchestration）、spec-0009（Traceability & Spec Architecture）、spec-0010（Steering & Governance）を spec-0001（spec-pack 構造定義）に統合

## Rationale

- 旧 3 spec はいずれもフレームワーク設計仕様であり、spec-pack 構造、トレーサビリティ連鎖、Governance は密接に関連
- v1421 layered spec-pack 構造への移行に伴い、構造定義を 1 つの spec に集約
- 実装 SSOT（specLayout.ts, specPack.ts）との整合性を優先

## Consolidation Mapping

| 新 ID 範囲        | 旧 spec   | 旧 ID 範囲              | 概要                              |
| ----------------- | --------- | ----------------------- | --------------------------------- |
| US-0001-0001~0003 | spec-0009 | US-0009-0001~0003       | Layered Spec 構造、レイアウト検出 |
| US-0001-0004~0007 | spec-0009 | US-0009-0001, 0003~0005 | トレーサビリティ、参照方向、Drift |
| US-0001-0008      | spec-0007 | US-0007-0001~0005       | Skill オーケストレーション        |
| US-0001-0009      | spec-0010 | US-0010-0001~0006       | Steering & Governance             |

## Candidates Considered

1. 旧 3 spec を独立に維持し ID のみ再採番
2. 3 spec を 1 つの spec-0001 に統合（採用）

## Adopted

- Adopted: 統合
- Why: 構造定義・トレーサビリティ・Governance は相互参照が密接で、分離管理のコストが統合コストを上回る

## Rejected

- Candidate: 独立維持
- Reason: spec 間の相互参照が多く、変更時の整合性維持が困難
- DO NOT: spec-pack 構造に関する仕様を複数 spec に分散させない

## Impact

- Affects: `.qfai/specs/spec-0001/` 配下の全ファイル
- 旧 spec-0007, spec-0009, spec-0010 は `.qfai/archive/specs-v1.7.x/` に退避済み
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行
- Owner: /qfai-sdd
- Due: 本バッチ完了時

## Implementation Delta Notes

- specLayout.ts の REQUIRED_LAYERED_SPEC_FILES_V1421 は 9 ファイル（10_Plan.md は含まない）。旧 spec-0009 は 10 ファイル（10_Plan 含む）と記載していたが、実装に合わせて 9 + optional 10_Plan.md に修正
- 旧 spec-0007 の AskUserQuestion Protocol 関連 BR/EX/TC は Steering & Governance の一部として US-0001-0009 に包含

## Triage

| Source                 | Subject                                                                                                                    | Existing Spec | Operation | Sub-op | Approved By  | Rationale                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001 (CHG-003)     | 4-layer assistant-tree (constitution / manifest / catalog / process + agents / skills) を structural definition に追加     | spec-0001     | UPDATE    | APPEND | pin-implied  | spec-pack structural definition の責務 (CAP-0001)。subject-token overlap (`asset`, `tree`, `assistant`). 新 CAP 不要。                              |

## CHG-003 (v1.9.0) — Assistant-layer Recut Structural Definition

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Subject: `.qfai/assistant/` の top-level entry を 6 つに固定 (`constitution/`, `manifest/`, `catalog/`, `process/`, `agents/`, `skills/`) — `assistantAssets.ts` がこの enum を SSOT として参照する
- Cascade:
  - downstream spec-0003 (init) が新 layer 構造を seed
  - downstream spec-0004 (validate) が新 layer 構造を enforce
- Out-of-scope (this spec): 旧 layout の deprecation 受理は spec-0004 が記述。`assistantPaths.ts` SSOT module は spec-0003 / spec-0004 が記述
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0001

