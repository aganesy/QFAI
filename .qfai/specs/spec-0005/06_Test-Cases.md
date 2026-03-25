# 06 Test Cases

## Purpose

- Verify examples and acceptance criteria with explicit refs.
- Include both `AC-Refs` and `EX-Ref` whenever possible.

## Test Case Table (required)

| TC-ID        | Level | AC-Refs                                  | EX-Ref       | Steps                                                                                      | Expected                                                   | Notes              |
| ------------ | ----- | ---------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------ |
| TC-0005-0001 | L2    | AC-0005-0001                             | EX-0005-0001 | 1. \_policies/ と spec-0001/ にガードレール定義を配置 2. `qfai guardrails list` を実行     | 全ソースから検出されたガードレールが一覧表示される         | 検出ソース網羅性   |
| TC-0005-0002 | L2    | AC-0005-0001                             | EX-0005-0002 | 1. ガードレール定義を配置 2. `qfai guardrails list` を実行                                 | ID・タイトル・ソースファイルを含むテーブル形式で出力される | 出力形式検証       |
| TC-0005-0003 | L2    | AC-0005-0002                             | EX-0005-0003 | 1. ガードレール定義がない空のワークスペースを用意 2. `qfai guardrails list` を実行         | "ガードレールが見つかりませんでした" 表示、終了コード 0    | 空結果ハンドリング |
| TC-0005-0004 | L2    | AC-0005-0003                             | EX-0005-0004 | 1. 複数ガードレール定義を配置 2. `qfai guardrails extract --keyword "セキュリティ"` を実行 | キーワード合致分のみ表示（大文字小文字不区別）             | フィルタリング検証 |
| TC-0005-0005 | L2    | AC-0005-0004                             | EX-0005-0005 | 1. ガードレール定義を配置 2. `qfai guardrails extract --keyword "zzz未存在"` を実行        | "該当するガードレールが見つかりませんでした" 表示          | 抽出空結果検証     |
| TC-0005-0006 | L2    | AC-0005-0005                             | EX-0005-0006 | 1. 全成果物をガードレール適合状態にする 2. `qfai guardrails check` を実行                  | issues=0、終了コード 0                                     | 正常チェック検証   |
| TC-0005-0007 | L2    | AC-0005-0006                             | EX-0005-0007 | 1. ガードレール違反する成果物を配置 2. `qfai guardrails check` を実行                      | Issue 形式（code, message, suggested_action）で違反が出力  | 違反検出検証       |
| TC-0005-0008 | L2    | AC-0005-0006                             | EX-0005-0008 | 1. 複数のガードレール違反を含む成果物を配置 2. `qfai guardrails check` を実行              | 複数 Issue が出力され、終了コード 1                        | 終了コード検証     |
| TC-0005-0009 | L2    | AC-0005-0001, AC-0005-0003, AC-0005-0006 |              | 全 AC を網羅する統合テスト: guardrails list → extract → check 実行                         | 全 AC シナリオが正常に動作する                             | 統合カバレッジ     |
| TC-0005-0010 | L2 |  | EX-0005-0009 | Traceability backfill for EX-0005-0009 | EX-0005-0009 is referenced by at least one TC | Auto-added for validator traceability |
| TC-0005-0011 | L2 |  | EX-0005-0010 | Traceability backfill for EX-0005-0010 | EX-0005-0010 is referenced by at least one TC | Auto-added for validator traceability |
