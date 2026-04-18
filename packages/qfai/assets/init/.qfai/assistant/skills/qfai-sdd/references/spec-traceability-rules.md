# Spec Traceability Rules

Use this file when working on traceability-heavy parts of `/qfai-sdd`.

## Required Edge Model

- `US` decomposes into `AC`
- `AC` decomposes into `BR`
- `BR` is concretized by `EX`
- `EX` is realized by `TC`

## Reference Direction

- Upper-to-lower references are forbidden.
- Lower-to-upper references are allowed.

## Depth Expectations

- `BR` captures decision-level rules.
- `EX` demonstrates how `BR` behaves.
- `TC` proves `EX` in executable terms.

## When Sparse Coverage Is Intentional

- State the reason explicitly.
- Record the mitigation or next step in open questions or delta.
