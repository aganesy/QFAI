```gherkin
# AC-0001-0007
Scenario: upper-to-lower 参照が禁止されている
  Given _policies/ のファイルを参照する
  When 個別 spec ID を検索する
  Then US/AC/BR/EX/TC の ID および spec-XXXX 参照が含まれていない
```

