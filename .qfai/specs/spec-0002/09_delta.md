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
- 旧 spec-0034 の taste interview / trend scan バリデータは UIX-VAL-TASTE-\* / UIX-VAL-TREND-\* として実装済み
- discussionPack.ts の validateDiscussionPackReadiness() は QFAI-DPACK-001~008 を実装済み

---

## Change Summary (DELTA-0002-0002)

- Change ID: DELTA-0002-0002
- Date: 2026-04-11
- Primary: v1.7.12 convergence correction — 3-layer canonical sidecar family 完全移行
- Tags: 3-layer, sidecar, 4-axis-removal, convergence, v1.7.12
- Summary: D-001（3-layer evaluation model canonical）、D-004（旧 4-axis テンプレート完全削除）を反映。uiux/ サイドカーのファイルファミリを 3-layer canonical family に置換し、旧 4-axis テンプレート（20*eval_axis*\*.md）を active path から完全排除

## Rationale (DELTA-0002-0002)

- 旧 4-axis モデル（usability/consistency/accessibility/delight）は 3-layer モデル（invariant/trend-derived/product-specific）に統合済み
- v1.7.12 は migration window 終了リリース。旧テンプレートの存在を warning から error に昇格し、canonical model への完全収束を実現
- 00_index.md を新ファイルファミリに準拠した内容に刷新

## v1.7.12 Sidecar File Family Mapping

| 新ファイル                          | 旧ファイル                    | 変更種別 |
| ----------------------------------- | ----------------------------- | -------- |
| 00_index.md                         | 00_index.md                   | 書き換え |
| 10_strategy.md                      | 10_strategy.md                | 維持     |
| 11_design_taste_interview.md        | 11_design_taste_interview.md  | 維持     |
| 20_design_eval_invariant.md         | 20_eval_axis_usability.md     | 置換     |
| 21_design_eval_trend_derived.md     | 21_eval_axis_consistency.md   | 置換     |
| 22_design_eval_product_specific.md  | 22_eval_axis_accessibility.md | 置換     |
| 23_design_eval_aggregate.md         | 23_eval_axis_delight.md       | 置換     |
| 24_design_eval_dynamic_overrides.md | (新規)                        | 追加     |
| 30_comparison.md                    | 31_anchor.md                  | リネーム |
| 40_contracts.md                     | 40_contracts.md               | 維持     |
| 50_review_bundle.md                 | 50_review_bundle.md           | 維持     |
| (削除)                              | 60_critique_loop.md           | 削除     |

## Spec Artifact Changes

| Section                   | Change                                                                      |
| ------------------------- | --------------------------------------------------------------------------- |
| 01_Spec.md                | Scope に 3-layer canonical / 4-axis 完全排除を明記。REQ-0018, REQ-0019 追加 |
| 02_User-stories.md        | US-0002-0003, US-0002-0004 更新。US-0002-0011, US-0002-0012 追加            |
| 03_Acceptance-Criteria.md | AC-0002-0009, AC-0002-0012 更新。AC-0002-0019~0022 追加                     |
| 04_Business-Rules.md      | BR-0002-0016, BR-0002-0018 更新。BR-0002-0027~0030 追加                     |
| 05_Examples.md            | EX-0002-0017~0019 更新。EX-0002-0031~0039 追加                              |
| 06_Test-Cases.md          | TC-0002-0017~0020 更新。TC-0002-0032~0039 追加                              |

## Discussion References

- D-001: 3-layer evaluation model（invariant/trend-derived/product-specific）as canonical
- D-004: Complete removal of old 4-axis templates from active paths

## Candidates Considered (DELTA-0002-0002)

1. Migration window 延長（v1.8.0 まで warning 維持）
2. v1.7.12 で即時 error に昇格し完全削除（採用）

## Adopted (DELTA-0002-0002)

- Adopted: v1.7.12 即時 error
- Why: 3-layer model は十分安定しており、旧 4-axis テンプレートを残す技術的理由がない。warning 期間は v1.7.8~v1.7.11 で十分

## Rejected (DELTA-0002-0002)

- Candidate: migration window 延長
- Reason: 旧テンプレートの残存は SSOT convergence（NFR-0005）に反する。ユーザーへの移行ガイダンスは error メッセージに含める
- DO NOT: 旧 4-axis テンプレートを active sidecar path に復帰させない

## Impact (DELTA-0002-0002)

- Affects: uiux/ サイドカー生成ロジック、サイドカーバリデータ、init アセットテンプレート、00_index.md テンプレート
- 旧 4-axis テンプレートを使用中のプロジェクトは qfai validate で error を受け取る
- Validation: `qfai validate` でエラー 0（3-layer family 準拠のプロジェクト）

## Follow-ups (DELTA-0002-0002)

- init アセットの 4-axis テンプレート除去
- Owner: /qfai-implement
- Due: v1.7.12 実装フェーズ
