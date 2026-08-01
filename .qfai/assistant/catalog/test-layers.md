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

## Layer derivation procedure (normative)

Deciding a `TC-*`'s layer is a per-TC judgement, not a constant. Use the
falsifying-oracle rule:

1. **Find the oracle.** Identify the single assertion whose removal would let a
   wrong implementation pass. That assertion, not the test's setup, is what the
   TC verifies.
2. **Restrict it to the parent BR's obligations.** Anything the oracle observes
   that the parent business rule does not own is incidental and does not raise
   the layer.
3. **Read the layer off what the oracle observes:**
   - inputs and return values only → **L1 Unit**
   - collaboration with a port through a fixture adapter (no real
     infrastructure) → **L2 Component**
   - real infrastructure state — DB rows, queue messages, files → **L3 Integration**
   - values at the service boundary — status codes, response bodies, auth and
     error contracts → **L4 API**
   - a full-system journey across UI/API/data → **L5 E2E**

### Worked examples

| Oracle asserts                                                                | Layer          |
| ----------------------------------------------------------------------------- | -------------- |
| `price(order) === 1250` for a given input                                     | L1 Unit        |
| the repository port was called with the normalized key, via a fixture adapter | L2 Component   |
| the row is present in the database after commit                               | L3 Integration |
| `POST /orders` returns `422` with `code: "OUT_OF_AREA"`                       | L4 API         |
| a user can register, order, and see the order in their history                | L5 E2E         |

### Obligation spanning more than one layer

**Split the row.** One TC = one oracle = one layer. If an obligation is
observable at two layers, it is two obligations: write one TC per oracle and
give each its own `Level`.

- A multi-valued `Level` cell (`L3/L5`) is **illegal**. Nothing consumes it and
  no validator can route it.
- If splitting is genuinely impossible, escalate through the Drift Protocol
  rather than inventing a combined value.

### Direction of authority (anti-pattern)

The test driver follows the declared layer. **The layer is never inferred from
how a test happens to be driven.** A unit-level obligation — one whose oracle,
after step 2, observes only inputs and return values — exercised through an
HTTP client is still L1 badly implemented; it is not an L4 test.

**Step 2 outranks step 3.** Restriction to the parent BR's obligations runs
first, so a transport the parent BR does not own is incidental and never
raises the layer. A BR that owns only the price calculation, asserted as
`response.body.price` over HTTP, reads as L1: the price is the BR-owned value,
the response envelope is the incidental transport. Step 3's "response bodies →
L4" applies only when the service-boundary values are themselves what the
parent BR owns. Inverting this is what collapses a designed pyramid into an
all-integration suite.

### Annotation routing is by ID type, not by `Level`

