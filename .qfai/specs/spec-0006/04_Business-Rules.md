# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                     | AC-Refs                                  | Rule                                                                                                |
| ------------ | ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| BR-0006-0001 | デフォルト format は text | AC-0006-0001                             | --format 未指定時はデフォルト text としてテキスト形式で診断結果を出力する                           |
| BR-0006-0002 | createDoctorData 委譲     | AC-0006-0001, AC-0006-0003, AC-0006-0004 | CLI コマンドは createDoctorData() に診断ロジックを委譲し、結果をフォーマットする                    |
| BR-0006-0003 | root 自動探索             | AC-0006-0001, AC-0006-0002               | --root が明示指定されない場合は startDir から qfai.config.yaml を探索して root を決定する           |
| BR-0006-0004 | failOn 判定               | AC-0006-0007, AC-0006-0008               | --fail-on 未指定時は常に exit 0。error: error > 0 で exit 1。warning: warning + error > 0 で exit 1 |
| BR-0006-0005 | --out 出力                | AC-0006-0009                             | --out 指定時はファイルに出力し、stdout には書き出さない。ディレクトリは自動作成する                 |
| BR-0006-0006 | summary 集計              | AC-0006-0006                             | summary は ok, info, warning, error のカウントを含む                                                |
