# 04 Business Rules

## Rule Table (required)

| BR-ID        | Title                       | AC-Refs                    | Rule                                                                                                     |
| ------------ | --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| BR-0005-0001 | デフォルト format は md     | AC-0005-0001               | --format 未指定時はデフォルト md として Markdown レポートを生成する                                      |
| BR-0005-0002 | 出力先解決順序              | AC-0005-0001, AC-0005-0006 | --out > config.output.outDir + format 拡張子 の順で出力先を解決する                                      |
| BR-0005-0003 | validate.json 入力解決      | AC-0005-0004, AC-0005-0005 | --run-validate 時は内部実行結果を使用。それ以外は --in > config.output.validateJsonPath の順で入力を解決 |
| BR-0005-0004 | --run-validate で --in 無視 | AC-0005-0004               | --run-validate と --in を同時指定した場合、--in は警告付きで無視する                                     |
| BR-0005-0005 | validate.json 形式検証      | AC-0005-0005               | validate.json は toolVersion, issues, counts, traceability の必須フィールドを含む必要がある              |
| BR-0005-0006 | ENOENT 時 exit 2            | AC-0005-0005               | validate.json が存在しない場合は exit code 2 で終了し、詳細なエラーメッセージを表示する                  |
| BR-0005-0007 | spec-pack レポート自動生成  | AC-0005-0007               | report.md/json 出力後に writeSpecPackReports() を自動実行する                                            |
| BR-0005-0008 | phase guard 統合            | AC-0005-0008               | --run-validate + --phase refinement の場合、phase guard が適用され exit 1 + エラーメッセージ             |

## BR-0005-0009: Prototyping Report Section

- AC-Refs: AC-0005-0009

- report.ts は ReportPrototypingSummary 型で prototyping データを収集する
- recommendationArtifact: status (valid/invalid/missing/no-pack), path
- mode: requested, effective, source, rationale, allowed_modes, surface, sourceSchema
- evidence: specsCoverage diff, runtimeGate, uiFidelity, renderBundle, browserQaBundle, obligationProfile
- fullHarness: enabled, runId, iterationCount, bestIteration, terminationReason, reviewerSignoff
- render: captured/skipped/failed counts, malformed flag, inlinePayloadViolation
- browserQa: findingsBySeverity, findingsByCategory, summaryAggregates, modeMismatch
- calibration: configPresent, thresholdSummary, scoringTraceAvailable
- v1.7.13 では foundation-only（observability note を含む）

## BR-0005-0010: Report Prototyping Mode Provenance Schema

- AC-Refs: AC-0005-0009

- report.ts の prototyping.mode セクションは以下のフィールドを含む:
  - requested: ユーザー指定の mode（null if unspecified）
  - effective: 最終的に適用された mode
  - source: mode 決定源（"explicit-request" | "discussion-recommendation" | "system-default"）
  - rationale: discussion-pack からの推奨理由
  - allowed_modes: discussion-pack で許可された mode リスト
  - surface: 検出された surface type
  - sourceSchema: "namespaced" | "top-level" | null
  - discussionRecommendation: discussion-pack の推奨詳細

## BR-0005-0011: Report fullHarness Schema

- AC-Refs: AC-0005-0009

- report.ts の prototyping.fullHarness セクションは以下の 8 フィールドを含む:
  - enabled: boolean（full-harness mode が有効か）
  - available: boolean（full-harness が利用可能か）
  - runId: string | null（実行 ID）
  - iterationCount: number（反復回数）
  - bestIteration: number | null（最良反復）
  - terminationReason: "converged" | "max-iterations" | null
  - reviewerSignoff: boolean
  - scoringTrace: boolean（スコアリングトレース利用可能か）

## BR-0005-0012: Report Calibration Schema

- AC-Refs: AC-0005-0009

- report.ts の prototyping.calibration セクションは以下のフィールドを含む:
  - configPresent: boolean（prototyping.calibration config が存在するか）
  - thresholdSummary: { accept: number, refine: number } | null
  - scoringTraceAvailable: boolean
