```gherkin
# AC-0001-0003
Scenario: レイアウト検出が v1421 を正しく判別する
  Given spec ディレクトリに 01_Spec.md, 02_User-stories.md, 05_Examples.md が存在する
  When collectSpecEntries() を実行する
  Then layout が "layered"、layeredStyle が "v1421" と判定される
```

