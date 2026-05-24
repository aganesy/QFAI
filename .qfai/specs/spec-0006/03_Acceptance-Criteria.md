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

| AC_ID        | Title              | Notes    | Priority |
| ------------ | ------------------ | -------- | -------- |
| AC-0006-0001 | config found       | REQ-0030 | P1       |
| AC-0006-0002 | config missing     | REQ-0030 | P1       |
| AC-0006-0003 | ディレクトリ構造   | REQ-0030 | P1       |
| AC-0006-0004 | パス解決           | REQ-0030 | P1       |
| AC-0006-0005 | レガシー警告       | REQ-0030 | P2       |
| AC-0006-0006 | JSON 出力          | REQ-0031 | P1       |
| AC-0006-0007 | --fail-on error    | REQ-0032 | P1       |
| AC-0006-0008 | --fail-on warning  | REQ-0032 | P1       |
| AC-0006-0009 | --out ファイル出力 | REQ-0033 | P2       |
| AC-0006-0010 | playwright primary probe | REQ-0107 | P1 |
| AC-0006-0011 | playwright-cli deprecation surface | REQ-0107 | P1 |
| AC-0006-0012 | fresh init + playwright install yields zero error lines | REQ-0107, NFR-0112 | P1 |
| AC-0006-0013 | skills.integrity defaults to warning severity | REQ-0122 | P1 |
| AC-0006-0014 | doctor summary groups errors vs warnings | REQ-0122 | P1 |

```gherkin
# AC-0006-0010
Scenario: playwright primary probe
  Given node_modules/.bin/playwright が存在する prototyping profile プロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then primary probe で playwright が検出される
  And probe order は (1) node_modules/.bin/playwright (Windows では .cmd / .bat / .ps1 を含む) → (2) `npx --no-install playwright --version` fallback の順番でドキュメント化されている
  And playwright-cli は deprecation window 中 accepted だが `D-DEPRECATED-PROBE` (severity warning) を fire する
```

```gherkin
# AC-0006-0011
Scenario: playwright probe 全失敗時の error text
  Given playwright も playwright-cli も node_modules / npx で見つからない
  When `qfai doctor --profile prototyping` を実行する
  Then error text に install hint `npm i -D playwright` が含まれる
  And severity は error
  And sunset version (`1.10.0`) 到達時 `D-DEPRECATED-PROBE` は error にエスカレートされている (本 AC は window 中の挙動を主張)
```

```gherkin
# AC-0006-0012
Scenario: fresh init で error なし
  Given `qfai init` 直後に `npm i -D playwright` を実行したプロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then 出力に `[error]` 接頭辞付きの行が 1 つも含まれない (NFR-0112)
```

```gherkin
# AC-0006-0013
Scenario: skills.integrity defaults to warning
  Given skills.integrity check が drift を検出する状態
  When `qfai doctor` を実行する
  Then finding severity は `warning` (既定値)
  And `--fail-on error` でも exit 0 が維持される (skills.integrity 単独では active profile を block しない)
```

```gherkin
# AC-0006-0014
Scenario: doctor summary は 2 group に分割表示
  Given doctor が errors と warnings を混在で出力する状態
  When `qfai doctor --format text` を実行する
  Then summary に "errors blocking the active profile" group と "warnings advisory of drift" group が個別に出力される
  And skills.integrity finding は wording にかかわらず "warnings advisory of drift" group に表示される
```
