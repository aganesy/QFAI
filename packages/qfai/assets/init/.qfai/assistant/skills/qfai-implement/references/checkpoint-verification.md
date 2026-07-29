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

## Verification command set (per item)

Run all of the following from the repository root, in order. Substitute the project's own runner for
the placeholders; record the literal commands actually executed in evidence.

1. The item's own test — the ledger's `Test file` **plus** the runner's test-name option applied to
   the ledger's `Selector`. The `Selector` is a test NAME, and every common runner takes a name
   through a flag, not a positional argument: a positional is a file filter. Vitest and Jest use
   `-t`, pytest uses `-k`, `go test` uses `-run`. For vitest:

   ```bash
   <test runner> <Test file> -t '<Selector>'
   ```

   Passing the selector positionally (`<test runner> '<Selector>'`) exits 1 with "No test files
   found", so the checkpoint would fail on every item and none could leave `refactor`.

2. The full test suite — `<test runner>` with no file filter and no test-name option.
3. The project's static gates, when the repository defines them — formatter check, linter, and type
   check.
4. `npx qfai validate --profile tdd --fail-on error` — qfai is a project dependency, not a global
   command; a bare `qfai …` is `command not found` (exit 127) on a normal local install, which would
   fail every checkpoint.

## Verification command set (per spec)

The spec-level boundary has no "item just completed" — a re-run in a later session has none, and
under parallel slices the ledger order does not identify one either. So step 1 is dropped: the
spec-level set is steps 2, 3 and 4 only. Everything step 1 would have proved is already covered by
the full suite.

## Pass criteria

Checkpoint verification PASSES only when **every** command in the applicable set exits 0, and step 4
reports zero `QFAI-TEST-001` findings. Any non-zero exit is a FAIL: for a per-item checkpoint the
item stays at `refactor`, the failure is fixed, and the whole set is re-run. A partial run is not a
pass.

## Spec-level boundary on an already-complete ledger

A ledger is **terminal** when every row is `done` or a valid `exception` — the same condition the
spec completion conditions use. The last row reaching `exception` ends the loop exactly as `done`
does, so both must reach this boundary.

The per-spec boundary is owed once per terminal ledger state, not once per session. Two cases leave
it unrecorded:

- the run was interrupted between the last row reaching its terminal status and the spec-level
  verification;
- `/qfai-implement` is re-run against a ledger that is already terminal.

In both, an unconditional "nothing to do" exit would skip the boundary permanently, and no later
re-run could repair it — a re-run finds no `todo` rows to process either. So before that exit: read
`.qfai/evidence/implement-<spec-id>.md` for spec-level `Checkpoint verification command` /
`Checkpoint verification result` entries covering the current ledger state. Run the **per spec**
command set above and record them when they are absent, or when they predate the last ledger
change. Only then report "nothing to do".

## Evidence

Record the result in `.qfai/evidence/implement-<spec-id>.md` using the two per-item evidence fields
`Checkpoint verification command` and `Checkpoint verification result`. As with RED/GREEN evidence,
a status without its command is invalid, and evidence from a previous checkpoint MUST NOT be reused.
