# 05 Examples

## Example Table (required)

| EX-ID        | BR-Ref                     | Input                                             | Expected                                                                  |
| ------------ | -------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| EX-0004-0001 | BR-0004-0001               | 正常なスペック構造で `qfai validate`              | 全バリデータ実行、issues + counts + traceability が出力される             |
| EX-0004-0002 | BR-0004-0002               | `qfai validate`（phase 未指定）                   | full フェーズとして全バリデータが実行される                               |
| EX-0004-0003 | BR-0004-0003               | `qfai validate --fail-on error`、warning のみ検出 | 終了コード 0                                                              |
| EX-0004-0004 | BR-0004-0003               | `qfai validate --fail-on warning`、warning 検出   | 終了コード 1                                                              |
| EX-0004-0005 | BR-0004-0004               | `qfai validate --format github`、120件の Issue    | 100件のアノテーション + 重複/超過 summary                                 |
| EX-0004-0006 | BR-0004-0005               | `qfai validate`                                   | validate.json が config.output.validateJsonPath に出力される              |
| EX-0004-0007 | BR-0004-0006               | `qfai validate`                                   | .qfai/report/run-\*/ にランログが保存される                               |
| EX-0004-0008 | BR-0004-0007               | waivers.yml に suppress ルールあり                | 該当 Issue が suppressed=true                                             |
| EX-0004-0009 | BR-0004-0008               | 対象 spec/01_Spec.md が欠落                       | E_SPEC_MISSING_FILESET エラー                                             |
| EX-0004-0010 | BR-0004-0009               | 不正な ID 形式がある                              | E_ID_INVALID_FORMAT エラー                                                |
| EX-0004-0011 | BR-0004-0010               | AC を参照する TC が存在しない                     | QFAI-COV-201 エラー                                                       |
| EX-0004-0012 | BR-0004-0012               | `qfai validate --phase refinement`（CI 環境）     | refinement blocking issue が生成、終了コード 1                            |
| EX-0004-0014 | BR-0004-0013, BR-0004-0016 | UI-bearing パック、新 3-layer 全ファイル完備      | canonical aggregator 経由で pass（構造エラーなし）                        |
| EX-0004-0015 | BR-0004-0017               | uiux/ に旧 4-axis ファイル残存、新 3-layer 欠落   | UIX-VAL-3LAYER-LEGACY-FORMAT / UIX-VAL-3LAYER-FORBIDDEN-FILE warning 発行 |
| EX-0004-0016 | BR-0004-0014               | UI コントラクトなしスペック                       | UIX バリデータ skip、UIX 関連 issue なし                                  |
| EX-0004-0017 | BR-0004-0015               | render-evidence 対象あり、キャプチャ環境未構成    | status=skipped + 理由明示（プレースホルダーなし）                         |
| EX-0004-0018 | BR-0004-0015               | Browser QA テスト定義あり、未実行                 | not-run 報告（fake pass なし）                                            |

## EX-0004-0013: Coverage Placeholder for BR-0004-0011

- BR-Ref: BR-0004-0011
- Given the consolidated rule BR-0004-0011
- When layer coverage is evaluated
- Then at least one example exists for BR-0004-0011

## EX-0004-0014: UI-bearing パックで新 3-layer ファイル完備 → pass

- BR-Ref: BR-0004-0013, BR-0004-0016
- Given UI-bearing なディスカッションパックの uiux/ に 11_design_taste_interview.md, 20_design_eval_invariant.md, 21_design_eval_trend_derived.md, 22_design_eval_product_specific.md, 23_design_eval_aggregate.md, 24_design_eval_dynamic_overrides.md が全て存在する
- When `qfai validate` を実行する
- Then UIX バリデータが canonical aggregator 経由で全ファイルを検証し、構造エラーなしで pass する

## EX-0004-0015: 旧 4-axis ファイルが残存 → migration warning

- BR-Ref: BR-0004-0017
- Given uiux/ に旧 4-axis ファイル（20_eval_axis_usability.md 等）が存在し、新 3-layer ファイルが欠落している
- When `qfai validate` を実行する
- Then UIX-VAL-3LAYER-LEGACY-FORMAT warning が発行され、旧フォーマットからの移行を促す

