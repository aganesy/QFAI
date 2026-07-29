# SDD Quality Gate

Use this file for the full quality gate checklist behind `/qfai-sdd`.

## Structural Checks

- Required `_policies` files exist.
- Required target spec files exist.
- `_policies/11_Slice-Policy.md` matches the current repo slice model.
- `_policies/04_Business-Flow.md` contains Mermaid `flowchart` or `sequenceDiagram`.
- `10_Plan.md` exists and remains How-only.
- `specs/plan.md` does not exist.
- Every `01_Spec.md` declares a valid `Status:` (active / superseded / deprecated / removed).
- `superseded` specs declare `Superseded-by: spec-NNNN` pointing to an existing spec.
- `deprecated` / `removed` specs declare `Deprecated-at: YYYY-MM-DD`.

## Triage Checks

- Every changed spec's `09_delta.md` includes a `## Triage` section under `## Change Summary`.
- Triage table headers cover Source / Subject / Existing Spec / Operation.
- Operation values are limited to CREATE / UPDATE / DELETE / SPLIT / MERGE / SUPERSEDE.
- UPDATE rows carry a Sub-op of APPEND / MODIFY / REMOVE.
- CREATE / DELETE / SPLIT / MERGE / SUPERSEDE and UPDATE:REMOVE rows record an `Approved By` value.

## Traceability Checks

- `US -> AC -> BR -> EX -> TC` edges exist. Check this against `.qfai/report/run-*/traceability.json`,
  which is built from the parsed spec pack on every run, clean or failing. Table-layout specs
  (`05_Examples.md` + `06_Test-Cases.md`) carry `BR_TO_AC`, `EX_TO_BR`, `TC_TO_AC` and `TC_TO_EX`
  edges; the older `Examples.feature` layouts carry `AC_TO_US`, `BR_TO_AC` and either
  `EX_TO_BR` / `TC_TO_EX` or `SC_TO_AC` / `CASE_TO_SC`. An empty `edges` array on a spec pack
  that has specs is a finding, not a tool limitation.
- `05_Examples.md` includes `EX-ID` and `BR-Ref`.
- `06_Test-Cases.md` includes `TC-ID`, `EX-Ref`, `AC-Refs`, and `Type`.
- Error or boundary coverage is present, not only normal-path coverage.

## Validation Checks

- `qfai validate --profile sdd --fail-on error --format github | tee .qfai/report/validate.log`
- `error=0`
- `.qfai/report/specs-coverage/spec-*.md` reviewed
- Density-smell warnings triaged

## Evidence Checks

- Evidence file exists.
- Work Orders Summary exists.
- Reviewer result exists.
