# SDD Quality Gate

Use this file for the full quality gate checklist behind `/qfai-sdd`.

## Structural Checks

- Required `_policies` files exist.
- Required target spec files exist.
- `_policies/11_Slice-Policy.md` matches the current repo slice model.
- `_policies/04_Business-Flow.md` contains Mermaid `flowchart` or `sequenceDiagram`.
- `10_Plan.md` exists and remains How-only.
- `specs/plan.md` does not exist.

## Traceability Checks

- `US -> AC -> BR -> EX -> TC` edges exist.
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
