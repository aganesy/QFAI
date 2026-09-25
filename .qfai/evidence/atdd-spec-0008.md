# ATDD Evidence: spec-0008

## Objective

Carry the proof for the two `done` rows of this spec's ledger whose `Evidence`
cells predate the pointer grammar. Both name a test that exists and passes. What
neither cell said is how the failing observation was obtained and how strong the
oracle is, and the original runs left no output behind.

It also carries the reviewed cycle of `TDD-0033`, `TDD-0034` and `TDD-0035`.
DR-0298 closed those rows at `exception` without per-row review, and each has
since been through the `qa-gatekeeper`, completion and code quality reviews it
was spared.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0008/06_Test-Cases.md`
- `.qfai/specs/spec-0008/tdd/test-list.md`
- `packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts`
- `packages/qfai/tests/integration/atddScaffoldEscalation.test.ts`
- `packages/qfai/src/core/atdd/scaffoldDialect.ts`
- `packages/qfai/src/core/atdd/scaffoldEscalation.ts`

## Decisions made (with rationale)

Both rows declare `Run output retained: no`. Their original runs are dated
2026-06-01 and the output was not kept, so the reviewer verdicts and the pack
seals a completed entry normally carries cannot be recorded — and must not be,
because a seal for a review whose artifacts are gone is a false record rather
than a missing one.

Everything the exemption does not drop is reproducible, and was reproduced. Each
test was re-run for its GREEN, and a mutation was applied to the code that
satisfies the obligation to establish that the test discriminates. Neither row
can produce an observed RED — the implementation shipped long before this
record — so both take the falsifiability path, and the mutation run is what that
path asks for.

## Work performed (what changed, where)

- `.qfai/specs/spec-0008/tdd/test-list.md` — the `Evidence` cells of `TDD-0013`
  and `TDD-0014` rewritten as pointers into this file. No `Status` moved.
- This file created.
- `.qfai/specs/spec-0008/tdd/test-list.md` — `TDD-0033`, `TDD-0034` and
  `TDD-0035` moved from `exception` to `done`, keeping DR-0298 in `DR-ID`. Their
  `Evidence` cells point at the entries below.
- `.qfai/waivers.yml` — the three rows removed from `WVR-20260925-08`.

## Commands executed + key outputs

Every command below ran from `packages/qfai`. The clean-tree runs were taken at
revision `d3894bf642fbc66fb2455d3340da4de66f1b6063`. Each mutation was reverted
before the next run, from a copy of the pre-mutation bytes rather than re-typed,
and the tree was re-addressed after each revert to confirm it had returned to
the clean value.

| Run                          | Command                                                                                                 | Result                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `TDD-0013` GREEN             | `npx vitest run tests/integration/atddScaffoldSkeleton.test.ts`                                          | 13 passed                         |
| `TDD-0013` falsifiability    | `npx vitest run tests/integration/atddScaffoldSkeleton.test.ts`                                          | 1 failed, 12 passed               |
| `TDD-0014` GREEN             | `npx vitest run tests/integration/atddScaffoldEscalation.test.ts`                                        | 8 passed                          |
| `TDD-0014` falsifiability    | `npx vitest run tests/integration/atddScaffoldEscalation.test.ts`                                        | 3 failed, 5 passed                |
| Refactor verify (both rows)  | `npx vitest run tests/integration/atddScaffoldSkeleton.test.ts tests/integration/atddScaffoldEscalation.test.ts` | 21 passed                 |
| Checkpoint (both rows)       | `npx vitest run --project integration`                                                                  | 1397 passed, 19 not run           |

## Test volume estimate

Not applicable. This run authored no test; it records proof for two rows whose
tests already exist.

## Coverage obligations checklist

Unchanged by this run. The spec's obligations and their coverage are scored in
the Coverage Depth Matrix below.

## Ledger rows advanced

`TDD-0013` and `TDD-0014` were already `done`; this file supplies the evidence
their cells point at. `TDD-0033`, `TDD-0034` and `TDD-0035` moved from
`exception` to `done`.

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0013` | `TC-0008-0013` | integration | falsifiability | done   |
| `TDD-0014` | `TC-0008-0014` | integration | falsifiability | done   |
| `TDD-0033` | `TC-0008-0025` | Integration | falsifiability | done   |
| `TDD-0034` | `TC-0008-0026` | Integration | falsifiability | done   |
| `TDD-0035` | `TC-0008-0027` | Integration | falsifiability | done   |

