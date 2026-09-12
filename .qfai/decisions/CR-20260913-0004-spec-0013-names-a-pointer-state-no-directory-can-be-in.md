# Change Request

- ID: `CR-20260913-0004`
- Title: `spec-0013 names an active-pointer state no directory can be in`
- Raised by: `qfai-implement`
- Raised at: `2026-09-12T21:35:40Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Five layers of `spec-0013` say the active-pack helper raises a recovery error
when `currentId` resolves to a **duplicate** pack, alongside the absent and
missing cases:

| Layer          | Statement                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------- |
| `01_Spec.md`   | "Missing/duplicate `currentId` raises an error naming candidate `discussion-*` dirs"        |
| `US-0013-0012` | "a clear error … on missing/duplicate ambiguity"                                            |
| `AC-0013-0021` | "`currentId` is absent OR resolves to a missing/duplicate pack"                             |
| `BR-0013-0017` | "When `currentId` is absent or resolves to a missing/duplicate pack, the helper MUST raise" |
| `TC-0013-0029` | "when `currentId` is absent or resolves to a missing/duplicate pack"                        |

`EX-0013-0017`, the example beneath the rule, names only the absent case.

A duplicate is not a state the helper's input can be in. That makes this a
defect in what the pack declares rather than a disagreement with the product:
the declaration names a condition with no instance, and there is one correct
repair.

## Reproduction

`resolveActiveDiscussionPack` in `packages/qfai/src/core/discussionPack.ts`
builds its candidates from one call, and filters them on an exact name:

```ts
const candidates = await findPacks(resolvedRoot, "discussion");
// …
const matches = candidates.filter((pack) => pack.name === currentId);
```

`findPacks` in `packages/qfai/src/core/packLocator.ts` performs a single
`readdir` of a single directory and pushes one entry per directory name. Two
entries of one directory cannot share a name, and the comparison is exact, so
`matches.length` is 0 or 1 and the `matches.length > 1` branch is not reachable.

**It never was.** The branch was introduced on 2026-05-29 with the helper
itself, and `findPacks` at that commit already read one root with one `readdir`.
No version scanned a second location, so there is no earlier behaviour to
restore — which is the question the issue left open, answered from history.

A case-insensitive filesystem does not change this: it cannot hold two names
that differ only by case in one directory, and a case-sensitive one gives them
distinct names that the exact comparison matches at most once.

What the branch keeps alive is `buildDuplicateMessage` and the `"duplicate"`
member of `ResolveActiveDiscussionPackErrorReason`, which serve only it. Neither
is exported from the package entry, so removing them changes no public surface.

## Proposed change

Narrow the five statements to the two conditions the helper can be in — an
absent pointer and a pointer naming a pack that does not exist — and remove the
branch, its message builder and its error kind.

Leaving the statements as they are makes `TC-0013-0029` read as a third
uncovered, when the uncovered third is a state no test can construct.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                     |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `spec-0013/TDD-0024` | `ledger-row` | Carries `TC-0013-0029`, whose obligation names the duplicate state. Its evidence cannot discharge a third it names |

- Not blocked by this CR: every other `spec-0013` row. The row's test,
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`, already proves the two
  reachable conditions, and nothing else in the pack reads the duplicate state.
- Overlapping open CRs: `CR-20260913-0001` and `CR-20260913-0003` block other
  `spec-0013` rows, and `CR-20260912-0003` reaches `spec-0013/TDD-0016`. None
  names `TDD-0024`, so the sets do not overlap; the halt on the pack is their
  union.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: `spec-0013/TDD-0024` — `packages/qfai/tests/core/activeDiscussionPack.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

  `05_Examples.md` is **not** here: `EX-0013-0017` names only the absent case,
  so no approved action edits it.

## Decision needed from user

Approve narrowing the five statements to the absent and missing conditions, and
removing the unreachable duplicate branch with the message builder and error
kind that exist only to serve it?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013` rerun, mode `re-derive`, over the requirement line in
   `01_Spec.md`, `US-0013-0012`, `AC-0013-0021`, `BR-0013-0017` and
   `TC-0013-0029`: each drops the duplicate state and keeps the absent and
   missing ones. One `09_delta.md` Triage row records it.

2. Downstream ledger sweep. Reset to `todo`, recording this CR's ID in `DR-ID`:
   `spec-0013/TDD-0024`. Its obligation changes — a third of it is withdrawn —
   and its recorded observation was taken against the three-condition wording.
   No row is retired: the obligation survives, narrowed.

3. Under `/qfai-implement`, remove from
   `packages/qfai/src/core/discussionPack.ts` the `matches.length > 1` branch,
   `buildDuplicateMessage`, and the `"duplicate"` member of
   `ResolveActiveDiscussionPackErrorReason`, and correct the helper's doc
   comment, which lists the duplicate case among the errors it throws. Correct
   the comment in `packages/qfai/src/core/validators/designContractReadiness.ts`
   that names a `"duplicate"` pointer among the ones that do not fall back.
   The row's existing test keeps passing unchanged, because it exercises only
   the two conditions that remain.

## Resolution

Not yet resolved.
