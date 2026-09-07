# Mutation-only request (read-only, moves no row)

The highest-precedence branch of `Phase: Red` step 1. It is the odd one out in
kind, not only in rank: the other three branches select a row and write a status
transition, this one selects a row already at a terminal status and is forbidden
to move it. Keep it here so step 1 stays a selection rule and nothing else.

## When one arrives

`/qfai-atdd` sends one when a stage that owns no ledger row has edited a shared
test artifact that a completed row reads
(`../../qfai-atdd/references/shared-test-artifacts.md`). That stage owns no
production agent, so it cannot take the mutation itself; the row it needs
re-verified is `done`, so no other entry of this skill can receive it. Without
this branch the request had no receiver and the requesting stage could never
complete.

## Inputs

The request names, **per affected row**:

- that row's spec and `TDD-ID`;
- the mutation its `Oracle proof` plan or `Satisfied-by` names;
- the selector to run under the changed artifact.

One shared artifact is read by every completed row that uses it, so a request
routinely carries several rows. **Work all of them** — one per iteration, in the
order given. `Phase: Red` step 1's "each iteration works exactly one row" bounds
an iteration, not a request; stopping after the first leaves the remaining rows
with no `Shared-artifact re-verify` line, so their stale `RED test hash` stays
unclearable and the requesting stage cannot complete — the very deadlock this
branch exists to break.

## Execution sequence

Run it in this order, per affected row, and finish each row in the same step:

1. Apply the mutation.
2. Run the selector and capture the failure.
3. **Revert in the same step** — the mutation is never left in the working
   tree.
4. Re-run for the restored GREEN.
5. Return both runs to the requesting stage.

## No-write rule

**Write nothing to `test-list.md` and nothing to that row's evidence.** The row
stays `done`, no round block opens, and the returned pair is recorded by the
requesting stage in its own `## Shared-artifact re-verify` block. That block is
what clears the row's stale `RED test hash` at the completion gate; a write from
here would reopen a terminal row instead.