### TDD-0013

- TDD-ID: TDD-0013
- Layer: integration
- Test file: packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts
- Selector: atdd scaffold — per-TC skeleton emission
- TC-ref: TC-0008-0013
- Run output retained: no
- Backfill note: the original cycle ran on 2026-06-01 and its output was not kept. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Round 1: Satisfied-by: packages/qfai/src/core/atdd/scaffoldDialect.ts, JS_TS_DIALECT.buildBody — the two lines that write the marker `// TODO: implement assertion for <TC>` into an emitted skeleton.
- Round 1: Falsifiability command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 1 failed, 12 passed (13). The failure is an assertion inside this row's own selector, on the marker the obligation names.
- Round 1: Falsifiability revision: working-tree+a70638bab00ced77542a68d7790dd2dd37d921f0c5072bce04bde5ab78297c59
- Round 1: GREEN command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 13 passed (13)
- Round 1: RED test hash: 2dee31345505f7d2554b7e61d2434fc5779173dc6c0b51f87dac83c1d1994642
- Round 1: RED test manifest: packages/qfai/tests/integration/atddScaffoldSkeleton.test.ts

The mutation removed the `TODO:` prefix from **both** marker lines in the JS/TS
body.

**A second mutation, and why it survives.** Removing the prefix from one of the
two lines leaves the test green. That was run rather than assumed, and it is not
an oracle gap: `TC-0008-0013` asks that each emitted file **contain**
`// TODO: implement assertion for <TC-ID>`, so a body still holding it at one
site satisfies the obligation. The surviving mutant changes no contracted
behaviour, which is what makes it uninformative here.

The boundary that follows is on the obligation, not the test: nothing in the
spec pins where in the body the marker sits. A test asserting placement would
assert more than the spec requires.

- Refactor verify command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts tests/integration/atddScaffoldEscalation.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 21 passed (21)
- Refactor verify revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Checkpoint verification command: npx vitest run --project integration
- Checkpoint verification result: PASS — exit 0; Test Files 154 passed (158); Tests 1397 passed (1416)
- Checkpoint verification revision: d3894bf642fbc66fb2455d3340da4de66f1b6063

Four of that project's test files, carrying nineteen cases, declare themselves
inactive and did not run.

### TDD-0014

- TDD-ID: TDD-0014
- Layer: integration
- Test file: packages/qfai/tests/integration/atddScaffoldEscalation.test.ts
- Selector: atdd scaffold — idempotency + 3-cycle escalation
- TC-ref: TC-0008-0014
- Run output retained: no
- Backfill note: the original cycle ran on 2026-06-01 and its output was not kept. The test was re-run for the GREEN below, and the mutation below was applied and reverted to establish that the test discriminates. No reviewer verdict is recorded because none can be reconstructed.
- RED failure mode: falsifiability

#### Round 1

- Round 1: Revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Round 1: Satisfied-by: packages/qfai/src/core/atdd/scaffoldEscalation.ts, shouldEscalate — the at-threshold comparison the obligation's third cycle turns on.
- Round 1: Falsifiability command: npx vitest run tests/integration/atddScaffoldEscalation.test.ts
- Round 1: Falsifiability result: Test Files 1 failed (1); Tests 3 failed, 5 passed (8). All three failures are assertions inside this row's own selector.
- Round 1: Falsifiability revision: working-tree+b4b29ebebaaf5fdb346e5bc96661f30ab4532e29af3ba70890a74976bc6ee0f6
- Round 1: GREEN command: npx vitest run tests/integration/atddScaffoldEscalation.test.ts
- Round 1: GREEN result: Test Files 1 passed (1); Tests 8 passed (8)
- Round 1: RED test hash: 02616ec8c9f1724ceae8e15d5b095fdb671440d773e630f66172ba8b265019a9
- Round 1: RED test manifest: packages/qfai/tests/integration/atddScaffoldEscalation.test.ts

The mutation changed the comparison from at-threshold to above-threshold. Three
cases die, which is what the obligation's shape predicts: the at-threshold case,
the configurable-threshold case and the escalation-warning case all read that
boundary, and the last two fail on an empty warning rather than a wrong count.

