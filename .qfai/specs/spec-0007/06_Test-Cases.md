# 06 Test Cases

## Test Case Table (required)

| TC-ID        | Level       | AC-Refs      | EX-Ref       | Title                                  |
| ------------ | ----------- | ------------ | ------------ | -------------------------------------- |
| TC-0007-0001 | integration | AC-0007-0001 | EX-0007-0001 | ガードレール検出ソース網羅性           |
| TC-0007-0002 | integration | AC-0007-0001 | EX-0007-0002 | list 出力形式検証                      |
| TC-0007-0003 | integration | AC-0007-0002 | EX-0007-0003 | list 空結果ハンドリング                |
| TC-0007-0004 | integration | AC-0007-0003 | EX-0007-0004 | extract キーワードフィルタリング       |
| TC-0007-0005 | integration | AC-0007-0004 | EX-0007-0005 | extract --max 制限                     |
| TC-0007-0006 | integration | AC-0007-0005 | EX-0007-0006 | check 正常（error=0, exit 0）          |
| TC-0007-0007 | integration | AC-0007-0006 | EX-0007-0007 | check 違反検出（error>0, exit 1）      |
| TC-0007-0008 | unit        | AC-0007-0007 | EX-0007-0008 | action 未指定エラー（exit 2）          |
| TC-0007-0009 | integration | AC-0007-0008 | EX-0007-0009 | パス読み込みエラー（exit 2）           |
| TC-0007-0010 | integration | AC-0007-0001 | EX-0007-0010 | migrated example EX-0007-0010 coverage |
| TC-0007-0011 | integration | AC-0007-0001 | EX-0007-0011 | migrated example EX-0007-0011 coverage |

## TC-0007-0001: ガードレール検出ソース網羅性

**Level:** integration
**AC Refs:** AC-0007-0001

Setup: `_policies/` と spec 内にガードレール定義を配置する。
Action: `runGuardrails({ root, action: 'list', paths: [] })` を実行する。
Verify:

- 全ソースから検出されたガードレールが一覧表示される

## TC-0007-0007: check 違反検出

**Level:** integration
**AC Refs:** AC-0007-0006

Setup: ガードレール違反が含まれる成果物を配置する。
Action: `runGuardrails({ root, action: 'check', paths: [] })` を実行する。
Verify:

- 出力に `[error]` Issue 行が含まれる
- 戻り値が 1

## TC-0007-0010: Coverage Placeholder for EX-0007-0010

- EX-Ref: EX-0007-0010
- AC-Refs: AC-0007-0001
- Verify that migrated example EX-0007-0010 is covered by at least one test case.

## TC-0007-0011: Coverage Placeholder for EX-0007-0011

- EX-Ref: EX-0007-0011
- AC-Refs: AC-0007-0001
- Verify that migrated example EX-0007-0011 is covered by at least one test case.
