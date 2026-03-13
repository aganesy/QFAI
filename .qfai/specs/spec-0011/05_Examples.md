# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                                       | Expected                                                                                               | Notes                         |
| ------------ | ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| EX-0011-0001 | BR-0011-0001 | evidence あり、/qfai-prototyping を実行                                                     | 実行前に Preflight Diff Protocol が自動起動し changed_specs が算出される                               | Happy: 自動起動               |
| EX-0011-0002 | BR-0011-0002 | git diff で 仕様A/01_Spec.md, 仕様A/03_Acceptance-Criteria.md が変更                        | Source A = [仕様A]                                                                                     | Happy: git diff 検出          |
| EX-0011-0003 | BR-0011-0003 | last_run_timestamp=2026-03-13T10:00:00Z, 仕様B/01_Spec.md の mtime=2026-03-13T12:00:00Z    | Source B = [仕様B]                                                                                     | Happy: timestamp 比較         |
| EX-0011-0004 | BR-0011-0004 | 仕様A/09_delta.md に「US-0011-0001 の AC 追加」と記載                                       | change_context に 仕様A の delta 情報が含まれる                                                        | Happy: delta.md パース        |
| EX-0011-0005 | BR-0011-0005 | Source A=[仕様A], Source B=[仕様A, 仕様C]                                                   | changed_specs = [仕様A, 仕様C]（union）                                                                | Happy: union 統合             |
| EX-0011-0006 | BR-0011-0006 | changed_specs=[仕様A, 仕様C], change_context に 仕様A の delta あり                         | Diff Summary: 仕様A(A+B, delta あり), 仕様C(B のみ) が表示                                            | Happy: Summary 表示           |
| EX-0011-0007 | BR-0011-0007 | evidence ファイルが存在しない状態で /qfai-atdd を実行                                       | 全 spec がフルスキャン対象、execution_mode=full で実行                                                 | Negative: evidence 不在       |
| EX-0011-0008 | BR-0011-0008 | テストに QFAI トレーサビリティアノテーションあり、スケルトンにも同形式のアノテーションあり | 対象 spec のアノテーション情報が収集される                                                             | Happy: アノテーション収集     |
| EX-0011-0009 | BR-0011-0009 | 仕様A: テスト・コード存在、仕様B: テストなし、仕様C: テスト古い、仕様D: 変更なし | 仕様A=implemented, 仕様B=missing, 仕様C=stale, 仕様D=unchanged                                        | Happy: 4状態分類              |
| EX-0011-0010 | BR-0011-0010 | 仕様C Primary=Behavior, changed_specs に含まれる, テスト更新日 < spec 更新日                | 仕様C = stale                                                                                          | Edge: stale 判定条件          |
| EX-0011-0011 | BR-0011-0010 | 仕様E Primary=Contract, changed_specs に含まれる, テスト更新日 < spec 更新日                | 仕様E = implemented（Primary が Behavior/Initial でないため stale にならない）                         | Edge: stale 非対象            |
| EX-0011-0012 | BR-0011-0011 | changed_specs=[仕様A], /qfai-prototyping インクリメンタル実行                                | 仕様A のスケルトンのみ更新される                                                                       | Happy: prototyping changed    |
| EX-0011-0013 | BR-0011-0012 | 仕様D=unchanged, /qfai-prototyping インクリメンタル実行                                      | 仕様D に対して Runtime Gate チェックのみ実行される                                                      | Happy: prototyping Gate       |
| EX-0011-0014 | BR-0011-0013 | changed_specs=[仕様A], 仕様A に Tag-A, Tag-B が関連                                          | Tag-A, Tag-B のみスケルトン生成対象となる                                                              | Happy: Tags 絞り込み         |
| EX-0011-0015 | BR-0011-0014 | スキル実行完了、git HEAD SHA=abc1234                                                         | evidence Diff Context に last_commit_sha=abc1234 が記録される                                          | Happy: SHA 記録               |
| EX-0011-0016 | BR-0011-0015 | スキル実行完了時刻=2026-03-14T09:30:00Z                                                      | evidence Diff Context に last_run_timestamp=2026-03-14T09:30:00Z が記録される                          | Happy: timestamp 記録         |
| EX-0011-0017 | BR-0011-0016 | インクリメンタルモードで 仕様A, 仕様C を処理                                                 | evidence に changed_specs=[仕様A, 仕様C], execution_mode=incremental が記録される                       | Happy: spec リスト記録        |
| EX-0011-0018 | BR-0011-0017 | evidence あり、/qfai-prototyping --full を実行                                               | Preflight Diff をスキップし全 spec をフルスキャン、execution_mode=full                                  | Happy: --full フラグ          |
| EX-0011-0019 | BR-0011-0018 | Source A で _policies/01_Objective.md が変更されている                                        | changed_specs に全 spec が含まれ「Policy 変更のため全 spec を対象にします」メッセージが提示される       | Edge: Policy 変更             |
| EX-0011-0020 | BR-0011-0019 | evidence あり、/qfai-verify を実行                                                           | Preflight Diff Protocol は実行されず全 spec がフルスキャン対象                                          | Permission: verify 除外       |
| EX-0011-0021 | BR-0011-0020 | 仕様B=missing, /qfai-atdd インクリメンタル実行                                               | 仕様B のテストが新規生成される                                                                         | Happy: atdd missing           |
| EX-0011-0022 | BR-0011-0021 | 仕様C=stale, /qfai-atdd インクリメンタル実行                                                 | 仕様C の既存テストが更新される                                                                         | Happy: atdd stale             |
| EX-0011-0023 | BR-0011-0022 | 仕様D=unchanged, /qfai-atdd インクリメンタル実行                                             | 仕様D のテストはスキップされる                                                                          | Happy: atdd unchanged         |
| EX-0011-0024 | BR-0011-0023 | git リポジトリが存在しない環境で Preflight Diff 実行                                         | Source A スキップ、Source B のみで changed_specs 算出、警告ログ出力                                     | Negative: git 不可            |
| EX-0011-0025 | BR-0011-0024 | Diff Context セクションがない旧 evidence で /qfai-prototyping 実行                           | エラーにならずフルスキャンモードにフォールバック                                                        | State: 後方互換               |
| EX-0011-0026 | BR-0011-0025 | Source A=[仕様A], Source B=[] → changed=[仕様A]。再度同条件で実行                            | 同一の changed_specs が算出される（冪等性）                                                             | Idempotency: 再実行同一結果   |
| EX-0011-0027 | BR-0011-0005 | Source A=[], Source B=[]                                                                     | changed_specs=[]（変更なし）。インクリメンタルモードで全 spec unchanged として処理                      | Edge: 変更ゼロ               |
| EX-0011-0028 | BR-0011-0007 | evidence あるが last_commit_sha が不正値（存在しない SHA）                                    | Source A の git diff がエラー → Source A スキップ、Source B で continued                                | Negative: 不正 SHA            |