- Refactor verify command: npx vitest run tests/integration/atddScaffoldSkeleton.test.ts tests/integration/atddScaffoldEscalation.test.ts
- Refactor verify result: Test Files 2 passed (2); Tests 21 passed (21)
- Refactor verify revision: d3894bf642fbc66fb2455d3340da4de66f1b6063
- Checkpoint verification command: npx vitest run --project integration
- Checkpoint verification result: PASS — exit 0; Test Files 154 passed (158); Tests 1397 passed (1416)
- Checkpoint verification revision: d3894bf642fbc66fb2455d3340da4de66f1b6063

Four of that project's test files, carrying nineteen cases, declare themselves
inactive and did not run.

### TDD-0027

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/stageSkillHandover.test.ts`
- Selector: `TC-0008-0019 (TDD-0027): The ATDD Stage Follows the Stage-Skill Handover`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/stageSkillHandover.test.ts --testNamePattern='TC-0008-0019 \(TDD-0027\): The ATDD Stage Follows the Stage-Skill Handover' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Entry check section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/stageSkillHandover.test.ts`

### TDD-0028

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/operationsTable.test.ts`
- Selector: `TC-0008-0020 (TDD-0028): The Operations Table Lists Exactly the ATDD Operations`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/operationsTable.test.ts --testNamePattern='TC-0008-0020 \(TDD-0028\): The Operations Table Lists Exactly the ATDD Operations' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the Operations table was written before this test existed
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/atdd/orchestrated/operationsTable.test.ts`

### TDD-0029

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/redAtAssertion.test.ts`
- Selector: `TC-0008-0021 (TDD-0029): A Non-Assertion Failure Is Never Reported as RED`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/redAtAssertion.test.ts --testNamePattern='TC-0008-0021 \(TDD-0029\): A Non-Assertion Failure Is Never Reported as RED' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## RED at the assertion section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/redAtAssertion.test.ts`

### TDD-0030

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/crossSpecDebts.test.ts`
- Selector: `TC-0008-0022 (TDD-0030): A Pass With Cross-Spec Obligations Is Accepted With Debt`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/crossSpecDebts.test.ts --testNamePattern='TC-0008-0022 \(TDD-0030\): A Pass With Cross-Spec Obligations Is Accepted With Debt' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## Cross-spec obligations section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/crossSpecDebts.test.ts`

### TDD-0031

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/seamRoundTrip.test.ts`
- Selector: `TC-0008-0023 (TDD-0031): The Seam Round Trip Returns to the Same Stage Instance`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/seamRoundTrip.test.ts --testNamePattern='TC-0008-0023 \(TDD-0031\): The Seam Round Trip Returns to the Same Stage Instance' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## The seam round trip section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/seamRoundTrip.test.ts`

### TDD-0032

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/layerDecisionNotCached.test.ts`
- Selector: `TC-0008-0024 (TDD-0032): The Layer Decision Is Made From the Current Spec and Ledger`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/layerDecisionNotCached.test.ts --testNamePattern='TC-0008-0024 \(TDD-0032\): The Layer Decision Is Made From the Current Spec and Ledger' --reporter=verbose`
- RED result: exit 1; `AssertionError: the ## The layer decision section exists: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/layerDecisionNotCached.test.ts`

### TDD-0033

- TDD-ID: TDD-0033
- Layer: Integration
- Test file: packages/qfai/tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts
- Selector: TC-0008-0025 (TDD-0033): A Test Fix Leaves the Ledger Row's Status Alone
- TC-ref: TC-0008-0025
- Reopened: `exception` -> `todo`. The row was parked under DR-0298 with an observed RED that no `qa-gatekeeper` judged and no reviewer read. That RED was taken on a tree that no longer exists, so this cycle takes the falsifiability branch against the current rule.
- Earlier cycle: on 2026-09-25 the test failed on the missing `` ## `test-fix` `` section, and passed once the section was written into `orchestrated-mode.md` together with the test. It is kept here as prose rather than as a round. The completion gate reads every round before the last as closed by a reviewer `REVISE` that opens the next one, and that cycle closed at `exception` with no reviewer verdict. Its fields are in the history of this file at revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de.
- Branch: falsifiability — the rule the test reads is already in the shipped skill, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md, section `` ## `test-fix` ``, the sentence that keeps `Status` out of what a test fix may edit
- Mutation: move `Status` from the fields the fix does not edit to the fields it may change, applied to base revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md, section `` ## `test-fix` ``, "The fix does not edit `Status`, `TC-Refs`, `Layer` or `Boundary`. It may change `Test file` and `Selector`."
- Round 1: Falsifiability command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts --testNamePattern="TC-0008-0025 \(TDD-0033\): A Test Fix Leaves the Ledger Row's Status Alone" --reporter=verbose (cwd `packages/qfai`)
- Round 1: Falsifiability result: exit 1; Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on ``AssertionError: expected '## `test-fix` - This skill takes a te…' to match /the fix does not edit `Status`, `TC-…/i`` at `tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts:23:18`

The edit:

```diff
-- The fix does not edit `Status`, `TC-Refs`, `Layer` or `Boundary`. It may
-  change `Test file` and `Selector`.
+- The fix does not edit `TC-Refs`, `Layer` or `Boundary`. It may change
+  `Status`, `Test file` and `Selector`.
```

- Round 1: Falsifiability revision: working-tree+4e1a96920cbb3a8414d12ecdd1a84a5b6846f05aa65d6a37916c43f7a74e7ae4
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 505e2fb6d06236b085813a4d34ff0bedf4341fb198d094955bf4fd0834efe24d
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts
```

