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
4. `npx qfai validate --profile tdd --fail-on error` — qfai is a project dependency, not a global
   command; a bare `qfai …` is `command not found` (exit 127) on a normal local install, which would
   fail every checkpoint.

## Pass criteria

Checkpoint verification PASSES only when **every** command in the set exits 0, and step 4 reports
zero `QFAI-TEST-001` findings. Any non-zero exit is a FAIL: the item stays at `refactor`, and the
failure is fixed and the whole set re-run. A partial run is not a pass.

## Spec-level boundary on an already-complete ledger

The per-spec boundary is owed once per ledger state, not once per session. Two cases leave it
unrecorded:

- the run was interrupted between the last item reaching `done` and the spec-level verification;
- `/qfai-implement` is re-run against a ledger whose rows are already all `done`.

In both, the skill's "all items `done` -> nothing to do" exit would skip the boundary permanently,
and no later re-run could repair it. So before that exit: read
`.qfai/evidence/implement-<spec-id>.md` for spec-level `Checkpoint verification command` /
`Checkpoint verification result` entries covering the current ledger state. Run the command set
above and record them when they are absent, or when they predate the last ledger change. Only then
report "nothing to do".

## Evidence

Record the result in `.qfai/evidence/implement-<spec-id>.md` using the two per-item evidence fields
`Checkpoint verification command` and `Checkpoint verification result`. As with RED/GREEN evidence,
a status without its command is invalid, and evidence from a previous checkpoint MUST NOT be reused.
