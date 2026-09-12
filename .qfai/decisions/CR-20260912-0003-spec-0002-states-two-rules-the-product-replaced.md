# Change Request

- ID: `CR-20260912-0003`
- Title: `spec-0002 states two rules the product replaced: discussion fixes no direction, and prototyping.yaml is required`
- Raised by: `/qfai-implement orchestrator, repairing the spec-0002 execution ledger`
- Raised at: `2026-09-12T12:40:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

Two statements in spec-0002 are contradicted by the product that is supposed to
satisfy them. Both were recorded on 2026-04-23, and neither was revisited when
the behaviour behind it changed.

### A. Discussion chooses no direction

`01_Spec.md` REQ-0012 says discussion performs no single-winner, selected
direction or design-system finalization. `03_Acceptance-Criteria.md`
AC-0002-0008 states it as a scenario: given a UI-bearing pack, a selected
direction or finalized design system is never a discussion completion
condition. `07_Decisions.md` DR-0002-0001 and DR-0002-0003 carry the same rule,
the second placing `selected-direction.yaml` and `design-system.yaml`
downstream of prototyping winner selection.

The product states a narrower rule. The user chooses the brand direction during
discussion; it is recorded at `01_Context.md#Design Direction`; `/qfai-sdd`
Phase 0 reads that field and stops without it; and planner-first now binds only
the screen explorations.
`packages/qfai/tests/assets/designDirectionInterview.test.ts` states the
narrowing in as many words — the rule used to forbid selecting any visual
winner, and it still holds for the screen explorations, which the prototype
loop ranks by iterating.

Nothing under `packages/qfai/src/` contains `planner-first`, and no validator
emits a violation for a pack that asserts a single final winner. The
`discussionDesignHardening` validator that would have was retired in v1.8.9
together with the exploration-sidecar family, which this spec's own ledger
notes record.

### B. `prototyping.yaml` is required of a UI-bearing pack

`01_Spec.md` REQ-0005 says UI-bearing discussion packs require
`prototyping.yaml` and non-ui packs do not. AC-0002-0010 states the scenario,
and TC-0002-0011 asks that README and skill wording match the active rule.

The shipped wording says the opposite, in one sentence three documents are
required to carry verbatim: UI-bearing discussion packs **may** include
`prototyping.yaml` as an optional recommendation artifact. The preflight agrees
— `tests/core/sddPreflight.test.ts` requires a UI-bearing pack missing the file
not to block, and requires a malformed one not to block either.

So a test that checks the wording against the product passes while
contradicting the acceptance criterion, and a test that enforced the criterion
would have to fail against the product.

## Proposed change

Reconcile each statement with the behaviour, in the direction the user chooses
from the options below, and sweep the ledger rows that rest on them.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                                              | Cost                                                     | Risk                                                                                                      | Recommended |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Narrow the spec to the product: REQ-0012 and AC-0002-0008 bind the screen explorations only; REQ-0005 and AC-0002-0010 say the artifact is optional | Edit four upstream statements; re-point four ledger rows | Records today's behaviour as intended. If either narrowing was a regression, it becomes the specification | ✅          |
| 2   | Restore the product to the spec: reinstate a winner check, and make `prototyping.yaml` a readiness blocker for UI-bearing packs                     | New validator work, and a breaking change for adopters   | Reverses a deliberate design move without the record of why it was made                                   |             |
| 3   | Retire the four obligations: withdraw REQ-0012, AC-0002-0008, REQ-0005's requiredness half and AC-0002-0010, and delete the rows resting on them    | Smallest edit                                            | Loses the record that the question was ever settled, so the next reader re-derives it                     |             |

Option 1 is recommended because the narrowing is documented in the tree and was
made on purpose: the direction interview asks the user rather than letting an
assistant invent a brand, and the optional artifact is stated identically in
three shipped documents and enforced by the preflight. What is missing is the
spec catching up, not the product going back.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                             |
| -------------------- | ------------ | -------------------------------------------------------------------------- |
| `spec-0002/TDD-0008` | `ledger-row` | `TC-0002-0008` asks that discussion completion not require a direction     |
| `spec-0002/TDD-0009` | `ledger-row` | `TC-0002-0009` asks that a pack asserting a single final winner be refused |
| `spec-0002/TDD-0010` | `ledger-row` | second row on `TC-0002-0009`                                               |
| `spec-0002/TDD-0012` | `ledger-row` | `TC-0002-0011` asks that the wording match the active requiredness rule    |
| `spec-0002/TDD-0011` | `ledger-row` | its recorded observation covers the file both annotation repairs must edit |

`TDD-0011` is here for a different reason from the other four. Its obligation is
sound and its test discharges it. But the two repairs the matrix asks for —
giving `non-UI skip` a fixture that makes the guard load-bearing, and removing
the three annotations `threeLayer.test.ts` declares that this spec's table does
not hold — both edit the file `TDD-0011`'s recorded observation covers. Either
reddens `QFAI-TDDLIST-009` and restarts the row's cycle, so the repair needs an
authorized reset rather than an edit beside it.

