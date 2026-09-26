```gherkin
# AC-0001-0006
Scenario: 必須トレーサビリティエッジが定義されている
  Given トレーサビリティ連鎖の定義が存在する
  When 必須エッジを確認する
  Then 01_Spec → CAP（Parent 参照）が必須である
  And acceptance criteria ごとに少なくとも 1 test case が必須である
  And business rule ごとに少なくとも 1 example が必須である
  And example ごとに少なくとも 1 test case が必須である
```

