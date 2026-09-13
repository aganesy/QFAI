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
command's single-candidate read. So does one requiring the helper for every
resolution: `AC-0013-0020` and the first sentence of `BR-0013-0017` say
downstream `/qfai-sdd` skills resolve the pack through it, with no exception
for an absent pointer.

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

**Where `spec-0013` says how `/qfai-sdd` finds its pack, it states Stage 0's
fallback.** `REQ-0155` and the resolution line beneath it, `US-0013-0012`,
`AC-0013-0020` and the first sentence of `BR-0013-0017` require the helper
for every resolution today, while `qfai sdd preflight` resolves a set pointer
through it and takes the newest pack, by the timestamp in its name, when the
pointer is absent. Each is narrowed to say that. The product does not change
there: the statements are brought to what Stage 0 already does, so the one
reading of the absent pointer no statement records is not left behind when
the duplicate state goes.

Leaving the statements as they are makes `TC-0013-0029` read as a third
uncovered, when the uncovered third is a state no test can construct.

## Blocked downstream items

| Item                                                                               | Kind         | Why it depends on the artifact                                                                                     |
| ---------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `spec-0013/TDD-0024`                                                               | `ledger-row` | Carries `TC-0013-0029`, whose obligation names the duplicate state. Its evidence cannot discharge a third it names |
| The `spec-0013` row `CR-20260913-0009` appends for `TC-0013-0029`'s absent pointer | `ledger-row` | The same obligation, narrowed                                                                                      |
| The `spec-0013` `E2E` rows whose `US-Refs` names `US-0013-0012`                    | `ledger-row` | The story's absent-pointer outcome becomes Stage 0's newest-pack fallback                                          |

- Not blocked by this CR: every other `spec-0013` row. `TDD-0023` and the row
  appended beside it for the file-time case are `CR-20260913-0009`'s: that
  record moves the case under `TC-0013-0028` and resets `TDD-0023`, and this one
  leaves both alone. `TC-0013-0028` is not edited: it tests the set-pointer path
  the narrowed `AC-0013-0020` keeps. The test for `TC-0013-0029`,
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`, already proves the two
  reachable conditions, and nothing else in the pack reads the duplicate state.
- Not blocked either: `spec-0010/TDD-0017`. It carries `TC-0010-0013`, which
  tests an absent pointer with several candidates and names no duplicate state,
  so its obligation does not move when the criterion above it narrows. Its
  `Evidence` cell does name a duplicate pointer its run never covered, and
  action 2 files that record defect and repairs it without re-running the row.
- Overlapping open CRs: `CR-20260913-0009`, which re-derives `spec-0013`'s ledger
  to its template: its columns, its seeded rows, and the split of every
  progressed row that runs several boundaries, `TDD-0024` and `TDD-0023` among
  them. It is applied first (action 3).

## Impact scope

- Specs: `spec-0010`, `spec-0013`, and `_policies` for `DR-0266`
- Plans: `.qfai/specs/spec-0010/10_Plan.md`, `.qfai/specs/spec-0013/10_Plan.md`
- Tests: `spec-0013/TDD-0024`, the row `CR-20260913-0009` appends for
  `TC-0013-0029`'s absent pointer, and the `E2E` rows for `US-0013-0012` —
  `packages/qfai/tests/core/activeDiscussionPack.test.ts`, whose header and
  `describe` name the duplicate state;
  `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`, whose
  `US-0013-0012` case asserts the absent pointer is rejected;
  `packages/qfai/tests/integration/cli/commands/discussion.test.ts`, for the
  command's branch; and, through the `/qfai-atdd spec-0013` pass in action 5,
  every other ATDD-owned `spec-0013` row still owed when that pass runs, with
  `.qfai/evidence/atdd-spec-0013.md` and
  `.qfai/evidence/coverage-depth-spec-0013.md`; and
  `.qfai/evidence/atdd-spec-0010.md`, for `spec-0010`'s record-defect queue
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
`spec-0010` and in `spec-0013` — stating Stage 0's newest-pack fallback where
`spec-0013` says how `/qfai-sdd` finds its pack, removing the two unreachable duplicate
branches, in the helper and in the command, with what exists only to serve
them — and correcting `spec-0010/TDD-0017`'s evidence, which names the
duplicate state its run never covered?

## Approved actions (owner skill rerun plan)

1. **The shared decision first.** `DR-0266`'s rejection clause is edited by
   hand under this approval, removing the duplicate state and keeping the
   absent and missing pointer, and this record's ID is added to its `Related`
   field, which it lacks today: the drift protocol records a Change Request on
   the Decision Record it amends as well as in the delta. A policy-level
   `/qfai-sdd` rerun, mode `confirm-only`, then confirms the edit and adds this
   Change Request's row to the `## Change Requests` table of
   `_policies/10_delta.md`. **`confirm-only`, not `re-derive`**: without an
   argument `/qfai-sdd` targets every capability and fans Phase 2 through
   Phase 4 out over every spec, so a `re-derive` there would rewrite and
   re-seed packs this record does not reach, while `confirm-only` writes
   nothing but the Change Request reference. Both packs follow that decision, so narrowing
   either one first would leave it disagreeing with the record it cites.
   **The clause keeps the command's single-candidate read**: it states the
   helper's rejection of an absent pointer as unconditional, and the command's
   as the no-candidate and several-candidate cases, so the rerun does not turn
   the fallback `discussion.test.ts:169-215` pins into an obligation to reject.
   Steps 2 and 3 carry the same distinction wherever their statements name the
   command. **It keeps Stage 0's fallback too**: wherever a statement describes
   how `/qfai-sdd` finds its pack, it says an absent pointer leaves Stage 0 on
   the newest pack, so no rerun turns that fallback into a rejection. Neither
   fallback changes, so no code or shipped guidance for either is edited. The
   one test that states the story's old absent-pointer outcome, the
   `US-0013-0012` case in `spec0013ActivePointerSurfaceTypeE2E.test.ts`, is
   rewritten under action 5.

