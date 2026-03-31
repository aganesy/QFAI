# 03 Acceptance Criteria

## AC Gherkin (required)

```gherkin
# AC-0006-0001
Scenario: 設定ファイル存在チェック
  Given qfai.config.yaml が存在する
  When `qfai doctor` を実行する
  Then config.found = true として報告される
  And 設定ファイルパスが表示される
```

```gherkin
# AC-0006-0002
Scenario: 設定ファイル不在チェック
  Given qfai.config.yaml が存在しない
  When `qfai doctor` を実行する
  Then config.found = false として報告される
  And 警告メッセージが表示される
```

```gherkin
# AC-0006-0003
Scenario: ディレクトリ構造診断
  Given .qfai/ 配下に specs/ が欠落している
  When `qfai doctor` を実行する
  Then specs/ の欠落が warning として報告される
```

```gherkin
# AC-0006-0004
Scenario: パス解決診断
  Given qfai.config.yaml の testsDir が存在しないパスを指している
  When `qfai doctor` を実行する
  Then パス解決失敗が warning として報告される
```

```gherkin
# AC-0006-0005
Scenario: レガシー警告
  Given レガシーファイルレイアウトが検出される
  When `qfai doctor` を実行する
  Then レガシー警告が表示される
```

```gherkin
# AC-0006-0006
Scenario: JSON 出力
  Given qfai.config.yaml が存在する
  When `qfai doctor --format json` を実行する
  Then JSON 形式で root, config, checks, summary が出力される
```

```gherkin
# AC-0006-0007
Scenario: --fail-on error で warning は pass
  Given doctor チェックで warning のみ検出される
  When `qfai doctor --fail-on error` を実行する
  Then 終了コード 0 で終了する
```

```gherkin
# AC-0006-0008
Scenario: --fail-on warning で warning は fail
  Given doctor チェックで warning が検出される
  When `qfai doctor --fail-on warning` を実行する
  Then 終了コード 1 で終了する
```

```gherkin
# AC-0006-0009
Scenario: --out ファイル出力
  Given doctor チェックが完了する
  When `qfai doctor --format json --out /tmp/doctor.json` を実行する
  Then /tmp/doctor.json に診断結果が出力される
```

## AC Catalog (optional)

| AC_ID        | Title                | Notes          | Priority |
| ------------ | -------------------- | -------------- | -------- |
| AC-0006-0001 | config found         | REQ-0030       | P1       |
| AC-0006-0002 | config missing       | REQ-0030       | P1       |
| AC-0006-0003 | ディレクトリ構造     | REQ-0030       | P1       |
| AC-0006-0004 | パス解決             | REQ-0030       | P1       |
| AC-0006-0005 | レガシー警告         | REQ-0030       | P2       |
| AC-0006-0006 | JSON 出力            | REQ-0031       | P1       |
| AC-0006-0007 | --fail-on error      | REQ-0032       | P1       |
| AC-0006-0008 | --fail-on warning    | REQ-0032       | P1       |
| AC-0006-0009 | --out ファイル出力   | REQ-0033       | P2       |
