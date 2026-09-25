# Change Request

- ID: `CR-20260923-0012`
- Title: `A spec-0012 ledger row records a source edit and names no test case`
- Raised by: `claude-code`
- Raised at: `2026-09-23T11:05:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T11:10:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T11:25:00Z` — see Resolution
- Superseded by: `-`

## Context

`QFAI-TDDLIST-022` reports seven `done` rows of
`.qfai/specs/spec-0012/tdd/test-list.md` whose `TC-Refs` names no test case.
Six of them hold a requirement id: `TDD-0496`, `TDD-0497` and `TDD-0514` to
`TDD-0517`. `CR-20260923-0001` decides those six and is applied in the same
change as this record. This record covers the seventh, `TDD-0420`, which that
record leaves out.

`TDD-0420` is a `unit` row with `TC-Refs` `n/a`. It records a source edit, not a
test:

| Cell        | Value                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Test file` | `packages/qfai/src/cli/commands/prototypingIterate.ts`, a source file                                                                                                  |
| `Selector`  | `(source)`                                                                                                                                                             |
| `Evidence`  | the bare `catch {}` in `specDirExists` became `catch (err) { if (isEnoent(err)) return false; throw err; }`, with "No new test (the bare-catch path is unreachable …)" |

The edit gives `specDirExists` two behaviours:

1. **A missing directory reads as absent.** This is the one failure the code
   handles. `TC-0012-0409` clause (e) states it: "primarySpecId pin ignored
   when the spec dir is absent". `TDD-0429` holds that case. Its test,
   `ignores a primarySpecId pin whose spec dir does not exist on disk`, runs
   this branch through `resolveSurfaceUnion`.
2. **Any other `stat` failure propagates.** That is not handling. It is what
   `.agents/rules/minimal-implementation.md` § 2 makes the default for a failure
   no spec names, so it owes no case.

So the one obligation the row could carry already has a case and a row. The
function has also moved since the row was written: `specDirExists` now lives in
`packages/qfai/src/core/prototyping/specResolution.ts`, so the row's
`Test file` no longer holds it.

## Reproduction

```text
$ node packages/qfai/dist/cli/index.mjs validate --profile tdd --format text
[error] QFAI-TDDLIST-022 TDD-0420 in tdd/test-list.md for spec-0012 (row 83) holds TC-Refs "n/a", which names no test case. ...

.qfai/specs/spec-0012/tdd/test-list.md
| TDD-0420 | n/a | unit | - | packages/qfai/src/cli/commands/prototypingIterate.ts | (source) | done | DR-0012-0028 | ... |
| TDD-0429 | TC-0012-0409 | unit | - | packages/qfai/tests/cli/commands/prototypingIterate.test.ts | TC-0012-0409 | done | DR-0012-0028 | ... |

