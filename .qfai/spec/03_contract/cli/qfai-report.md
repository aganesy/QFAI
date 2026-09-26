# CLI Contract: `qfai report`

- Contract scope: the public report command and its story-tree scope
- Migration origin: `spec-0005`
- Used-by: `/qfai-verify` and operators reading validation results
- SSOT modules: `packages/qfai/src/cli/commands/report.ts` and `packages/qfai/src/core/report.ts`

## Command surface

`qfai report` renders validation results as Markdown or JSON. It reads a
validation result or runs validation when `--run-validate` is set. `--in` names
an explicit result, `--out` names an explicit output, and `--format md|json`
selects the rendered format. The command uses the configured output directory
when no output is named. The validation profile and failure threshold follow
the corresponding `qfai validate` options.

`--flow BF-NNNN` scopes the result to the named business
flow. A scoped report reads the matching `validate.flow-<ids>.json` and writes
`report.flow-<ids>.md`, or `.json` for JSON format. An explicit `--out` changes
only the report destination. An explicit `--in` must carry the requested scope
in its filename; a repository-wide result is not silently filtered into a
scoped report. An invalid flow, an absent flow, or `--spec` is an argument
error (exit 2) and writes no scoped result. The parser refuses `--spec` with
an instruction to use `--flow BF-NNNN`. A legacy spec-pack layout is rejected
before an input is read or an output is written.

The report unit is a business flow. The summary counts declarations in the
story tree and carries validation findings and waiver totals without
reinterpreting them. It writes `coverage.md` and `traceability-graph.json`
under `<outDir>/business-flow-NNNN/` for each selected flow. The graph uses
BF, US, AC, EX, BR, and CON nodes. A scoped run writes only its selected
flow directories. The validation contract owns the finding definitions and
scope-selection rules.

The Markdown `## Prototyping` section is present even when no evidence pack
exists. In that case it reports `Status: no-pack` and points to
`/qfai-prototyping`. With evidence, it reports Mode, Obligations, Evidence
coverage, Render, Browser QA, and Calibration. A field absent from the
evidence is shown as unavailable, never as a passing result.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Examples                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0170 | Report Reads Validate Output - `qfai report` reads validate output and renders Markdown or JSON summaries. - `--base-url` links the file paths it names to the repository URL. `--out` writes the report to the given path. - Without `--run-validate`, a missing validate output exits 2 and reports that the input file was not found. - `--run-validate` renders from the validation it runs, and a report on a narrow validate profile in CI carries that run's `QFAI-VALIDATE-017` finding. | EX-0001-0060-01, EX-0001-0061-01, EX-0001-0062-01, EX-0001-0063-01, EX-0001-0064-01, EX-0001-0065-01, EX-0001-0066-02, EX-0001-0063-02 |
| BR-0171 | Prototyping Section Reflects Current Posture - The report includes a prototyping section. - That section describes screenshot / HTML evidence readiness from the accepted convergence iteration's `evidenceRefs[]` entries (`kind`, `path`) for each screen, carries validation findings, and gives rerun guidance. - It does not depend on the retired per-iteration capture script or `QFAI-UIE-001/002` findings, and it must not instruct users to run `qfai prototyping`.                   | EX-0001-0067-01, EX-0001-0067-02, EX-0001-0067-04                                                                                      |
| BR-0172 | Recover Guidance - When the accepted iteration lacks a valid screenshot or HTML `evidenceRefs[]` entry for a screen, recover guidance points to rerunning `/qfai-prototyping` and recapturing the missing kind. - Missing evidence is a rerun condition, not an optional note.                                                                                                                                                                                                                   | EX-0001-0067-01, EX-0001-0067-02                                                                                                       |
| BR-0173 | Legacy Artifact Reading - If legacy prototyping artifacts are present, report may summarize them. - Legacy artifact support must not change the public interface posture.                                                                                                                                                                                                                                                                                                                        | EX-0001-0067-03                                                                                                                        |
| BR-0174 | On the Story Tree the Report Unit Is the Business Flow - On the story tree, `qfai report` writes one report per business flow in place of the per-spec reports, at `<outDir>/business-flow-NNNN/`, holding `coverage.md` and `traceability-graph.json`. - The graph's node types are BF, US, AC, EX, BR and CON.                                                                                                                                                                                 | EX-0001-0066-02                                                                                                                        |
| BR-0175 | `--flow` Scopes the Report - On the story tree, `qfai report --flow BF-NNNN` reads `validate.flow-<ids>.json`, the file `qfai validate --flow` writes for the same flows, and writes `report.flow-<ids>.md`, or `.json` with `--format json`, unless `--out` names another path. - It writes the per-flow reports of the named flows only, so parallel workers over different flows do not overwrite one another's files (`.qfai/spec/03_contract/cli/qfai-validate.md#flow-scope`).             | EX-0001-0068-01                                                                                                                        |
| BR-0176 | `--spec` Is Refused on the Story Tree - On the story tree, `qfai report --spec <spec-id>` exits 2, and its message names `--flow BF-NNNN` as the option that scopes a report (`.qfai/spec/03_contract/cli/qfai-validate.md#flow-scope`).                                                                                                                                                                                                                                                         | EX-0001-0068-02                                                                                                                        |
| BR-0177 | A Malformed `--flow` Value Writes Nothing - A `--flow` value that is not a `BF-NNNN` ID exits 2 before any file is written, so raw input never reaches a file name (`.qfai/spec/03_contract/cli/qfai-validate.md#flow-scope`).                                                                                                                                                                                                                                                                   | EX-0001-0068-03                                                                                                                        |
