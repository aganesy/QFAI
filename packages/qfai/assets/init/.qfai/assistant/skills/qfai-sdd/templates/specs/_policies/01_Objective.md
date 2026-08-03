# 01 Objective

The product-level "why" the whole spec pack serves. One objective per project;
every `CAP-*` in `03_Capabilities.md` traces up to it.

## Objective

- <one sentence: the outcome this product exists to produce>

## Success criteria

| ID     | Criterion              | How it is measured        |
| ------ | ---------------------- | ------------------------- |
| OBJ-01 | `<observable outcome>` | `<metric or observation>` |

## Out of scope

- `<what this objective explicitly does not cover>`

## Authoring rules

- Outcome only. No solution, no architecture, no delivery sequencing — those
  live in `02_Initiative.md` and `10_Plan.md` respectively.
- Do not name `US` / `AC` / `BR` / `EX` / `TC` IDs here: `_policies/**` must not
  define or own lower-layer items (`references/spec-traceability-rules.md`).
- An empty success-criteria table is a finding, not a default. An objective no
  one can measure cannot adjudicate a capability.
