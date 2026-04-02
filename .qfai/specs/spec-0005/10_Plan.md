# 10 Plan

- Spec: spec-0005
- Parent: CAP-0005

## 1. Implementation Strategy

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

## 2. Dependencies

| Dependency           | Content                                        |
| -------------------- | ---------------------------------------------- |
| spec-0004 (validate) | report consumes validate.json as primary input |
| spec-0003 (init)     | init creates the output directory structure    |

## 3. Implementation Order

All functionality is already implemented. This spec documents existing behavior.
