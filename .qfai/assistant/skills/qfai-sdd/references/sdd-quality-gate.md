# SDD Quality Gate

Use this file for the full quality gate checklist behind `/qfai-sdd`.

## Structural Checks

- Required `_policies` files exist.
- Required target spec files exist.
- Each target spec has `tdd/test-list.md` with one row per coverage-target TC from `06_Test-Cases.md`, and the ledger is the first Markdown table in the file.
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

## Contract Checks

Phase 0 is a mandatory output of this skill, so its own artifacts belong on this page.

- Every `api/`, `db/` and `ui/` contract declares a unique, correctly-prefixed `QFAI-CONTRACT-ID`.
- Every `db/` contract has been **applied to a scratch database**, and every declared write path
  **driven at least twice** — the second traversal is what exercises head-advance and
  expected-version guards. Applying cleanly is the floor, not the gate: a contract that applies
  without error still fails at runtime, because the failure is a resolution error inside a PL/pgSQL
  body rather than a syntax error.
- The command and result are recorded in `.qfai/evidence/sdd-<spec-id>.md`; `QFAI-CONTRACT-031`
  (`warning`) reports a `db/` contract with no such record.
- `QFAI-DB-001` dangerous-SQL warnings are resolved or explicitly triaged.
- Full rule: `references/contract-artifact-rules.md#executability-must`.

## Cross-contract Checks

- Every terminal state, status enum value, and error code an API contract mandates has a
  representable counterpart in the paired DB contract (`references/contract-artifact-rules.md#cross-contract-reconciliation-must`).
- Failure / rejection paths in particular: the DB has an honest terminal value for each API-mandated
  failure outcome, rather than a success state whose preconditions cannot hold on failure.
- The reconciled API↔DB pairing is recorded in `_policies/05_Contracts.md`.
- `QFAI-CONTRACT-040` findings are resolved or explicitly triaged before sign-off. It reports
  `warning` unless every contract declaring that field name bounds it with an ENUM, which is
  `error` — the value is then unstorable whichever pairing is the real one.

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
- **The chain does not terminate at `TC`.** Every `BR` / `AC` names the contract that realizes it,
  and every persisted attribute it names resolves to a column, field or enum member in that
  contract — directly or by a stated join. Phase 0 authors contracts before these obligations
  exist, so an obligation the contract cannot express passes every other check on this page: the
  SQL is valid, the `US -> AC -> BR -> EX -> TC` edges are complete, `npx qfai validate` is clean.
  Driving the declared path succeeds, so execution-based checking does not find it either. See
  `references/contract-artifact-rules.md#obligation-reconciliation-must--phase-2c`.

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
