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

## TC-0005-0009: Coverage Placeholder for EX-0005-0005

- EX-Ref: EX-0005-0005
- AC-Refs: AC-0005-0001
- Verify that migrated traceability includes EX-0005-0005.

## TC-0005-0010: Coverage Placeholder for EX-0005-0009

- EX-Ref: EX-0005-0009
- AC-Refs: AC-0005-0001
- Verify that migrated example EX-0005-0009 is covered by at least one test case.

## TC-0005-0009: Prototyping Report Section Present

- EX-Ref: EX-0005-0009
- AC-Refs: AC-0005-0009
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create valid prototyping evidence | Evidence files exist |
| 2 | Run qfai report --format md | report.md generated |
| 3 | Check for ## Prototyping section | Section present with all subsections |

## TC-0005-0010: Prototyping Section No Evidence

- EX-Ref: EX-0005-0010
- AC-Refs: AC-0005-0010
- Type: boundary

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | No prototyping evidence exists | Clean state |
| 2 | Run qfai report --format md | report.md generated |
| 3 | Check ## Prototyping section | Section present, status shows "missing" or "no-pack" |

## TC-0005-0011: Mode Provenance Fields

- EX-Ref: EX-0005-0011
- AC-Refs: AC-0005-0009
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create report with discussion-recommended mode | Report generated |
| 2 | Check prototyping.mode fields | source="discussion-recommendation", effective matches recommendation |

## TC-0005-0012: fullHarness Fields

- EX-Ref: EX-0005-0012
- AC-Refs: AC-0005-0009
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create report with full-harness converged run | Report generated |
| 2 | Check prototyping.fullHarness | enabled=true, terminationReason="converged" |

## TC-0005-0013: Calibration in Report

- EX-Ref: EX-0005-0013
- AC-Refs: AC-0005-0009
- Type: normal

| Step | Action | Expected |
| ---- | ------ | -------- |
| 1 | Create config with prototyping.calibration | Config ready |
| 2 | Run qfai report | calibration.configPresent=true |
| 3 | Remove prototyping stanza from config | Config updated |
| 4 | Run report again | calibration.configPresent=false |
