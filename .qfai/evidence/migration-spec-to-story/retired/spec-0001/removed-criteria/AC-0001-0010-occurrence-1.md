```gherkin
# AC-0001-0010
Scenario: 9 Skill のカタログが定義されている
  Given Skill オーケストレーション仕様を参照する
  When Skill 一覧を確認する
  Then discussion, sdd, atdd, configure, prototyping, verify, tdd-red, tdd-green, tdd-refactor の 9 Skill が定義されている
```

