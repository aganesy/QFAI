```gherkin
# AC-0001-0002
Scenario: _policies の必須ファイル 10 件が定義されている
  Given specLayout.ts の REQUIRED_LAYERED_SHARED_FILES_V1421 を参照する
  When ファイル一覧を確認する
  Then 01_Objective.md から 10_delta.md までの 10 ファイルが定義されている
```

