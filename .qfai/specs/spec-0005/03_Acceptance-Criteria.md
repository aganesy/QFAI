# 03 Acceptance Criteria

## Purpose

- Keep acceptance scenarios in this file.
- Gherkin belongs here, not in Business Flow.

## AC Gherkin (required)

```gherkin
# AC-0005-0001
Scenario: ガードレール一覧の正常表示
  Given _policies/ および spec ディレクトリにガードレール定義が存在する
  When `qfai guardrails list` を実行する
  Then 全ガードレールが ID・タイトル・ソースファイル付きで一覧表示される

# AC-0005-0002
Scenario: ガードレール一覧の空結果
  Given ガードレール定義が一切存在しない
  When `qfai guardrails list` を実行する
  Then "ガードレールが見つかりませんでした" というメッセージが表示される

# AC-0005-0003
Scenario: キーワードによるガードレール抽出の正常動作
  Given ガードレール定義が複数存在する
  When `qfai guardrails extract --keyword "セキュリティ"` を実行する
  Then キーワード "セキュリティ" に合致するガードレールのみが表示される

# AC-0005-0004
Scenario: キーワード抽出で該当なし
  Given ガードレール定義が存在する
  When `qfai guardrails extract --keyword "存在しないキーワード"` を実行する
  Then "該当するガードレールが見つかりませんでした" というメッセージが表示される

# AC-0005-0005
Scenario: ガードレール整合性チェックの正常動作
  Given ガードレール定義と成果物が整合している
  When `qfai guardrails check` を実行する
  Then issues=0 で終了コード 0 が返される

# AC-0005-0006
Scenario: ガードレール整合性チェックで違反検出
  Given 成果物がガードレールに違反している
  When `qfai guardrails check` を実行する
  Then 違反が Issue 形式（code, message, suggested_action）で出力され、終了コード 1 が返される
```

## AC Catalog (optional)

| AC_ID   | Title                              | Notes                        | Priority |
| ------- | ---------------------------------- | ---------------------------- | -------- |
| AC-0005-0001 | ガードレール一覧の正常表示          | Happy path                   | P1       |
| AC-0005-0002 | ガードレール一覧の空結果            | Empty result                 | P1       |
| AC-0005-0003 | キーワードによるガードレール抽出    | Happy path                   | P1       |
| AC-0005-0004 | キーワード抽出で該当なし            | Empty result                 | P1       |
| AC-0005-0005 | ガードレール整合性チェック正常      | Happy path                   | P1       |
| AC-0005-0006 | ガードレール整合性チェック違反検出  | Error case                   | P1       |
