# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 change detection と green-on-skip verdict

# AC-0002-0004-01
# Parent: US-0002-0004
Scenario: 配布 detection と green-on-skip
  Given 配布 orchestrator の detection job と verdict job
  When Markdown のみの diff / source の diff / 認識外パスの diff / shallow clone の 4 入力で detection を走らせ、続いて空 matrix で verdict を評価する
  Then 選択 lane 集合はそれぞれ minimal / full / full / full となり、detection は third-party action を使わず name-only diff + JSON filtering で実装され full history を自 job のみで要求する。diff 失敗と shallow clone では warning annotation を出して full superset に fail open する。verdict は同一ファイル内に co-located され、empty permission map と always-run condition を持ち、空 matrix で exit 0 する
```
