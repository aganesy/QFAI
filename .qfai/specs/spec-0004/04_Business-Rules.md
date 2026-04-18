# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                              | AC-Refs                    | Rule                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0004-0001 | バリデータ順次実行                 | AC-0004-0001               | validate は登録された全バリデータ（33+）を順次実行し、各バリデータの Issue[] を統合する                                                                                                                                                                                   |
| BR-0004-0002 | デフォルトフェーズ full            | AC-0004-0002               | --phase 未指定時はデフォルト full として全バリデータを実行する                                                                                                                                                                                                            |
| BR-0004-0003 | failOn 解決順序                    | AC-0004-0003, AC-0004-0004 | CLI --fail-on > --strict(=warning) > config validation.failOn の順で解決する                                                                                                                                                                                              |
| BR-0004-0004 | GitHub 出力上限100件               | AC-0004-0005               | --format github は重複排除後に最大100件のアノテーションを出力し、超過分は summary に件数表示する                                                                                                                                                                          |
| BR-0004-0005 | validate.json 必須出力             | AC-0004-0006               | validate.json は --format に関わらず常に出力する。出力パスは config.output.validateJsonPath で決定する                                                                                                                                                                    |
| BR-0004-0006 | ランログ自動生成                   | AC-0004-0007               | バリデーション完了後、.qfai/report/run-\*/ にランログを自動保存する                                                                                                                                                                                                       |
| BR-0004-0007 | ウェイバー suppress/downgrade      | AC-0004-0008               | waivers.yml に基づき suppress（suppressed=true）または downgrade（severity 低下）を適用する                                                                                                                                                                               |
| BR-0004-0008 | 必須ファイルセット                 | AC-0004-0009               | 各 spec-XXXX/ は 01_Spec..09_delta の必須ファイルを含む必要がある                                                                                                                                                                                                         |
| BR-0004-0009 | ID 形式規約                        | AC-0004-0010               | ID は `XX-XXXX-YYYY` 形式（XX=CAP/US/AC/BR/EX/TC、XXXX=spec番号、YYYY=連番）に準拠する必要がある                                                                                                                                                                          |
| BR-0004-0010 | トレーサビリティ最小エッジ         | AC-0004-0011               | AC->TC, BR->EX, EX->TC のエッジが全て存在する必要がある                                                                                                                                                                                                                   |
| BR-0004-0011 | GitHub annotation escape           | AC-0004-0005               | GitHub annotation の value は `%`, `\r`, `\n` をエスケープする                                                                                                                                                                                                            |
| BR-0004-0012 | phase guard refinement ブロック    | AC-0004-0015               | `buildCiRefinementIssue()` が refinement phase で blocking issue を生成し、バリデーションをスキップする                                                                                                                                                                   |
| BR-0004-0013 | 3-layer テンプレートファイル名期待 | AC-0004-0016, AC-0004-0017 | UIX バリデータは新 3-layer テンプレートファミリー（11_design_taste_interview.md, 20_design_eval_invariant.md, 21_design_eval_trend_derived.md, 22_design_eval_product_specific.md, 23_design_eval_aggregate.md, 24_design_eval_dynamic_overrides.md）のみを検証対象とする |
| BR-0004-0014 | 存在しないファイル期待の禁止       | AC-0004-0017, AC-0004-0019 | バリデータは実際に生成されるファイルのみを期待し、存在しないファイルに対してエラーを発生させてはならない。Non-UI パックでは UIX バリデータをスキップする                                                                                                                  |
| BR-0004-0015 | Evidence state の truthful 性      | AC-0004-0020, AC-0004-0021 | render-evidence および Browser QA バリデータは captured \| skipped \| failed のいずれかの truthful state のみ返却し、プレースホルダーや fake-complete 状態を使用しない                                                                                                    |
| BR-0004-0016 | canonical aggregator 義務          | AC-0004-0016               | `runAllUixValidators()` は canonical aggregator として動作し、レガシー 4-axis 集約パスを経由しない。validate.ts は直接 canonical パスにルーティングする                                                                                                                   |
| BR-0004-0017 | 旧 4-axis ファイル検出 error       | AC-0004-0018               | 旧 4-axis テンプレートファイル（20_eval_axis_usability 等）が検出された場合、UIX-VAL-3LAYER-FORBIDDEN-FILE error を発行し削除と新 3-layer ファイルへの移行を促す。D-004 に基づき旧テンプレートのバリデーションは行わない                                                  |

