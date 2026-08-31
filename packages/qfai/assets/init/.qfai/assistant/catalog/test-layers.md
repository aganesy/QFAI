# Test Layers Policy

This document is the SSOT for ATDD test-layer semantics and completion gates.

For which CI lane runs which layer, see the sibling map
[`test-layers-ci-lanes.md`](./test-layers-ci-lanes.md). That file is a crosswalk only — the policy
loader reads this file and not that one, so nothing there can change the vocabulary declared below.

## Layer vocabulary crosswalk (normative)

qfai spells the same layer four ways across shipped artifacts. This table is
the crosswalk; every artifact MUST use the spelling in its column.

| Code | Word        | Tag                 | Test directory              | `06_Test-Cases.md#Level` | `tdd/test-list.md#Layer` |
| ---- | ----------- | ------------------- | --------------------------- | ------------------------ | ------------------------ |
| L1   | Unit        | `layer-unit`        | project convention          | `L1`                     | `Unit`                   |
| L2   | Component   | `layer-component`   | project convention          | `L2`                     | `Component`              |
| L3   | Integration | `layer-integration` | `<testsDir>/integration/**` | `L3`                     | `Integration`            |
| L4   | API         | `layer-api`         | `<testsDir>/api/**`         | —                        | `API`                    |
| L5   | E2E         | `layer-e2e`         | `<testsDir>/e2e/**`         | —                        | `E2E`                    |

Rules:

- **One value per cell.** A `Level` cell and a `Layer` cell each hold exactly
  one layer. An obligation spanning two layers is two rows, not one row with
  two values.
- `06_Test-Cases.md` uses the **code** (`L1`…`L3`) in its `Level` column.
- `tdd/test-list.md` uses the **word** in its `Layer` column.
- Test-strategy tags in prompts and policy files use the **tag** form.
- **`<testsDir>` is `paths.testsDir` from `qfai.config.yaml`**, whose default
  is `tests` — hence the shipped `tests/integration/**`, `tests/api/**` and
  `tests/e2e/**`. A project that repoints `paths.testsDir` moves all three at
  once; the ATDD traceability scan follows the configured value, so never
  hard-code the literal `tests/` prefix in a project's own artifacts.
- L1 and L2 have no mandated directory: unit and component tests live wherever
  the project's own convention puts them. Only L3-L5 are directory-pinned, and
  only those directories are scanned by the ATDD traceability rules.
