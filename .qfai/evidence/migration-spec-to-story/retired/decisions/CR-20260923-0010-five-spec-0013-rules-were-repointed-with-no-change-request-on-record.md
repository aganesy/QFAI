# Change Request

- ID: `CR-20260923-0010`
- Title: `Five spec-0013 rules were repointed at their own criterion with no change request on record, and the coverage record still reports them broken`
- Raised by: `requirements-analyst`
- Raised at: `2026-09-23T10:36:00Z`
- Class: `defect`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-23T10:38:00Z`
- Approved option: `1`
- Applied at: `2026-09-23T10:52:00Z` — see Resolution
- Superseded by: `-`

## Context

Five business rules in `spec-0013/04_Business-Rules.md` cited, in `AC-Refs`,
a criterion about a different subject. The numbering lined up one for one,
which is what made it read as correct. A reader following a rule to its
criterion landed on an unrelated obligation, and a coverage count over that
edge reported it covered. `.qfai/evidence/coverage-depth-spec-0013.md` finding
7 recorded the defect.

The repair is already in the tree. Two earlier changes made it:

| Rule           | Its subject               | `AC-Refs` before                   | `AC-Refs` now                            |
| -------------- | ------------------------- | ---------------------------------- | ---------------------------------------- |
| `BR-0013-0002` | upper-to-lower forbidden  | AC-0013-0002 (Contract Index)      | AC-0013-0006 (Reference Direction)       |
| `BR-0013-0004` | plan after slice          | AC-0013-0004 (Slice Gate)          | AC-0013-0005 (Plan After Slice Gate)     |
| `BR-0013-0005` | contract stub validity    | AC-0013-0005 (Plan After Slice)    | AC-0013-0026 (Contract Stub Validity)    |
| `BR-0013-0006` | delta rejected sections   | AC-0013-0006 (Reference Direction) | AC-0013-0009 (Delta Rejected Guardrails) |
| `BR-0013-0007` | batch mode stable mapping | AC-0013-0007 (Validate Gate)       | AC-0013-0027 (Batch Mode Mapping Stable) |

- `AC-0013-0026` and `AC-0013-0027` were added, because no criterion stated
  either subject. `TC-0013-0012` now cites the first and `TC-0013-0010` the
  second. Both test cases already proved those subjects and had cited
  `AC-0013-0001` before.
- `BR-0013-0005`'s second clause — `none` only with no contract impact and a
  written reason — had no shipped text. The `qfai-sdd` skill now states it in
  its Contract Index step, and `sddSkillSpec0013.test.ts` asserts the sentence
  under `TC-0013-0012`.

Two things the repair left behind are this record's subject:

1. **No change request authorised the upstream edits.** They changed
   `03_Acceptance-Criteria.md`, `04_Business-Rules.md` and `06_Test-Cases.md`.
   `drift-protocol.md` makes a change request the precondition for any upstream
   edit, and names `09_delta.md` as the place its reference lands. spec-0013's
   delta records none.
2. **Finding 7 still reads open.** It says the `AC-Refs` route "is broken for
   five of the twenty rules". A reader of the coverage record cannot tell that
   the defect was repaired.

## Reproduction

Before the repair, from `.qfai/specs/spec-0013/04_Business-Rules.md` at the
parent of the first repair commit, with the heading each cited id resolved to in
`03_Acceptance-Criteria.md`:

```text
04_Business-Rules.md
  9: ## BR-0013-0002: Upper-to-Lower References Forbidden
 11: - AC-Refs: AC-0013-0002
 23: ## BR-0013-0004: Plan After Slice
 25: - AC-Refs: AC-0013-0004
 30: ## BR-0013-0005: Contract Stub Validity
 32: - AC-Refs: AC-0013-0005
 37: ## BR-0013-0006: Delta Rejected Section
 39: - AC-Refs: AC-0013-0006
 43: ## BR-0013-0007: Batch Mode Stable Mapping
 45: - AC-Refs: AC-0013-0007
03_Acceptance-Criteria.md
  7: ## AC-0013-0002: Contract Index Alignment
 15: ## AC-0013-0004: Slice Gate Enforcement
 19: ## AC-0013-0005: Plan After Slice Gate
 23: ## AC-0013-0006: Reference Direction Enforcement
 27: ## AC-0013-0007: Validate Gate error=0
```

Now, from the working tree:

```text
04_Business-Rules.md
 11: - AC-Refs: AC-0013-0006
 25: - AC-Refs: AC-0013-0005
 32: - AC-Refs: AC-0013-0026
 39: - AC-Refs: AC-0013-0009
 45: - AC-Refs: AC-0013-0027
03_Acceptance-Criteria.md
146: ## AC-0013-0026: Contract Stub Validity
150: ## AC-0013-0027: Batch Mode Capability Mapping Is Stable
09_delta.md
     (no `CR-` id, and no `## Change Requests` table)
