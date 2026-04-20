# 99_delta — 変更履歴

<!-- UX-INTENT: ui_bearing: false — Rejected Visual Directions セクションは non-UI につき対象外 -->

## Change History

| Date       | Change Type | Section               | Summary                                                                                      | Rationale                                                                                 |
| ---------- | ----------- | --------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 2026-04-17 | adopted     | 01_Context.md         | ui_bearing: false / primary_surface: non-ui に分類確定                                       | packages/qfai ライブラリ変更のみ。UI サーフェスなし。                                      |
| 2026-04-17 | adopted     | 02_Inception-Deck.md  | WS 実装順序（refSemantics → specCoverage → panelScore → measurement → index → tests → README）を Inception Deck Q6 に Mermaid で可視化 | 依存関係の明確化。後工程（SDD/TDD）への引き継ぎ情報として必要。                            |
| 2026-04-17 | adopted     | 06_REQ.md             | REQ-0001〜0013 の 13 件を確定。WS-1（0001〜0007）/ WS-2（0008〜0009）/ WS-3（0010〜0013）で分類 | 設計書 rev11 の WS 定義・DoD と 1:1 対応。                                                 |
| 2026-04-17 | adopted     | 11_OQ-Register.md     | OQ-0002（#screen: reject テスト）と OQ-0003（scoreL1/L2 export）を resolved、OQ-0001/0004 を deferred | delivery-planner の preflight 評価に基づきアクション可否を確定。                           |
| 2026-04-17 | adopted     | 09_Constraints.md     | TC-01〜TC-11 / OC-01〜OC-05 / DC-01〜DC-08 を確定。実装順序固定（TC-11）を明記               | 設計書 rev11 の制約を構造化して後工程で参照可能にするため。                                 |
| 2026-04-17 | correction  | 04_Sources.md         | Traceability テーブルのノートずれ修正（REQ-0003 挿入時の更新漏れ）+ REQ-0013・NFR-0006 追加 | requirements-reviewer FAIL (R02) 指摘を受けて修正。                                       |
| 2026-04-17 | correction  | 06_REQ.md             | REQ-0002 の非空検証対象に `screenContractRefs` を追加（8カテゴリ全列挙に統一）             | requirements-reviewer 指摘：全8カテゴリの列挙が REQ-0003 との整合に必要。                  |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option                                                      | Reason                                                                                                    | Recurrence Prevention                                                                                   |
| ---------- | ------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 2026-04-17 | OQ-0001 | PerSpecCoverage dead fields を即時削除（Option A）                    | SDD フェーズのコード精査なしには影響範囲を確定できない。現状は 0/empty で機能的問題なし。                   | SDD フェーズ開始時に必ず OQ-0001 の再起票と判断を義務付ける（13_Deferred.md に記録済み）。               |
| 2026-04-17 | OQ-0002 | 既存の `#dashboard` 正例のみで DoD 5-2 を満たすとみなす（Option A）  | 設計書 rev11 sec.6-3-1 が `#screen:dashboard` を明示的な負例として記載しており、省略は DoD 不達となる。    | REQ-0010 に `#screen:<slug>` reject テストを明記。テストレビューで AC との対応を確認する。              |
| 2026-04-17 | OQ-0004 | テストファイルを常に新規作成（存在チェックなし）                      | 既存ファイルが存在する場合に新規作成すると重複が生じる。設計書が「新規または既存拡張」と記載。             | TDD 開始時に `ls packages/qfai/tests/core/prototyping/` で確認してから判断するルールを 13_Deferred.md に記録。 |
| 2026-04-17 | OQ-0005 | `#L0` を valid な行参照として扱う（Option B）                         | 設計書が「positive integer」と明記。0 は正の整数ではないため `#L0` は文法上無効。                         | `refSemantics.test.ts` に `#L0` reject テストを境界値ケースとして追加する（REQ-0013 に明記）。           |

## Rejected Visual Directions

*Non-UI pack (ui_bearing: false) のため本セクションは対象外。*

## Drift Events

| Date       | Trigger                                          | Impact Assessment                                                                        | Files Updated                                 |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| 2026-04-17 | delivery-planner が WS-1/WS-2 ソース変更着地済みを指摘 | スコープの主軸が「ソース変更」から「テスト同期（WS-3）」に移動。05_Scope.md の Assumptions に反映。 | 05_Scope.md Assumptions, 11_OQ-Register.md OQ-0004 deferred 理由 |
