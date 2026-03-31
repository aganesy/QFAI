# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                                |
| ------------ | ----------- | ------------ | ------------ | ------------------------------------ |
| TC-0004-0001 | integration | AC-0004-0001 | EX-0004-0001 | 全バリデータ実行と Issue 集約        |
| TC-0004-0002 | integration | AC-0004-0002 | EX-0004-0002 | デフォルト full フェーズ             |
| TC-0004-0003 | unit        | AC-0004-0003 | EX-0004-0003 | --fail-on error で warning は pass   |
| TC-0004-0004 | unit        | AC-0004-0004 | EX-0004-0004 | --fail-on warning で warning は fail |
| TC-0004-0005 | integration | AC-0004-0005 | EX-0004-0005 | --format github アノテーション出力   |
| TC-0004-0006 | integration | AC-0004-0006 | EX-0004-0006 | validate.json 出力                   |
| TC-0004-0007 | integration | AC-0004-0007 | EX-0004-0007 | ランログ生成                         |
| TC-0004-0008 | integration | AC-0004-0008 | EX-0004-0008 | ウェイバー suppress 適用             |
| TC-0004-0009 | integration | AC-0004-0009 | EX-0004-0009 | 必須ファイル欠落検出                 |
| TC-0004-0010 | integration | AC-0004-0010 | EX-0004-0010 | ID フォーマット不正検出              |
| TC-0004-0011 | integration | AC-0004-0011 | EX-0004-0011 | トレーサビリティエッジ欠落           |
| TC-0004-0012 | integration | AC-0004-0012 |              | ATDD アノテーション検証              |
| TC-0004-0013 | integration | AC-0004-0013 |              | blocking OQ 検出                     |
| TC-0004-0014 | integration | AC-0004-0014 |              | 冪等性 - 2回実行で同一結果           |
| TC-0004-0015 | integration | AC-0004-0015 | EX-0004-0012 | phase guard refinement ブロック      |

## TC-0004-0001: 全バリデータ実行と Issue 集約

**Level:** integration
**AC Refs:** AC-0004-0001

Setup: テストプロジェクトに正常なスペック構造を配置する。
Action: `runValidate({ root, strict: false })` を実行する。
Verify:

- ValidationResult に issues, counts, traceability が含まれる
- validate.json が出力される

## TC-0004-0005: --format github アノテーション出力

**Level:** integration
**AC Refs:** AC-0004-0005

Setup: 複数の Issue が検出されるスペック構造を配置する。
Action: `runValidate({ root, format: 'github' })` を実行する。
Verify:

- stdout に `::error` または `::warning` 形式の出力がある
- 重複排除されている
- summary 行に counts が含まれる
