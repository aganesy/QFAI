# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                                 |
| ------------ | ----------- | ------------ | ------------ | ------------------------------------- |
| TC-0006-0001 | integration | AC-0006-0001 | EX-0006-0001 | config found - text 出力              |
| TC-0006-0002 | integration | AC-0006-0002 | EX-0006-0007 | config missing 検出                   |
| TC-0006-0003 | integration | AC-0006-0003 | EX-0006-0008 | ディレクトリ構造診断                  |
| TC-0006-0004 | integration | AC-0006-0004 |              | パス解決診断                          |
| TC-0006-0005 | integration | AC-0006-0005 |              | レガシー警告                          |
| TC-0006-0006 | integration | AC-0006-0006 | EX-0006-0002 | JSON 出力フォーマット                 |
| TC-0006-0007 | unit        | AC-0006-0007 | EX-0006-0004 | --fail-on error pass                  |
| TC-0006-0008 | unit        | AC-0006-0008 | EX-0006-0005 | --fail-on warning fail                |
| TC-0006-0009 | integration | AC-0006-0009 | EX-0006-0006 | --out ファイル出力                    |
| TC-0006-0010 | integration | AC-0006-0001 | EX-0006-0003 | Coverage Placeholder for EX-0006-0003 |
| TC-0006-0011 | integration | AC-0006-0001 | EX-0006-0009 | Coverage Placeholder for EX-0006-0009 |

## TC-0006-0001: config found - text 出力

**Level:** integration
**AC Refs:** AC-0006-0001

Setup: qfai.config.yaml が存在するプロジェクトを用意。
Action: `runDoctor({ root, rootExplicit: true, format: 'text' })` を実行する。
Verify:

- 出力に `config=<path> (found)` が含まれる
- summary に ok/info/warning/error カウントが含まれる

## TC-0006-0007: --fail-on error pass

**Level:** unit
**AC Refs:** AC-0006-0007

Setup: warning のみ検出される状態。
Action: `shouldFailDoctor({ warning: 1, error: 0 }, 'error')` を呼び出す。
Verify:

- 戻り値が false（exit 0）

## TC-0006-0010: Coverage Placeholder for EX-0006-0003

- EX-Ref: EX-0006-0003
- AC-Refs: AC-0006-0001
- Verify that migrated traceability includes EX-0006-0003.

## TC-0006-0011: Coverage Placeholder for EX-0006-0009

- EX-Ref: EX-0006-0009
- AC-Refs: AC-0006-0001
- Verify that migrated example EX-0006-0009 is covered by at least one test case.
