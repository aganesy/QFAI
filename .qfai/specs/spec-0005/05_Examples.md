# 05 Examples

## EX-0005-0001: Missing Screenshot Evidence

- Given validate output contains `QFAI-UIE-001`
- When report is generated
- Then the prototyping section tells the user to rerun `/qfai-prototyping` and recapture screenshot evidence

## EX-0005-0002: Missing HTML Evidence

- Given validate output contains `QFAI-UIE-002`
- When report is generated
- Then the prototyping section tells the user to rerun `/qfai-prototyping` and recapture HTML evidence

## EX-0005-0003: Legacy Artifact Present

- Given a legacy prototyping artifact includes design-system or Lighthouse findings
- When report is generated
- Then the report may summarize the issue without presenting a removed CLI command
