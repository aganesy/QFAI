# 05 Examples

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                 | Expected                                                    |
| ------------ | ------------ | ----------------------------------------------------- | ----------------------------------------------------------- |
| EX-0005-0001 | BR-0005-0001 | `qfai report`（format 未指定）                        | paths.outDir/report.md が生成される                         |
| EX-0005-0002 | BR-0005-0001 | `qfai report --format json`                           | paths.outDir/report.json が生成される                       |
| EX-0005-0003 | BR-0005-0002 | `qfai report --out /tmp/my-report.md`                 | /tmp/my-report.md に出力される                              |
| EX-0005-0004 | BR-0005-0003 | `qfai report --run-validate`                          | 内部バリデーション実行 + レポート生成。validate.json も更新 |
| EX-0005-0005 | BR-0005-0004 | `qfai report --run-validate --in old.json`            | 警告表示、--in は無視、内部バリデーション結果でレポート生成 |
| EX-0005-0006 | BR-0005-0006 | `qfai report`（validate.json 不在）                   | "入力ファイルが見つかりません" エラー、exit 2               |
| EX-0005-0007 | BR-0005-0007 | `qfai report`                                         | report.md + spec-pack レポートが出力される                  |
| EX-0005-0008 | BR-0005-0008 | `qfai report --run-validate --phase refinement`（CI） | phase guard エラー、exit 1                                  |

## EX-0005-0009: Coverage Placeholder for BR-0005-0005

- BR-Ref: BR-0005-0005
- Given the consolidated rule BR-0005-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0005-0005

## EX-0005-0009: Prototyping Section with Valid Evidence

- BR-Ref: BR-0005-0009

| Input | Expected |
| ----- | -------- |
| Valid prototyping evidence + prototyping.yaml (mode: standard) | ## Prototyping section with mode=standard, evidence coverage details |

## EX-0005-0010: Prototyping Section without Evidence

- BR-Ref: BR-0005-0009

| Input | Expected |
| ----- | -------- |
| No prototyping evidence, no discussion-pack | ## Prototyping section with recommendationArtifact.status="no-pack" |

## EX-0005-0011: Mode Provenance in Report

- BR-Ref: BR-0005-0010

| Input | Expected |
| ----- | -------- |
| User specified full-harness, discussion recommends standard | mode.requested="full-harness", mode.effective="full-harness", mode.source="explicit-request" |
| No user override, discussion recommends low-cost | mode.requested=null, mode.effective="low-cost", mode.source="discussion-recommendation" |

## EX-0005-0012: fullHarness in Report

- BR-Ref: BR-0005-0011

| Input | Expected |
| ----- | -------- |
| Full-harness enabled, converged at iteration 3 | enabled=true, iterationCount=3, terminationReason="converged" |
| Standard mode (no full-harness) | enabled=false, all other fields null/0 |

## EX-0005-0013: Calibration in Report

- BR-Ref: BR-0005-0012

| Input | Expected |
| ----- | -------- |
| Config with prototyping.calibration present | calibration.configPresent=true, thresholdSummary populated |
| Config without prototyping stanza | calibration.configPresent=false, thresholdSummary=null |
