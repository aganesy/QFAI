# Change Request

- ID: `CR-20260913-0003`
- Title: `spec-0013 states four rules the product states otherwise`
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

Four obligations in `spec-0013` state something the code states the opposite of,
or something no code path reaches. Each was found while scoring the pack's
coverage depth. All four ledger rows stand `done`, so nothing reports the
disagreement today except an unresolved `Selector` on two of them.

They are gathered in one record because they share a cause — the pack was
written against a mechanism that has since been retired, and against a template
that was filled in after the criterion was drafted — and because settling them
one at a time would leave the pack self-contradictory between records. They are
settled **separately**: the decision section puts one question per item, and an
approval names an option for each.

The count band drift is not here: it is a separate contradiction about a
different obligation, and it blocks different rows.

### 1. Two test cases in one pack require opposite things of one value

`TC-0013-0025` requires every `screens[]` entry of the shipped
`ui-contract.sample.yaml` to carry a literal `primary_tasks: []`.
`AC-0013-0018`, `BR-0013-0015` and `EX-0013-0015` repeat the literal form —
`BR-0013-0015` says "The slot ships as an empty array (placeholder for
authoring)".

`TC-0013-0026`, in the same pack, requires the validate lane to fail at `error`
on exactly that value, naming the file, the screen id and the rule token.

A template shipping the literal empty list would hand an author a contract that
fails on first use. The template ships filled entries — two tasks on the sample
screen — and `sddUiTemplate.test.ts` asserts only that the key is present and
holds a list. So the product satisfies `TC-0013-0026` and contradicts the other
four statements.

### 2. Legacy contracts are specified non-blocking, and blocked

`TC-0013-0027` says pre-existing contracts that predate the slot "are treated
under deprecation-window semantics (informational, non-blocking)", with no
further condition. The covering case is named
`legacy slot-less contracts emit QFAI-AUD-001 at severity=error (past sunset)`
and asserts that no `info`-severity finding is produced.

`BR-0013-0016` states the same rule **with** its condition: informational "until
they are re-authored or until the next minor escalates the warning". The sunset
named throughout is `qfai 1.10.0` and the package is at `1.11.1`, so that
condition has been met and the product is right.

What is wrong is what carries the condition. The test case dropped it, and the
test file's own header comment still describes the pre-sunset behaviour: "legacy
UI contracts -> QFAI-AUD-001 at severity=info … non-blocking so legacy contracts
can migrate without a hard break", three lines above a case asserting the
opposite.

### 3. A skill is named and a helper nothing calls is driven

`TC-0013-0030`'s obligation has two halves: `/qfai-sdd` sets
`surface_type: ui-bearing` frontmatter for a spec with a UI companion, and
`resolveAllUiBearingSpecs()` still requires that frontmatter as the strict
signal.

`surfaceTypePopulate.test.ts` calls `populateSurfaceTypeIfUiCompanion` directly.
That function is exported from `packages/qfai/src/core/detection/surfaceType.ts`
and has **no caller anywhere in `src`** — the only references are its own
definition and the test. So the first half is exercised against a helper no
stage invokes, and the second half is exercised by nothing. The ledger row's
`Evidence` cell already records the gap: "end-to-end driver-side wiring tracked
as follow-up".

### 4. A finding is specified `warning` during a window and emitted `error` always

`AC-0013-0023`, `BR-0013-0018`, `TC-0013-0031` and `US-0013-0013` all require
`D-SURFACE-TYPE-MISSING` at `warning` during a deprecation window, sunsetting to
`error` at window close.

`validateSurfaceTypeDrift` sets `const severity = "error" as const`, with no
window logic of any kind. **The mechanism those four layers name no longer
exists**: it was removed by `retire the version-keyed severity mechanism`, a
change whose own title says what it did. Two facts follow, and they point the
same way — the window's named sunset is `1.10.0` and the package is `1.11.1`, so
even on the retired mechanism the finding would now be `error`.

The comments around the covering cases are wrong under either reading. Both pin
`error` under a `describe` still named "warns", and beside each sits the comment
"Comparing against `deprecationSeverity` breaks if the validator hard-codes
again" — written beside a hard-coded literal, in
`surfaceTypePopulate.test.ts` and `spec0013ActivePointerSurfaceTypeE2E.test.ts`
alike.

## Proposed change

For each of the four, settle which side is stale, make every layer of the pack
state the settled rule, and leave a test that pins it.

## Options (at least 3) and recommendation

The options are per item. An approval names one per row of the decision section;
`Approved option` records them as `1b/2a/3c/4a` or the like.

### Item 1 — the template slot

