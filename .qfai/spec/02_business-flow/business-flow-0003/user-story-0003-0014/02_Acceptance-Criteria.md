# Acceptance Criteria

## Criteria

```gherkin
Feature: ガードレール抽出

# AC-0003-0014-01
# Parent: US-0003-0014
Scenario: キーワードによるガードレール抽出
  Given ガードレール定義が複数存在する
  When `qfai guardrails extract --keyword <keyword>` を実行する
  Then キーワードに合致するガードレールのみが LLM 向けフォーマットで表示される

# AC-0003-0014-02
# Parent: US-0003-0014
Scenario: extract --max 制限
  Given 30 件のガードレールがある
  When `qfai guardrails extract --max 10` を実行する
  Then 最大 10 件のガードレールが出力される
```
