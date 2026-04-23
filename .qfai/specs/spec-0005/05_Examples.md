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
- When `qfai report` renders Markdown or JSON
- Then report sections are derived from validate output rather than ad-hoc runtime probing

## EX-0005-0005: No Prototyping Evidence Present

- BR-Ref: BR-0005-0002, BR-0005-0003
- Given prototyping evidence is absent
- When report is generated
- Then the prototyping section still renders a missing / no-pack status and points to rerun guidance
