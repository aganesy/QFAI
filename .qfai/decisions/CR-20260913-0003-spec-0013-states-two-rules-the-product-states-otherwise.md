# Change Request

- ID: `CR-20260913-0003`
- Title: `spec-0013 states two rules the product states otherwise`
- Raised by: `qfai-implement`
- Raised at: `2026-09-12T20:41:35Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Two obligations in `spec-0013` state something the code states otherwise, or
something no code path reaches. Both were found while scoring the pack's
coverage depth. Both ledger rows stand `done`, so nothing reports the
disagreement today except an unresolved `Selector` on one of them.

In each, the pack states one rule consistently and the product has moved, so
what is left is a decision about which side to keep. They are gathered in one
record because they describe one feature, `surface_type` population and its
drift finding, and they are settled **separately**: the decision section puts
one question per item, and an approval names an option for each.

Two further contradictions found in the same pass are the pack disagreeing with
itself. Each has one correct fix, so each is raised as a defect on its own:
`CR-20260913-0007` for the template slot, and `CR-20260913-0008` for the
legacy-contract window.

### 1. A skill is named, a helper nothing calls is driven, and the resolver admits more

`TC-0013-0030`'s obligation has two halves: `/qfai-sdd` sets
`surface_type: ui-bearing` frontmatter for a spec with a UI companion, and
`resolveAllUiBearingSpecs()` still requires that frontmatter as the strict
signal. `REQ-0163`, the consumer view in `01_Spec.md`, `US-0013-0013`,
`AC-0013-0022` and the `surface_type` step of `10_Plan.md` state both halves.

**The first half is exercised against a helper no stage invokes.**
`populateSurfaceTypeIfUiCompanion` is exported from
`packages/qfai/src/core/detection/surfaceType.ts` and has no caller anywhere in
`src`. Three test files drive it directly:
`packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
`packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts:111`
and `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts:110`.
The ledger row's `Evidence` cell already records the gap: "end-to-end
driver-side wiring tracked as follow-up".

**The second half is contradicted by the resolver.**
`packages/qfai/src/core/prototyping/specResolution.ts:209-212` admits a spec
whose frontmatter is absent when a matching UI contract exists, and
`packages/qfai/tests/core/prototyping/specResolution.test.ts:209-215` pins it:
`accepts the contract fallback even when 01_Spec.md has no marker`. The
resolver is `spec-0012`'s, and `EX-0012-0152` specifies that fallback. The
frontmatter is therefore not the strict signal, and a rerun restating that it is
would point a later change at removing behaviour another pack owns.

### 2. A finding is specified `warning` during a window and emitted `error` always

`REQ-0163`, the consumer view in `01_Spec.md`, `US-0013-0013`, `AC-0013-0023`,
`BR-0013-0018`, `EX-0013-0018`, `TC-0013-0031` and the `surface_type` step of
`10_Plan.md` require `D-SURFACE-TYPE-MISSING` at `warning` during a deprecation
window, sunsetting to `error` at window close.

`validateSurfaceTypeDrift` sets `const severity = "error" as const`, with no
window logic of any kind. **The mechanism those layers name no longer exists**:
it was removed by `retire the version-keyed severity mechanism`, a change whose
own title says what it did. The window's named sunset is `1.10.0` and the
package is `1.12.0`, so even on the retired mechanism the finding would now be
`error`.

The text around the covering cases is wrong under either reading. Three suites
pin `error` under titles saying the finding warns, each beside the comment
"Comparing against `deprecationSeverity` breaks if the validator hard-codes
again", written next to a hard-coded literal:

| File                                                                       | Says the finding warns                          | The comment   |
| -------------------------------------------------------------------------- | ----------------------------------------------- | ------------- |
| `packages/qfai/tests/core/surfaceTypePopulate.test.ts`                     | header, `describe` and `it` (lines 7, 110, 111) | lines 118-122 |
| `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts` | `it` (line 117)                                 | lines 134-139 |
| `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`      | header, `it`, assertion message (8, 116, 126)   | lines 127-131 |

## Proposed change

For each of the two, settle which side is stale, make every layer of the pack
state the settled rule, and leave a test that pins it.

## Options (at least 3) and recommendation

The options are per item. An approval names one per row of the decision
section; `Approved option` records them as `1c/2a` or the like.

### Item 1 — the unwired helper

**The resolver half is settled the same way under every option**: a spec is
UI-bearing by its frontmatter or by a matching UI contract, as `spec-0012`
specifies. That is not a choice this record offers. The resolver is another
pack's, its fallback is specified there, and the product and its tests
implement it. The options below settle the first half only.

