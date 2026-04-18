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
| EX-0004-0013 | BR-0004-0011               | GitHub annotation の fix text に `%`, `\r`, `\n` を含む | annotation value が `%25`, `%0D`, `%0A` にエスケープされる          |
| EX-0004-0014 | BR-0004-0013, BR-0004-0016 | UI-bearing パック、新 3-layer 全ファイル完備      | canonical aggregator 経由で pass（構造エラーなし）                        |
| EX-0004-0015 | BR-0004-0017               | uiux/ に旧 4-axis ファイル残存、新 3-layer 欠落   | UIX-VAL-3LAYER-LEGACY-FORMAT / UIX-VAL-3LAYER-FORBIDDEN-FILE warning 発行 |
| EX-0004-0016 | BR-0004-0014               | UI コントラクトなしスペック                       | UIX バリデータ skip、UIX 関連 issue なし                                  |
| EX-0004-0017 | BR-0004-0015               | render-evidence 対象あり、キャプチャ環境未構成    | status=skipped + 理由明示（プレースホルダーなし）                         |
| EX-0004-0018 | BR-0004-0015               | Browser QA テスト定義あり、未実行                 | not-run 報告（fake pass なし）                                            |

## EX-0004-0013: GitHub annotation value escape

- BR-Ref: BR-0004-0011

| Input                                      | Expected                                                    |
| ------------------------------------------ | ----------------------------------------------------------- |
| fix text containing `%`, carriage return, and newline | GitHub annotation value escapes them as `%25`, `%0D`, `%0A` |

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

| Input                           | Expected                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Canonical UIX validator finding | issue.category === "canonical"                                                |
| Any validator finding           | issue.category === "canonical" or "change" (v1.7.14: "compatibility" removed) |

## EX-0004-0021: Canonical Production Path Verification

- BR-Ref: BR-0004-0020

| Input                                                | Expected                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Inspect validate.ts registered validators at runtime | runCanonicalUixValidators present, validateDdpFields absent, legacy namespace removed (v1.7.14) |

## EX-0004-0023: QFAI-AUD-021 Selected Anchor

- BR-Ref: BR-0004-0024

| Input                                                                | Expected           |
| -------------------------------------------------------------------- | ------------------ |
| uiux/31_selected_anchor_screen.md with selected_option field present | No QFAI-AUD-021    |
| uiux/31_selected_anchor_screen.md without selected_option field      | QFAI-AUD-021 error |

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

## EX-0004-0028: terminationReason=max-iterations with low iterationCount (v1.7.15)

- BR-Ref: BR-0004-0027

| Input                                                                             | Expected                    |
| --------------------------------------------------------------------------------- | --------------------------- |
| evidence with terminationReason=max-iterations, iterationCount=2, maxIterations=5 | QFAI-PROT-292 error emitted |
| evidence with terminationReason=max-iterations, iterationCount=5, maxIterations=5 | No PROT-292 error           |

## EX-0004-0029: Single-iteration converged reject (v1.7.15)

- BR-Ref: BR-0004-0028

| Input                                                       | Expected                             |
| ----------------------------------------------------------- | ------------------------------------ |
| evidence with terminationReason=converged, iterationCount=1 | QFAI-PROT-290 + QFAI-PROT-308 errors |
| evidence with terminationReason=converged, iterationCount=3 | No PROT-290/308 errors               |

## EX-0004-0030: weightedTotal mismatch (v1.7.15)

- BR-Ref: BR-0004-0029

| Input                                                        | Expected                           |
| ------------------------------------------------------------ | ---------------------------------- |
| iteration with l1.total=0.7, l2.total=0.8, weightedTotal=0.8 | QFAI-PROT-296 error (expected 0.7) |
| iteration with l1.total=0.7, l2.total=0.8, weightedTotal=0.7 | No PROT-296 error                  |

## EX-0004-0031: Reviewer placeholder reject (v1.7.15)

- BR-Ref: BR-0004-0030

| Input                                          | Expected               |
| ---------------------------------------------- | ---------------------- |
| reviewerSignoff.reviewerId="qfai"              | QFAI-PROT-295 error    |
| iteration.reviewerId="default"                 | QFAI-PROT-309 error    |
| reviewerSignoff.reviewerId="alice@example.com" | No PROT-295/309 errors |

## EX-0004-0032: Zero-seeded specCoverage (v1.7.15)

- BR-Ref: BR-0004-0031

| Input                                                               | Expected            |
| ------------------------------------------------------------------- | ------------------- |
| all specs: declared.uiRoutes=0, checked.uiOk=0, missing.uiRoutes=[] | QFAI-PROT-305 error |
| specs with declared.uiRoutes=3, checked.uiOk=2                      | No PROT-305 error   |

## EX-0004-0033: Synthetic mockPaths pass (v1.7.15)

- BR-Ref: BR-0004-0032

| Input                                                 | Expected            |
| ----------------------------------------------------- | ------------------- |
| uiFidelity screen with mockPaths[].status="pass"      | QFAI-PROT-306 error |
| uiFidelity screen with mockPaths[].status="fail" only | No PROT-306 error   |

