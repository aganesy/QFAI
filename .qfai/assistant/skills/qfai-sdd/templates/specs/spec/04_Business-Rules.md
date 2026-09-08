# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Granularity (required)

- **One BR expresses one independently falsifiable rule.** If you can delete
  half of the `Rule` cell and what remains is still a complete, testable rule,
  it is two BRs.
- A BR that needs the words "and also", "additionally", or an enumerated list
  of unrelated conditions to be stated is almost always several BRs.
- Splitting late is expensive: `05_Examples.md` pins `EX` to `BR` 1:1 by
  default — several `BR-*` in one `BR-Ref` cell is legal, but only for a
  cohesive rule bundle — so a coarse BR propagates downward by construction and
  is usually discovered only after it has been projected into one oversized
  test module.
- `QFAI-DENSITY-005` (`warning`) flags a `Rule` cell that is a size outlier
  against the other rules in the same file. It is a signal, not a gate.
- See `.qfai/assistant/constitution/requirements-decomposition.md#item-granularity-acbrextc`.

## Reference Column Conventions

- `AC-Refs`, `NFR-Refs` and `Contract-Refs` are typed reference columns. Each
  holds a comma-separated list of IDs and nothing else — no prose, no
  parentheses, no trailing commentary.
- `Contract-Refs` holds the contract IDs this rule is bound by. The supported
  kinds are exactly `CON-API-*`, `CON-DB-*` and `CON-UI-*` — for example
  `CON-API-0001`, `CON-DB-0002`, `CON-UI-0003`. Any other kind is silently
  untracked: `specPackIds.ts` and `contractReferences.ts` only recognise these
  three, so an invented kind such as `CON-EVT-*` is neither declarable nor
  traceable. Use `-` when the rule binds no contract. Do not put contract IDs
  in `Notes`.
- `Notes` is free prose. IDs written there are **not** traced by any tool and
  must not be the only place an obligation is recorded.

## Rule Table (required)

| BR-ID   | Title   | AC-Refs | Rule   | Contract-Refs | Notes   | NFR-Refs |
| ------- | ------- | ------- | ------ | ------------- | ------- | -------- |
| BR-0001 | <title> | AC-0001 | <rule> | CON-API-0001  | <notes> | <nfr>    |