- Round 1: Revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Round 1: GREEN command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts --testNamePattern="TC-0008-0025 \(TDD-0033\): A Test Fix Leaves the Ledger Row's Status Alone" --reporter=verbose (cwd `packages/qfai`)
- Round 1: GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed (1). The mutation was reverted from a copy of the base bytes before this run, and the tree outside the ledger and the evidence tree equals the base revision.

- Refactor verify command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts --reporter=verbose (cwd `packages/qfai`)
- Refactor verify result: exit 0; Test Files 1 passed (1); Tests 1 passed (1). The output names the row's selector. No production or test file changed in this phase, so there was nothing to refactor, and the whole test file is the relevant suite: the shipped reference it reads is imported by no other module.
- Refactor verify revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de

- qa-gatekeeper: PASS x2 (qa-gatekeeper#1 — Round 1, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+4e1a96920cbb3a8414d12ecdd1a84a5b6846f05aa65d6a37916c43f7a74e7ae4 at HEAD b0c0cdcac2558808fcf69800e84c8f53cb8f36de; qa-gatekeeper#4 — Round 1, build-phase GREEN + oracle proof, reviewed revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de)

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the evidence file carried no grilling record for this run and no work-order rows for it; the stage-level record was added and the row re-reviewed with no change to its RED or GREEN
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925105400001 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): a148eedd0638e0fb594294bc4b81e950c31742f0b4fe9ccea5d61e5e4d974ab1

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260925112000001 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): c8369eecfb7ae4953f4b8004fca57947a661c7de0bab365ad0cdef272b6a68b6
- Spec review: PASS
- Spec reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Spec audited evidence hash: 350902e3eaef589a263916b15a093707d158d48cbc2f90da2a706c2b282dc923
- Spec review pack: .qfai/review/review-20260925112000001 <!-- qfai:not-a-citation -->
- Spec review pack seal: c8369eecfb7ae4953f4b8004fca57947a661c7de0bab365ad0cdef272b6a68b6
- Code quality review: PASS
- Code quality reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Code quality audited evidence hash: 350902e3eaef589a263916b15a093707d158d48cbc2f90da2a706c2b282dc923
- Code quality review pack: .qfai/review/review-20260925112000001 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c8369eecfb7ae4953f4b8004fca57947a661c7de0bab365ad0cdef272b6a68b6
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Checkpoint verification command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts --reporter=verbose (cwd `packages/qfai`)
- Checkpoint verification result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since spec-0008 still has rows at `todo`, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Checkpoint verification seal: 81544a5d88f2d35fb3a0b46a8e95eb43173219e6d6f26d723031abde1f6267a8

### TDD-0034

