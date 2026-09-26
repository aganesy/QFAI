```gherkin
# AC-0001-0004
Scenario: ID フォーマットが spec 番号付き 4-4 桁形式に準拠する
  Given spec-0001 のドキュメントを参照する
  When ID パターンを確認する
  Then US/AC/BR/EX/TC の各 ID が spec-0001 namespace の 4-4 桁形式に従っている
```

