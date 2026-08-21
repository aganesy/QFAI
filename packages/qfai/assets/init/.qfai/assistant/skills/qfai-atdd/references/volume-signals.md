# Volume signals

The estimator table in `SKILL.md` has two numeric columns. `Raw count` is the
obligation count for the layer — `#US`, `#CON`, `#TC`. `Signal` is defined here.

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

For a signal outside its band, write the options and a recommendation in that
row's `Notes` and continue — for example, "`E2E_s` 41: the spec files six of its
nine obligations as `US-*`; options are (a) re-file the three that assert a
component boundary as `TC-*`, (b) accept the distribution because the spec is a
UI flow, recommendation (a)". Then keep going.

## The bands never gate

They orient the judgement; they are not a configured guardrail. No validator
measures them, and `.qfai/assistant/catalog/test-layers.md#volume-policy` states
that qfai ships no default floor, ratio or threshold for volume. So a signal
outside its band is an observation with a recommendation, never a failure and
never a Change Request: **never fail on a signal value alone.**

The one measurable neighbour is a different subject.
`validation.testStrategy.maxE2eScenarioRatio` / `maxE2eScenarioCount` are opt-in
project settings measured by `npx qfai report` over **Gherkin scenarios
parsed from the Examples file**, not over these obligation counts. When a
project sets them, record the configured value, the measured value and the
report warning separately from this table.
