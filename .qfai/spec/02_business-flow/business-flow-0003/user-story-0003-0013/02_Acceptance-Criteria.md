# Acceptance Criteria

## Criteria

```gherkin
Feature: ガードレール一覧

# AC-0003-0013-01
# Parent: US-0003-0013
Scenario: ガードレール一覧の正常表示
  Given policy と contract の Markdown に明示的な `DG-NNNN` 項目が存在する
  When `qfai guardrails list` を実行する
  Then 明示項目が ID・種別・テキスト・根拠・再検討条件・ソースファイル付きで一覧表示され、RFC 2119 の語だけでは項目が増えない

# AC-0003-0013-02
# Parent: US-0003-0013
Scenario: ガードレール一覧の空結果
  Given ガードレール定義が一切存在しない
  When `qfai guardrails list` を実行する
  Then "(none)" が表示される
```
