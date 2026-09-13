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

**The absent pointer is not one condition across its readers.** The helper
rejects an absent pointer whatever candidates exist. `qfai discussion list
--active` rejects it only when there is no candidate or there are several: with
exactly one, it prints that pack and says on stderr that it assumed it
(`packages/qfai/src/cli/commands/discussion.ts:259-272`), and
`packages/qfai/tests/integration/cli/commands/discussion.test.ts:169-215` pins
that outcome. The statements above word the absent case as one rejection, so a
rerun that only drops the duplicate state would leave them contradicting the
command's single-candidate read.

**Stage 0 is a third reader, and it falls back rather than rejecting.**
`qfai sdd preflight` resolves the pointer through the helper only when it is
set. When it is absent, the preflight takes the newest pack
(`resolveSelectedPackDir` in `packages/qfai/src/cli/commands/sddPreflight.ts`),
because nothing in the shipped skill set writes the pointer and requiring it
would block Stage 0 for every default project. The pointer cases in
`packages/qfai/tests/cli/commands/sddPreflight.test.ts` and the Stage 0 step
of the shipped `qfai-sdd/SKILL.md` rest on that. A statement saying `/qfai-sdd`
rejects an absent pointer contradicts Stage 0 as much as it contradicts the
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

Remove the duplicate state from the rule, keeping the two conditions of its
three-condition clause that can occur — an absent pointer and a pointer naming
a pack that does not exist — at the shared decision first and then in both
packs that follow it, and remove both dead branches with what serves only them.

**These two are not every error the helper raises.** A state file that cannot
be read as a pointer is rejected under its own `corrupt` reason, and this record
leaves that rejection, its branch and its reason member alone. The narrowed
clause names the two conditions it keeps, not an exhaustive list.

The narrowed wording keeps what each reader does with an absent pointer: the
helper rejects it, and `qfai discussion list --active` rejects it only when
there is no candidate or there are several, printing the one pack otherwise.

Leaving the statements as they are makes `TC-0013-0029` read as a third
uncovered, when the uncovered third is a state no test can construct.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                                     |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `spec-0013/TDD-0024` | `ledger-row` | Carries `TC-0013-0029`, whose obligation names the duplicate state. Its evidence cannot discharge a third it names |

- Not blocked by this CR: every other `spec-0013` row. `TDD-0023` is reset by
  action 4 although its obligation does not change, because a case it owns moves
  under its `Selector`. The row's test,
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`, already proves the two
  reachable conditions, and nothing else in the pack reads the duplicate state.
- Not blocked either: `spec-0010/TDD-0017`. It carries `TC-0010-0013`, which
  tests an absent pointer with several candidates and names no duplicate state,
  so its obligation does not move when the criterion above it narrows.
- Overlapping open CRs: `none`.

## Impact scope

- Specs: `spec-0010`, `spec-0013`, and `_policies` for `DR-0266`
- Plans: `.qfai/specs/spec-0010/10_Plan.md`, `.qfai/specs/spec-0013/10_Plan.md`
- Tests: `spec-0013/TDD-0023` and `spec-0013/TDD-0024` — `packages/qfai/tests/core/activeDiscussionPack.test.ts`,
  whose header and `describe` name the duplicate state and whose file-time
  guard moves between its two `describe` blocks; and
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
  `.qfai/specs/spec-0010/tdd/test-list.md`,
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

Approve removing the duplicate state from the active-pointer rule, keeping its
absent and missing conditions — in the shared decision `DR-0266`, in
`spec-0010` and in `spec-0013` — and removing the two unreachable duplicate
branches, in the helper and in the command, with what exists only to serve
them?

## Approved actions (owner skill rerun plan)

1. **The shared decision first.** A policy-level `/qfai-sdd` rerun, mode
   `re-derive`, removes the duplicate state from `DR-0266`'s rejection clause,
   keeping the absent and missing pointer, and adds this Change Request's row to
   the `## Change Requests` table of `_policies/10_delta.md`. It also adds this
   record's ID to `DR-0266`'s `Related` field, which that record lacks today:
   the drift protocol records a Change Request on the Decision Record it amends
   as well as in the delta. Both packs follow that decision, so narrowing
   either one first would leave it disagreeing with the record it cites.
   **The clause keeps the command's single-candidate read**: it states the
   helper's rejection of an absent pointer as unconditional, and the command's
   as the no-candidate and several-candidate cases, so the rerun does not turn
   the fallback `discussion.test.ts:169-215` pins into an obligation to reject.
   Steps 2 and 3 carry the same distinction wherever their statements name the
   command. **It keeps Stage 0's fallback too**: wherever a statement describes
   how `/qfai-sdd` finds its pack, it says an absent pointer leaves Stage 0 on
   the newest pack, so no rerun turns that fallback into a rejection. Neither
   fallback changes, so no code, test or shipped guidance for either is edited.

