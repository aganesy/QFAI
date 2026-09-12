# Change Request

- ID: `CR-20260913-0004`
- Title: `The active-pointer rule names a state no directory can be in`
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

The rule for resolving the active discussion pack says a recovery error is
raised when `currentId` resolves to a **duplicate** pack, alongside the absent
and missing cases. It is stated in three places, and all three name the
duplicate state:

- the shared decision `_policies/08_Decisions.md` `DR-0266`, which the two packs
  below both follow;
- `spec-0010`, the writer side: `AC-0010-0012`, `BR-0010-0012` and its plan;
- `spec-0013`, the reader side, in the layers below and in its decision and
  plan.

In `spec-0013`:

| Layer          | Statement                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------- |
| `01_Spec.md`   | "Missing/duplicate `currentId` raises an error naming candidate `discussion-*` dirs"        |
| `US-0013-0012` | "a clear error … on missing/duplicate ambiguity"                                            |
| `AC-0013-0021` | "`currentId` is absent OR resolves to a missing/duplicate pack"                             |
| `BR-0013-0017` | "When `currentId` is absent or resolves to a missing/duplicate pack, the helper MUST raise" |
| `TC-0013-0029` | "when `currentId` is absent or resolves to a missing/duplicate pack"                        |

`EX-0013-0017`, the example beneath the rule, names only the absent case. The
same state is also restated in that pack's `07_Decisions.md` and `10_Plan.md`.

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

**The command has the same branch.** `qfai discussion list --active` in
`packages/qfai/src/cli/commands/discussion.ts` builds its candidates from one
`listPacks` call over one directory and filters on `name === currentId`, then
words a `matches.length > 1` outcome as resolving to "duplicate discussion-*
dirs". It is unreachable for the same reason.

## Proposed change

Narrow the rule to the two conditions a resolver can be in — an absent pointer
and a pointer naming a pack that does not exist — at the shared decision first
and then in both packs that follow it, and remove both dead branches with what
serves only them.

Leaving the statements as they are makes `TC-0013-0029` read as a third
uncovered, when the uncovered third is a state no test can construct.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                     |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `spec-0013/TDD-0024` | `ledger-row` | Carries `TC-0013-0029`, whose obligation names the duplicate state. Its evidence cannot discharge a third it names |

- Not blocked by this CR: every other `spec-0013` row. The row's test,
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`, already proves the two
  reachable conditions, and nothing else in the pack reads the duplicate state.
- Not blocked either: `spec-0010/TDD-0017`. It carries `TC-0010-0013`, which
  tests an absent pointer with several candidates and names no duplicate state,
  so its obligation does not move when the criterion above it narrows.
- Overlapping open CRs: `none`.

## Impact scope

- Specs: `spec-0010`, `spec-0013`, and `_policies` for `DR-0266`
- Plans: `none`
- Tests: `spec-0013/TDD-0024` — `packages/qfai/tests/core/activeDiscussionPack.test.ts`,
  whose header and `describe` name the duplicate state; and
  `packages/qfai/tests/integration/cli/commands/discussion.test.ts`, for the
  command's branch
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/_policies/08_Decisions.md`,
  `.qfai/specs/_policies/10_delta.md`,
  `.qfai/specs/spec-0010/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0010/04_Business-Rules.md`,
  `.qfai/specs/spec-0010/09_delta.md`,
  `.qfai/specs/spec-0010/10_Plan.md`,
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/07_Decisions.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/10_Plan.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

  `05_Examples.md` is **not** here: `EX-0013-0017` names only the absent case,
  so no approved action edits it.

## Decision needed from user

Approve narrowing the active-pointer rule to the absent and missing conditions —
in the shared decision `DR-0266`, in `spec-0010` and in `spec-0013` — and
removing the two unreachable duplicate branches, in the helper and in the
command, with what exists only to serve them?

## Approved actions (owner skill rerun plan)

1. **The shared decision first.** A policy-level `/qfai-sdd` rerun, mode
   `re-derive`, narrows `DR-0266`'s rejection clause to the absent and missing
   pointer, and records it in `_policies/10_delta.md`. Both packs follow that
   decision, so narrowing either one first would leave it disagreeing with the
   record it cites.

2. `/qfai-sdd spec-0010`, mode `re-derive`, over `AC-0010-0012`,
   `BR-0010-0012` and the two `10_Plan.md` lines that restate the rejection,
   with its own `09_delta.md` row. `TC-0010-0013` is not edited: it names no
   duplicate state.

3. `/qfai-sdd spec-0013`, mode `re-derive`, over the requirement line in
   `01_Spec.md`, `US-0013-0012`, `AC-0013-0021`, `BR-0013-0017`,
   `TC-0013-0029`, and the restatements in `07_Decisions.md` and `10_Plan.md`:
   each drops the duplicate state and keeps the absent and missing ones. One
   `09_delta.md` Triage row records it.

4. Downstream ledger sweep. Reset to `todo`, recording this CR's ID in `DR-ID`:
   `spec-0013/TDD-0024`. Its obligation changes — a third of it is withdrawn —
   and its recorded observation was taken against the three-condition wording.
   No row is retired: the obligation survives, narrowed.

5. Under `/qfai-implement`, remove from
   `packages/qfai/src/core/discussionPack.ts` the `matches.length > 1` branch,
   `buildDuplicateMessage`, and the `"duplicate"` member of
   `ResolveActiveDiscussionPackErrorReason`, and correct the helper's doc
   comment, which lists the duplicate case among the errors it throws. Correct
   the comment in `packages/qfai/src/core/validators/designContractReadiness.ts`
   that names a `"duplicate"` pointer among the ones that do not fall back.
   Remove the `matches.length > 1` wording from `qfai discussion list --active`
   in `packages/qfai/src/cli/commands/discussion.ts` the same way, leaving the
   missing-pointer message. Correct the header and `describe` of
   `activeDiscussionPack.test.ts`, which still name the duplicate state. Both
   suites keep passing unchanged, because neither exercises a duplicate — no
   test could construct one.

## Resolution

Not yet resolved.