packages/qfai/src/core/prototyping/specResolution.ts:374
  async function specDirExists(root: string, specsDir: string, specId: string): Promise<boolean> {
packages/qfai/src/core/prototyping/specResolution.ts:393-395
    } catch (err) {
      if (isEnoent(err)) return false;
      throw err;

packages/qfai/tests/cli/commands/prototypingIterate.test.ts:2396-2397
  // QFAI:SPEC-0012:TC-0012-0409
  describe("resolveSurfaceUnion (direct unit test for the union composition rule)", () => {
packages/qfai/tests/cli/commands/prototypingIterate.test.ts:2518
  it("ignores a primarySpecId pin whose spec dir does not exist on disk", async () => {
```

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                          | Cost                                                   | Risk                                                                                                                                                                                                             | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Retire `TDD-0420` and tombstone its id                                                                                                                                          | One row removed, one tombstone                         | None found. The handled failure keeps its case, row and test. Nothing else the row names is an obligation                                                                                                        | ✅          |
| 2   | Point `TDD-0420` at `TC-0012-0409`                                                                                                                                              | One cell                                               | A second row on `TC-0012-0409` is a split. `QFAI-TDDLIST-017` then wants a `Boundary` for each row, and clause (e) already belongs to `TDD-0429`'s test. The row's `Test file` is a source file, and a stale one |             |
| 3   | Add a case stating that a `stat` failure other than a missing directory propagates out of `resolveSurfaceUnion`, reset `TDD-0420` to `todo`, and write a test that fakes EACCES | One case under `AC-0012-0037`, one test, one row reset | It writes into the spec, as an obligation, the propagation `minimal-implementation.md` § 2 already makes the default. The request asked for none of it                                                           |             |

## Proposed change

Option 1.

1. `TDD-0420` is removed from `.qfai/specs/spec-0012/tdd/test-list.md`.
2. Its id is tombstoned under that ledger's `## TDD-ID reservations` section, so
   the next allocation does not reissue it:

   ```markdown
   - ~~TDD-0420~~ — row deleted 2026-09-23, the one failure it handles is TC-0012-0409 on TDD-0429, removed by CR-20260923-0012
   ```

3. `spec-0012/09_delta.md` records this request in `## Change Requests`.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact |
| -------------------- | ------------ | ------------------------------ |
| `spec-0012/TDD-0420` | `ledger-row` | This record removes it         |

- Not blocked by this CR: `spec-0012/TDD-0429`, which keeps `TC-0012-0409` and
  its test unchanged.
- Overlapping open CRs: `CR-20260923-0001` edits the same ledger and is applied
  in the same change. It names `TDD-0420` only as a neighbour in the backlog.
  `CR-20260912-0003`, `CR-20260913-0002` and `CR-20260913-0030` edit `spec-0012`
  and name neither `TDD-0420` nor `TC-0012-0409`.

## Impact scope

- Specs: `spec-0012`
- Plans: `none`
- Tests: `spec-0012/TDD-0420`;
  `packages/qfai/tests/assets/completedRowNamesItsTestCase.test.ts`, whose
  backlog lists the row and asserts equality
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0012/tdd/test-list.md`,
  `.qfai/specs/spec-0012/09_delta.md`

## Decision needed from user

Approve option 1: retire `TDD-0420`, whose one handled failure is already
`TC-0012-0409` on `TDD-0429`, and tombstone its id?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0012`, mode `re-derive`, over `tdd/test-list.md` only. It
   removes the row, writes the tombstone and records this request in
   `09_delta.md`.
2. Downstream ledger sweep.
   - Reset to `todo`: none.
   - Retire: `spec-0012/TDD-0420`. Its `Evidence` cell, verbatim:

     | Row                  | `Evidence`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
     | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
     | `spec-0012/TDD-0420` | CHG-002 cascade. Replaced bare `catch {}` in `specDirExists` with `catch (err) { if (isEnoent(err)) return false; throw err; }` so EACCES / EIO / ENOTDIR propagate instead of being silently classified as "doesn't exist". No new test (the bare-catch path is unreachable without simulating EACCES/EIO; the diff is a 4-line surgical hardening verified by the existing test suite — 73/73 targeted, full suite green). Renumbered from TDD-0414 |

     The row names no test, so no test is left unowned. The branch it records
     is run by `spec-0012/TDD-0429`'s
     `ignores a primarySpecId pin whose spec dir does not exist on disk`.
3. The change that removes the row strikes `spec-0012 TDD-0420 done` from
   `KNOWN_WITHOUT_A_TEST_CASE` in
   `packages/qfai/tests/assets/completedRowNamesItsTestCase.test.ts`.

## Resolution

Approved under option 1, the recommendation. It is the smallest change, and it
loses nothing: the one failure the code handles keeps its case, row and test.
Option 2 puts a second row on a clause another row already holds, and option 3
writes a default into the spec as an obligation.

Applied under option 1.

- Retired: `spec-0012/TDD-0420`, with the `Evidence` value quoted in the
  approved actions. It named no test. Its tombstone is under
  `## TDD-ID reservations`.
- Reset: none.
- `spec-0012/09_delta.md` records this request.
- `completedRowNamesItsTestCase.test.ts` no longer lists the row.