- Not blocked by this CR under options 1 and 3: `spec-0002/TDD-0001`. Its
  obligation, pack readiness, is untouched by either statement, and its test
  discharges it. **Under option 2 it is blocked**: making a missing
  `prototyping.yaml` a readiness blocker edits
  `packages/qfai/tests/core/sddPreflight.test.ts`, which is the file this row's
  recorded observation covers, so its evidence goes stale the moment the change
  lands and it needs the same reset as the others.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0002` — `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/02_User-stories.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/04_Business-Rules.md`,
  `.qfai/specs/spec-0002/05_Examples.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`
- Plans: `.qfai/specs/spec-0002/10_Plan.md`
- Tests: `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0010`,
  `spec-0002/TDD-0011`, `spec-0002/TDD-0012`, and `spec-0002/TDD-0001` under
  option 2 only —
  `packages/qfai/tests/validators/uix/threeLayer.test.ts`,
  `packages/qfai/tests/validators/uix/screenContract.test.ts`,
  and under option 2 `packages/qfai/tests/core/sddPreflight.test.ts`
- Product files, option 2 only — the option is implementation work, and the
  scope has to authorise what it edits:
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/**` and its
  root mirror, which carry the direction interview;
  `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/**` and its mirror,
  whose Phase 0 reads the recorded direction;
  `packages/qfai/src/core/preflight/sddPreflight.ts`, which must block on a
  missing `prototyping.yaml`; a new validator source for the single-winner
  violation; and the three shipped documents carrying the optional-artifact
  sentence. The tests that pin the behaviour being removed move with it:
  `packages/qfai/tests/assets/designDirectionInterview.test.ts`,
  `packages/qfai/tests/assets/sddStage0PrototypingOptional.test.ts`,
  `packages/qfai/tests/assets/assets.test.ts` and
  `packages/qfai/tests/core/sddPreflight.test.ts`.
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0002/01_Spec.md`,
  `.qfai/specs/spec-0002/02_User-stories.md`,
  `.qfai/specs/spec-0002/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0002/04_Business-Rules.md`,
  `.qfai/specs/spec-0002/05_Examples.md`,
  `.qfai/specs/spec-0002/06_Test-Cases.md`,
  `.qfai/specs/spec-0002/07_Decisions.md`,
  `.qfai/specs/spec-0002/09_delta.md`,
  `.qfai/specs/spec-0002/10_Plan.md`,
  `.qfai/specs/spec-0002/tdd/test-list.md`

  A layered pack states one rule at every layer, so the story, the business rule
  and the example that carry these two rules move with the requirement and the
  acceptance criterion. Leaving them behind is how a pack ends up saying
  prototyping selects the direction on one page and the user does on another.

## Decision needed from user

Which of the three options settles each statement? They may be settled
differently: option 1 for the direction rule and option 3 for the requiredness
rule is a coherent answer, since the second is a sentence the product already
states in three places and the first is a rule the product still partly keeps.

`Approved option` takes one value, so a split answer is written as one — `1A/3B`
means option 1 for statement A, the direction rule, and option 3 for statement
B, the requiredness rule. A single digit means the same option for both. The
nine combinations are not listed as nine options, because the two statements are
independent and a table of every pairing would ask the user to read nine rows to
make two choices.

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd` rerun scope: the statements the chosen option names, plus the
   `06_Test-Cases.md` rows that read them, and the `10_Plan.md` row citing
   `TC-0002-0026`, which this spec's table does not declare.