.qfai/evidence/coverage-depth-spec-0013.md
440: **broken for five of the twenty rules** and is not used here; see Findings 7.
```

## Proposed change

Option 1.

1. Confirm that the tree already holds the repair in the table above, the two
   added criteria, and the test case citing each.
2. `spec-0013/09_delta.md` gains a `## Change Requests` table in the template's
   shape, with one row for this record. The `Mode` is `confirm-only`.
3. `.qfai/evidence/coverage-depth-spec-0013.md` finding 7 gains one resolution
   line. It names what changed and what still stands. The finding's text and
   the matrix scores are left as recorded. The scores are refreshed by the
   `/qfai-atdd spec-0013` pass that `CR-20260913-0012` already schedules.

No product code, no test and no ledger row changes. The repair did not change
any test case's verify text, so no row's obligation moved.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                                                                | Cost                                                         | Risk                                                                                                                                                                         | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Confirm the repair, record this request in the delta, and add a resolution line to finding 7                                                                                          | One delta table, one evidence line                           | None found. It changes no obligation, so no ledger row moves                                                                                                                 | ✅          |
| 2   | Record this request in the delta, and leave finding 7 for the coverage refresh `CR-20260913-0012` schedules                                                                           | One delta table                                              | Finding 7 keeps reading open until an unrelated record is applied. That refresh rescores the whole pack, and the finding's history can be lost in the rewrite                |             |
| 3   | Option 1, and also restate `TC-0013-0010` and `TC-0013-0012` to name the clauses of `AC-0013-0027` and `AC-0013-0026` they verify, with a new assertion for the stable-mapping clause | Two verify texts, one new assertion                          | Goes past the request. It changes the obligation of `spec-0013/TDD-0010` and `spec-0013/TDD-0012`, so both reset to `todo`. It adds test work, which is `/qfai-atdd`'s       |             |
| 4   | Withdraw `BR-0013-0005`'s `none` clause and the matching clause of `AC-0013-0026`                                                                                                     | Two clauses removed, one sentence and one assertion reverted | Reverses shipped skill text that a test pins. A contract declared `none` with no reason becomes acceptable again, and a later reader cannot tell a decision from an omission |             |

## Blocked downstream items

None. Option 1 changes no obligation. Every spec-0013 ledger row keeps its
status.

- Not blocked by this CR: `spec-0013/TDD-0010` and `spec-0013/TDD-0012`. Their
  test cases' `AC-Refs` moved, but their verify text did not, and neither did
  the tests they name.
- Overlapping open CRs: `CR-20260913-0012` (approved, not applied) edits the same
  `03_Acceptance-Criteria.md`. It planned to give its kept criterion
  `AC-0013-0026`. That id is now taken, so under its own fallback clause it
  takes the next free id, `AC-0013-0028`. This record allocates no id.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: `none`; `.qfai/evidence/coverage-depth-spec-0013.md` gains one line
  under finding 7
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`

## Decision needed from user

Approve option 1: confirm the repair already in the tree, record it in
spec-0013's delta, and add a resolution line to finding 7?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013`, mode `confirm-only`. It confirms step 1 of
   `## Proposed change` and writes the one `## Change Requests` row in
   `09_delta.md`. It makes no other upstream edit.
2. Downstream ledger sweep: none. No `tdd/test-list.md` row is reset or retired.
3. The finding 7 resolution line in
   `.qfai/evidence/coverage-depth-spec-0013.md`. It records the repair and
   rescores nothing.

## Resolution

Applied under option 1.

- Confirmed: `BR-0013-0002`, `-0004`, `-0005`, `-0006` and `-0007` cite
  `AC-0013-0006`, `-0005`, `-0026`, `-0009` and `-0027`. `TC-0013-0012` cites
  `AC-0013-0026`, and `TC-0013-0010` cites `AC-0013-0027`. The `qfai-sdd` skill
  states the `none` clause, and `sddSkillSpec0013.test.ts` asserts it.
- `spec-0013/09_delta.md` records this request in a new `## Change Requests`
  table.
- Finding 7 of `.qfai/evidence/coverage-depth-spec-0013.md` carries a
  resolution line.
- No ledger row was reset or retired.

Left open, outside this record:

- The three duplicate criterion ids that finding 7 also names. They belong to
  `CR-20260913-0012`.
- `TC-0013-0010` cites `AC-0013-0027`, but its test checks only that a
  no-argument run targets every capability in `_policies/03_Capabilities.md`.
  No test checks the rest of that criterion: an assigned id keeps its spec, and
  reordering needs a change request. The skill states the second in its
  Arguments section. This is a coverage-depth gap, not a wrong reference.