## BR-0004-0018: Canonical Production Path

- AC-Refs: AC-0004-0022

- validate.ts pipeline は runCanonicalUixValidators() のみを UIX entrypoint として登録する
- v1.7.14: validateDdpFields および legacy/ ディレクトリは完全削除済み（DR-0115）。migration tooling パスは存在しない

## BR-0004-0019: IssueCategory Discrimination

- AC-Refs: AC-0004-0023

- IssueCategory type: "canonical" | "change"（v1.7.14: "compatibility" は DR-0108 で削除）
- 全 canonical validator は category: "canonical" を emit

## BR-0004-0020: prototypingRecommendation Validator

- AC-Refs: AC-0004-0024

- prototyping.yaml の schema validation を validate pipeline に登録
- 必須フィールド: recommended_mode, rationale, allowed_modes, surface
- allowed_modes に recommended_mode が含まれない場合は QFAI-PROT-154（semantic invariant error）
- v1.7.14: legacy top-level keys の存在は hard error（DR-0112）。QFAI-PROT-231/232 warning は廃止

## BR-0004-0022: Canonical Validator Enumeration

- AC-Refs: AC-0004-0022

- runCanonicalUixValidators() は以下の 12 validator を並列実行する:
  1. validateClassification (classification.ts)
  2. validateSidecarMissing (foundation.ts)
  3. validateTasteInterview (taste.ts)
  4. validateTrendScan (trend.ts)
  5. validateThreeLayerModel (threeLayer.ts)
  6. validateForbiddenLegacyFiles (threeLayer.ts)
  7. validateThreeLayerFamilyCompleteness (threeLayer.ts)
  8. validateScoringReady (scoringReady.ts)
  9. validateStrategyStrong (strategy.ts)
  10. validateScreenContractSchema (screenContract.ts)
  11. validateOptionComparison (comparisonValidator.ts)
  12. validateOqClosure (oqClosure.ts)

## BR-0004-0023: QFAI-VIS-002 Severity Downgrade

- AC-Refs: AC-0004-0016

- v1.7.13 で QFAI-VIS-002（HTML+CSS visual mock 不在）の severity を warning → info に降格
- メッセージ変更: "HTML+CSS visual mock is an optional fallback aid; sidecar artifacts (uiux/) are the primary UI definition"
- 設計意図: sidecar-first モデルで HTML mock は optional/fallback に位置づけ変更

## BR-0004-0024: QFAI-AUD-021 Selected Anchor Audit

- AC-Refs: AC-0004-0016

- v1.7.13 で新規監査ルール QFAI-AUD-021 を追加（v1.7.14: "Selected Direction" → "Selected Anchor" にリネーム）
- uiux/31_selected_anchor_screen.md に selected_option フィールドが存在しない場合に error を emit
- dimension: consistency, tier: 1

## BR-0004-0025: [REMOVED v1.7.14] Canonical Barrel Isolation Rule

- AC-Refs: AC-0004-0022
- Removal note: v1.7.14 で validators/legacy/ ディレクトリ自体が完全削除されたため、barrel isolation ルールは不要（DR-0115）

## BR-0004-0026: QFAI-CRIT-005 Read-Order Requirement

- AC-Refs: AC-0004-0016

- v1.7.13 で renderCritique.ts の QFAI-CRIT-005 read-order 要件を 4 カテゴリに拡張:
  1. Sidecar/Selected-Direction tokens
  2. Strategy tokens
  3. Contracts tokens
  4. Taste/Trend/3-layer evaluation family tokens
- 旧: DDP → Design Token → UI Contract → HTML Mock → Flow

## BR-0004-0027: PROT-292 terminationReason=max-iterations integrity (v1.7.15)

- AC-Refs: AC-0004-0025
- Detection: terminationReason=max-iterations AND iterationCount < calibration.maxIterations
- Severity: error (upgraded from warning in v1.7.14)
- Rule ID: QFAI-PROT-292

## BR-0004-0028: PROT-290/308 single-iteration converged reject (v1.7.15)

- AC-Refs: AC-0004-0026
- Detection: terminationReason=converged AND iterationCount < 2
- Severity: error (PROT-290 upgraded from warning; PROT-308 new error)
- Rule IDs: QFAI-PROT-290, QFAI-PROT-308

## BR-0004-0029: PROT-296 weightedTotal mismatch reject (v1.7.15)