2. `AC-0010-0012`, `BR-0010-0012` and the two `10_Plan.md` lines that restate
   the rejection are edited by hand under this approval, and
   `/qfai-sdd spec-0010`, mode `confirm-only`, confirms them and records its own
   row in that pack's `09_delta.md` `## Change Requests` table.
   `TC-0010-0013` is not edited: it names no duplicate state.

   **`spec-0010/TDD-0017`'s `Evidence` cell is corrected, not its row.** It says
   the run covered `absent/duplicate currentId + multi-candidate`, and its test,
   `discussion.test.ts:111-155`, exercises an absent pointer and a pointer
   naming a missing pack, each beside several candidates.
   `/qfai-implement spec-0010`, which writes that cell, repairs it in place under
   this approval to what the run covered — `absent or missing currentId + multi-candidate` —
   keeping its date, commit and reviewer attestation. The row is not re-run, its
   `Status` does not change, and its `DR-ID` keeps `DR-0010-0006` alone, since
   no reset happens. The defect is filed as one entry of `spec-0010`'s
   record-defect queue, `## Record defects` in
   `.qfai/evidence/atdd-spec-0010.md`, and this repair closes it, as the drift
   protocol's drain closes an entry. The pack has no
   `.qfai/evidence/implement-spec-0010.md`, so the queue lives in the ATDD file,
   which the repair creates.

   **`confirm-only`
   because no `spec-0010` row changes identity**: a `re-derive` would run
   Phase 2b over a ledger that lacks the template's columns, `Tier` among them,
   and every story's `E2E` row, and would migrate it, derive every row's tier
   and seed rows this record does not reach.

3. The `spec-0013` statements are edited by hand under this approval, and
   `/qfai-sdd spec-0013`, mode `confirm-only`, confirms them: the requirement
   line in `01_Spec.md`, `US-0013-0012`, `AC-0013-0020`, `AC-0013-0021`,
   `BR-0013-0017`, `TC-0013-0029`, and the restatements in `07_Decisions.md`
   and `10_Plan.md`. Each drops the duplicate state and keeps the missing pack. **Which
   absent-pointer rule each keeps depends on whose reading it states.**
   `AC-0013-0021`, `BR-0013-0017` and `TC-0013-0029` state the helper's, which
   rejects an absent pointer. The two `01_Spec.md` lines that state the rule
   (`REQ-0155` and the resolution line beneath it) and `US-0013-0012` describe
   how `/qfai-sdd` finds its pack, so they say Stage 0 resolves a set pointer
   through the helper and takes the newest pack when the pointer is absent. The
   restatements in `07_Decisions.md` and `10_Plan.md` follow the statement each
   restates. **`AC-0013-0020` and the first sentence of `BR-0013-0017` are in
   the rerun as well**, though neither names the duplicate state: they describe
   how `/qfai-sdd` finds its pack and require the helper for every resolution,
   so each says it of a set pointer and gives the same newest-pack fallback when
   the pointer is absent, still without reading file times. The rerun records
   this Change Request as one row in `spec-0013/09_delta.md`'s
   `## Change Requests` table — `CR ID`, `Upstream artifact`, `Mode`,
   `Approved by`, `Applied at` — not as a `## Triage` row — and adds this
   record's ID to the `Related` field of `DR-0013-0002`, which lacks one, as
   step 1 does for `DR-0266`.

   **`confirm-only`, because no `spec-0013` row changes identity.** The narrowed
   test case keeps both of the boundaries its rows own, so a `re-derive` would
   run Phase 2b with nothing to write.

   **`CR-20260913-0009` is applied first.** It re-derives `spec-0013`'s ledger
   to its template and splits `TDD-0024` into the missing-pack and
   absent-pointer boundaries, seeding no row for the duplicate state, which no
   test can construct. It also seeds the `E2E` rows for `US-0013-0012`. This
   record's resets name the rows it leaves, and this record authorises no
   other ledger write.

