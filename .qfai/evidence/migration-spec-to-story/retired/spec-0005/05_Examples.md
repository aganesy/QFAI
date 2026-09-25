# 05 Examples

## EX-0005-0001: Missing Screenshot Evidence

- BR-Ref: BR-0005-0002, BR-0005-0003
- Given validate output contains `QFAI-UIE-001`
- When report is generated
- Then the prototyping section tells the user to rerun `/qfai-prototyping` and recapture screenshot evidence

## EX-0005-0002: Missing HTML Evidence

- BR-Ref: BR-0005-0002, BR-0005-0003
- Given validate output contains `QFAI-UIE-002`
- When report is generated
- Then the prototyping section tells the user to rerun `/qfai-prototyping` and recapture HTML evidence

## EX-0005-0003: Legacy Artifact Present

- BR-Ref: BR-0005-0004
- Given a legacy prototyping artifact includes design-system or Lighthouse findings
- When report is generated
- Then the report may summarize the issue without presenting a removed CLI command

## EX-0005-0004: Report Consumes Validate Output

- BR-Ref: BR-0005-0001
- Given validate output exists
- When `qfai report --format md` renders Markdown
- Then Markdown report sections are derived from validate output rather than ad-hoc runtime probing

## EX-0005-0018: JSON Report Consumes Validate Output

- BR-Ref: BR-0005-0001
- Given validate output exists
- When `qfai report --format json` renders JSON
- Then JSON report fields are derived from validate output rather than ad-hoc runtime probing

## EX-0005-0019: Repository Links

- BR-Ref: BR-0005-0001
- Given validate output contains file paths
- When `qfai report --format md --base-url <url>` runs
- Then the report links file paths to the repository URL

## EX-0005-0020: Run Validate Before Reporting

- BR-Ref: BR-0005-0001
- Given a report needs current validation data
- When `qfai report --run-validate` runs
- Then its sections derive from the validation it ran

## EX-0005-0021: Missing Validate Output

- BR-Ref: BR-0005-0001
- Given no validation output exists
- When `qfai report` runs without `--run-validate`
- Then it exits unsuccessfully and reports the missing input

## EX-0005-0022: Custom Output Path

- BR-Ref: BR-0005-0001
- Given validate output exists
- When `qfai report --out <path>` runs
- Then it writes the report to the requested path

## EX-0005-0023: Multiple Business Flows

- BR-Ref: BR-0005-0001
- Given validation output covers multiple business flows
- When `qfai report` runs
- Then it renders the covered flow reports from validation data

## EX-0005-0024: Phase Guard

- BR-Ref: BR-0005-0001
- Given validation output identifies the current phase
- When `qfai report` runs
- Then the report respects the phase guard from validation

## EX-0005-0005: No Prototyping Evidence Present

- BR-Ref: BR-0005-0002, BR-0005-0003
- Given prototyping evidence is absent
- When report is generated
- Then the prototyping section still renders a missing / no-pack status and points to rerun guidance

## EX-0005-0014: Two Flows Give Two Flow Directories

- BR-Ref: BR-0005-0013
- Given the story tree with two business flows, and a `validate.json` from a run over both
- When `qfai report` runs
- Then `report.md` is written, and `<outDir>/business-flow-NNNN/` is written once per flow, each holding `coverage.md` and `traceability-graph.json`
- And no per-spec report is written, and each graph's nodes are of the types BF, US, AC, EX, BR and CON only

## EX-0005-0015: `--flow` Renders One Flow's Result

- BR-Ref: BR-0005-0014
- Given the story tree with two business flows, and `validate.flow-<ids>.json` written by `qfai validate --flow BF-NNNN` for the first flow
- When `qfai report --flow BF-NNNN` runs for the same flow, and again with `--format json`
- Then the first run writes `report.flow-<ids>.md` and the second `report.flow-<ids>.json`, each rendered from `validate.flow-<ids>.json`
- And only the first flow's `<outDir>/business-flow-NNNN/` is written, and `report.md` and `report.json` are left as they were

## EX-0005-0016: `--spec` Refused on the Story Tree

- BR-Ref: BR-0005-0015
- Given the story tree
- When `qfai report --spec <spec-id>` runs
- Then it exits 2, and its message names `--flow BF-NNNN`

## EX-0005-0017: Malformed `--flow` Value

- BR-Ref: BR-0005-0016
- Given the story tree
- When `qfai report --flow ../../etc` runs
- Then it exits 2, and no report file is written, inside `<outDir>` or outside it
