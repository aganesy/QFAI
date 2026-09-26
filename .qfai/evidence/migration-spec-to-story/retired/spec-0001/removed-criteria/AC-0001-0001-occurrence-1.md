```gherkin
# AC-0001-0001
Scenario: v1421 layered spec の必須ファイル 9 件が定義されている
  Given specLayout.ts の REQUIRED_LAYERED_SPEC_FILES_V1421 を参照する
  When ファイル一覧を確認する
  Then 01_Spec.md, 02_User-stories.md, 03_Acceptance-Criteria.md, 04_Business-Rules.md, 05_Examples.md, 06_Test-Cases.md, 07_Decisions.md, 08_Open-questions.md, 09_delta.md の 9 ファイルが定義されている
```

