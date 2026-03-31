# 09 Delta

## Change Summary

- Change ID: DELTA-0002-0001
- Date: 2026-04-01
- Primary: spec-0002 統合初回作成
- Tags: discussion-pack, uiux, sidecar, consolidation
- Summary: 旧 spec-0023（Discussion Design Hardening）、spec-0026（UIUX Authoring Foundation）、spec-0034（Discussion Canonical Architecture）を spec-0002（discussion-pack 構造定義）に統合

## Rationale

- 旧 3 spec はいずれも discussion-pack の構造・品質・UI/UX オーサリングに関する仕様
- discussion フェーズ全体を 1 つの spec で管理することで、バリデータ・サイドカー・テンプレートの整合性を維持

## Consolidation Mapping

| 新 ID 範囲        | 旧 spec   | 旧 ID 範囲        | 概要                                          |
| ----------------- | --------- | ----------------- | --------------------------------------------- |
| US-0002-0001      | (新規)    | -                 | 15 ファイル構造検証（discussionPack.ts 由来） |
| US-0002-0002      | spec-0023 | US-0023-0001~0010 | UI-bearing 検出、DDS バリデータ               |
| US-0002-0003      | spec-0026 | US-0026-0001~0006 | uiux/ サイドカー、テンプレート                |
| US-0002-0004~0005 | spec-0034 | US-0034-0003~0004 | 3-layer model、scoring-ready schema           |
| US-0002-0006~0007 | spec-0034 | US-0034-0005~0006 | strategy、screen contract                     |
| US-0002-0008~0009 | spec-0034 | US-0034-0001~0002 | taste interview、trend research               |
| US-0002-0010      | (新規)    | -                 | discussion-to-SDD ハンドオフ                  |

## Candidates Considered

1. 旧 3 spec を独立に維持
2. 3 spec を spec-0002 に統合（採用）

## Adopted

- Adopted: 統合
- Why: discussion フェーズ内の仕様が 3 spec に分散していると、バリデータ追加時の影響範囲把握が困難

## Rejected

- Candidate: 独立維持
- Reason: discussion-pack 構造、UI-bearing 検出、サイドカー生成は密接に関連
- DO NOT: discussion フェーズの構造仕様を複数 spec に分散させない

## Impact

- Affects: `.qfai/specs/spec-0002/` 配下の全ファイル
- 旧 spec-0023, spec-0026, spec-0034 は `.qfai/archive/specs-v1.7.x/` に退避済み
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行
- Owner: /qfai-sdd
- Due: 本バッチ完了時

## Implementation Delta Notes

- 旧 spec-0023 の TDD エントリ（TDD-0001~0041）は実装済み。新 spec-0002 の tdd/test-list.md に TC マッピングを記載
- 旧 spec-0026 の uiux/ サイドカーテンプレートは init アセットに反映済み
- 旧 spec-0034 の taste interview / trend scan バリデータは UIX-VAL-TASTE-_ / UIX-VAL-TREND-_ として実装済み
- discussionPack.ts の validateDiscussionPackReadiness() は QFAI-DPACK-001~008 を実装済み
