# Acceptance Criteria

## Criteria

```gherkin
Feature: playwright primary probe

# AC-0003-0006-01
# Parent: US-0003-0006
Scenario: playwright primary probe
  Given node_modules/.bin/playwright が存在する prototyping profile プロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then primary probe で playwright が検出される
  And probe order は (1) node_modules/.bin/playwright (Windows では .cmd / .bat / .ps1 を含む) → (2) `npx --no-install playwright --version` fallback の順番でドキュメント化されている
  And playwright-cli は deprecation window 中 accepted だが `D-DEPRECATED-PROBE` (severity warning) を fire する

# AC-0003-0006-02
# Parent: US-0003-0006
Scenario: playwright probe 全失敗時の error text
  Given playwright も playwright-cli も node_modules / npx で見つからない
  When `qfai doctor --profile prototyping` を実行する
  Then error text に install hint `npm i -D playwright` が含まれる
  And severity は error
  And sunset version (`1.10.0`) 到達時 `D-DEPRECATED-PROBE` は error にエスカレートされている (本 AC は window 中の挙動を主張)

# AC-0003-0006-03
# Parent: US-0003-0006
Scenario: fresh init で error なし
  Given `qfai init` 直後に `npm i -D playwright` を実行したプロジェクト
  When `qfai doctor --profile prototyping` を実行する
  Then 出力に `[error]` 接頭辞付きの行が 1 つも含まれない (NFR-0112)
```
