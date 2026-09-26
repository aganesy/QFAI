# 04 Business Rules

## BR-0005-0001: Report Reads Validate Output

- AC-Refs: AC-0005-0001, AC-0005-0002, AC-0005-0003, AC-0005-0004, AC-0005-0005, AC-0005-0006, AC-0005-0007, AC-0005-0008
- `qfai report` reads validate output and renders Markdown or JSON summaries.

## BR-0005-0002: Prototyping Section Reflects Current Posture

- AC-Refs: AC-0005-0009, AC-0005-0010
- The report may include a prototyping section.
- That section must describe screenshot / HTML evidence readiness, validator findings, and rerun guidance.
- It must not instruct users to run `qfai prototyping`.

## BR-0005-0003: Recover Guidance

- AC-Refs: AC-0005-0009, AC-0005-0010
- When prototyping evidence is incomplete, recover guidance points to rerunning `/qfai-prototyping`.
- Missing screenshot/HTML evidence is treated as a rerun condition, not as an optional note.

## BR-0005-0004: Legacy Artifact Reading

- AC-Refs: AC-0005-0009
- If legacy prototyping artifacts are present, report may summarize them.
- Legacy artifact support must not change the public interface posture.

## BR-0005-0013: On the Story Tree the Report Unit Is the Business Flow

- AC-Refs: AC-0005-0007
- On the story tree, `qfai report` writes one report per business flow in place of the per-spec reports, at `<outDir>/business-flow-NNNN/`, holding `coverage.md` and `traceability-graph.json`.
- The graph's node types are BF, US, AC, EX, BR and CON.

## BR-0005-0014: `--flow` Scopes the Report

- AC-Refs: AC-0005-0011
- On the story tree, `qfai report --flow BF-NNNN` reads `validate.flow-<ids>.json`, the file `qfai validate --flow` writes for the same flows, and writes `report.flow-<ids>.md`, or `.json` with `--format json`, unless `--out` names another path.
- It writes the per-flow reports of the named flows only, so parallel workers over different flows do not overwrite one another's files (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).

## BR-0005-0015: `--spec` Is Refused on the Story Tree

- AC-Refs: AC-0005-0012
- On the story tree, `qfai report --spec <spec-id>` exits 2, and its message names `--flow BF-NNNN` as the option that scopes a report (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).

## BR-0005-0016: A Malformed `--flow` Value Writes Nothing

- AC-Refs: AC-0005-0013
- A `--flow` value that is not a `BF-NNNN` ID exits 2 before any file is written, so raw input never reaches a file name (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).
