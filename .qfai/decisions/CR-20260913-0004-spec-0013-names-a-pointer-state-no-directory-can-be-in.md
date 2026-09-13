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

**The absent pointer is not one condition across the two readers.** The helper
rejects an absent pointer whatever candidates exist. `qfai discussion list
--active` rejects it only when there is no candidate or there are several: with
exactly one, it prints that pack and says on stderr that it assumed it
(`packages/qfai/src/cli/commands/discussion.ts:259-272`), and
`packages/qfai/tests/integration/cli/commands/discussion.test.ts:169-215` pins
that outcome. The statements above word the absent case as one rejection, so a
rerun that only drops the duplicate state would leave them contradicting the
command's single-candidate read.

## Reproduction

Both readers take their candidates from `findPacks` and match them on an exact
name. On this branch:

```text
$ grep -n "readdir(rootDir\|for (const entry of entries)\|name: entry.name" packages/qfai/src/core/packLocator.ts
136:  const entries = await readdir(rootDir, { withFileTypes: true }).catch((cause: unknown) => {
145:  for (const entry of entries) {
157:      name: entry.name,
$ grep -n "const candidates = await findPacks\|const matches = candidates.filter\|if (matches.length > 1)" packages/qfai/src/core/discussionPack.ts
272:  const candidates = await findPacks(resolvedRoot, "discussion");
293:  const matches = candidates.filter((pack) => pack.name === currentId);
300:  if (matches.length > 1) {
$ grep -n 'findPacks(discussionRoot\|const matches = candidates.filter\|resolves to duplicate' packages/qfai/src/cli/commands/discussion.ts
125:  const packs = await findPacks(discussionRoot, "discussion");
142:    const packs = await findPacks(discussionRoot, "discussion", { onReadFailure: "throw" });
287:  const matches = candidates.filter((name) => name === currentId);
295:      : `active session pointer "${currentId}" resolves to duplicate discussion-* dirs.`;
```

`findPacks` reads one directory with one `readdir` (`packLocator.ts:136`) and
pushes one candidate per entry, named by that entry (`packLocator.ts:145-157`).
Two entries of one directory cannot share a name. Both filters compare names
exactly (`discussionPack.ts:293`, `discussion.ts:287`), so each keeps at most one
candidate, and neither the branch at `discussionPack.ts:300` nor the duplicate
wording at `discussion.ts:295` can be reached. `qfai discussion list --active`
reads its candidates through `listPacks`, whose `findPacks` call is line 142.

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

The narrowed wording keeps what each reader does with an absent pointer: the
helper rejects it, and `qfai discussion list --active` rejects it only when
there is no candidate or there are several, printing the one pack otherwise.

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
- Plans: `.qfai/specs/spec-0010/10_Plan.md`, `.qfai/specs/spec-0013/10_Plan.md`
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
   record it cites. **The clause keeps the command's single-candidate read**:
   it states the helper's rejection of an absent pointer as unconditional, and
   the command's as the no-candidate and several-candidate cases, so the rerun
   does not turn the fallback `discussion.test.ts:169-215` pins into an
   obligation to reject. Steps 2 and 3 carry the same distinction wherever
   their statements name the command.

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
   comment, which lists the duplicate case among the errors it throws. Remove
   the `matches.length > 1` wording from `qfai discussion list --active` in
   `packages/qfai/src/cli/commands/discussion.ts` the same way, leaving the
   missing-pointer message. Correct every comment that still names the
   duplicate state, each of which is false once the branches go:

   | File                                                           | Lines    | What it says                                                           |
   | -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
   | `packages/qfai/src/core/discussionPack.ts`                     | 195-216  | the reason type's doc and the error's doc name the duplicate state     |
   | `packages/qfai/src/core/discussionPack.ts`                     | 243-245  | the helper's doc lists a duplicate match among the errors it throws    |
   | `packages/qfai/src/cli/commands/discussion.ts`                 | 181-182  | `discussion use` says the missing/duplicate condition surfaces at read |
   | `packages/qfai/src/cli/commands/discussion.ts`                 | 240      | `list --active` says a missing/duplicate dir fails with several packs  |
   | `packages/qfai/src/core/validators/designContractReadiness.ts` | 271, 326 | a duplicate pointer does not fall back, and makes the answer unknown   |
   | `packages/qfai/src/core/validators/researchSummary.ts`         | 672      | a `currentId` naming no pack "(or two)"                                |

   Correct the header and `describe` of `activeDiscussionPack.test.ts`, which
   still name the duplicate state. Both suites keep passing unchanged, because
   neither exercises a duplicate — no test could construct one.

## Resolution

Not yet resolved.
