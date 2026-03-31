# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                           | AC-Refs                    | Rule                                                                                                    |
| ------------ | ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| BR-0004-0001 | バリデータ順次実行              | AC-0004-0001               | validate は登録された全バリデータ（33+）を順次実行し、各バリデータの Issue[] を統合する                 |
| BR-0004-0002 | デフォルトフェーズ full         | AC-0004-0002               | --phase 未指定時はデフォルト full として全バリデータを実行する                                          |
| BR-0004-0003 | failOn 解決順序                 | AC-0004-0003, AC-0004-0004 | CLI --fail-on > --strict(=warning) > config validation.failOn の順で解決する                            |
| BR-0004-0004 | GitHub 出力上限100件            | AC-0004-0005               | --format github は重複排除後に最大100件のアノテーションを出力し、超過分は summary に件数表示する        |
| BR-0004-0005 | validate.json 必須出力          | AC-0004-0006               | validate.json は --format に関わらず常に出力する。出力パスは config.output.validateJsonPath で決定する  |
| BR-0004-0006 | ランログ自動生成                | AC-0004-0007               | バリデーション完了後、.qfai/report/run-\*/ にランログを自動保存する                                     |
| BR-0004-0007 | ウェイバー suppress/downgrade   | AC-0004-0008               | waivers.yml に基づき suppress（suppressed=true）または downgrade（severity 低下）を適用する             |
| BR-0004-0008 | 必須ファイルセット              | AC-0004-0009               | 各 spec-XXXX/ は 01_Spec..09_delta の必須ファイルを含む必要がある                                       |
| BR-0004-0009 | ID 形式規約                     | AC-0004-0010               | ID は `XX-XXXX-YYYY` 形式（XX=CAP/US/AC/BR/EX/TC、XXXX=spec番号、YYYY=連番）に準拠する必要がある        |
| BR-0004-0010 | トレーサビリティ最小エッジ      | AC-0004-0011               | AC->TC, BR->EX, EX->TC のエッジが全て存在する必要がある                                                 |
| BR-0004-0011 | GitHub annotation escape        | AC-0004-0005               | GitHub annotation の value は `%`, `\r`, `\n` をエスケープする                                          |
| BR-0004-0012 | phase guard refinement ブロック | AC-0004-0015               | `buildCiRefinementIssue()` が refinement phase で blocking issue を生成し、バリデーションをスキップする |
