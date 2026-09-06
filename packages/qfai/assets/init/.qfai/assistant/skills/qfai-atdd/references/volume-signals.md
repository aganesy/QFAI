# Volume signals

The estimator table in `SKILL.md` has two numeric columns. `Raw count` is the
obligation count for the layer — `#US`, `#CON`, `#TC`. `Signal` is defined here.

## What the three counts are

All three are counted in **one scope: the spec this run was invoked on**. Mixing
a per-spec count with a repository-wide one would let an unrelated spec move
this spec's `Signal`, and the spec-to-spec comparison the column exists for
would stop holding.

Each of the three is **one row's numerator**, not a count of one ID type: a
`TC-*` that declares `L4` or `L5` is an API or E2E obligation and belongs to
that row, and a `CON-DB-*` is an integration obligation and belongs to `#TC`.
Every obligation is counted in exactly one row, so the three never
double-count and `total` is their sum.

Only **active** obligations count. A contract that declares
`x-qfai-status: planned` is deferred by `catalog/test-layers.md` out of its
test obligation — `QFAI-ATDD-113` for an API contract, `QFAI-ATDD-115` for a DB
one — so counting it would charge this spec for work no test owes yet: leave it
out of its row and name the deferred IDs in `Notes`.

**The two kinds carry that marker in different places.** Read each one the way
its own validator reads it, or the count and the obligation disagree:

- `CON-API-*` (YAML/JSON) — the marker counts only as a **document-root key**.
  The same key nested under one operation defers nothing: one path must not be
  able to drop the API-test obligation for every other `CON-API-*` the file
  declares.
- `CON-DB-*` (SQL) — the marker is a **standalone `-- x-qfai-status: planned`
  comment line, at any position in the file**. It does not have to come before
  the contract ID or before any statement, so a file whose marker sits under a
  `CREATE TABLE` is deferred just the same. Only a whole comment line counts —
  the same text trailing a statement on a shared line defers nothing. Applying
  the API rule here would read as active a DB contract `QFAI-ATDD-115` has
  already excluded, inflating `#TC` and `INT_s`.

- `#US` — the E2E row: required `US-*` declared by this spec, **plus** this
  spec's required `TC-*` declaring `Level` `L5`/`E2E`.
- `#CON` — the API row: the `CON-API-*` **this spec references** and has not
  deferred, **plus** this spec's required `TC-*` declaring `Level` `L4`/`API`.
  Read the references from **the contract-reference SSOT this spec actually
  carries**: the `Contract-Refs` column of `04_Business-Rules.md` — the
  declaration the shipped `/qfai-sdd` spec template emits — together with the
  `01_Spec.md` `QFAI-CONTRACT-REF:` line for a spec that declares one. Count
  each ID once across both: `Contract-Refs` is per-`BR`, so one contract bound
  by three rules is one obligation, not three. Reading `01_Spec.md` alone would
  report `#CON` 0 for every spec authored from that template, whose contract
  binding lives only in `04`. Do **not** take this count from
  `tdd/test-list.md` either: `/qfai-sdd` Phase 2b seeds no `Layer = API` row
  (`references/red-provenance.md`), so a first run would read `#CON` 0 for a
  spec whose contracts this stage is about to implement. `.qfai/contracts/**`
  has no spec owner in the model (see `SKILL.md`, CRITICAL CONSTRAINTS), so the
  repository-wide declared set is **not** this number either. A declared
  contract no spec references is a repo-level obligation for the end-of-stage
  run — name it in `Notes`, do not count it here.
- `#TC` — the Integration row: required `TC-*` of this spec that route to
  `tests/integration/**`: declared `Level` `L3`/`Integration`, or no declared
  `Level` — **plus** the active `CON-DB-*` this spec references, read from the
  same contract-reference SSOT as `#CON` and deferral-filtered the same way.
  Every declared `CON-DB-*` owes an integration test (`QFAI-ATDD-115`), which
  this skill's Annotation obligations and DoD carry, so counting only `TC-*`
  inverts the very share this row reports: one required `US-*`, nine active
  `CON-DB-*` and no `TC-*` would read `E2E_s` 100 / `INT_s` 0 for a spec whose
  obligations are almost entirely integration. `L1`/`L2` owe nothing to this
  skill, so they are excluded from `#TC`
  and from `total`; `L4`/`L5` are counted in the two rows above, never in
  `#TC`. Counting every `TC-*` in `#TC` instead would report an Integration share for
  obligations this skill does not own — a spec of one `US-*` and nine `L1` TCs
  would read `INT_s` 90 with no integration obligation at all.

## The formula

`Signal` is that layer's share of the obligation total, in whole percent:

```text
total = #US + #CON + #TC
E2E_s = round(100 * #US  / total)
API_s = round(100 * #CON / total)
INT_s = round(100 * #TC  / total)
```

`round` here is **half-up**: a share of exactly `.5` rounds up, so `#US` 1 of a
`total` of 8 gives `E2E_s` 13, never 12. Fixing the tie-break is what keeps one
spec's `Signal` reproducible across runs and comparable with another's.

The three sum to 100 up to rounding. When `total` is 0 there is nothing to take
a share of: write `-` in all three `Signal` cells and say in `Notes` that this
spec declares no **ATDD-owned** obligations. That is a statement about this
table's scope only — a spec whose `TC-*` are all `L1`/`L2` reaches `total` 0
while still owing real work, which `/qfai-implement` carries.

`Raw count` already carries the volume, so `Signal` carries only the
distribution — the part that is comparable between two specs, and between two
cycles of one spec. **A `Signal` cell that repeats its own `Raw count` is
wrong**: two specs of different sizes then produce values nothing can compare,
which is the whole reason the column exists.

## The bands

A signal is **low or high** when it falls outside its band:

| Signal  |  Band |
| ------- | ----: |
| `E2E_s` |  5–25 |
| `API_s` | 10–40 |
| `INT_s` | 40–80 |

The shape they describe is the one ATDD expects: integration carries the bulk of
the obligations, API a smaller declared surface, E2E the thin top.

For a signal outside its band, record the observed value and the reason the spec
is shaped that way in that row's `Notes`, then continue — for example, "`E2E_s`
67 / `INT_s` 22: six of this spec's nine obligations are `US-*` because
acceptance for this UI flow is only observable end to end; distribution accepted
and recorded". **Never re-file an obligation to move the number.**
`catalog/test-layers.md` forbids adjusting a distribution to make it read better
and lists re-labelling a declared layer among its anti-patterns: an obligation's
layer follows what it verifies, never how the totals look.

## The bands never gate

They orient the judgement; they are not a configured guardrail. No validator
measures them, and `.qfai/assistant/catalog/test-layers.md#volume-policy` — which
carries this band as a non-gating reference band — ships no default floor, ratio
or threshold for volume. So a signal outside its band is an observation with a
recorded reason, never a failure and never a Change Request: **never fail on a
signal value alone.**

The one measurable neighbour is a different subject.
`validation.testStrategy.maxE2eScenarioRatio` / `maxE2eScenarioCount` are opt-in
project settings measured by `npx qfai report` over **Gherkin scenarios
parsed from the Examples file**, not over these obligation counts. When a
project sets them, record the configured value, the measured value and the
report warning separately from this table.