| #   | Option                                                                                                                                            | Cost                                                | Risk                                                                                                                                                               | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 1a  | Narrow the four statements to what the template does: every `screens[]` entry carries the `primary_tasks` key, holding at least one authored task | One criterion, one rule, one example, one test case | The template stops demonstrating the empty-slot placeholder the rule was written to describe, and an author copying it edits tasks rather than filling blanks      | ✅          |
| 1b  | Ship the literal `primary_tasks: []` and narrow `TC-0013-0026` so the lane's error applies only to authored contracts, not to the template        | The template, its test, and the lane's subject      | The shipped sample then fails the repository's own validate lane, and the exemption is a rule about where a file came from, which the lane cannot read from a path |             |
| 1c  | Keep both statements and record the template as a declared exception to the lane                                                                  | An exception list and the code that reads it        | A second mechanism to carry one file. The lane's message names the rule token, so the exception has to be explained wherever the finding surfaces                  |             |

Option 1a is recommended because the product has already chosen. The template
ships filled entries, its test asserts only presence and list-ness, and both have
stood through the lane's introduction. The contradiction is between two
statements about one value, and the one the product satisfies is the one with an
executable consequence.

### Item 2 — the legacy-contract window

| #   | Option                                                                                                                                                 | Cost                                                     | Risk                                                                                                                          | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2a  | Re-derive `TC-0013-0027` to carry the condition `BR-0013-0016` already states, so the test case says informational **until** the sunset, then blocking | One test case, and the test file's header comment        | None identified. The rule beneath it is unchanged and the product already satisfies it                                        | ✅          |
| 2b  | Re-derive `TC-0013-0027` to the post-sunset state alone: legacy contracts block                                                                        | The same, plus the window drops out of the pack entirely | The pack then records no window at all, so a reader cannot tell a rule that never had one from a rule whose window has closed |             |
| 2c  | Restore the window in the product                                                                                                                      | A severity mechanism retired repository-wide             | Re-introduces the mechanism item 4's change removed, for one finding, and the named sunset has passed regardless              |             |

Option 2a is recommended because nothing here is actually in dispute: the
business rule states the rule correctly, the product implements it, and the test
case is a lossy restatement. What it costs is one sentence.

### Item 3 — the unwired helper

| #   | Option                                                                                                                                      | Cost                                                                    | Risk                                                                                                                             | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 3a  | Wire the helper into `/qfai-sdd` so the obligation's first half has a driver, and add a case that drives the stage rather than the function | A product change and its test, plus whatever the stage's contract needs | The stage gains a write to a spec's frontmatter, which is an upstream edit made by a stage rather than by an author              |             |
| 3b  | Narrow `TC-0013-0030` to the helper's behaviour, and state that the wiring is not this pack's obligation                                    | One test case and its criterion                                         | The pack then specifies a function nobody calls. The obligation reads as met while the behaviour a user would see does not exist |             |
| 3c  | Split the obligation: keep the helper's half here, and record the wiring as its own requirement with its own row                            | One test case, one new requirement chain, one ledger row                | Two records where there was one, and the new row is `todo` from the day it is written                                            | ✅          |

Option 3c is recommended because 3b and 3a each discard half of a real
obligation. The helper's behaviour is specified, implemented and tested, and
losing that to a narrowing would be a regression in what the pack states; the
wiring is genuinely absent, and calling it out of scope would make the absence
invisible. Splitting keeps both true, and the row it opens is honest about what
is missing. The ledger cell already calls the wiring a follow-up, so this option
is the one that matches what the row's author believed.

### Item 4 — the finding's severity

| #   | Option                                                                                                                                     | Cost                                                            | Risk                                                                                                            | Recommended |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------- |
| 4a  | Re-derive the four layers to an unconditional `error`, and correct the two `describe` names and the two comments beside the covering cases | One story, one criterion, one rule, one test case, two suites   | The pack stops recording that the finding was once a warning. The retirement change is where that history lives | ✅          |
| 4b  | Restore a window for this finding alone                                                                                                    | A mechanism retired repository-wide, re-introduced for one code | A second severity path for one finding, and its sunset has already passed, so it would be born closed           |             |
| 4c  | Leave the four layers and record the disagreement as known                                                                                 | Nothing now                                                     | Four active statements contradicting the product, which is the state this Change Request exists to end          |             |

Option 4a is recommended because the mechanism the four layers describe was
removed on purpose, repository-wide, by a change whose title says so. A spec
requiring a version-keyed severity is requiring a feature the product no longer
has; and the window it names has closed regardless, so both readings arrive at
`error`.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                      |
| -------------------- | ------------ | ------------------------------------------------------------------- |
| `spec-0013/TDD-0019` | `ledger-row` | Carries `TC-0013-0025`, the template-slot obligation item 1 settles |
| `spec-0013/TDD-0021` | `ledger-row` | Carries `TC-0013-0027`, whose non-blocking sentence item 2 settles  |
| `spec-0013/TDD-0025` | `ledger-row` | Carries `TC-0013-0030`, the obligation item 3 splits or narrows     |
| `spec-0013/TDD-0026` | `ledger-row` | Carries `TC-0013-0031`, the severity obligation item 4 settles      |

Each row stands `done` and cannot carry pointer-grammar evidence while this
holds: a mutation recorded against the narrower assertion would fix the
disagreement into the record and drop the ratchet that is the only thing holding
the rows open today.

