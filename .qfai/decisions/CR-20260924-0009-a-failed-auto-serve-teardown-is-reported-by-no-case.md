# Change Request

- ID: `CR-20260924-0009`
- Title: `A failed auto-serve teardown is reported by no case`
- Raised by: `qfai-sdd`
- Raised at: `2026-09-24T01:44:21Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-24T01:45:10Z`
- Approved option: `1`
- Applied at: `2026-09-24T01:45:17Z` — see Resolution
- Superseded by: `-`

## Identifier

This record was merged as `CR-20260924-0001`. The main branch already gave that
ID to the record retiring two repository skills, so this one is
`CR-20260924-0009`. Commit messages written before the change keep the old ID.

## Context

Before `CR-20260923-0008`, `TC-0012-0462` also required that an asynchronous
cleanup error under `--auto-serve` be surfaced on stderr, naming what failed.
Restating that case as the runner contract's SIGINT path dropped the clause, and
`CR-20260923-0009` left restoring it to a record of its own. This is that
record.

`teardownOnce` in `packages/qfai/src/cli/commands/prototypingIterate.ts` still
handles a failed teardown. No requirement, criterion or case states what it
does, and no test asserts it, so the handling could be removed and nothing would
fail.

What the product does:

| Behaviour                                                                                                                                                   | Where                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| A teardown that rejects is caught, and `warn` prints `qfai prototyping iterate --auto-serve: teardown failed (<reason>)`, `<reason>` the rejection's reason | `prototypingIterate.ts:1272-1280`                      |
| `warn` writes to stdout, not stderr                                                                                                                         | `packages/qfai/src/cli/lib/logger.ts:5-7`              |
| The cycle-end teardown runs in a `finally`, and its failure is not rethrown; the run returns what the cycle returned — the capture exit code or `0`         | `prototypingIterate.ts:1347-1349`, `1367-1370`, `1400` |
| A SIGINT during the cycle goes through the same `teardownOnce`, so it reports the same way                                                                  | `prototypingIterate.ts:1326-1328`                      |

The removed clause said stderr. The line has gone to stdout since
`teardownOnce` was written, and no case ever held the stream.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                     | Cost                                           | Risk                                                                                           | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------- |
| 1   | State the handling on `REQ-0012-0062` as the product behaves — a line on stdout naming the failure, exit code unchanged — with a case and a row of its own | One requirement sentence, a new chain, one row | None found; no product change                                                                  | ✅          |
| 2   | State it as the removed clause read, on stderr, and move the line to stderr in `teardownOnce`                                                              | As option 1, plus a product change             | Changes an output stream nothing asked to change, and splits this line from every other `warn` |             |
| 3   | Leave it unstated                                                                                                                                          | None                                           | The handling can be deleted with no test failing                                               |             |

## Proposed change

Option 1.

1. `REQ-0012-0062` also states that when the teardown rejects, iterate MUST
   print a line on stdout naming the `--auto-serve` teardown as what failed,
   with the rejection's reason, and MUST return the exit code the cycle would
   have returned had the teardown resolved.
2. `AC-0012-0084`, `BR-0012-0068`, `EX-0012-0190` and `TC-0012-0490` carry that
   clause down the chain. The existing criterion and rule on `REQ-0012-0062`
   state the teardown call and not its failure, so they are not reused.
3. `/qfai-sdd` Phase 2b seeds `TDD-0577` on `TC-0012-0490`: `Integration`, at
   `todo`, with this record in `DR-ID`, `Test file` and `Selector` `-`, and the
   `Boundary` `teardown-rejection-reported-exit-unchanged`.

## Blocked downstream items

None. No existing case or row changes.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `none`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR: `.qfai/specs/spec-0012/01_Spec.md`,
  `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0012/04_Business-Rules.md`,
  `.qfai/specs/spec-0012/05_Examples.md`,
  `.qfai/specs/spec-0012/06_Test-Cases.md`,
  `.qfai/specs/spec-0012/09_delta.md`,
  `.qfai/specs/spec-0012/tdd/test-list.md`

## Decision needed from user

Approve option 1: state the failed-teardown report on `REQ-0012-0062` as the
product behaves, and seed a row for it?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012` makes steps 1 to 3, and records this request in
   `09_delta.md`.
2. `/qfai-atdd spec-0012` writes the test and hands `TDD-0577` over.
3. `/qfai-implement spec-0012` takes the row through.

## Resolution

Applied under option 1.

- `REQ-0012-0062` states the failed-teardown report and the unchanged exit code.
- `AC-0012-0084`, `BR-0012-0068`, `EX-0012-0190` and `TC-0012-0490` carry it.
- `TDD-0577` is seeded on `TC-0012-0490` at `todo`, with this record in `DR-ID`.
- `spec-0012/09_delta.md` records this request.
