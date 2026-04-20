# Spec Traceability Rules

Use this file when working on traceability-heavy parts of `/qfai-sdd`.

## Required Edge Model (Conceptual Decomposition)

Conceptual decomposition / realization hierarchy (how specs are _authored_, not how
IDs reference each other):

- `US` conceptually decomposes into `AC`
- `AC` conceptually decomposes into `BR`
- `BR` is conceptually concretized by `EX`
- `EX` is conceptually realized by `TC`

## Reference Direction (`Refs` ID fields)

ID reference direction (the value of `Refs:` columns) must be lower-to-upper only:

- Upper-to-lower ID references are forbidden (`US.Refs: AC-0001` is not allowed).
- Lower-to-upper ID references are allowed (`AC.Refs: US-0001` is the canonical form).
- The conceptual hierarchy above describes authoring direction; the `Refs` direction
  is the _inverse_ so downstream specs cite upstream IDs, never the other way round.

## Depth Expectations

- `BR` captures decision-level rules.
- `EX` demonstrates how `BR` behaves.
- `TC` proves `EX` in executable terms.

## When Sparse Coverage Is Intentional

- State the reason explicitly.
- Record the mitigation or next step in open questions or delta.