- AC-Refs: AC-0004-0025
- Detection: iteration.weightedTotal !== min(iteration.l1.total, iteration.l2.total) (tolerance 0.001)
- Severity: error
- Rule ID: QFAI-PROT-296

## BR-0004-0030: PROT-295/309 reviewer placeholder reject (v1.7.15)

- AC-Refs: AC-0004-0027
- Detection: reviewerSignoff.reviewerId or iteration.reviewerId is placeholder (qfai, default, auto, system, unknown, empty)
- Severity: error
- Rule IDs: QFAI-PROT-295 (top-level), QFAI-PROT-309 (iteration-level)

## BR-0004-0031: PROT-305 zero-seeded specCoverage reject (v1.7.15)

- AC-Refs: AC-0004-0028
- Detection: all specs have declared/checked counts = 0 and missing arrays empty
- Severity: error
- Rule ID: QFAI-PROT-305

## BR-0004-0032: PROT-306 synthetic mockPaths pass reject (v1.7.15)

- AC-Refs: AC-0004-0029
- Detection: uiFidelity.screens[].mockPaths contains status="pass", id ending "-default", or id containing "auto"
- Severity: error
- Rule ID: QFAI-PROT-306

## BR-0004-0033: PROT-301 calibrationRef missing/empty reject (v1.7.15)

- AC-Refs: AC-0004-0031
- Detection: calibrationRef.configPath or calibrationRef.packPath is empty
- Severity: error
- Rule ID: QFAI-PROT-301

## BR-0004-0034: PROT-304 reviewerLogs count mismatch (v1.7.15)

- AC-Refs: AC-0004-0030
- Detection: reviewerLogs.length !== iterationCount
- Severity: error
- Rule ID: QFAI-PROT-304

## BR-0004-0035: PROT-291 iterations/scoringTrace count mismatch (v1.7.15)

- AC-Refs: AC-0004-0030
- Detection: iterations.length !== iterationCount OR scoringTrace.length !== iterationCount
- Severity: error (upgraded from warning in v1.7.14)
- Rule ID: QFAI-PROT-291

## BR-0004-0036: PROT-297 commitSha missing reject (v1.7.15)

- AC-Refs: AC-0004-0031
- Detection: iteration.commitSha is empty or missing
- Severity: error
- Rule ID: QFAI-PROT-297

## BR-0004-0037: PROT-298 limitations missing reject (v1.7.15)

- AC-Refs: AC-0004-0031
- Detection: fullHarness.limitations is undefined/missing
- Severity: error
- Rule ID: QFAI-PROT-298

## BR-0004-0038: Additional full-harness integrity rules (v1.7.15)

- AC-Refs: AC-0004-0025
- PROT-299: status=completed but terminationReason missing → error
- PROT-300: terminationReason=plateau but iterationCount < plateauLookback → error
- PROT-302: all iterations have identical commitSha → warning
- PROT-303: reviewerLog summary < 10 chars → warning

## BR-0004-0039: Rev2 Evidence Category Validators (v1.7.15 rev2)

- AC-Refs: AC-0004-0033, AC-0004-0034, AC-0004-0035, AC-0004-0036, AC-0004-0037
- REQ-Refs: REQ-0136
- discussion.evidenceRefs.length === 0 → error（新 rule ID）
- screenContract.evidenceRefs.length === 0 → error（新 rule ID）
- trend.evidenceRefs.length === 0 → error（新 rule ID）
- declared DB objects > 0 && observed DB objects === 0 → error（新 rule ID）
- uiFidelity.status === "completed" && screen-level data 不足 → error（新 rule ID）
- iterations[i].evidenceRefs に 8 必須カテゴリのいずれかが欠落 → error（新 rule ID）
- evidence に request.l1/l2 旧 schema 由来の痕跡を検出 → error（新 rule ID）
- 既存ルールの severity 変更は rule ID を維持し severity のみ upgrade

## BR-0004-0040: Validator Tests Rev2 Fixture Policy (v1.7.15 rev2)

- AC-Refs: AC-0004-0038
- REQ-Refs: REQ-0137
- 正常系 fixture: l1/l2 直渡し / packVersion:"1.0.0" / single-iteration converged / actionsWired=0 / flattened DOM labels を含まない
- 異常系 fixture: missing pack / missing reviewer / missing discussion|trend|screenContract evidence / insufficient ui observation / per-spec coverage build failure を含む
