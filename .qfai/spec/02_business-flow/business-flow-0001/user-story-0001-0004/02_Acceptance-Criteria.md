# Acceptance Criteria

## Criteria

```gherkin
Feature: Steering & Governance フレームワーク定義

# AC-0001-0004-01
# Parent: US-0001-0004
Scenario: Canonical Workflow Stages が定義されている
  Given Steering & Governance 仕様を参照する
  When Canonical Workflow Stages を確認する
  Then Stage 0（steering refresh）～ Stage 7（verify）の 8 ステージが定義されている
  And Stage 0 は全 Skill 開始時に必須である
  And Stage 4（prototyping）はオプショナルである
  And Stage 6（implementation）は EX ごとの TDD を実施する
```