2. Downstream ledger sweep. The two statements are settled independently, so the
   plan is read per statement and not per bundle. Statement A is the direction
   rule — `REQ-0012`, `AC-0002-0008`, `DR-0002-0001`, `DR-0002-0003`, and
   `TC-0002-0008` / `TC-0002-0009` under them, which `TDD-0008`, `TDD-0009` and
   `TDD-0010` rest on. Statement B is the requiredness rule — `REQ-0005`,
   `AC-0002-0010`, and `TC-0002-0011` under them, which `TDD-0012` rests on.
   Nothing in statement A's list touches statement B's rows or the reverse, so
   `1A/2B` is option 1 applied to A's rows and option 2 applied to B's, with no
   overlap to resolve. `TDD-0011` is reset under every combination for a reason
   belonging to neither statement, given at step 3.

   The three option bodies below each describe **both** statements, because that
   is how they are compared. Applying one to a single statement means taking only
   the rows and files that statement's list names.

   **Option 1 — narrow the spec to the product.** `/qfai-sdd` re-derives
   `REQ-0012`, `AC-0002-0008`, `DR-0002-0001`, `DR-0002-0003`, `REQ-0005` and
   `AC-0002-0010` to the narrower statements, and `TC-0002-0008`, `-0009` and
   `-0011` follow them.
   - Reset to `todo`, recording this CR's ID in `DR-ID`:
     `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0012`
   - Retire: `spec-0002/TDD-0010` — `current preflight unit test pass`

   **Option 2 — restore the product to the spec.** `/qfai-sdd` is `confirm-only`:
   no upstream statement changes. The work is implementation, and it is larger
   than a new validator. `REQ-0012` says discussion performs no selected-direction
   finalization, so restoring it means withdrawing the direction interview as well
   as adding the check: the shipped discussion skill asks the user to choose a
   brand direction, `01_Context.md#Design Direction` records it, and `/qfai-sdd`
   Phase 0 reads that field and stops without it. All three go, or the product
   still selects a direction during discussion and the requirement is still
   contradicted. Beside that: a validator that emits the single-winner violation
   `TC-0002-0009` names, a preflight that blocks a UI-bearing pack missing
   `prototyping.yaml`, and the three shipped documents rewritten to say the
   artifact is required. This is the option with the largest blast radius, and
   the direction interview it removes was itself added to stop an assistant
   inventing a brand.
   - Reset to `todo`, recording this CR's ID in `DR-ID`:
     `spec-0002/TDD-0008`, `spec-0002/TDD-0009`, `spec-0002/TDD-0012`, and
     `spec-0002/TDD-0001` — the last because the preflight change edits the file
     its observation covers.
   - Retire: `spec-0002/TDD-0010` — `current preflight unit test pass`, as under
     option 1. Restoring a winner validator gives `TC-0002-0009` no second
     boundary: the test case defines one violation, and this row points at a
     preflight selector about a missing `prototyping.yaml` that the restored
     check does not touch. Keeping it would preserve the duplicate row this CR
     exists to clear.

   **Option 3 — retire the four obligations.** `/qfai-sdd` re-derives every layer
   that carries them, not only the three that name them most visibly:
   `01_Spec.md` (`REQ-0012`, `REQ-0005`'s requiredness half),
   `02_User-stories.md` (`US-0002-0005`), `03_Acceptance-Criteria.md`
   (`AC-0002-0008`, `AC-0002-0010`), `04_Business-Rules.md` (`BR-0002-0008`,
   `BR-0002-0010`), `05_Examples.md` (`EX-0002-0008`, `EX-0002-0009`,
   `EX-0002-0011`) and `06_Test-Cases.md` (`TC-0002-0008`, `TC-0002-0009`,
   `TC-0002-0011`). A withdrawal that stops at the requirement leaves the story,
   the rule and the example asserting what was withdrawn, which is the state this
   Change Request exists to end rather than to reproduce one layer down.
   - Reset to `todo`: none.
   - Retire, each with its `Evidence` cell verbatim:
     `spec-0002/TDD-0008` — `current template integration test pass`;
     `spec-0002/TDD-0009` — `current e2e guidance test pass`;
     `spec-0002/TDD-0010` — `current preflight unit test pass`;
     `spec-0002/TDD-0012` — `current three-layer validator pass`.
     No test is deleted with any of them, and each retired row's test needs a
     disposition rather than a file that merely survives. `TDD-0012`'s selector,
     `legacy 4-axis format is error`, names a case that asserts
     `validateThreeLayerModel` emits `UIX-VAL-3LAYER-LEGACY-FORMAT`. That is a
     real behaviour of a live validator, and withdrawing `TC-0002-0011` takes
     away its obligation rather than its subject. The retirement procedure
     requires each surviving test to be deleted or re-pointed, and "left
     unowned" is neither, so this retirement carries an open item rather than a
     disposition: **name the obligation that owns the legacy-format finding, or
     delete the case.** It may not be re-pointed at `TDD-0011`, whose selector is
     a different case in the same file. Deleting it drops the only assertion
     that `validateThreeLayerModel` emits `UIX-VAL-3LAYER-LEGACY-FORMAT`, so the
     choice is a real one and option 3 cannot complete until it is made.
     `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`,
     `packages/qfai/tests/e2e/discussionHardeningE2E.test.ts` and
     `packages/qfai/tests/core/sddPreflight.test.ts` all carry coverage for
     other rows; `packages/qfai/tests/validators/uix/threeLayer.test.ts` stays
     with `spec-0002/TDD-0011`.

3. `spec-0002/TDD-0011` is **re-verified, not reset**, under every option. Its
   obligation `TC-0002-0010` does not move and its case `skips non-UI packs` is
   not edited; what changes is the file around it — the annotations, and the
   sibling case's fixture. A `CR-*` reset is for a row whose obligation an
   upstream change invalidated, and nothing here invalidates this one, so
   resetting it would claim a drift that did not happen. What the row needs is a
   fresh observation over the edited file: re-run its selector, re-record the
   `RED test hash` its manifest now computes to, and leave `Status` at `done`.

4. Reserve every retired `TDD-ID` in the ledger's `## TDD-ID reservations`
   section before the row is deleted. The ledger allocates the next id as
   `max + 1`, so deleting the highest row hands its number to the next one
   written, and two runs then share an identifier that this Change Request is
   the only record of. Option 1 reserves `spec-0002/TDD-0010`; option 2 the
   same; option 3 reserves `TDD-0008`, `TDD-0009`, `TDD-0010` and `TDD-0012`,
   the last of which is the current maximum and so the one that would be reused
   first.

## Resolution

Not yet resolved.
