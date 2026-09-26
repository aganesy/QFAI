# Change Request

- ID: `CR-20260913-0013`
- Title: `spec-0010 says /qfai-discussion writes the active-pack pointer, and only a CLI command does`
- Raised by: `qfai-implement`
- Raised at: `2026-09-18T03:30:00Z`
- Class: `defect`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`spec-0010` makes `/qfai-discussion` the writer of the active-pack pointer,
`.qfai/state.json#discussion.currentId`. The stage sets the pointer when it
finalizes a pack, so the pack it just wrote is the one downstream skills find.

| Artifact                                 | What it says                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `REQ-0155` in `01_Spec.md`               | "`/qfai-discussion` WRITES `.qfai/state.json#discussion.currentId`"     |
| `US-0010-0012`                           | "I want the skill to write `.qfai/state.json#discussion.currentId`"     |
| `AC-0010-0011`, `BR-0010-0011`           | The pointer is set to the just-authored pack when the pack is finalized |
| `EX-0010-0012`, `TC-0010-0012`           | Finalize a pack, then read `currentId`                                  |
| `10_Plan.md`                             | "on pack finalization, `/qfai-discussion` writes …"                     |
| `DR-0266` in `_policies/08_Decisions.md` | The pointer is the single source of truth for the active session        |

**Nothing in the stage writes it.** `writeDiscussionCurrentId` in
`packages/qfai/src/core/state.ts` has one caller, `qfai discussion use <id>` in
`packages/qfai/src/cli/commands/discussion.ts`. The shipped
`qfai-discussion/SKILL.md` never names that command, the pointer or
`state.json`. So the pointer is set only when a user runs the command by hand.
Until then `qfai sdd preflight` falls back to the newest pack.

**The ledger certifies the stage with the command's test.** `spec-0010/TDD-0016`
stands `done` for `TC-0010-0012` on
`packages/qfai/tests/integration/cli/commands/discussion.test.ts`. That file
drives `qfai discussion use` directly. No test in it finalizes a pack, and the
`done` claim is a record defect under either outcome below.

## Reproduction

```text
$ grep -rn "writeDiscussionCurrentId" packages/qfai/src
packages/qfai/src/cli/commands/discussion.ts:10:  writeDiscussionCurrentId,
packages/qfai/src/cli/commands/discussion.ts:198:  await writeDiscussionCurrentId(options.root, id);
packages/qfai/src/core/state.ts:717:export async function writeDiscussionCurrentId(root: string, currentId: string): Promise<void> {
$ grep -c "discussion use\|currentId\|state.json" packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md
0
```

From `.qfai/specs/spec-0010/tdd/test-list.md`:

```text
20: | TDD-0016 | TC-0010-0012 | integration
    | packages/qfai/tests/integration/cli/commands/discussion.test.ts
    | discussion writes state.json#discussion.currentId | done | DR-0010-0006
    | RED→GREEN 2026-05-28: … `qfai discussion use <id>` writer …
```

## Options (at least 3) and recommendation

| #   | Option                                                                                                                 | Cost                                                                                                                         | Risk                                                                                                                                                     | Recommended |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | The stage writes the pointer: once the pack is authored, the discussion skill runs `npx qfai discussion use <pack-id>` | One step in the shipped skill, and one test; no statement in `spec-0010` changes                                             | Downstream skills now read the pointer instead of the newest-pack fallback. That is what `DR-0266` chose                                                 | ✅          |
| 2   | The specification follows the product: the command is the writer, and the stage writes nothing                         | Re-derive `REQ-0155`, `US-0010-0012`, `AC-0010-0011`, `BR-0010-0011`, `EX-0010-0012`, `TC-0010-0012`, the plan and `DR-0266` | The pack a run just wrote is found only by the newest-pack fallback until a user runs the command, which is the outcome `US-0010-0012` exists to prevent |             |
| 3   | A new `qfai discussion finalize` command that validates the pack and writes the pointer, called by the skill           | A new command, its contract and its tests                                                                                    | A second writer beside `discussion use`, for a write the existing command already makes                                                                  |             |

## Proposed change

Option 1.

1. The shipped `qfai-discussion/SKILL.md` gains one step where authoring ends:
   once the pack's files are written and its completion checks have run, run
   `npx qfai discussion use <pack-id>` with the ID of the pack just authored.
   The step belongs to the three endings that authorize authoring —
   `confirmed`, `user-closed` and `no-question`. A `stopped` session writes no
   pack, so it moves no pointer.