- Not blocked by this CR: every other `spec-0013` row. The pack's other
  obligations do not read the template's slot value, the legacy-contract window,
  the surface-type helper or the drift finding's severity. `TDD-0016`, the row
  for the lock write, is not blocked here either: its obligation is about which
  stage writes the lock, which none of these four items touches.
- Overlapping open CRs: `none`.

## Impact scope

- Specs: `spec-0013`
- Plans: `none`
- Tests: `spec-0013/TDD-0019`, `spec-0013/TDD-0021`, `spec-0013/TDD-0025`,
  `spec-0013/TDD-0026` —
  `packages/qfai/tests/integration/sddUiTemplate.test.ts`,
  `packages/qfai/tests/integration/sddPrimaryTasksLane.test.ts`,
  `packages/qfai/tests/core/surfaceTypePopulate.test.ts`,
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
  `.qfai/specs/spec-0013/tdd/test-list.md`

  **Product paths, under the options that change the product** — `1b` and `1c`
  reach
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/contracts/ui-contract.sample.yaml`
  and its root mirror; `2c` and `4b` reach
  `packages/qfai/src/core/validators/surfaceTypeDrift.ts` and
  `packages/qfai/src/core/validators/designAudit.ts`; `3a` reaches
  `packages/qfai/src/core/detection/surfaceType.ts` and the `/qfai-sdd` skill
  under `packages/qfai/assets/init/` with its root mirror. **This list is
  reduced to the approved outcomes before `Status: approved` is written**:
  `QFAI-DRIFT-001` reads a path here and not the condition beside it, so under
  the recommended set — `1a/2a/3c/4a` — the only product edits are the test-side
  corrections named below, and every path in this paragraph is struck.

  The test files above are in scope under every outcome, because each item's
  settlement changes what its covering case asserts or what its comments claim.

## Decision needed from user

Four questions, settled independently.

1. **The template slot.** Does the shipped UI contract template carry
   `primary_tasks` as a literal empty list (the spec's current wording), or as a
   key holding at least one authored task (what it ships)?
2. **The legacy-contract window.** Does `TC-0013-0027` carry the sunset
   condition its business rule states, drop the window and describe the current
   blocking behaviour, or should the window be restored in the product?
3. **The surface-type helper.** Is the missing `/qfai-sdd` wiring a separate
   requirement with its own row, out of this pack's scope, or work to do now?
4. **The drift finding's severity.** Is `D-SURFACE-TYPE-MISSING` an
   unconditional error, or should a deprecation window be restored for it?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0013` rerun, mode `re-derive`, scope by item:

   | Item | Statements re-derived                                                                                                                     |
   | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
   | 1    | `AC-0013-0018`, `BR-0013-0015`, `EX-0013-0015`, `TC-0013-0025` — and `US-0013-0011` above them, which the criterion scenarios             |
   | 2    | `TC-0013-0027`. `BR-0013-0016` already states the rule and is not edited under `2a`                                                       |
   | 3    | `TC-0013-0030` and its criterion; under `3c` a new requirement chain for the wiring, story through test case, with its own `09_delta` row |
   | 4    | `US-0013-0013`, `AC-0013-0023`, `BR-0013-0018`, `TC-0013-0031`                                                                            |

   Each item carries its own `09_delta.md` Triage row. One rerun performs them
   all; an item whose option leaves its statements alone contributes no row.

2. Downstream ledger sweep.
   - Reset to `todo`, recording this CR's ID in `DR-ID`: `spec-0013/TDD-0019`
     under `1a` or `1b`, `spec-0013/TDD-0021` under `2a` or `2b`,
     `spec-0013/TDD-0025` under `3a`, `3b` or `3c`, and `spec-0013/TDD-0026`
     under `4a`. Each row's obligation changes under those outcomes, and each
     recorded observation is of the rule being replaced.
   - `TDD-0019` and `TDD-0025` are **re-pointed in the same rerun**. Both carry
     an unresolved `Selector` today, so a reset alone returns a row to `todo`
     still selecting nothing. Row identity is Phase 2b's to write.
   - No row is retired. Every one of the four keeps an obligation under every
     option, so the retirement branch does not apply and no `TDD-ID` reservation
     is owed.
   - Under `1c`, `2c` and `4b` no row is reset: those options change the product
     to match statements that do not move, which is the in-place
     shared-artifact re-verification rather than an upstream invalidation.

3. Correct the test-side text the items make wrong, under `/qfai-implement`,
   with the row repairs:
   - the header comment of `sddPrimaryTasksLane.test.ts`, which describes the
     pre-sunset behaviour three lines above a case asserting the opposite;
   - the two `describe` names reading "warns" over cases pinning `error`;
   - the two comments claiming a comparison against a computed severity, beside
     hard-coded literals.

   These are not optional under any outcome. A comment that states the opposite
   of the case beneath it is what let all four of these sit unreported.

## Resolution

Not yet resolved.
