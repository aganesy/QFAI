# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID        | Title                      | AC-Refs                                | Rule                                                                                                                            | Notes                                           | NFR-Refs |
| ------------ | -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- |
| BR-0005-0001 | ガードレール検出ソース     | AC-0005-0001                           | ガードレールは `_policies/07_Constraints.md`、`_policies/08_Decisions.md`、および各 spec の `04_Business-Rules.md` から検出する | ソースファイルの優先順位は policies > spec。検出フォーマット仕様: RFC 2119 キーワード (MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY) を大文字小文字区別なしで検索し、キーワードと周辺コンテキストを1ガードレールエントリとして抽出する。詳細は BR-0005-0009 参照 | -        |
| BR-0005-0002 | ガードレール一覧出力形式   | AC-0005-0001                           | 一覧表示は ID、タイトル、ソースファイルパスを含むテーブル形式で出力する                                                         | -                                               | NFR-0040 |
| BR-0005-0003 | 空結果メッセージ           | AC-0005-0002                           | ガードレールが 0 件の場合、"ガードレールが見つかりませんでした" メッセージを stderr に出力し、終了コード 0 で終了する           | エラーではなく情報メッセージ                    | NFR-0040 |
| BR-0005-0004 | キーワードフィルタリング   | AC-0005-0003                           | extract の `--keyword` は大文字小文字を区別しない部分一致でタイトルおよびルール本文を検索する                                   | -                                               | -        |
| BR-0005-0005 | キーワード抽出空結果       | AC-0005-0004                           | 該当ガードレールが 0 件の場合、"該当するガードレールが見つかりませんでした" メッセージを表示し、終了コード 0 で終了する         | -                                               | NFR-0040 |
| BR-0005-0006 | 整合性チェックアルゴリズム | AC-0005-0005,AC-0005-0006              | check は各ガードレールのルールを成果物（spec ファイル群）と突合し、違反を Issue 形式で報告する                                  | Issue には code, message, suggested_action 必須 | NFR-0040 |
| BR-0005-0007 | チェック終了コード         | AC-0005-0005,AC-0005-0006              | 違反 0 件 → 終了コード 0、違反 1 件以上 → 終了コード 1                                                                          | -                                               | -        |
| BR-0005-0008 | CLI ヘルプ表示             | AC-0005-0001,AC-0005-0003,AC-0005-0005 | `qfai guardrails --help` で list/extract/check の使用方法を表示する                                                             | -                                               | NFR-0042 |
| BR-0005-0009 | ガードレール検出フォーマット | AC-0005-0001                           | ガードレール検出は RFC 2119 キーワードベースで行う。対象キーワード: MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY。検索は大文字小文字を区別しない。検出ソースは `_policies/07_Constraints.md`、`_policies/08_Decisions.md`、`spec/04_Business-Rules.md`。各キーワード出現箇所とその周辺コンテキストを1ガードレールエントリとし、出力には guardrail ID（自動生成）、keyword、source file、context text を含める | OQ-0004 により確定。REQ-0004 (GAP-04) 解消 | -        |