2. The generated mirror of the skill is refreshed with it.
3. No statement in `spec-0010` changes. The stage becomes the writer those
   statements already name, and it writes through the command
   `AC-0010-0012` already names as the way to repair the pointer.
4. `spec-0010/TDD-0016` is reset to `todo`, recording this CR's ID in
   `DR-ID`. Its `Test file` and `Selector` move to the test `/qfai-atdd` writes
   for it. That test reads the shipped skill for the step and its command, runs
   the command it names against a pack in a temporary tree, and reads
   `currentId` back. A test that only reads the skill proves the instruction,
   not the write, and the command's own test proves the write, not that the
   stage makes it.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                |
| -------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `spec-0010/TDD-0016` | `ledger-row` | Its `done` claim rests on the command's test, and this record changes the writer it certifies |

- Not blocked by this CR: every other `spec-0010` row. `TDD-0017` shares
  `discussion.test.ts` and carries `TC-0010-0013`, the reader's rejection of an
  absent pointer. That obligation does not change when the stage starts writing
  the pointer.
- Overlapping open CRs:
  - `CR-20260913-0004` reconciles the pointer's readers, and its cross-spec
    walk re-runs the `done` rows certified by `discussion.test.ts`,
    `TDD-0016` among them. The two records are independent, and either can be
    applied first. If this one is applied first, the walk no longer meets
    `TDD-0016` at `done` and skips it. If it is applied second, `TDD-0016` is
    re-run under `CR-20260913-0004` and then reset here.
  - `CR-20260912-0003` re-derives other `spec-0010` chains: the direction rule
    and root `DESIGN.md`. It names neither `TC-0010-0012` nor `TDD-0016`. Under
    option 1 the two records edit different lines of
    `spec-0010/tdd/test-list.md` and `09_delta.md`, and their order does not
    matter.
  - `spec-0010`'s ledger lacks the template's newer columns, and a repair for
    that is owed. The reset in step 4 writes only cells the ledger has today:
    `Test file`, `Selector`, `Status`, `DR-ID` and `Evidence`.

## Impact scope

- Specs: `spec-0010`
- Plans: `none`
- Tests: `spec-0010/TDD-0016` and the test `/qfai-atdd` writes for it, under
  `packages/qfai/tests/**`; and, through the `/qfai-atdd spec-0010` pass in
  action 3, every other ATDD-owned `spec-0010` row still owed that no open
  Change Request blocks when that pass runs, with
  `.qfai/evidence/atdd-spec-0010.md`
- Contracts: `none`
- Schema: `none`
- Product: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/SKILL.md`
  and its generated mirror under `.qfai/assistant/skills/qfai-discussion/`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0010/09_delta.md`,
  `.qfai/specs/spec-0010/tdd/test-list.md`

## Decision needed from user

Approve option 1: the discussion skill writes the pointer by running
`qfai discussion use` on the pack it authored, and `TDD-0016` is reset onto a
test of that writer?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0010`, mode `confirm-only`. No statement changes, so it
   re-derives nothing. It records this Change Request as one row in
   `spec-0010/09_delta.md`'s `## Change Requests` table — `CR ID`,
   `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — not as a
   `## Triage` row.

2. **In this order**:
   1. `/qfai-implement spec-0010` runs its Change Request preflight, which
      writes step 4's reset of `TDD-0016` before the ledger is read for
      anything else. It advances no row and makes no product edit.
   2. `/qfai-atdd spec-0010` writes the test step 4 describes and binds
      `TDD-0016` to it. The row is an `Integration` row, whose tests that stage
      writes and `/qfai-implement` does not (`qfai-implement/SKILL.md`). The
      skill has no such step yet, so the test fails. It records the handover.
      **That invocation is not limited to this row**: it takes up every
      ATDD-owned `spec-0010` row still owed when it runs that no open Change
      Request blocks, as that stage's ordinary forward work. It writes their
      tests under `packages/qfai/tests/**` and their entries in
      `.qfai/evidence/atdd-spec-0010.md`. None of that edits an upstream path.
   3. `/qfai-implement spec-0010` resumes from that handover and takes
      `TDD-0016` through its cycle. Its product edit is steps 1 and 2 of
      `## Proposed change`: the skill step, then `corepack pnpm -s sync:ssot`
      for the mirror.

## Resolution

Not yet resolved.
