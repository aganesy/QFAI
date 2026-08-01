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

## Cross-contract Checks

- Every terminal state, status enum value, and error code an API contract mandates has a
  representable counterpart in the paired DB contract (`references/contract-artifact-rules.md#cross-contract-reconciliation-must`).
- Failure / rejection paths in particular: the DB has an honest terminal value for each API-mandated
  failure outcome, rather than a success state whose preconditions cannot hold on failure.
- The reconciled API↔DB pairing is recorded in `_policies/05_Contracts.md`.
- `QFAI-CONTRACT-040` warnings are resolved or explicitly triaged before sign-off.

## Traceability Checks

- `US -> AC -> BR -> EX -> TC` edges exist. Check this against `.qfai/report/run-*/traceability.json`,
  which is built from the parsed spec pack on every run, clean or failing. Table-layout specs
  (`05_Examples.md` + `06_Test-Cases.md`) carry `BR_TO_AC`, `EX_TO_BR`, `TC_TO_AC` and `TC_TO_EX`
  edges; the older `Examples.feature` layouts carry `AC_TO_US`, `BR_TO_AC` and either
  `EX_TO_BR` / `TC_TO_EX` or `SC_TO_AC` / `CASE_TO_SC`. `EX_TO_AC` also appears: in v1417 an
  `EX` may hang off an `AC` directly rather than off a `BR`, and the graph builder emits both
  edge kinds — it is a normal edge type, not an unknown one. An empty `edges` array on a spec
  pack that has specs is a finding, not a tool limitation.
- `05_Examples.md` includes `EX-ID` and `BR-Ref`.
- `06_Test-Cases.md` includes `TC-ID`, `Level`, `EX-Ref`, `AC-Refs`, and `Type`. `Level` holds exactly one code from `.qfai/assistant/catalog/test-layers.md#layer-definitions`, which defines all five (`L1`-`L5`); the template's list is a reading aid pointing back at it.
- Error or boundary coverage is present, not only normal-path coverage.

## Validation Checks

- `npx qfai validate --profile sdd --fail-on error --format github`
- `error=0`
- `<paths.outDir>/validate.log` (`.qfai/report/validate.log` by default) — written automatically by the
  command above (no `tee` redirect); its `run_log:` line points at the `run-*/` directory of that run.
  A project that changed `paths.outDir` in `qfai.config.yaml` finds both under its configured directory
- `.qfai/report/specs-coverage/spec-*.md` reviewed
- Density-smell warnings triaged

## Evidence Checks

- Evidence file exists.
- Work Orders Summary exists.
- Reviewer result exists.
