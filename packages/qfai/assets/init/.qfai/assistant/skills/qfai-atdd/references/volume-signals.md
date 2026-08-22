# Volume signals

The estimator table in `SKILL.md` has two numeric columns. `Raw count` is the
obligation count for the layer — `#US`, `#CON`, `#TC`. `Signal` is defined here.

## What the three counts are

All three are counted in **one scope: the spec this run was invoked on**. Mixing
a per-spec count with a repository-wide one would let an unrelated spec move
this spec's `Signal`, and the spec-to-spec comparison the column exists for
would stop holding.

- `#US` — required `US-*` declared by this spec.
- `#CON` — the `CON-API-*` **this spec references**: the API obligations its
  `tdd/test-list.md` carries in `CON-API-Refs`, which are the contracts this
  spec's `tests/api/**` must cover. `.qfai/contracts/**` has no spec owner in
  the model (see `SKILL.md`, CRITICAL CONSTRAINTS), so the repository-wide
  declared set is **not** this number. A declared contract no spec references is
  a repo-level obligation for the end-of-stage run — name it in `Notes`, do not
  count it here.
- `#TC` — required `TC-*` of this spec that route to `tests/integration/**`:
  declared `Level` `L3`/`Integration`, or no declared `Level`. `L1`/`L2` owe
  nothing to this skill, so they are excluded from `#TC` and from `total`; a
  `TC-*` declaring `L4`/`L5` is counted in the row its `Level` routes it to
  (`#CON` for `L4`/API, `#US` for `L5`/E2E), never in `#TC`. Counting every
  `TC-*` instead would report an Integration share for obligations this skill
  does not own — a spec of one `US-*` and nine `L1` TCs would read `INT_s` 90
  with no integration obligation at all.

## The formula

`Signal` is that layer's share of the obligation total, in whole percent:

```text
total = #US + #CON + #TC
E2E_s = round(100 * #US  / total)
API_s = round(100 * #CON / total)
INT_s = round(100 * #TC  / total)
```

The three sum to 100 up to rounding. When `total` is 0 there is nothing to take
a share of: write `-` in all three `Signal` cells and say in `Notes` that the
spec declares no obligations.

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