## EX-0004-0016: Non-UI パック → UIX バリデータ skip

- BR-Ref: BR-0004-0014
- Given スペックに UI コントラクト（uiux/ ディレクトリ）が存在しない
- When `qfai validate` を実行する
- Then UIX バリデータはスキップされ、UIX 関連の error/warning は生成されない

## EX-0004-0017: render-evidence truthful state → skipped with reason

- BR-Ref: BR-0004-0015
- Given render-evidence 対象があるが、キャプチャ環境が未構成である
- When render-evidence バリデータを実行する
- Then status=skipped かつ skip 理由が明示された結果が返され、プレースホルダー pass にならない

## EX-0004-0018: Browser QA 未実行テスト → not-run 報告

- BR-Ref: BR-0004-0015
- Given Browser QA テスト対象が定義されているが未実行である
- When Browser QA バリデータを実行する
- Then 未実行テストが not-run として報告され、pass として偽装されない

## EX-0004-0019: Canonical Validator Registration

- BR-Ref: BR-0004-0018

| Input                           | Expected                                                       |
| ------------------------------- | -------------------------------------------------------------- |
| validate.ts pipeline inspection | runCanonicalUixValidators registered, validateDdpFields absent |

## EX-0004-0020: IssueCategory Values

- BR-Ref: BR-0004-0019

| Input                                    | Expected                           |
| ---------------------------------------- | ---------------------------------- |
| Canonical UIX validator finding          | issue.category === "canonical"     |
| Any validator finding                    | issue.category === "canonical" or "change" (v1.7.14: "compatibility" removed) |

## EX-0004-0021: Canonical Production Path Verification

- BR-Ref: BR-0004-0020

| Input                                                | Expected                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Inspect validate.ts registered validators at runtime | runCanonicalUixValidators present, validateDdpFields absent, legacy namespace removed (v1.7.14) |

## EX-0004-0022: Phase1 Ratchet Active

- BR-Ref: BR-0004-0021

| Input                                                      | Expected                              |
| ---------------------------------------------------------- | ------------------------------------- |
| phase1ReleaseDate set to 10 days ago, UIX-VAL error exists | Error downgraded to warning           |
| phase1ReleaseDate set to 40 days ago, UIX-VAL error exists | Error remains as-is (ratchet expired) |
| phase1ReleaseDate not set                                  | All UIX-VAL severities unchanged      |

## EX-0004-0023: QFAI-AUD-021 Selected Anchor

- BR-Ref: BR-0004-0024

| Input                                                                     | Expected           |
| ------------------------------------------------------------------------- | ------------------ |
| uiux/31_selected_anchor_screen.md with selected_option field present      | No QFAI-AUD-021    |
| uiux/31_selected_anchor_screen.md without selected_option field           | QFAI-AUD-021 error |

## EX-0004-0024: Canonical Validator Enumeration

- BR-Ref: BR-0004-0022

| Input                           | Expected                          |
| ------------------------------- | --------------------------------- |
| Run runCanonicalUixValidators() | 12 validators execute in parallel |

## EX-0004-0025: QFAI-VIS-002 Info Severity

- BR-Ref: BR-0004-0023

| Input                                         | Expected                                          |
| --------------------------------------------- | ------------------------------------------------- |
| HTML+CSS mock absent in sidecar-first project | QFAI-VIS-002 with severity "info" (not "warning") |

## EX-0004-0026: Canonical Barrel Isolation

- BR-Ref: BR-0004-0025

| Input                           | Expected                   |
| ------------------------------- | -------------------------- |
| Import from validators/index.ts | No legacy/ exports present |

## EX-0004-0027: CRIT-005 4-Category Read-Order

- BR-Ref: BR-0004-0026

| Input                                                                      | Expected              |
| -------------------------------------------------------------------------- | --------------------- |
| Critique evidence referencing sidecar + strategy + contracts + eval tokens | QFAI-CRIT-005 passes  |
| Critique evidence missing eval family tokens                               | QFAI-CRIT-005 warning |
