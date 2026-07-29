# Checkpoint Verification

"Checkpoint verification" is the whole-repository regression check run at a checkpoint boundary. It
is what item 11 of the 11-point gate refers to and the only thing it refers to.

## Checkpoint boundary

A checkpoint boundary is reached in exactly two places:

- **Per item** — after all routed blocking reviewers have returned PASS for the item and before it
  transitions `refactor` -> `done`. Every item has exactly one.
- **Per spec** — after the last item in `test-list.md` reaches `done` or a valid `exception`, before
  declaring spec-level completion.

No other point is a checkpoint boundary. There is no "every N items" rule.

## Verification command set

Run all of the following from the repository root, in order. Substitute the project's own runner for
the placeholders; record the literal commands actually executed in evidence.

1. The item's own selector — `<test runner> <Selector>` for the item just completed.
2. The full test suite — `<test runner>` with no selector.
3. The project's static gates, when the repository defines them — formatter check, linter, and type
   check.
4. `qfai validate --profile tdd --fail-on error`

## Pass criteria

Checkpoint verification PASSES only when **every** command in the set exits 0, and step 4 reports
zero `QFAI-TEST-001` findings. Any non-zero exit is a FAIL: the item stays at `refactor`, and the
failure is fixed and the whole set re-run. A partial run is not a pass.

## Evidence

Record the result in `.qfai/evidence/implement-<spec-id>.md` using the two per-item evidence fields
`Checkpoint verification command` and `Checkpoint verification result`. As with RED/GREEN evidence,
a status without its command is invalid, and evidence from a previous checkpoint MUST NOT be reused.
