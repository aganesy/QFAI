# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference **at least one** BR via `BR-Ref`.

## BR-Ref column (required)

- **One `BR-*` is the default.** One example is one concrete input/expected
  pair for one rule, and an example that needs two unrelated rules to explain
  it is two examples.
- **A cohesive rule bundle may be written as several comma-separated `BR-*` in
  the one cell.** This is legal and `npx qfai validate` counts every id in it, so
  do not collapse such a bundle to a single `BR-*` and do not split the EX to
  avoid the multi-value cell. Reserve it for rules no single example can
  demonstrate in isolation.
- The cell is read as a **set**: its order carries no meaning. `/qfai-implement`
  derives a ledger row's T1 review-group key from it — `TC` -> `EX` -> `BR`,
  then the lowest-numbered `BR-*` of the union it reaches — so a bundle
  produces one reproducible key rather than none
  (`.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`,
  "Group key column").

## Example Table (required)

| EX-ID   | BR-Ref  | Input   | Expected   | Notes   |
| ------- | ------- | ------- | ---------- | ------- |
| EX-0001 | BR-0001 | <input> | <expected> | <notes> |