4. Downstream ledger sweep for `TC-0013-0029` and `US-0013-0012`. **Reset to
   `todo`**, with this CR's ID in `DR-ID`, each of these rows wherever it has
   left `todo` by then:
   - `spec-0013/TDD-0024`, and the `spec-0013` row carrying `TC-0013-0029` whose
     `Boundary` is the absent pointer. Their test case's wording changes, and an
     observation taken against the three-condition wording does not describe
     it;
   - every `spec-0013` `E2E` row whose `US-Refs` names `US-0013-0012`. The
     story's absent-pointer outcome becomes Stage 0's newest-pack fallback.

   Those rows are named by the rule each line gives rather than by a `TDD-ID`,
   which `CR-20260913-0009` allocates. No row is retired: every obligation
   survives, narrowed.

5. **In this order**, once the rerun above has written the ledger:

   1. `/qfai-implement spec-0013` runs its Change Request preflight, which
      writes action 4's resets before the ledger is read for anything else. The
      rows it resets are `Integration` rows with no handoff yet, so the run
      leaves them at `todo` and makes no product edit.
   2. `/qfai-atdd spec-0013` makes the test edits. `TDD-0024` and the
      absent-pointer row are `Integration` rows, whose tests that stage writes
      and `/qfai-implement` does not (`qfai-implement/SKILL.md`). It corrects the
      header and `describe` of `activeDiscussionPack.test.ts`, which still name
      the duplicate state, and records the reset rows' handoff. It rewrites the
      `US-0013-0012` case in `spec0013ActivePointerSurfaceTypeE2E.test.ts` that
      asserts an absent pointer is rejected: under the narrowed story, Stage 0
      takes the newest pack there, and only a pointer naming a missing pack is
      rejected. The helper's own suites keep passing unchanged, because neither
      exercises a duplicate — no test could construct one. **That invocation is not limited to these rows**: it takes
      up every ATDD-owned `spec-0013` row still owed when it runs — today
      `TDD-0016` to `TDD-0018`, and any row `CR-20260913-0009` seeded that its
      own pass left open — as that stage's ordinary forward work. It writes
      their tests under `packages/qfai/tests/integration/**` and
      `packages/qfai/tests/e2e/**`, their entries in
      `.qfai/evidence/atdd-spec-0013.md`, and a refreshed
      `.qfai/evidence/coverage-depth-spec-0013.md` through its reviewer gate.
      None of that edits an upstream path.
   3. `/qfai-implement spec-0013` resumes from that handoff. It removes from
      `packages/qfai/src/core/discussionPack.ts` the `matches.length > 1`
      branch, `buildDuplicateMessage`, and the `"duplicate"` member of
      `ResolveActiveDiscussionPackErrorReason`, and corrects the helper's doc
      comment, which lists the duplicate case among the errors it throws. It
      removes the `matches.length > 1` wording from
      `qfai discussion list --active` in
      `packages/qfai/src/cli/commands/discussion.ts` the same way, leaving the
      missing-pointer message, and corrects every comment that still
      names the duplicate state, each of which is false once the branches go:

      | File                                                           | Lines    | What it says                                                                 |
      | -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
      | `packages/qfai/src/core/discussionPack.ts`                     | 195-216  | the reason type's doc and the error's doc name the duplicate state           |
      | `packages/qfai/src/core/discussionPack.ts`                     | 243-245  | the helper's doc lists a duplicate match among the errors it throws          |
      | `packages/qfai/src/cli/commands/discussion.ts`                 | 181-182  | `discussion use` says the missing/duplicate condition surfaces at read       |
      | `packages/qfai/src/cli/commands/discussion.ts`                 | 240      | `list --active` says a missing/duplicate dir fails with several packs        |
      | `packages/qfai/src/core/validators/designContractReadiness.ts` | 271, 326 | a duplicate pointer does not fall back, and makes the answer unknown         |
      | `packages/qfai/src/core/validators/researchSummary.ts`         | 536-539  | `brokenPointer`'s doc says a set pointer may resolve "to more than one" pack |
      | `packages/qfai/src/core/validators/researchSummary.ts`         | 672      | a `currentId` naming no pack "(or two)"                                      |

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