- TDD-ID: TDD-0034
- Layer: Integration
- Test file: packages/qfai/tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts
- Selector: TC-0008-0026 (TDD-0034): A Change of Meaning Is Routed to SDD
- TC-ref: TC-0008-0026
- Reopened: `exception` -> `todo`. The row was parked under DR-0298 with an observed RED that no `qa-gatekeeper` judged and no reviewer read. That RED was taken on a tree that no longer exists, so this cycle takes the falsifiability branch against the current rule.
- Earlier cycle: on 2026-09-25 the test failed on the missing `` ## `test-fix` `` section, and passed once the section was written into `orchestrated-mode.md` together with the test. It is kept here as prose rather than as a round. The completion gate reads every round before the last as closed by a reviewer `REVISE` that opens the next one, and that cycle closed at `exception` with no reviewer verdict. Its fields are in the history of this file at revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de.
- Branch: falsifiability — the rule the test reads is already in the shipped skill, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md, section `` ## `test-fix` ``, the sentence that sends a change of meaning to `qfai-sdd`
- Mutation: name `qfai-atdd` instead of `qfai-sdd` as the finding's resolving owner, applied to base revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md, section `` ## `test-fix` ``, "A fix after which the expectation would cite a different AC or BR returns `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its `resolvingOwner`."
- Round 1: Falsifiability command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts --testNamePattern="TC-0008-0026 \(TDD-0034\): A Change of Meaning Is Routed to SDD" --reporter=verbose (cwd `packages/qfai`)
- Round 1: Falsifiability result: exit 1; Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on ``AssertionError: expected '## `test-fix` - This skill takes a te…' to match /a fix after which the expectation wo…/i`` at `tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts:21:18`

The edit:

```diff
-  `needs_repair`, listing that finding in `debts` with `qfai-sdd` as its
+  `needs_repair`, listing that finding in `debts` with `qfai-atdd` as its
```

- Round 1: Falsifiability revision: working-tree+7682794c8d3afa4a177721ad9e092cba3fb3c03d80f86ffbcd9f6ee5a91cf94e
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: ab4de10b0356760598c965821b21c7d83d903a8112180e1be417a97b7c232154
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts
```

- Round 1: Revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Round 1: GREEN command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts --testNamePattern="TC-0008-0026 \(TDD-0034\): A Change of Meaning Is Routed to SDD" --reporter=verbose (cwd `packages/qfai`)
- Round 1: GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed (1). The mutation was reverted from a copy of the base bytes before this run, and the tree outside the ledger and the evidence tree equals the base revision.

- Refactor verify command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts --reporter=verbose (cwd `packages/qfai`)
- Refactor verify result: exit 0; Test Files 1 passed (1); Tests 1 passed (1). The output names the row's selector. No production or test file changed in this phase, so there was nothing to refactor, and the whole test file is the relevant suite: the shipped reference it reads is imported by no other module.
- Refactor verify revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de

- qa-gatekeeper: PASS x2 (qa-gatekeeper#2 — Round 1, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+7682794c8d3afa4a177721ad9e092cba3fb3c03d80f86ffbcd9f6ee5a91cf94e at HEAD b0c0cdcac2558808fcf69800e84c8f53cb8f36de; qa-gatekeeper#4 — Round 1, build-phase GREEN + oracle proof, reviewed revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de)

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the evidence file carried no grilling record for this run and no work-order rows for it; the stage-level record was added and the row re-reviewed with no change to its RED or GREEN
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925105400002 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 33e70df81553dc5dffbf4f624ee5b90f98d2c1aa3d1df02b5da5e6eb26a9424b

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260925112000002 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): c68f6a6d71b8bfa815a9fb982b01d54f6eaa0ef38019ff8722e2955d6e61a9bd
- Spec review: PASS
- Spec reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Spec audited evidence hash: 5012e81ebb80c93ee26bc3efc9723e9a4bd5790551a0ab0417327d59d0a9bf65
- Spec review pack: .qfai/review/review-20260925112000002 <!-- qfai:not-a-citation -->
- Spec review pack seal: c68f6a6d71b8bfa815a9fb982b01d54f6eaa0ef38019ff8722e2955d6e61a9bd
- Code quality review: PASS
- Code quality reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Code quality audited evidence hash: 5012e81ebb80c93ee26bc3efc9723e9a4bd5790551a0ab0417327d59d0a9bf65
- Code quality review pack: .qfai/review/review-20260925112000002 <!-- qfai:not-a-citation -->
- Code quality review pack seal: c68f6a6d71b8bfa815a9fb982b01d54f6eaa0ef38019ff8722e2955d6e61a9bd
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Checkpoint verification command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts --reporter=verbose (cwd `packages/qfai`)
- Checkpoint verification result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since spec-0008 still has rows at `todo`, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Checkpoint verification seal: 74319a02eb54cde3ae2f8497cadaa3a3d4ad1c19f0c3609cabee655406813685

### TDD-0035

- TDD-ID: TDD-0035
- Layer: Integration
- Test file: packages/qfai/tests/integration/atdd/orchestrated/testFixLayers.test.ts
- Selector: TC-0008-0027 (TDD-0035): ATDD Takes a Test Fix Only for an Acceptance-Layer Row
- TC-ref: TC-0008-0027
- Reopened: `exception` -> `todo`. The row was parked under DR-0298 with an observed RED that no `qa-gatekeeper` judged and no reviewer read. That RED was taken on a tree that no longer exists, so this cycle takes the falsifiability branch against the current rule.
- Earlier cycle: on 2026-09-25 the test failed on the missing `` ## `test-fix` `` section, and passed once the section was written into `orchestrated-mode.md` together with the test. It is kept here as prose rather than as a round. The completion gate reads every round before the last as closed by a reviewer `REVISE` that opens the next one, and that cycle closed at `exception` with no reviewer verdict. Its fields are in the history of this file at revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de.
- Branch: falsifiability — the rule the test reads is already in the shipped skill, so no natural RED can be observed
- Predicate to break: packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md, section `` ## `test-fix` ``, the sentence that settles the mixed `Integration` row
- Mutation: hand an `Integration` row with one `L3` case among `L1` and `L2` cases to `qfai-implement` instead of this skill, applied to base revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de

#### Round 1

- Round 1: Satisfied-by: packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md, section `` ## `test-fix` ``, "One `L3` test case among `L1` and `L2` cases makes the row this skill's."
- Round 1: Falsifiability command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLayers.test.ts --testNamePattern="TC-0008-0027 \(TDD-0035\): ATDD Takes a Test Fix Only for an Acceptance-Layer Row" --reporter=verbose (cwd `packages/qfai`)
- Round 1: Falsifiability result: exit 1; Test Files 1 failed (1); Tests 1 failed (1). The row's case fails on ``AssertionError: expected '## `test-fix` - This skill takes a te…' to match /one `L3` test case among `L1` and `L…/i`` at `tests/integration/atdd/orchestrated/testFixLayers.test.ts:27:18`

