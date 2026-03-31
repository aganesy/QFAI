# 05 Examples

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                             | Expected                                                      |
| ------------ | ------------ | ------------------------------------------------- | ------------------------------------------------------------- |
| EX-0004-0001 | BR-0004-0001 | 正常なスペック構造で `qfai validate`              | 全バリデータ実行、issues + counts + traceability が出力される |
| EX-0004-0002 | BR-0004-0002 | `qfai validate`（phase 未指定）                   | full フェーズとして全バリデータが実行される                   |
| EX-0004-0003 | BR-0004-0003 | `qfai validate --fail-on error`、warning のみ検出 | 終了コード 0                                                  |
| EX-0004-0004 | BR-0004-0003 | `qfai validate --fail-on warning`、warning 検出   | 終了コード 1                                                  |
| EX-0004-0005 | BR-0004-0004 | `qfai validate --format github`、120件の Issue    | 100件のアノテーション + 重複/超過 summary                     |
| EX-0004-0006 | BR-0004-0005 | `qfai validate`                                   | validate.json が config.output.validateJsonPath に出力される  |
| EX-0004-0007 | BR-0004-0006 | `qfai validate`                                   | .qfai/report/run-\*/ にランログが保存される                   |
| EX-0004-0008 | BR-0004-0007 | waivers.yml に suppress ルールあり                | 該当 Issue が suppressed=true                                 |
| EX-0004-0009 | BR-0004-0008 | 対象 spec/01_Spec.md が欠落                       | E_SPEC_MISSING_FILESET エラー                                 |
| EX-0004-0010 | BR-0004-0009 | 不正な ID 形式がある                              | E_ID_INVALID_FORMAT エラー                                    |
| EX-0004-0011 | BR-0004-0010 | AC を参照する TC が存在しない                     | QFAI-COV-201 エラー                                           |
| EX-0004-0012 | BR-0004-0012 | `qfai validate --phase refinement`（CI 環境）     | refinement blocking issue が生成、終了コード 1                |

## EX-0004-0013: Coverage Placeholder for BR-0004-0011

- BR-Ref: BR-0004-0011
- Given the consolidated rule BR-0004-0011
- When layer coverage is evaluated
- Then at least one example exists for BR-0004-0011