| #   | Option                                                                                                                                      | Cost                                                                                                                             | Risk                                                                                                                             | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1a  | Wire the helper into `/qfai-sdd` so the obligation's first half has a driver, and add a case that drives the stage rather than the function | A product change and its test, plus whatever the stage's contract needs                                                          | The stage gains a write to a spec's frontmatter, which is an upstream edit made by a stage rather than by an author              |             |
| 1b  | Narrow `TC-0013-0030` to the helper's behaviour, and state that the wiring is not this pack's obligation                                    | One test case and its criterion                                                                                                  | The pack then specifies a function nobody calls. The obligation reads as met while the behaviour a user would see does not exist |             |
| 1c  | Split the obligation: keep the helper's half here, and record the wiring as its own requirement with its own row                            | One test case, and one new requirement chain with two ledger rows: an `E2E` row for its story and a row at its test case's level | Two records where there was one, and the new rows are `todo` from the day they are written                                       | ✅          |

Option 1c is recommended, and the case against 1a is its risk rather than its
reach. 1a completes the obligation as written: it wires the helper and drives
the stage. But it makes `/qfai-sdd` write a spec's frontmatter, an upstream
edit made by a stage, which no stage contract provides for today, and approving
1a here would settle that question as a side effect. 1c keeps the wiring a
stated, tracked requirement without settling it now, and keeps the helper's
specified, tested behaviour in the pack. 1b is the one that discards half of
the obligation: calling the wiring out of scope makes its absence invisible.
The ledger cell already calls the wiring a follow-up, which is what 1c records.

### Item 2 — the finding's severity

| #   | Option                                                                                                                                 | Cost                                                                                            | Risk                                                                                                                                                                                                 | Recommended |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2a  | Re-derive the layers to an unconditional `error`, and correct the titles, the assertion message and the comments the table above names | The requirement, story, criterion, rule, example, test case, plan step and three suites         | The pack stops recording that the finding was once a warning. The retirement change is where that history lives                                                                                      | ✅          |
| 2b  | Restore a window for this finding alone, closing at a release the user names                                                           | A mechanism retired repository-wide, re-introduced for one code, and the release that closes it | A second severity path for one finding. The named sunset, `1.10.0`, has passed, so the window is open only until a later release, and which release that is is the user's to name, never the agent's |             |
| 2c  | Leave the layers and record the disagreement as known                                                                                  | Nothing now                                                                                     | Every one of those statements keeps contradicting the product, which is the state this Change Request exists to end                                                                                  |             |

Option 2a is recommended because the mechanism the layers describe was removed
on purpose, repository-wide, by a change whose title says so. A spec requiring a
version-keyed severity is requiring a feature the product no longer has; and the
window it names has closed regardless, so both readings arrive at `error`.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                                         |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `spec-0013/TDD-0025` | `ledger-row` | Carries `TC-0013-0030`, whose resolver half every option restates and whose helper half item 1 settles |
| `spec-0013/TDD-0026` | `ledger-row` | Carries `TC-0013-0031`, the severity obligation item 2 settles                                         |

Each row stands `done` and cannot carry pointer-grammar evidence while this
holds: a mutation recorded against the narrower assertion would fix the
disagreement into the record and drop the ratchet that is the only thing holding
the rows open today.

- Not blocked by this CR: every other `spec-0013` row. `TDD-0019` and `TDD-0021`
  are blocked by the two defect requests instead. `TDD-0016`, the row for the
  lock write, is about which stage writes the lock, which neither item touches.
- Overlapping open CRs: `CR-20260913-0007` and `CR-20260913-0008` name files
  this record names too — `06_Test-Cases.md`, `09_delta.md` and
  `tdd/test-list.md`, and `CR-20260913-0007` also the other statement files and
  `10_Plan.md`. **They are applied in order**: `CR-20260913-0008`, then
  `CR-20260913-0007`, then this record, which assumes both have landed. If
  either is rejected, this record is restated before it is applied. The three
  blocked sets do not intersect.

## Impact scope