## EX-0004-0034: CalibrationRef empty (v1.7.15)

- BR-Ref: BR-0004-0033

| Input                                                                  | Expected            |
| ---------------------------------------------------------------------- | ------------------- |
| calibrationRef.configPath=""                                           | QFAI-PROT-301 error |
| calibrationRef.configPath="qfai.config.yaml", packPath="packs/default" | No PROT-301 error   |

## EX-0004-0035: reviewerLogs count mismatch (v1.7.15)

- BR-Ref: BR-0004-0034

| Input                                   | Expected            |
| --------------------------------------- | ------------------- |
| iterationCount=3, reviewerLogs.length=2 | QFAI-PROT-304 error |
| iterationCount=3, reviewerLogs.length=3 | No PROT-304 error   |

## EX-0004-0036: iterations/scoringTrace count mismatch (v1.7.15)

- BR-Ref: BR-0004-0035

| Input                                                        | Expected            |
| ------------------------------------------------------------ | ------------------- |
| iterationCount=3, iterations.length=2, scoringTrace.length=3 | QFAI-PROT-291 error |
| iterationCount=3, iterations.length=3, scoringTrace.length=3 | No PROT-291 error   |

## EX-0004-0037: commitSha missing (v1.7.15)

- BR-Ref: BR-0004-0036

| Input                           | Expected            |
| ------------------------------- | ------------------- |
| iteration.commitSha=""          | QFAI-PROT-297 error |
| iteration.commitSha="abc123def" | No PROT-297 error   |

## EX-0004-0038: limitations missing (v1.7.15)

- BR-Ref: BR-0004-0037

| Input                             | Expected            |
| --------------------------------- | ------------------- |
| fullHarness.limitations=undefined | QFAI-PROT-298 error |
| fullHarness.limitations=[]        | No PROT-298 error   |

## EX-0004-0039: Additional integrity checks (v1.7.15)

- BR-Ref: BR-0004-0038

| Input                                                          | Expected              |
| -------------------------------------------------------------- | --------------------- |
| status=completed, terminationReason=undefined                  | QFAI-PROT-299 error   |
| terminationReason=plateau, iterationCount=1, plateauLookback=3 | QFAI-PROT-300 error   |
| 3 iterations all with commitSha="abc123"                       | QFAI-PROT-302 warning |
| reviewerLog.summary="ok" (3 chars)                             | QFAI-PROT-303 warning |

## EX-0004-0040: Valid evidence passes all v1.7.15 rules

- BR-Ref: BR-0004-0027..BR-0004-0038

| Input                                                                                                                                                                                                        | Expected                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| Well-formed evidence: real reviewer, iterationCount=3 for converged, correct min(l1,l2), non-zero specCoverage, no synthetic mockPaths, matching counts, valid calibrationRef, present commitSha/limitations | Zero PROT-290..309 errors |

## EX-0004-0041: Rev2 evidence category validator cases (v1.7.15 rev2)

- BR-Ref: BR-0004-0039

| Input                                                 | Expected      |
| ----------------------------------------------------- | ------------- |
| discussion.evidenceRefs = []                          | Error emitted |
| screenContract.evidenceRefs = []                      | Error emitted |
| trend.evidenceRefs = []                               | Error emitted |
| declared DB = 3, observed = 0                         | Error emitted |
| uiFidelity.status = "completed", no screen-level data | Error emitted |
| iteration[0].evidenceRefs missing "discussion" key    | Error emitted |
| evidence contains request.l1 field (old schema)       | Error emitted |

## EX-0004-0042: Rev2 validator happy path (v1.7.15 rev2)

- BR-Ref: BR-0004-0039, BR-0004-0040

| Input                                                                                                            | Expected                    |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------- |
| All 8 category evidenceRefs non-empty, screen-level uiFidelity, no old schema artifacts, rev2-compliant fixtures | Zero errors from rev2 rules |

## EX-0004-0043: Rev2 fixture validation (v1.7.15 rev2)

- BR-Ref: BR-0004-0040

- Given normal-path test fixtures in validator tests
- When grepped for l1/l2 direct pass or packVersion:"1.0.0"
- Then zero matches found
- Given error-path test fixtures
- When checked for missing discussion/trend/screenContract evidence cases
- Then all cases present

## EX-0004-0044: Missing guideline research coverage emits warning (v1.7.17)

- BR-Ref: BR-0004-0041

| Input | Expected |
| ----- | -------- |
| UI-bearing pack with no `design_guideline_research` category | UIX-VAL-T05 warning |
| UI-bearing pack with placeholders only, no rule_refs/local_translation | UIX-VAL-T05 warning |
| UI-bearing pack with one valid guideline entry | No UIX-VAL-T05 |

## EX-0004-0045: Adjective-only score anchors emit warning (v1.7.17)

- BR-Ref: BR-0004-0042

| Input | Expected |
| ----- | -------- |
| `score_anchors.high = "very polished and modern"` | UIX-VAL-T06 warning |
| `score_anchors.high = ">=44px targets and contrast >=4.5:1"` | No UIX-VAL-T06 |
