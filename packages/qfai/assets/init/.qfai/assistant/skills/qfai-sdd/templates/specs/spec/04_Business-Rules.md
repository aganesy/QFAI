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
- Splitting late is expensive: `05_Examples.md` pins `EX` to `BR` 1:1, so a
  coarse BR propagates downward by construction and is usually discovered only
  after it has been projected into one oversized test module.
- `QFAI-DENSITY-005` (`warning`) flags a `Rule` cell that is a size outlier
  against the other rules in the same file. It is a signal, not a gate.
- See `.qfai/assistant/constitution/requirements-decomposition.md#item-granularity-acbrextc`.

## Rule Table (required)

| BR-ID   | Title   | AC-Refs | Rule   | Notes   | NFR-Refs |
| ------- | ------- | ------- | ------ | ------- | -------- |
| BR-0001 | <title> | AC-0001 | <rule> | <notes> | <nfr>    |
