# 10 Plan

- Spec: spec-0005
- Parent: CAP-0005

## Implementation approach

### Primary Source Files

| File                                       | Responsibility                                                 |
| ------------------------------------------ | -------------------------------------------------------------- |
| `packages/qfai/src/cli/commands/report.ts` | CLI entry point. runReport() with format/input/output routing  |
| `packages/qfai/src/core/report.ts`         | createReportData(), formatReportMarkdown(), formatReportJson() |
| `packages/qfai/src/core/specPackReport.ts` | writeSpecPackReports() for per-spec reports                    |

### Key Functions (implemented)

| Function                 | Responsibility                                                 |
| ------------------------ | -------------------------------------------------------------- |
| `runReport()`            | CLI orchestrator: resolve input, generate report, write output |
| `createReportData()`     | Build report data structure from ValidationResult              |
| `formatReportMarkdown()` | Format report as Markdown with optional base URL links         |
| `formatReportJson()`     | Format report as JSON                                          |
| `writeSpecPackReports()` | Generate per-spec report files                                 |
| `isValidationResult()`   | Validate shape of input validate.json                          |

## Test approach

| Layer       | Where                                                                                 | What it proves                                                               |
| ----------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| unit        | `packages/qfai/tests/core/report*.test.ts`                                            | Markdown / JSON formatting, layer distribution, delta-scan disclosure        |
| cli         | `packages/qfai/tests/cli/report.test.ts`                                              | Flag routing (`--format` / `--input` / `--output`) and exit codes            |
| integration | `packages/qfai/tests/integration/validateReportStaleReferences.{window,zero}.test.ts` | Stale-reference reporting at both ends: inside the window, and the zero case |

The boundary that needs its own case rather than a shared one is the input
shape: `report` consumes a `validate.json` this spec does not produce, so
`isValidationResult()` is the seam where a malformed or foreign file has to be
refused rather than half-read.

## Dependencies

| Dependency           | Content                                        |
| -------------------- | ---------------------------------------------- |
| spec-0004 (validate) | report consumes validate.json as primary input |
| spec-0003 (init)     | init creates the output directory structure    |

## Implementation Order

All functionality is already implemented. This spec documents existing behavior.

## v1.7.13 Implementation Notes

- Prototyping report section: `packages/qfai/src/core/report.ts` — ReportPrototypingSummary, collectPrototypingSummary()
- Subsections: recommendationArtifact, mode, evidence, fullHarness, render, browserQa, calibration
- Foundation-only: not integrated into blocking validation in v1.7.13
- Implemented in v1.7.13-22.

## Risk mitigation

| Risk                                                                                                     | Likelihood / impact | Mitigation                                                                                                                                       | Trigger to act                                                                      |
| -------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `validate.json` changes shape in spec-0004 and `report` reads the new file as if it were the old one     | med / high          | `isValidationResult()` validates the shape at the boundary rather than trusting the extension; a foreign file is refused, not partially rendered | A `validate.json` field is added or renamed in spec-0004 with no report-side change |
| This file documents behavior that has already shipped, so it drifts silently as the implementation moves | med / med           | The source and function tables above name real symbols, so a rename breaks the reader's search rather than reading as still-true prose           | A function named in the tables no longer resolves under `src/`                      |
| Per-spec report output overwrites a pack's previous report and loses the comparison a reader wanted      | low / med           | `writeSpecPackReports()` writes under the configured `outDir`, which is a generated tree the repository does not version                         | A report path is proposed outside `outDir`                                          |
