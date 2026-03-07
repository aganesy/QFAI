# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID   | BR-Ref  | Input                                                                  | Expected                                                                                                          | Notes                        |
| ------- | ------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| EX-0005-0001 | BR-0005-0001 | `_policies/07_Constraints.md` にガードレール定義 3 件、任意スペックの `04_Business-Rules.md` に BR 2 件 | 合計 5 件のガードレールが検出される                                                                                | 検出ソースの網羅性確認        |
| EX-0005-0002 | BR-0005-0002 | `qfai guardrails list` 実行                                            | テーブル形式: `GR-001 \| パストラバーサル防止 \| _policies/07_Constraints.md` のように出力                          | 出力形式の確認               |
| EX-0005-0003 | BR-0005-0003 | ガードレール定義が 0 件の状態で `qfai guardrails list`                   | stderr: "ガードレールが見つかりませんでした"、終了コード: 0                                                        | 空結果のハンドリング          |
| EX-0005-0004 | BR-0005-0004 | `qfai guardrails extract --keyword "セキュリティ"` 実行（5 件中 2 件該当） | "セキュリティ" を含む 2 件のガードレールのみ表示                                                                   | 大文字小文字不区別            |
| EX-0005-0005 | BR-0005-0005 | `qfai guardrails extract --keyword "zzz未存在"` 実行                    | stderr: "該当するガードレールが見つかりませんでした"、終了コード: 0                                                 | 抽出空結果                   |
| EX-0005-0006 | BR-0005-0006 | 全成果物がガードレール適合の状態で `qfai guardrails check`               | issues=0、stdout: "全ガードレールに適合しています"、終了コード: 0                                                   | 正常チェック                 |
| EX-0005-0007 | BR-0005-0006 | BR-0005-0001 のパストラバーサル防止ルールに違反する成果物がある状態で `check`    | Issue: `{ code: "QFAI-GR-001", message: "パストラバーサル防止ルール違反", suggested_action: "パス解決ロジックを修正" }` | 違反検出                     |
| EX-0005-0008 | BR-0005-0007 | 違反 2 件の状態で `qfai guardrails check`                               | 2 件の Issue が出力され、終了コード: 1                                                                             | 終了コード確認               |
| EX-0005-0009 | BR-0005-0008 | `qfai guardrails --help` 実行                                          | list, extract, check サブコマンドの使用方法が表示される                                                            | CLI ヘルプ表示確認            |
