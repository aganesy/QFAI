# 03 Acceptance Criteria

## AC Gherkin (required)

```gherkin
# AC-0007-0001
Scenario: ガードレール一覧の正常表示
  Given _policies/ および spec ディレクトリにガードレール定義が存在する
  When `qfai guardrails list` を実行する
  Then 全ガードレールが ID・タイプ・テキスト・ソースファイル付きで一覧表示される
```

```gherkin
# AC-0007-0002
Scenario: ガードレール一覧の空結果
  Given ガードレール定義が一切存在しない
  When `qfai guardrails list` を実行する
  Then "(none)" が表示される
```

```gherkin
# AC-0007-0003
Scenario: キーワードによるガードレール抽出
  Given ガードレール定義が複数存在する
  When `qfai guardrails extract --keyword <keyword>` を実行する
  Then キーワードに合致するガードレールのみが LLM 向けフォーマットで表示される
```

```gherkin
# AC-0007-0004
Scenario: extract --max 制限
  Given 30 件のガードレールがある
  When `qfai guardrails extract --max 10` を実行する
  Then 最大 10 件のガードレールが出力される
```

```gherkin
# AC-0007-0005
Scenario: ガードレール整合性チェック正常
  Given ガードレールに違反がない
  When `qfai guardrails check` を実行する
  Then error=0 warning=0 で終了コード 0 が返される
```

```gherkin
# AC-0007-0006
Scenario: ガードレール整合性チェック違反検出
  Given ガードレールに違反がある
  When `qfai guardrails check` を実行する
  Then 違反が Issue 形式（code, message, file, severity）で出力され、終了コード 1 が返される
```

```gherkin
# AC-0007-0007
Scenario: action 未指定エラー
  Given action が指定されていない
  When `qfai guardrails` を実行する
  Then "action is required (list|extract|check)" エラーが表示され、終了コード 2 が返される
```

```gherkin
# AC-0007-0008
Scenario: パス読み込みエラー
  Given --paths に存在しないパスが指定される
  When `qfai guardrails list --paths /nonexistent` を実行する
  Then エラーメッセージが表示され、終了コード 2 が返される
```

## AC Catalog (optional)

| AC-ID        | Title               | Notes    | Priority |
| ------------ | ------------------- | -------- | -------- |
| AC-0007-0001 | 一覧の正常表示      | REQ-0040 | P1       |
| AC-0007-0002 | 一覧の空結果        | REQ-0040 | P1       |
| AC-0007-0003 | キーワード抽出      | REQ-0041 | P1       |
| AC-0007-0004 | extract --max       | REQ-0043 | P1       |
| AC-0007-0005 | check 正常          | REQ-0042 | P1       |
| AC-0007-0006 | check 違反検出      | REQ-0042 | P1       |
| AC-0007-0007 | action 未指定エラー | CLI      | P1       |
| AC-0007-0008 | パス読み込みエラー  | REQ-0044 | P1       |
