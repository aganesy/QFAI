# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                       | AC-Refs                    | Rule                                                                                                     |
| ------------ | --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| BR-0005-0001 | デフォルト format は md     | AC-0005-0001               | --format 未指定時はデフォルト md として Markdown レポートを生成する                                      |
| BR-0005-0002 | 出力先解決順序              | AC-0005-0001, AC-0005-0006 | --out > config.output.outDir + format 拡張子 の順で出力先を解決する                                      |
| BR-0005-0003 | validate.json 入力解決      | AC-0005-0004, AC-0005-0005 | --run-validate 時は内部実行結果を使用。それ以外は --in > config.output.validateJsonPath の順で入力を解決 |
| BR-0005-0004 | --run-validate で --in 無視 | AC-0005-0004               | --run-validate と --in を同時指定した場合、--in は警告付きで無視する                                     |
| BR-0005-0005 | validate.json 形式検証      | AC-0005-0005               | validate.json は toolVersion, issues, counts, traceability の必須フィールドを含む必要がある              |
| BR-0005-0006 | ENOENT 時 exit 2            | AC-0005-0005               | validate.json が存在しない場合は exit code 2 で終了し、詳細なエラーメッセージを表示する                  |
| BR-0005-0007 | spec-pack レポート自動生成  | AC-0005-0007               | report.md/json 出力後に writeSpecPackReports() を自動実行する                                            |
| BR-0005-0008 | phase guard 統合            | AC-0005-0008               | --run-validate + --phase refinement の場合、phase guard が適用され exit 1 + エラーメッセージ             |