2. `/qfai-sdd spec-0010`, mode `re-derive`, over `AC-0010-0012`,
   `BR-0010-0012` and the two `10_Plan.md` lines that restate the rejection,
   with its own row in that pack's `09_delta.md` `## Change Requests` table.
   `TC-0010-0013` is not edited: it names no duplicate state.

3. `/qfai-sdd spec-0013`, mode `re-derive`, over the requirement line in
   `01_Spec.md`, `US-0013-0012`, `AC-0013-0021`, `BR-0013-0017`,
   `TC-0013-0029`, and the restatements in `07_Decisions.md` and `10_Plan.md`:
   each drops the duplicate state and keeps the absent and missing ones. The
   rerun records it as one row in `spec-0013/09_delta.md`'s
   `## Change Requests` table — `CR ID`, `Upstream artifact`, `Mode`,
   `Approved by`, `Applied at` — not as a `## Triage` row — and adds this
   record's ID to the `Related` field of `DR-0013-0002`, which lacks one, as
   step 1 does for `DR-0266`.

   Both pack reruns run Phase 2b, which also seeds, at `todo`, the `E2E` rows
   those ledgers lack, and migrates `spec-0010`'s eight-column table. The
   stories without a row are all twelve of `spec-0010`'s and thirteen of
   `spec-0013`'s fourteen. **That is a floor on the rows, not their count.**
   Phase 2b seeds one row per independently observable boundary a story's
   criteria name, so `US-0010-0011` and `US-0010-0012`, each mapped to two
   criteria, may take two rows each. The count is the one that derivation
   reaches, and the approval covers the rows it seeds. They are owed whatever
   this record decides.

   **`spec-0013/TDD-0022` is the fourteenth story's row, and this record does
   not re-scope it.** It is `done`, with one `Selector` over `AC-0013-0018`
   and `AC-0013-0019`. Phase 2b touches a progressed row that conflates
   boundaries only under a Change Request naming the row and the order of its
   split (`.qfai/assistant/skills/qfai-sdd/references/sdd-phase-checklists.md`),
   and this record names neither. So the `spec-0013` rerun raises that record
   and leaves the row as it is until it is approved. Nothing else in this plan
   waits on it.

4. Downstream ledger sweep for `spec-0013/TDD-0024`. `TC-0013-0029` keeps two
   independently observable rejections once the duplicate state goes — an
   absent pointer and a pointer naming a missing pack — and its row's
   `Selector` runs both cases. So the `spec-0013` rerun's Phase 2b splits it:
   - `TDD-0024` keeps the missing-pack boundary, which its recorded
     falsifiability mutation observed failing, with its `Selector` narrowed to
     that case. It is **reset to `todo`** with this CR's ID in `DR-ID`: its
     obligation changes, and its observation was taken against the
     three-condition wording.
   - A new `todo` row carrying `TC-0013-0029` owns the absent-pointer boundary,
     with this CR's ID in `DR-ID`.

   No row is retired: the obligation survives, narrowed and split.

   **`TDD-0023` is reset to `todo` as well**, with this CR's ID in `DR-ID`. The
   case asserting that the helper infers nothing from file times belongs to
   `TC-0013-0028`, which `TDD-0023` carries, but it sits in `TC-0013-0029`'s
   `describe` and runs only under `TDD-0024`'s whole-`describe` `Selector`.
   Narrowing that selector would leave the case under no row, so action 5 moves
   it into the `describe` that `TDD-0023`'s `Selector` runs. That selector then
   runs a case its recorded evidence does not cover.