- **A `TC-*` row's `Level` is L1-L3.** Of those, only L3 owes an ATDD
  annotation: L1 and L2 have no mandated directory, so `QFAI-ATDD-112` does not
  apply to them and `QFAI-ATDD-117` (`info`) names them instead. Their gate is
  `tdd/test-list.md` / `TDDLIST_TC_NOT_COVERED`, under `/qfai-implement`.
  `US-*` is answered from `<testsDir>/e2e/**` (`QFAI-ATDD-111`), `CON-API-*`
  from `<testsDir>/api/**` (`QFAI-ATDD-113`) and `CON-DB-*` from
  `<testsDir>/integration/**` (`QFAI-ATDD-115`) — those three are fixed by the
  ID type. A `TC-*` is answered from the directory **its own declared `Level`**
  names, which for a correctly filed row is `<testsDir>/integration/**`; see
  [Annotation routing](#annotation-routing) for the full table and the
  misplacement rules. L4's goal is `CON-API-*` and L5's is `US-*` (see the
  layer definitions below), so an oracle that lands at L4 or L5 means the
  obligation is misfiled: record it as `CON-API-*` or `US-*` rather than
  leaving a `TC-*` row at a layer whose goal is another ID type.
- The two code-side word lists (`tddHelpers.ts#UNIT_COMPONENT_LAYERS` /
  `#NON_COVERAGE_LAYERS`) accept both the code and the word form for the same
  layer; they MUST stay in step with this table.

## How this file is consumed

The layer set below is read by `core/layerPolicy.ts` and is the SSOT for two
checks: `QFAI-EX-005` on the legacy spec-pack layout, and `QFAI-EX-105` on the
layered layout `npx qfai init` produces. Until both consumed it, the file was
read, reported on, and then ignored on every modern project.

- A file that yields no layers raises `QFAI-SPACK-090` (error) rather than
  silently widening to the built-in set.
- A declared set that disagrees with the built-in set raises `QFAI-SPACK-091`
  (warning). Without it the two could drift in either direction and this file
  would not be an SSOT.

## Scaffolded tests

`npx qfai atdd scaffold` writes skeletons to `<testsDir>/integration/<spec-id>/`.
There is deliberately no `<testsDir>/atdd/**` row below: a fourth root would
need a rule for which layer such a file belongs to, and qfai has none. The
writer targets a declared layer instead.

## Layer definitions

### L1 Unit

- Scope: pure decision logic — a single module's inputs and return values, with
  no port collaboration and no real infrastructure.
- Goal: verify `TC-*` obligations whose oracle observes inputs and outputs only.
- Convention: `tests/unit/**`. L1 has no mandated directory and owes no ATDD annotation — see the crosswalk and "Unit and Component owe no ATDD annotation".

### L2 Component

- Scope: collaboration with a port through a fixture adapter (fake / in-memory),
  with no real infrastructure.
- Goal: verify `TC-*` obligations whose oracle observes the interaction with a
  port rather than infrastructure state.
- Convention: `tests/component/**`. L2 has no mandated directory and owes no ATDD annotation — see the crosswalk and "Unit and Component owe no ATDD annotation".

### L3 Integration

- Scope: real infrastructure integration (for example DB/queue/filesystem) within service boundaries.
- Goal: verify `TC-*` obligations from specs.
- Location rule: `<testsDir>/integration/**`.

### L4 API

- Scope: service-boundary contracts (HTTP/gRPC/etc), auth, and error contracts.
- Goal: verify `CON-API-*` obligations from contracts.
- Location rule: `<testsDir>/api/**`.

### L5 E2E

- Scope: representative full-system journeys across UI/API/data.
- Goal: verify `US-*` obligations from specs.
- Location rule: `<testsDir>/e2e/**`.

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

- A multi-valued `Level` cell (`L3/L5`, `L1/L2`, `L1, L3`) is **illegal**. It
  matches no entry in the crosswalk, so no rule can read a layer out of it.
- **What a reader does with one: split the row.** One TC per oracle, each with
  its own single `Level`. Nothing else is a fix — in particular, do not record
  a normalization that "drops one half": no tool performs one, and a note
  saying an `L3/L5` row "normalizes to `L3`" is a claim about a value that only
  `06_Test-Cases.md` can make.
- **What the validators do with one, until it is split.** They neither guess
  nor let it through:
  - `QFAI-ATDD-112` routes the TC to the same place a TC with no declared
    `Level` goes — `<testsDir>/integration/**` — and keeps the obligation.
    Unreadable is deliberately not "excused": if a cell qfai cannot read
    discharged the obligation, `L1/L2` would be a one-keystroke way to delete
    any TC from the gate. That default is where the obligation is _reported_,
    not where the obligation _belongs_.
  - `TDDLIST_UNKNOWN_LEVEL` (`warning`) names the cell, and the TC stays a
    coverage target, so `tdd/test-list.md` still owes it a row.
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

### Annotation routing

The derived `Level` records which oracle owns the obligation, and the
[ATDD annotation hard gate](#atdd-annotation-hard-gate) routes each obligation
ID to exactly one directory. `US-*` is answered from `<testsDir>/e2e/**`
(`QFAI-ATDD-111`) and `CON-API-*` from `<testsDir>/api/**` (`QFAI-ATDD-113`); those
two are fixed by the ID type. A `TC-*` is answered from the directory **its own
declared `Level`** names (`QFAI-ATDD-112`):

| `Level`                       | Answered from                       |
| ----------------------------- | ----------------------------------- |
| `L1`/`Unit`                   | no ATDD obligation                  |
| `L2`/`Component`              | no ATDD obligation                  |
| `L3`/`Integration`            | `<testsDir>/integration/**`         |
| `L4`/`API`                    | `<testsDir>/api/**` (note)          |
| `L5`/`E2E`                    | `<testsDir>/e2e/**` (note)          |
| none declared                 | `<testsDir>/integration/**`         |
| anything else — typo, `L3/L5` | `<testsDir>/integration/**` (note2) |

**(note)** A `TC-*` **should not be** at L4 or L5 — the first bullet below says
why and what to do instead. The gate routes it there rather than rejecting it so
a misfiled row is reported once, by the rule that names the real cause, instead
of twice as "uncovered in integration" and "forbidden in api".

**(note2)** A `Level` the crosswalk does not list — a typo, a project's own
word, or the illegal multi-valued cell — falls to the same default as an
undeclared one, and keeps its obligation. The default is the conservative
answer to a cell qfai cannot read, never a supported spelling: fix the cell
(see [Obligation spanning more than one layer](#obligation-spanning-more-than-one-layer)).
`TDDLIST_UNKNOWN_LEVEL` (`warning`) names such a cell on the ledger side.

Exactly one directory, never two: an annotation outside the one its `Level`
names is both uncovered and rejected (`QFAI-ATDD-121` / `QFAI-ATDD-122` /
`QFAI-ATDD-123`), and
the rejection is symmetric — an annotation left in `<testsDir>/integration/**` after
its TC moved to `L4`/`L5` is rejected the same way an early one in
`<testsDir>/api/**` is. Two consequences bind every `TC-*` row:

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
- **An L1/L2 `Level` carries no `QFAI-ATDD-112` obligation, and the gate does
  not change the `Level`.** The two are independent: the `Level` records what
  the oracle observes and is derived before any test exists, while
  `QFAI-ATDD-112` asks only about the layers ATDD owns. Never rewrite a derived
  L1/L2 to L3 to make a gate quieter — that would make the recorded oracle
  depend on implementation order and hide the unit/component work
  `/qfai-implement` selects. An L1/L2 row's obligation is discharged through
  `tdd/test-list.md` and `TDDLIST_TC_NOT_COVERED`, not through an annotation in
  a directory ATDD scans.

## Directory → AtddTestKind (code-side, derived from the crosswalk)

Derived from `## Layer vocabulary crosswalk (normative)`, which is the
authority for this mapping. This list only restates the three kinds the ATDD
scan can resolve:

- `<testsDir>/integration/**` -> Integration
- `<testsDir>/api/**` -> API
- `<testsDir>/e2e/**` -> E2E

L1 Unit and L2 Component resolve to no kind. They follow project convention, no
directory maps to them, and none of them is scanned — see the crosswalk rules
and `**Unit and Component owe no ATDD annotation.**` above.

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
  - `QFAI:CON-DB-0001`

## ATDD annotation hard gate

- E2E obligations:
  - Every `US-*` in a **user-facing** spec must be referenced at least once from
    `<testsDir>/e2e/**`. "User-facing" is the same surface **union**
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
    its declared `Level` routes to: L3/Integration -> `<testsDir>/integration/**`,
    L4/API -> `<testsDir>/api/**`, L5/E2E -> `<testsDir>/e2e/**`. A TC with no declared
    `Level` defaults to `<testsDir>/integration/**`. **L1/Unit and L2/Component owe
    no reference at all** — see "Unit and Component owe no ATDD annotation"
    below. This is what `QFAI-ATDD-112` checks.
  - Use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
  - A `TC-*` annotation outside the directory its declared `Level` names is
    rejected (`QFAI-ATDD-121` / `QFAI-ATDD-122` / `QFAI-ATDD-123`). The rule is
    `Level`-relative,
    not a blanket ban: a `TC-*` in `<testsDir>/api/**` is rejected **unless** that TC
    declares `L4`/`API`, and in `<testsDir>/e2e/**` unless it declares `L5`/`E2E` —
    an annotation matching its own `Level` is what discharges the obligation
    there. A `TC-*` should not be at L4 or L5 in the first place (see
    "Annotation routing"): re-file that obligation as `CON-API-*` or `US-*`.
    But while the row exists at that `Level`, its annotation belongs in the one
    directory the `Level` names, and putting it anywhere else leaves the TC
    uncovered as well as forbidden.
  - Every declared `CON-DB-*` must be referenced at least once from
    `<testsDir>/integration/**` (`QFAI-ATDD-115`). Use `QFAI:CON-DB-XXXX`
    annotations. L3 owns this because a DB contract is only exercised against
    real infrastructure, which is L3's declared scope; a `CON-DB` reference
    from `<testsDir>/e2e/**` is not counted, or an end-to-end assertion that never
    touches the schema could close the obligation. A contract outside the
    current slice defers with a `-- x-qfai-status: planned` comment line,
    reported at `info` by `QFAI-ATDD-116` so the deferral stays visible.

- **Unit and Component owe no ATDD annotation.** A `TC-*` whose declared
  `Level` is L1 or L2 is outside `QFAI-ATDD-112` entirely: it is not required
  in any directory, and an annotation for it inside a scanned directory is not
  a violation either. `QFAI-ATDD-117` (`info`) names the excluded TCs on every
  run so the exclusion is visible rather than silent.
  - This is the only reading consistent with the rest of the package.
    `qfai-atdd/SKILL.md` puts Unit and Component out of its scope, and the
    crosswalk above gives L1/L2 no mandated directory — only L3-L5 are
    directory-pinned and only those three roots are scanned.
  - Previously L1/L2 fell through to `<testsDir>/integration/**` — the fallback for
    a spec with no `Level` column at all — so every declared Unit and Component
    TC was an `error` demanding an annotation in a directory this file says is
    not its home. `QFAI-WAIVER-002` refuses waivers on `error` rules, so a
    project that filed unit tests where L1's own entry says to had no exit, and
    the only validator-clean path was duplicating every annotation into
    `<testsDir>/integration/**` — the all-integration collapse named under
    Anti-patterns below.
  - **They are still gated, by the other stage.** Every coverage-target `TC-*`
    owes a `tdd/test-list.md` row, and `TDDLIST_TC_NOT_COVERED` (`error`)
    reports a missing one. L1/L2 belong to `/qfai-implement`, which is the
    stage that writes unit and component tests.

- **An annotation carrier is not a test.** The scan reads `.feature` and `.md` too, and a file's
  kind is read from its body: a `.feature` with a `Scenario:` declares a test, a `.md` never does,
  and a `.test.ts` holding only the annotation is the same ledger renamed. An obligation no carrier
  declares a test for clears `QFAI-ATDD-111` / `-112` / `-113` / `-115` with nothing behind it, so
  `QFAI-ATDD-118` (`info`) names it — a legitimate placeholder that must not read as coverage. A
  repo-wide gate reads `missing.<kind>` **and** `coveredByCarrierOnly` in `summary.json`, never
  `missing` alone; a `--spec` gate reads the narrowed `QFAI-ATDD-118` in `validate.spec-<id>.json`,
  because `summary.json` is repo-wide under every scope. A skipped test still counts as declared,
  and the partition is suppressed, not empty, when `scan.truncated` says the scan was cut short.
- API obligations:
  - Every declared `CON-API-*` must be referenced at least once from `<testsDir>/api/**`.
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
  - `<testsDir>/api/**` must not include `QFAI:SPEC-XXXX:TC-YYYY` **for a TC whose
    declared `Level` is not L4/API**. A TC that declares an API-level
    obligation belongs in `<testsDir>/api/**`, and its annotation there counts as
    coverage. The rule exists to stop obligations drifting into the wrong
    layer, not to make the correct layer unusable.
  - `<testsDir>/e2e/**` must not include `QFAI:SPEC-XXXX:TC-YYYY` **for a TC whose
    declared `Level` is not L5/E2E**. Same reason as above: the routing rule
    and the forbidden rule must agree, or the layer the routing selects
    becomes unusable.
  - `<testsDir>/integration/**` must not include `QFAI:SPEC-XXXX:TC-YYYY` **for a TC
    whose declared `Level` is not L3/Integration** (`QFAI-ATDD-123`). The rule
    is symmetric so "exactly one directory" holds in both directions: an
    annotation left behind here after the TC moved to L4/L5 is as wrong as one
    filed early into `<testsDir>/api/**`.
- Unknown references (`US/TC/CON-API` not declared) are errors.
- A `TC-*` annotation outside the directory its `Level` routes to is a
  misplacement, whichever directory it lands in. **This applies to L3-L5 only.**
  L1 and L2 route nowhere — they carry no ATDD annotation obligation at all — so
  an annotation for one is neither required nor misplaced, in
  `tests/unit/**`, `tests/component/**` or anywhere else.
- AC annotations are not required in code; AC coverage is treated as indirect through TC coverage.
- `QFAI:CON-API-*` in `<testsDir>/e2e/**` is not forbidden, but contract guarantee belongs to API tests.

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

## Test stub detection (QFAI-TEST-001 / QFAI-TEST-002)

`QFAI-TEST-001` (error) reports the silent-placeholder construct of each
supported stack:

| Extensions           | Construct                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `.ts` / `.js` family | `it.todo(` / `test.todo(` / `describe.todo(`                        |
| `.py`                | `pytest.skip(`, `@pytest.mark.skip/skipif/xfail`, `@unittest.skip*` |
| `.go`                | `t.Skip*(`                                                          |
| `.java` / `.kt`      | `@Disabled` / `@Ignore`                                             |
| `.rs`                | `#[ignore]`                                                         |
| `.rb`                | a line starting `skip` / `pending`                                  |
| `.cs`                | `[Ignore` / `Skip = "`                                              |

`QFAI-TEST-002` (info) names any extension the scan opened that has no dialect.
Without it a clean run on an unsupported stack is indistinguishable from a
checked one — the detector used to be JS-only while file selection was
stack-agnostic, so every other stack got a clean result that meant nothing.