The edit:

```diff
-  test case among `L1` and `L2` cases makes the row this skill's.
+  test case among `L1` and `L2` cases leaves the row `qfai-implement`'s.
```

- Round 1: Falsifiability revision: working-tree+e19346d64928af8d931d2397dd4db2b14f5db34b4884ece8fc289a0dcadb3a11
- Round 1: RED failure mode: falsifiability
- Round 1: RED test hash: 1457166bf90b15db54d576e3936874bc8b9f251808ccc0945e6c4f8b9de955b7
- Round 1: RED test manifest:

```text
packages/qfai/tests/helpers/recordProse.ts
packages/qfai/tests/helpers/shippedAssistant.ts
packages/qfai/tests/integration/atdd/orchestrated/testFixLayers.test.ts
```

- Round 1: Revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Round 1: GREEN command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLayers.test.ts --testNamePattern="TC-0008-0027 \(TDD-0035\): ATDD Takes a Test Fix Only for an Acceptance-Layer Row" --reporter=verbose (cwd `packages/qfai`)
- Round 1: GREEN result: exit 0; Test Files 1 passed (1); Tests 1 passed (1). The mutation was reverted from a copy of the base bytes before this run, and the tree outside the ledger and the evidence tree equals the base revision.

- Refactor verify command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLayers.test.ts --reporter=verbose (cwd `packages/qfai`)
- Refactor verify result: exit 0; Test Files 1 passed (1); Tests 1 passed (1). The output names the row's selector. No production or test file changed in this phase, so there was nothing to refactor, and the whole test file is the relevant suite: the shipped reference it reads is imported by no other module.
- Refactor verify revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de

- qa-gatekeeper: PASS x2 (qa-gatekeeper#3 — Round 1, RED phase gate on the falsifiability mutation run, reviewed revision working-tree+e19346d64928af8d931d2397dd4db2b14f5db34b4884ece8fc289a0dcadb3a11 at HEAD b0c0cdcac2558808fcf69800e84c8f53cb8f36de; qa-gatekeeper#4 — Round 1, build-phase GREEN + oracle proof, reviewed revision b0c0cdcac2558808fcf69800e84c8f53cb8f36de)

- Round 1: reviewer verdict (attempt 1): REVISE — completion-reviewer: the evidence file carried no grilling record for this run and no work-order rows for it; the stage-level record was added and the row re-reviewed with no change to its RED or GREEN
- Round 1: Review pack (attempt 1): .qfai/review/review-20260925105400003 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 1): 3a12d69dc7ceaa92e59cdf55425c69ad23f6fcef4b78496796eff678bb2dbac1