5. Under `/qfai-implement`, remove from
   `packages/qfai/src/core/discussionPack.ts` the `matches.length > 1` branch,
   `buildDuplicateMessage`, and the `"duplicate"` member of
   `ResolveActiveDiscussionPackErrorReason`, and correct the helper's doc
   comment, which lists the duplicate case among the errors it throws. Remove
   the `matches.length > 1` wording from `qfai discussion list --active` in
   `packages/qfai/src/cli/commands/discussion.ts` the same way, leaving the
   missing-pointer message. Correct every comment that still names the
   duplicate state, each of which is false once the branches go:

   | File                                                           | Lines    | What it says                                                                 |
   | -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
   | `packages/qfai/src/core/discussionPack.ts`                     | 195-216  | the reason type's doc and the error's doc name the duplicate state           |
   | `packages/qfai/src/core/discussionPack.ts`                     | 243-245  | the helper's doc lists a duplicate match among the errors it throws          |
   | `packages/qfai/src/cli/commands/discussion.ts`                 | 181-182  | `discussion use` says the missing/duplicate condition surfaces at read       |
   | `packages/qfai/src/cli/commands/discussion.ts`                 | 240      | `list --active` says a missing/duplicate dir fails with several packs        |
   | `packages/qfai/src/core/validators/designContractReadiness.ts` | 271, 326 | a duplicate pointer does not fall back, and makes the answer unknown         |
   | `packages/qfai/src/core/validators/researchSummary.ts`         | 536-539  | `brokenPointer`'s doc says a set pointer may resolve "to more than one" pack |
   | `packages/qfai/src/core/validators/researchSummary.ts`         | 672      | a `currentId` naming no pack "(or two)"                                      |

   **The test edits go through `/qfai-atdd spec-0013`, ahead of that work.**
   `TDD-0023`, `TDD-0024` and the new absent-pointer row are `Integration`
   rows, whose tests `/qfai-atdd` writes and `/qfai-implement` does not
   (`qfai-implement/SKILL.md`). That run corrects the header and `describe` of
   `activeDiscussionPack.test.ts`, which still name the duplicate state, and
   moves its file-time guard case from `TC-0013-0029`'s `describe` into
   `TC-0013-0028`'s, as action 4 sets out. Both suites keep passing unchanged,
   because neither exercises a duplicate — no test could construct one.

   **These edits are cross-spec.** Before making them, the run takes the
   detection step `.qfai/assistant/skills/qfai-implement/references/cross-spec-ownership.md`
   sets out over every file above, reading every other spec's `done` rows.
   Some matches are visible now:

   | Test the edit reaches                                                      | `done` rows it certifies                                 |
   | -------------------------------------------------------------------------- | -------------------------------------------------------- |
   | `packages/qfai/tests/integration/cli/commands/discussion.test.ts`          | `spec-0010/TDD-0016`, `spec-0010/TDD-0017`               |
   | `packages/qfai/tests/integration/spec0010DiscussionMockAndPointer.test.ts` | `spec-0010/TDD-0013`, `spec-0010/TDD-0014`               |
   | `packages/qfai/tests/core/validators/designContractReadiness.test.ts`      | `spec-0004/TDD-0008` to `TDD-0010`, `spec-0012/TDD-0355` |

   The walk at run time decides the full set. Each match is recorded under
   `## Cross-spec obligations` in `.qfai/evidence/atdd-spec-0013.md`, the
   evidence file of the `Integration` rows these edits are made for, its
   `Selector` is re-run against the changed tree, and `completion-reviewer`
   reviews those rows' obligations beside `spec-0013`'s, with the fresh results
   as its input.

## Resolution

Not yet resolved.
