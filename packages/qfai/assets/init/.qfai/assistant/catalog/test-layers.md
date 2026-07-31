# Test Layers Policy

This document is the SSOT for ATDD test-layer semantics and completion gates.

## Layer definitions

### L1 Unit

- Scope: pure decision logic — a single module's inputs and return values, with
  no port collaboration and no real infrastructure.
- Goal: verify `TC-*` obligations whose oracle observes inputs and outputs only.
- Location rule: `tests/unit/**`.

### L2 Component

- Scope: collaboration with a port through a fixture adapter (fake / in-memory),
  with no real infrastructure.
- Goal: verify `TC-*` obligations whose oracle observes the interaction with a
  port rather than infrastructure state.
- Location rule: `tests/component/**`.

### L3 Integration

- Scope: real infrastructure integration (for example DB/queue/filesystem) within service boundaries.
- Goal: verify `TC-*` obligations from specs.
- Location rule: `tests/integration/**`.

### L4 API

- Scope: service-boundary contracts (HTTP/gRPC/etc), auth, and error contracts.
- Goal: verify `CON-API-*` obligations from contracts.
- Location rule: `tests/api/**`.

### L5 E2E

- Scope: representative full-system journeys across UI/API/data.
- Goal: verify `US-*` obligations from specs.
- Location rule: `tests/e2e/**`.

## TestKind resolution (single source)

- `tests/unit/**` -> Unit
- `tests/component/**` -> Component
- `tests/e2e/**` -> E2E
- `tests/api/**` -> API
- `tests/integration/**` -> Integration

## Annotation schema (code-side)

- Smallest trace unit is ID.
- Multiple IDs per test file are allowed.
- AC annotations are optional (indirect coverage through TC is acceptable).
- Allowed forms:
  - `QFAI:SPEC-0001:US-0001`
  - `QFAI:SPEC-0001:TC-0001`
  - `QFAI:CON-API-0001`

## ATDD annotation hard gate

- E2E obligations:
  - Every `US-*` in specs must be referenced at least once from `tests/e2e/**` (no exception).
  - Use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration obligations (enforced today):
  - Every `TC-*` in specs must be referenced at least once from
    `tests/integration/**`, whatever its declared `Level`. This is what
    `QFAI-ATDD-112` checks.
  - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
  - `tests/api/**` and `tests/e2e/**` must not carry `TC-*` annotations
    (`QFAI-ATDD-121` / `QFAI-ATDD-122`), so an L4 obligation is discharged as a
    `CON-API-*` reference, never as a `TC-*` one.

- Per-level routing (target state — **not enforced, do not follow yet**):
  - The intended end state is one required location per declared `Level`:
    L1 -> `tests/unit/**`, L2 -> `tests/component/**`,
    L3 -> `tests/integration/**`. L4 stays `CON-API-*` in `tests/api/**` and
    L5 stays `US-*` in `tests/e2e/**`.
  - **This is not live.** `buildAtddTestGlobs` scans only
    `tests/{e2e,api,integration}`, so an annotation placed in `tests/unit/**`
    or `tests/component/**` is invisible to the scanner and `QFAI-ATDD-112`
    still reports the TC as uncovered. Until the scanner and `QFAI-ATDD-112`
    resolve per-TC, keep discharging every `TC-*` in `tests/integration/**`.
- API obligations:
  - Every declared `CON-API-*` must be referenced at least once from `tests/api/**`.
  - Use `QFAI:CON-API-XXXX` annotations.
- Forbidden references:
  - `tests/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
  - `tests/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- A `TC-*` annotation outside the directory its `Level` routes to is a
  misplacement, whichever directory it lands in — including the two new
  locations `tests/unit/**` and `tests/component/**`.
- AC annotations are not required in code; AC coverage is treated as indirect through TC coverage.
- `QFAI:CON-API-*` in `tests/e2e/**` is not forbidden, but contract guarantee belongs to API tests.

## Volume policy

- Floors and ratios are signals, not completion gates. This is the only
  statement in this section: no volume observation blocks completion, and none
  triggers a Change Request.
- Completion gate is validation pass with no errors:
  - `npx qfai validate --fail-on error`

If an observed layer distribution looks wrong:

1. Do not auto-adjust the distribution to make it look better.
2. Record the observed distribution and the rationale for it in the running
   stage's evidence file under `.qfai/evidence/` — for example
   `.qfai/evidence/atdd-<spec-id>.md` or
   `.qfai/evidence/implement-<spec-id>.md`.
3. Continue. The stage is not blocked.

The record goes to evidence, not into the spec, on purpose.
`constitution/drift-protocol.md` lists `*_delta.md` and the per-spec Open
Questions file among the upstream SSOT a downstream stage must not edit without
explicit user approval, and whitelists `.qfai/evidence/**` append/update as an
allowed exception. Pointing this step at the spec would send ATDD and implement
straight back into the STOP-and-wait state the policy exists to avoid.

The owner phase (`/qfai-sdd`) is the one that may carry the note into the
spec's own Open Questions file on a later run: `08_Open-questions.md` in a
layered spec, `15_Open-questions.md` in a spec pack.
(`09_Open-questions.md` is the shared `_policies` file, not a per-spec one.)

A Change Request is reserved for `constitution/drift-protocol.md`-class events
— an actual conflict with an upstream SSOT decision. A volume observation is not
one, and it stays non-blocking either way. What differs is how much of it is
measurable:

- **No configured guardrail.** qfai ships no default floor, ratio or threshold,
  and no validator emits a volume rule, so "unmet" is a judgement call with no
  tool-checkable meaning. Record the observation and the reasoning.
- **A configured guardrail.** When a project sets
  `validation.testStrategy.maxE2eScenarioRatio` or `maxE2eScenarioCount` to a
  non-null value, `report.ts` measures it and reports `ratioExceeded` /
  `countExceeded` with a warning. That is the project's own stated limit, not a
  subjective read: record the configured value, the measured value and the
  report warning in the evidence, so the breach is auditable rather than
  paraphrased.

  **What it counts is narrow.** These two knobs measure **Gherkin scenarios
  parsed out of each spec's Examples file**, bucketed by their `@layer-*` tags.
  They never inspect `<testsDir>/e2e/**` or any other code test. A project that
  writes no Gherkin — the normal shape for a layered project whose E2E lives in
  code — measures zero scenarios, so the guardrail stays silent however many
  code E2E tests exist. Treat them as a guardrail over the **scenario**
  distribution, not over the real test-layer distribution: when they are silent,
  the observation is the judgement call above, and the evidence entry must say
  how the distribution was counted so it is not read as a tool measurement.

Either way completion is not blocked and no Change Request is raised: a
user-blocking Change Request against a project's own tuning knob cannot conclude
anything actionable.

## Anti-patterns

- Do not treat `scenario.feature` or a coverage ledger as mandatory completion input.
- Do not convert all obligations into E2E.
- Do not inflate tests only to satisfy floor numbers.
- Do not re-label an existing obligation's declared layer to change how a
  distribution reads. Re-labelling is the cheapest way to clear a signal and
  the one that destroys the most information; the layer of an obligation is
  determined by what it verifies, never by how the totals look.
