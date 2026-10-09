# CLI-0013: `qfai report`

## Ownership boundary

This contract decides what `qfai report` reads, which report files it writes and what they hold, how `--flow` scopes a report, and how the command exits.

The findings a report carries, the waivers that apply to them and how `--flow` selects a validation scope are decided by the `qfai validate` contract (CLI-0014). A report renders them and reinterprets none of them.

## Business rules

| BR-ID | Statement | Examples |
| --- | --- | --- |
| BR-0013-0001 | `qfai report` reads a validation result and renders it as Markdown or JSON, as `--format md\|json` selects. `--in` names the result to read, and without it the report reads the configured validation result. `--out` names the report's path, and without it the report is written as `report.md` or `report.json` under the configured output directory. `--base-url` links the file paths the report names to the repository URL. Without `--run-validate`, a missing validation result exits 2 with a message that the input file was not found. `--run-validate` renders from the validation it runs, with the profile and failure threshold of the matching `qfai validate` options, and a report on a narrow validation profile in CI carries that run's `QFAI-VALIDATE-017` finding. | EX-0001-0058-01, EX-0001-0059-01, EX-0001-0060-01, EX-0001-0061-01, EX-0001-0062-01, EX-0001-0063-01, EX-0001-0064-01, EX-0001-0061-02 |
| BR-0013-0005 | On the story tree the report unit is the business flow. `qfai report` writes, for each flow the result covers, `coverage.md` and `traceability-graph.json` under `<outDir>/business-flow-NNNN/`, and writes no per-spec report. The graph's node types are BF, US, AC, EX, BR and CON. A CON node is named by the contract ID its file declares, whatever the contract's kind and format, and by the file's path when the file declares none. | EX-0001-0064-01, EX-0001-0064-02 |
| BR-0013-0006 | On the story tree, `qfai report --flow BF-NNNN` reads `validate.flow-<ids>.json`, the file `qfai validate --flow` writes for the same flows, and writes `report.flow-<ids>.md`, or `.json` with `--format json`, unless `--out` names another path, which changes only the report's destination. It writes the per-flow reports of the named flows only, so parallel workers over different flows do not overwrite one another's files, and it leaves `report.md` and `report.json` as they were. | EX-0001-0066-01 |
| BR-0013-0008 | A `--flow` value that is not a `BF-NNNN` ID, or that names a flow the story tree does not declare, exits 2 before any file is written, so raw input never reaches a file name. | EX-0001-0066-03 |
| BR-0013-0009 | Under `--flow`, the validation result read must be the one written for the same flows. A repository-wide result is never filtered into a scoped report: when the scoped result is missing, the command exits 2 and names the `qfai validate --flow` run that writes it. | EX-0001-0066-04 |
| BR-0013-0010 | The report's summary counts the declarations of the story tree and carries the validation findings and the waiver totals of the result it reads, unchanged. | EX-0001-0058-01, EX-0001-0059-01 |
| BR-0013-0011 | In a project that still has the 1.x spec-pack layout, `qfai report` exits 2 before it reads an input or writes a report. | EX-0001-0062-02 |