- Specs: `spec-0013`
- Plans: `.qfai/specs/spec-0013/10_Plan.md`
- Tests: `spec-0013/TDD-0025`, `spec-0013/TDD-0026` —
  `packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
  `packages/qfai/tests/integration/spec0013ActivePointerSurfaceType.test.ts`,
  `packages/qfai/tests/e2e/spec0013ActivePointerSurfaceTypeE2E.test.ts`
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0013/01_Spec.md`,
  `.qfai/specs/spec-0013/02_User-stories.md`,
  `.qfai/specs/spec-0013/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0013/04_Business-Rules.md`,
  `.qfai/specs/spec-0013/05_Examples.md`,
  `.qfai/specs/spec-0013/06_Test-Cases.md`,
  `.qfai/specs/spec-0013/09_delta.md`,
  `.qfai/specs/spec-0013/10_Plan.md`,
  `.qfai/specs/spec-0013/tdd/test-list.md`

  **Product paths, under the options that change the product** — `1a` reaches
  `packages/qfai/src/core/detection/surfaceType.ts` and the `/qfai-sdd` skill
  under `packages/qfai/assets/init/` with its root mirror; `2b` reaches
  `packages/qfai/src/core/validators/surfaceTypeDrift.ts`. **This list is
  reduced to the approved outcomes before `Status: approved` is written**, so
  what an approval covers is read off the paths rather than off the conditions
  beside them. Under the recommended set, `1c/2a`, the only product edits are
  the test-side corrections named below, and every path in this paragraph is
  struck.

  The test files above are in scope under every outcome, because each item's
  settlement changes what its covering cases assert or what their text claims.

## Decision needed from user

Two questions, settled independently, and one value that only the second can
ask for.

1. **The surface-type helper.** Is the missing `/qfai-sdd` wiring a separate
   requirement with its own row, out of this pack's scope, or work to do now?
   The resolver half follows `spec-0012` whichever is chosen.
2. **The drift finding's severity.** Is `D-SURFACE-TYPE-MISSING` an
   unconditional error, or should a deprecation window be restored for it?
3. **Only if a window is restored:** the release at which it closes. There is
   no recommended value, because a release number is the user's to choose.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013` rerun, mode `re-derive`, scope by item:

   | Item | Statements re-derived                                                                                                                                                                                                                                                                                       |
   | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 1    | Under every option, the resolver half of `REQ-0163`, the consumer view, `US-0013-0013`, `AC-0013-0022`, `TC-0013-0030` and the `10_Plan.md` step, to the frontmatter or a matching UI contract. The helper half per the option — under `1c` a new requirement chain for the wiring, story through test case |
   | 2    | `REQ-0163`, the consumer view, `US-0013-0013`, `AC-0013-0023`, `BR-0013-0018`, `EX-0013-0018`, `TC-0013-0031` and the `10_Plan.md` step — under `2b` with the release the user named                                                                                                                        |

   One rerun performs both items, and it records this Change Request as one row
   in `spec-0013/09_delta.md`'s `## Change Requests` table — `CR ID`,
   `Upstream artifact`, `Mode`, `Approved by`, `Applied at` — not as a
   `## Triage` row.

   `CR-20260913-0008`'s rerun, applied first, seeds at `todo` the thirteen
   `E2E` rows `spec-0013`'s ledger lacks for its stories. If this rerun still
   finds any, its Phase 2b seeds them; they are owed whatever this record
   decides, and they are listed so the approval covers them.

2. Downstream ledger sweep.
   - Reset to `todo`, recording this CR's ID in `DR-ID`: `spec-0013/TDD-0025`
     under every option, because its resolver half changes under all three, and
     `spec-0013/TDD-0026` under `2a` and `2b`, because both re-derive
     `TC-0013-0031` — `2b` with the release the user names. Each recorded
     observation is of a rule being replaced.
   - `TDD-0025` is **re-pointed in the same rerun**. It carries an unresolved
     `Selector` today, so a reset alone returns it to `todo` still selecting
     nothing. Row identity is Phase 2b's to write.
   - No row is retired. Both keep an obligation under every option, so the
     retirement branch does not apply and no `TDD-ID` reservation is owed.
   - Under `1c`, Phase 2b adds two `todo` rows for the new chain: an `E2E` row
     with the new story in `US-Refs`, and a row at the new test case's declared
     level with it in `TC-Refs`. A test case never goes on the `E2E` row.
   - Under `2c` nothing moves.

3. Correct the test-side text under `/qfai-implement`, with the row repairs, so
   each title, message and comment the item 2 table names states what its case
   asserts. This is not optional under any outcome: text stating the opposite of
   the case beneath it is what let both of these sit unreported.

   **One of those titles is a row's `Selector`.** `TDD-0026` selects on
   `D-SURFACE-TYPE-MISSING warns on companion-without-frontmatter`, the
   `describe` title in `surfaceTypePopulate.test.ts`, so renaming it without the
   row would leave the row selecting nothing. Under `2a` the rerun re-points the
   row to the renamed title in the step that resets it, and under `2b`, where the
   restored window makes the title true again, the reset re-points it to whatever
   title the case then carries. Under `2c` no rerun
   runs to re-point the row, so that title stays and only the comments and the
   assertion message are corrected.

## Resolution

Not yet resolved.
