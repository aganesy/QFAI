# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                             |
| ------------ | ----------- | ------------ | ------------ | --------------------------------- |
| TC-0005-0001 | integration | AC-0005-0001 | EX-0005-0001 | デフォルト Markdown レポート生成  |
| TC-0005-0002 | integration | AC-0005-0002 | EX-0005-0002 | JSON レポート生成                 |
| TC-0005-0003 | integration | AC-0005-0003 |              | --base-url リポジトリリンク付与   |
| TC-0005-0004 | integration | AC-0005-0004 | EX-0005-0004 | --run-validate 内部バリデーション |
| TC-0005-0005 | integration | AC-0005-0005 | EX-0005-0006 | validate.json 不在時 exit 2       |
| TC-0005-0006 | integration | AC-0005-0006 | EX-0005-0003 | --out 出力先制御                  |
| TC-0005-0007 | integration | AC-0005-0007 | EX-0005-0007 | spec-pack レポート自動生成        |
| TC-0005-0008 | integration | AC-0005-0008 | EX-0005-0008 | phase guard refinement ブロック   |

## TC-0005-0001: デフォルト Markdown レポート生成

**Level:** integration
**AC Refs:** AC-0005-0001

Setup: テストプロジェクトに validate.json を配置する。
Action: `runReport({ root, format: 'md' })` を実行する。
Verify:

- report.md が出力される
- エグゼクティブサマリーセクションが含まれる
- イシュー一覧セクションが含まれる

## TC-0005-0005: validate.json 不在時 exit 2

**Level:** integration
**AC Refs:** AC-0005-0005

Setup: validate.json が存在しないテストプロジェクト。
Action: `runReport({ root, format: 'md' })` を実行する。
Verify:

- エラーメッセージに "入力ファイルが見つかりません" が含まれる
- process.exitCode が 2 に設定される
