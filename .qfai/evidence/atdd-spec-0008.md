# ATDD Evidence: spec-0008

## Objective

Carry the proof for the two `done` rows of this spec's ledger whose `Evidence`
cells predate the pointer grammar. Both name a test that exists and passes. What
neither cell said is how the failing observation was obtained and how strong the
oracle is, and the original runs left no output behind.

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

No row changed status. Both rows below were already `done`; this run supplies
the evidence their cells point at.

| TDD-ID     | Obligation     | Layer       | RED provenance | Status |
| ---------- | -------------- | ----------- | -------------- | ------ |
| `TDD-0013` | `TC-0008-0013` | integration | falsifiability | done   |
| `TDD-0014` | `TC-0008-0014` | integration | falsifiability | done   |

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

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts`
- Selector: `TC-0008-0025 (TDD-0033): A Test Fix Leaves the Ledger Row's Status Alone`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts --testNamePattern='TC-0008-0025 \(TDD-0033\): A Test Fix Leaves the Ledger Row's Status Alone' --reporter=verbose`
- RED result: exit 1; `` AssertionError: the ## `test-fix` section exists: expected '' not to be '' // Object.is equality ``
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/testFixLedgerRow.test.ts`

### TDD-0034

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts`
- Selector: `TC-0008-0026 (TDD-0034): A Change of Meaning Is Routed to SDD`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts --testNamePattern='TC-0008-0026 \(TDD-0034\): A Change of Meaning Is Routed to SDD' --reporter=verbose`
- RED result: exit 1; `` AssertionError: the ## `test-fix` section exists: expected '' not to be '' // Object.is equality ``
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/testFixMeaningChange.test.ts`

### TDD-0035

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/atdd/orchestrated/testFixLayers.test.ts`
- Selector: `TC-0008-0027 (TDD-0035): ATDD Takes a Test Fix Only for an Acceptance-Layer Row`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/atdd/orchestrated/testFixLayers.test.ts --testNamePattern='TC-0008-0027 \(TDD-0035\): ATDD Takes a Test Fix Only for an Acceptance-Layer Row' --reporter=verbose`
- RED result: exit 1; `` AssertionError: the ## `test-fix` section exists: expected '' not to be '' // Object.is equality ``
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`, `packages/qfai/tests/integration/atdd/orchestrated/testFixLayers.test.ts`

### TDD-0036

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E. Discharged by the spec-0018 US-0018-0001 journey, whose acceptance stage runs from its work order as `qfai-atdd` `author-acceptance-tests` with a seam round trip (spec-0018 `10_Plan.md` `### Which journey discharges which stage story`); the test carries `QFAI:SPEC-0008:US-0008-0009`.
- Test file: `packages/qfai/tests/e2e/spec0018DeliverAFeatureE2E.test.ts`
- Selector: `US-0018-0001 (TDD-0455): one create question`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018DeliverAFeatureE2E.test.ts --testNamePattern='US-0018-0001 \(TDD-0455\): one create question' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 1, shared with spec-0018 TDD-0455: the journey stopped at the seam round trip, since `next` issued no seam-only work order after an acceptance result asking for a seam (the journal fold kept no seam request)
- GREEN result: exit 0; `✓ |e2e| tests/e2e/spec0018DeliverAFeatureE2E.test.ts > US-0018-0001 (TDD-0455): one create question, then every stage from its work order, and finish qfai_done`
- Production files: `packages/qfai/src/core/workflow/persistence.ts` (`foldSeam`), under spec-0018 TDD-0455


## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0008.md`.
Totals: ✅ 45 / ⚠️ 26 / ❌ 192, with 7 not applicable, across 270 scored cells —
234 matrix depth cells (26 rows × 9 columns) and 36 business rule cells
(12 rows × 3 columns). `Status` is a row verdict, not a mark, and is outside
every total.

## Work Orders Summary

| Role                | Task                                                  | Status (PASS/REVISE/PENDING) |
| ------------------- | ----------------------------------------------------- | ---------------------------- |
| test-design-analyst | Score the twenty-six obligations and write the matrix | PASS                         |
| completion-reviewer | Audit the matrix against the depth checklist          | PENDING                      |

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
- Twelve of the spec's other rows are parked at `exception`, and two of those
  cite `DR-0008-0100`, which no decision record declares. Out of scope here:
  this run advanced no row's status.

## Final status

PASS for the two rows recorded here: each carries the evidence its pointer
names. This is a per-row verdict, not a stage verdict — the coverage matrix
beside it is unreviewed, and the reviewer row above reads `PENDING`.