The derived `Level` records which oracle owns the obligation. It does **not**
move the traceability annotation. The [ATDD annotation hard gate](#atdd-annotation-hard-gate)
routes by obligation ID: `US-*` is answered from `tests/e2e/**`
(`QFAI-ATDD-111`), `TC-*` from `tests/integration/**` (`QFAI-ATDD-112`), and
`CON-API-*` from `tests/api/**` (`QFAI-ATDD-113`); a `TC-*` reference inside
`tests/api/**` or `tests/e2e/**` is rejected outright (`QFAI-ATDD-121` /
`QFAI-ATDD-122`). Two consequences bind every `TC-*` row:

- **A `TC-*` row's `Level` stays within L1–L3.** L4's goal is `CON-API-*` and
  L5's goal is `US-*` (see the layer definitions above), so an oracle that
  derives to L4 or L5 means the obligation is misfiled, not that the TC is an
  L4/L5 test. Re-file it as `CON-API-*` or `US-*`.
  **Re-filing is an upstream change, never a bare row deletion.** By step 2 the
  derivation reaches L4/L5 only when the parent `BR-*` itself owns the
  service-boundary contract or the journey, so the `TC-*` row is removed only
  together with the `EX-*` it verifies and the `BR-*`/`AC-*` that EX
  concretizes. Dropping the row alone leaves the parent EX with no `EX-Ref`
  and `npx qfai validate --profile sdd --fail-on error` reports `QFAI-COV-203`
  (and `QFAI-COV-201` when that TC was the AC's only cover); dropping the EX
  but keeping its BR reports `QFAI-COV-202`. Move the whole chain in one
  change through the Drift Protocol so `04_Business-Rules.md`,
  `05_Examples.md`, `06_Test-Cases.md` and the contract stay consistent. If the
  parent BR keeps a spec-side obligation, split the row instead: keep a `TC-*`
  for the part the BR owns — by step 2 that part derives to L1–L3 — and re-file
  only the boundary assertion as `CON-API-*` / `US-*`.
- **An L1/L2 `Level` does not relax `QFAI-ATDD-112`, and the gate does not
  change the `Level`.** The two are independent: the `Level` records what the
  oracle observes and is derived before any test exists, while the
  `QFAI:SPEC-XXXX:TC-YYYY` annotation is still owed to `tests/integration/**`.
  Never rewrite a derived L1/L2 to L3 because no integration trace exists yet —
  that would make the recorded oracle depend on implementation order and hide
  the unit/component work `/qfai-implement` selects. The missing annotation is
  an open ATDD obligation to satisfy, not evidence that the `Level` was wrong.

## TestKind resolution (single source)

- `tests/unit/**` -> Unit
- `tests/component/**` -> Component
- `tests/e2e/**` -> E2E
- `tests/api/**` -> API
- `tests/integration/**` -> Integration

## Annotation schema (code-side)

- Smallest trace unit is ID.
- Multiple IDs per test file are allowed — but this is a trace rule, not
  licence to aggregate a whole spec into one module. See Test-file granularity
  below.
- AC annotations are optional (indirect coverage through TC is acceptable).
- Allowed forms:
  - `QFAI:SPEC-0001:US-0001`
  - `QFAI:SPEC-0001:TC-0001`
  - `QFAI:CON-API-0001`

## ATDD annotation hard gate

- E2E obligations:
  - Every `US-*` in a **user-facing** spec must be referenced at least once from
    `tests/e2e/**`. "User-facing" is the same surface **union**
    `/qfai-prototyping` enforces. Any one of these signals puts a spec in it:
    - frontmatter `surface_type: ui-bearing` in `01_Spec.md`;
    - a matching UI contract `.qfai/contracts/ui/<spec-id>*.yaml` — a project
      that declares its surfaces only through contracts is still in scope;
    - a legacy `# … prototyping …` heading in `01_Spec.md`;
    - the spec pinned by `qfai.config.yaml#prototyping.primarySpecId`.

    A spec that declares no user-facing surface by **any** of those signals
    owes no E2E reference, and `QFAI-ATDD-111` does not fire for it.

  - Scoping applies only when the project declares at least one UI-bearing
    spec. A project that has never declared a surface has not opted into
    surface typing, so the obligation stays project-wide for it.
  - Do not create an E2E tree whose only purpose is to receive annotations.
    That is the "convert all obligations into E2E" anti-pattern below.
  - Use `QFAI:SPEC-XXXX:US-YYYY` annotations.

- Integration obligations (enforced today):
  - Every `TC-*` in specs must be referenced at least once from the directory
    its declared `Level` routes to: L3/Integration -> `tests/integration/**`,
    L4/API -> `tests/api/**`, L5/E2E -> `tests/e2e/**`. A TC with no declared
    `Level` defaults to `tests/integration/**`. This is what `QFAI-ATDD-112`
    checks. - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
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
  - **Deferral.** `/qfai-sdd` authors contracts in Phase 0 (Contracts-first) and
    slices them in Phase 2, so a contract legitimately exists before its slice
    ships. A contract that declares `x-qfai-status: planned` is excluded from
    the `QFAI-ATDD-113` obligation and reported as `QFAI-ATDD-114` (`info`)
    instead. Remove the marker when the slice is implemented — leaving it in
    place on a shipped slice is a review finding, not a tool finding.
    - The marker counts only at the **document root**. The same key nested under
      an operation defers nothing: one path must not be able to drop the
      API-test obligation for every other `CON-API-*` the file declares.
    - Deferral removes the test obligation, not the declaration. A deferred
      `CON-API-*` stays a known ID, so writing its API test ahead of the slice
      is fine and never raises `QFAI-ATDD-103`.
    - Deferred IDs are recorded in `report/atdd-traceability/summary.{json,md}`
      under `deferred.conApi`, so an empty `missing.conApi` can be told apart
      from a project where every contract is still planned.
- Forbidden references:
  - `tests/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY` **for a TC whose
    declared `Level` is not L4/API**. A TC that declares an API-level
    obligation belongs in `tests/api/**`, and its annotation there counts as
    coverage. The rule exists to stop obligations drifting into the wrong
    layer, not to make the correct layer unusable.
  - `tests/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY` **for a TC whose
    declared `Level` is not L5/E2E**. Same reason as above: the routing rule
    and the forbidden rule must agree, or the layer the routing selects
    becomes unusable.
  - `tests/integration/**` must not include `QFAI:SPEC-XXXX:TC-YYYY` **for a TC
    whose declared `Level` is not L3/Integration** (`QFAI-ATDD-123`). The rule
    is symmetric so "exactly one directory" holds in both directions: an
    annotation left behind here after the TC moved to L4/L5 is as wrong as one
    filed early into `tests/api/**`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- A `TC-*` annotation outside the directory its `Level` routes to is a
  misplacement, whichever directory it lands in — including the two new
  locations `tests/unit/**` and `tests/component/**`.
- AC annotations are not required in code; AC coverage is treated as indirect through TC coverage.
- `QFAI:CON-API-*` in `tests/e2e/**` is not forbidden, but contract guarantee belongs to API tests.

## Test-file granularity

- Default: **one test module per `TC-*`**. A TDD ledger row's `Test file`
  names that module.
- Grouping several `TC-*` into one module is allowed when they verify the same
  BR and the module stays reviewable in one pass. Above that, split by BR, then
  by AC.
- A single `Test file` value shared by every row of a spec is an anti-pattern:
  it makes the per-item "relevant test suite" indistinguishable from the whole
  spec suite, and it puts the whole spec's test code in front of every
  in-context reviewer gate.
- `qfai-sdd` should emit a per-item `Test file` value, not a per-spec one.

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
- Do not over-concentrate obligations into a single layer, module, or selector. Collapsing a matrix-shaped `TC-*` into one integration module — or into one test function behind one `test-list.md` selector — is the same failure mode as converting everything into E2E, and it additionally destroys the RED observation: a test function fails once, so only the first failing assert is ever observed. Split per independently observable boundary (see `qfai-implement/references/execution-ledger.md#selector-granularity-must`).
- Do not re-label an existing obligation's declared layer to change how a
  distribution reads. Re-labelling is the cheapest way to clear a signal and
  the one that destroys the most information; the layer of an obligation is
  determined by what it verifies, never by how the totals look.

### Concentration signals (non-gating)

Treat these as review signals in the same class as volume floors — worth a finding, never a hard gate:

- one test module holding a disproportionate share of a spec's `assert` statements
- a very low `test_` functions per file ratio in a module that carries many obligations
- a single selector whose recorded runtime grows monotonically across RED rounds
