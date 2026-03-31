# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                         | AC-Refs                    | Rule                                                                                                                              |
| ------------ | ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| BR-0007-0001 | ガードレール検出ソース        | AC-0007-0001               | ガードレールは `_policies/` および各 spec の制約事項から RFC 2119 キーワード（MUST/MUST NOT/SHALL/SHOULD/MAY）ベースで検出する    |
| BR-0007-0002 | list 出力形式                 | AC-0007-0001, AC-0007-0002 | list は `# Decision Guardrails (list)` ヘッダ + `- [ID][type] text (file:line)` 形式。0 件時は `- (none)`                         |
| BR-0007-0003 | キーワードフィルタリング      | AC-0007-0003               | extract の `--keyword` は大文字小文字を区別しない部分一致でフィルタリングする                                                      |
| BR-0007-0004 | extract --max デフォルト 20   | AC-0007-0004               | `--max` 未指定時はデフォルト 20。非負整数でない場合はエラー（exit 2）                                                              |
| BR-0007-0005 | extract LLM フォーマット      | AC-0007-0003               | extract は formatGuardrailsForLlm() で LLM 向けフォーマットを出力する                                                             |
| BR-0007-0006 | check 結果形式                | AC-0007-0005, AC-0007-0006 | check は `guardrails check: error=N warning=M` summary + 個別 Issue 行を出力する                                                  |
| BR-0007-0007 | check 終了コード              | AC-0007-0005, AC-0007-0006 | error > 0 → exit 1、error = 0 → exit 0                                                                                            |
| BR-0007-0008 | action 必須                   | AC-0007-0007               | action が未指定の場合はエラーメッセージを表示して exit 2                                                                           |
| BR-0007-0009 | パスエラーハンドリング        | AC-0007-0008               | loadDecisionGuardrails のエラー（パス不在等）があれば全エラーを表示して exit 2                                                     |
| BR-0007-0010 | normalize + sort              | AC-0007-0001, AC-0007-0003 | list/extract では normalizeDecisionGuardrails() + sortDecisionGuardrails() で正規化・ソートしてから出力する                       |