- Round 1: reviewer verdict (attempt 2): PASS
- Round 1: Review pack (attempt 2): .qfai/review/review-20260925112000003 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal (attempt 2): 5c3d434ddcba60b51de1f319c19fa3d501bd53cdd154fe834296dedcf3a3fde9
- Spec review: PASS
- Spec reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Spec audited evidence hash: fbd7cd81e6727800882d66c0288c35cf14d15b9c80e685139eb23b0114fff04b
- Spec review pack: .qfai/review/review-20260925112000003 <!-- qfai:not-a-citation -->
- Spec review pack seal: 5c3d434ddcba60b51de1f319c19fa3d501bd53cdd154fe834296dedcf3a3fde9
- Code quality review: PASS
- Code quality reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Code quality audited evidence hash: fbd7cd81e6727800882d66c0288c35cf14d15b9c80e685139eb23b0114fff04b
- Code quality review pack: .qfai/review/review-20260925112000003 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 5c3d434ddcba60b51de1f319c19fa3d501bd53cdd154fe834296dedcf3a3fde9
- Prototype parity: n/a (not UI-affecting)
- Prototype parity reviewed revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Checkpoint verification command: NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLayers.test.ts --reporter=verbose (cwd `packages/qfai`)
- Checkpoint verification result: PASS — exit 0; Test Files 1 passed (1); Tests 1 passed (1). Off a checkpoint boundary, since spec-0008 still has rows at `todo`, so the narrow suite of the refactor step is the checkpoint and nothing was re-run
- Checkpoint verification revision: b0c0cdcac2558808fcf69800e84c8f53cb8f36de
- Checkpoint verification seal: 979bf48e2c0ba2bd59c792dce75bdb0f25ac49b9b34c880ea0a4015e15e766ac

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0008.md`.
Totals: ✅ 45 / ⚠️ 26 / ❌ 192, with 7 not applicable, across 270 scored cells —
234 matrix depth cells (26 rows × 9 columns) and 36 business rule cells
(12 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Grilling Session

### /qfai-implement — run started 2026-09-25T10:08:45.000Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

No session opened. The run reopened `TDD-0033`, `TDD-0034` and `TDD-0035`, which
changed no production or test file, so it had no seam, production approach or
refactor scope to decide. Two choices it made are settled by rules rather than
decided, and step 3 of the Work Orders Summary names them. Step 12 is the
run's marker.

## Work Orders Summary

| Step | Role (sub-agent)        | Agent instance            | Task title                                                                                  | Input (refs)                                                                                                                  | Output (refs)                                                                                                                                                                                                                                                                                                                                                                                                                         | Status (PASS/REVISE/PENDING) |
| ---- | ----------------------- | ------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | test-design-analyst     | -                         | Score the twenty-six obligations and write the matrix                                       | `06_Test-Cases.md`, `02_User-stories.md`                                                                                      | `.qfai/evidence/coverage-depth-spec-0008.md`                                                                                                                                                                                                                                                                                                                                                                                          | PASS                         |
| 2    | completion-reviewer     | -                         | Audit the matrix against the depth checklist                                                | `.qfai/evidence/coverage-depth-spec-0008.md`                                                                                  | `#reviewer-response`                                                                                                                                                                                                                                                                                                                                                                                                                  | PENDING                      |
| 3    | orchestrator            | orchestrator#1            | Reopen `TDD-0033`..`TDD-0035` from `exception`, take each falsifiability mutation, revert   | DR-0298; `WVR-20260925-08`; `tdd/test-list.md`                                                                                | `#tdd-0033`, `#tdd-0034`, `#tdd-0035`. Falsifiability is the first branch of `red-provenance.md` that applies, because each rule already ships. The earlier cycle is prose, not a round, because the completion gate reads every round before the last as closed by a reviewer `REVISE`, and that cycle had no reviewer verdict.                                                                                                     | PASS                         |
| 4    | qa-gatekeeper           | qa-gatekeeper#1           | RED phase gate, `TDD-0033` falsifiability run                                               | `#tdd-0033` Round 1                                                                                                           | `#tdd-0033` `qa-gatekeeper`                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                         |
| 5    | qa-gatekeeper           | qa-gatekeeper#2           | RED phase gate, `TDD-0034` falsifiability run                                               | `#tdd-0034` Round 1                                                                                                           | `#tdd-0034` `qa-gatekeeper`                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                         |
| 6    | qa-gatekeeper           | qa-gatekeeper#3           | RED phase gate, `TDD-0035` falsifiability run                                               | `#tdd-0035` Round 1                                                                                                           | `#tdd-0035` `qa-gatekeeper`                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                         |
| 7    | qa-gatekeeper           | qa-gatekeeper#4           | Build-phase GREEN and oracle proof, `TDD-0033`..`TDD-0035`                                  | `#tdd-0033`, `#tdd-0034`, `#tdd-0035` Round 1                                                                                 | each row's `qa-gatekeeper`                                                                                                                                                                                                                                                                                                                                                                                                            | PASS                         |
| 8    | completion-reviewer     | completion-reviewer#1     | Spec review, attempt 1, one pack per row                                                    | `#tdd-0033`, `#tdd-0034`, `#tdd-0035`                                                                                         | `.qfai/review/review-20260925105400001`..`003` <!-- qfai:not-a-citation -->. No grilling record for this run; this section and steps 3-7 answer it                                                                                                                                                                                                                                                                                     | REVISE                       |
| 9    | implementation-reviewer | implementation-reviewer#1 | Code quality review, attempt 1, one pack per row                                            | `#tdd-0033`, `#tdd-0034`, `#tdd-0035`                                                                                         | `.qfai/review/review-20260925105400001`..`003` <!-- qfai:not-a-citation -->                                                                                                                                                                                                                                                                                                                                                           | PASS                         |
| 10 | completion-reviewer | completion-reviewer#2 | Spec review, attempt 2, one pack per row | `#tdd-0033`, `#tdd-0034`, `#tdd-0035`; attempt-1 packs | `.qfai/review/review-20260925112000001`..`003` <!-- qfai:not-a-citation --> | PASS |
| 11 | implementation-reviewer | implementation-reviewer#2 | Code quality review, attempt 2, one pack per row | `#tdd-0033`, `#tdd-0034`, `#tdd-0035` | `.qfai/review/review-20260925112000001`..`003` <!-- qfai:not-a-citation --> | PASS |
| 12 | - | n/a | grilling(-@2026-09-25T10:08:45.000Z/none): none | - | - | PASS |

