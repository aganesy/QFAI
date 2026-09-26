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

### Story-tree layout

This covers the rows under `## Triage (2026-09-23 spec-to-story)` in
`09_delta.md`. The work is done in the order P1, P2, P3, P5, P6, P7, P8. P1 is
a pull request of its own, merged before the rest. P2 to P8 are ordered commits
of one pull request, which also carries their tests. spec-0005 has work in P3
and P7.

**Elements used.** This plan introduces none. It consumes two that other plans
specify:

- E4, flow scope (`spec-0004/10_Plan.md`): `resolveFlowScope` in
  `packages/qfai/src/core/flowScope.ts`, and `scopedReportPath` in
  `packages/qfai/src/cli/commands/validate.ts`, which `report.ts` already
  imports.
- E2, the story-tree reader (`spec-0001/10_Plan.md`):
  `packages/qfai/src/core/storyTree/tree.ts`, for the per-flow model.

**Order of the work.**

1. P3, in `packages/qfai/src/cli/commands/report.ts`:
   - `--flow` is repeatable. Each value is parsed at the argument boundary by
     `resolveFlowScope`. A value that is not a `BF-NNNN` ID exits 2 before any
     path is built, so raw input never reaches a file name (BR-0005-0016).
   - The input is `scopedReportPath` of the configured `validate.json` with
     the `flow` prefix, which is `validate.flow-<ids>.json`. The output is
     `report.flow-<ids>.md`, or `.json` with `--format json`, unless `--out`
     names another path (BR-0005-0014). A missing scoped input takes the
     existing missing-input guidance, naming `qfai validate` with the same
     `--flow` values.
   - `--spec` on the story tree exits 2, and the message names
     `--flow BF-NNNN` (BR-0005-0015). The layout is read through spec-0001's
     E1 predicate.
   - `packages/qfai/src/cli/main.ts` lists `--flow` in the help text.
2. P7:
   - `packages/qfai/src/core/specPackReport.ts` writes one
     `<outDir>/business-flow-NNNN/` per flow, holding `coverage.md` and
     `traceability-graph.json`. The graph's node types are BF, US, AC, EX, BR
     and CON, built from E2's model. The per-spec report goes (BR-0005-0013).
   - With `--flow`, only the named flows' directories are written.
   - The `--spec` REMOVE row deletes the flag and the tests that pin it.

`packages/qfai/src/core/report.ts` and `specPackReport.ts` are two of the six
callers of `buildContractIndex`, which does not change before P7
(`spec-0004/10_Plan.md`).

**Alternatives rejected.**

- Re-filtering the unscoped `validate.json` inside report: `resolveReportPaths`
  in `report.ts` and `.qfai/contracts/cli/qfai-validate.md#flow-scope` both
  read the scoped file, so report never reinterprets a scope validate did not
  apply.
- A scoped-name helper of report's own: validate and report would name the
  same scope in two places, and report would miss the file validate wrote.

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

### Story-tree layout

| Layer          | Where                              | What it proves                                                                                                                                                                              |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L3 Integration | `packages/qfai/tests/integration/` | `runReport` in-process on a `mkdtemp` story tree, after `runValidate` with the same `--flow` values: per-flow reports, `--flow`, `--spec` refused, a malformed value (TC-0005-0014 to 0017) |
| L5 E2E         | `packages/qfai/tests/e2e/`         | The journey of US-0005-0009                                                                                                                                                                 |

Boundaries that need a case of their own:

- `--flow ../../etc` exits 2 with nothing written (TC-0005-0017). It is kept
  apart from the `--spec` refusal (TC-0005-0016), because the two exit 2 for
  different reasons and only one of them may reach path building.
- The Markdown and JSON results of one flow are separate cases (TDD-0021,
  TDD-0022).
- "Only the named flow's directory; shared reports untouched" (TDD-0023) and
  the per-flow directories of TC-0005-0014 go green at P7 with the rewrite of
  `specPackReport.ts`. The Markdown and JSON cases go green at P3.

## NFR approach

- **NFR-0012: idempotent.** The graph's nodes and edges are written sorted by
  ID, and a flow's files depend only on the validate result and the tree. A
  breach is a second `qfai report` run over the same input that changes any
  file under `<outDir>`.
- **NFR-0040: actionable errors.** The `--spec` refusal names
  `--flow BF-NNNN`, and a missing scoped input names `qfai validate` with the
  same `--flow` values. TC-0005-0016 asserts the first; a breach is a refusal
  whose message names neither.
- **NFR-0042: help.** `--flow` appears in `qfai --help`. A breach is help
  output without it once the option exists.

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

### Story-tree layout

| Risk                                                                                       | Likelihood / impact | Mitigation                                                                                                                  | Trigger to act                                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Scoped file names diverge between validate and report                                      | med / high          | One helper, `scopedReportPath` in `cli/commands/validate.ts`, names both files                                              | A second implementation of the scoped name appears under `packages/qfai/src/`                          |
| Raw `--flow` input reaches a file name                                                     | low / high          | Values are parsed into `BF-NNNN` IDs at the argument boundary, and `scopedReportPath` returns `null` for any unusable value | TC-0005-0017 finds a file under `<outDir>`, or a path is built before the values are parsed            |
| A per-flow case is marked done at P3, before the per-flow reports exist                    | med / low           | TDD-0019, TDD-0020 and TDD-0023 wait for the P7 rewrite of `specPackReport.ts`                                              | One of those rows is `done` while `specPackReport.ts` still writes per-spec reports                    |
| `QFAI-ATDD-111` and `QFAI-ATDD-112` fire for this spec's new cases until their tests exist | high / med          | `/qfai-atdd` and `/qfai-implement` run in the same change; no dogfood pin is added                                          | The change is marked ready to merge with a `QFAI-ATDD-111` or `QFAI-ATDD-112` finding naming spec-0005 |