## Cross-spec obligations

None.

## Reviewer response

- Role: completion-reviewer
- Status: PENDING
- Subject: `.qfai/evidence/coverage-depth-spec-0008.md`, audited against
  `.qfai/assistant/skills/qfai-atdd/references/test-case-depth-checklist.md`
- Result: outstanding. No verdict on record rules on this artifact. The subject
  is twenty-six rows and 234 depth cells — the eight user stories as well as the
  eighteen test cases — and the totals under "Coverage Depth Matrix" above are
  counted from it. An audit of a matrix that scored the test cases alone ruled on
  a smaller artifact, and does not carry to this one.
- Residual risk: the totals above, the reason given for each of the 192 `❌`
  cells, and the rationale given for each of the 26 `⚠️` cells are unreviewed. A
  count that disagrees with the table, or a justification that does not hold
  against the tree, is caught by nothing else in this file.

## Execution logs

Recorded per row above, and summarized in the table under
"Commands executed + key outputs".

## Gaps / Open risks

- `TC-0008-0013` pins the marker's presence in an emitted body and not its
  position, so a mutation to one of the two sites that write it survives. The
  measurement is in that row's section.
- Twelve of the spec's older rows are parked at `exception`, and two of those
  cite `DR-0008-0100`, which no decision record declares.
- `TDD-0027` to `TDD-0032` are still at `exception` under DR-0298 and still
  named in `WVR-20260925-08`. `TDD-0028`'s test passed on its first run, so it
  owes a real RED or a falsifiability proof as well as the reviews.
- The Coverage Depth Matrix scores `TC-0008-0001` to `TC-0008-0018` only, so no
  reviewer's audited hash for `TDD-0033` to `TDD-0035` covers a matrix slice.

## Final status

PASS for the five rows recorded here: each carries the evidence its pointer
names. This is a per-row verdict, not a stage verdict — the coverage matrix
beside it is unreviewed, and the reviewer row above reads `PENDING`.
