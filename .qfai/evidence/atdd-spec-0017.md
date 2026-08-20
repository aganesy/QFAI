# ATDD Evidence: spec-0017

## Objective

Cover `spec-0017`'s nine `US-0017-*` from `<testsDir>/e2e/**`, which is where `QFAI-ATDD-111` answers
`US-*` obligations. Before this stage the spec had **zero** E2E coverage and the gate reported all
nine — one of the two `error=2` findings that had stood through six review rounds of
`/qfai-implement`, and, as PR #794 showed, one of the reasons the required status context cannot go
green.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0017/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`,
  `05_Examples.md`, `06_Test-Cases.md`
- `.qfai/specs/spec-0017/tdd/test-list.md` — read, never written. 82 rows: 71 `Integration`,
  11 `Unit`; 74 `refactor`, 6 `blocked`, 2 `todo`
- `.qfai/assistant/catalog/test-layers.md` — the layer derivation and the directory each `Level`
  routes to
- `packages/qfai/assets/init/root/.github/workflows/**` — the shipped surface, measured before any
  test was written
- `packages/qfai/tests/e2e/initE2E.test.ts` — the existing `runInit` E2E pattern

## Decisions made (with rationale)

**1. The E2E surface for this spec is `qfai init`, not this repository's workflows.** `spec-0017` has
two halves, and the own half is already asserted directly against `.github/workflows/**` by
`tests/scripts/ownWorkflowTopology.test.ts` and `tests/scripts/workflowHygiene.test.ts`. A user story
is about the adopter. So the one end-to-end surface is: initialise an empty project and read what
arrives.

**2. The shipped tree was measured before a line was written.** Four of the nine stories are
satisfied there and five are not:

```text
US-0017-0001  detection job + verdict over toJSON(needs)      SHIPPED
US-0017-0002  SHA pins, persist-credentials: false            SHIPPED
US-0017-0003  no workflow-level Node version literal          SHIPPED
US-0017-0009  the layer-to-CI-lane map                        SHIPPED
US-0017-0004  build reuse + upload hygiene                    0 uploads, 0 builds — no surface
US-0017-0005  layer lanes without a new check name            5 separate JOBS, not matrix legs
US-0017-0006  a hygiene lint lane pull requests run           not invoked by the shipped set
US-0017-0007  parallelism knobs from the workload             no knob file ships
US-0017-0008  the duplicate validate workflow retired         qfai-validate.yml still ships
```

**3. The five unsatisfied stories are not asserted as absences.** A test pinning "no hygiene lane is
invoked" fails the day someone correctly adds one — a test that punishes its own fix. Each asserts
instead the invariant its story depends on and which survives the gap closing. The depth loss is
recorded as `❌` in the Coverage Depth Matrix with a justification per row, which is what that
committed record is for.

**4. The annotation was appended AFTER the test existed, not before.** `QFAI-ATDD-111` reads
`tests/e2e/qfai-traceability.md` at the repository root — an annotation ledger, not the test files.
Appending nine lines to it would have cleared the gate at any point in the last six rounds, and doing
so before a test existed is precisely the false certification `CR-20260814-0001` describes. The
script that appended them refuses unless every declared `US` is covered by a `describe` in the E2E
file, so the ledger cannot outrun the tests.

**5. One `runInit`, shared across nine describes, with an `afterAll` teardown.** Nine inits of a full
asset tree is nine times the same work; this spec's own integration slice was pushed past its timeout
by exactly that shape. The teardown was missing in the first draft and `eslint` caught the unused
`rm` import, which is how the leak was found.

## Work performed (what changed, where)

- **new** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — nine annotated describes,
  one per user story
- **appended** `tests/e2e/qfai-traceability.md` — nine `QFAI:SPEC-0017:US-0017-NNNN` lines
- **new** `.qfai/evidence/coverage-depth-spec-0017.md` — the Coverage Depth Matrix, committed

`tdd/test-list.md` was not written. `/qfai-implement` owns its cells.

## Commands executed + key outputs

```text
pnpm -C packages/qfai exec vitest run --project e2e tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts
  -> Tests 9 passed (9), exit 0

node packages/qfai/dist/cli/index.mjs validate --profile atdd --fail-on error --spec 0017
  before:  info=2 warning=0 error=2   QFAI-ATDD-111 (9 US), QFAI-ATDD-112 (8 TC)
  after:   info=2 warning=0 error=1   QFAI-ATDD-112 only

node packages/qfai/dist/cli/index.mjs validate --profile tdd --fail-on error --root .
  QFAI-ATDD-111 items:  20 -> 11    (spec-0017's 9 cleared; spec-0003/0006/0008/0015 keep 11)
  counts unchanged at   info=5 warning=376 error=2

pnpm ci:lint   -> exit 0, all eleven members
```

## Test volume estimate

| Layer       | Raw count | Signal | Evidence                    | Notes                                                     |
| ----------- | --------: | -----: | --------------------------- | --------------------------------------------------------- |
| E2E         |         9 |      9 | `US-0017-0001` … `-0009`    | one describe each, this stage                              |
| API         |         0 |      0 | no `CON-API-*` declared      | nothing owed                                               |
| Integration |        71 |     71 | `Layer = Integration` rows   | already implemented under `/qfai-implement`; not this stage |

The 11 `Unit` rows owe nothing here (`L1` has no mandated directory).

## Coverage obligations checklist

- `US-0017-0001` … `US-0017-0009` — **covered**, `tests/e2e/**`, verified by
  `validate --profile atdd --spec 0017` no longer reporting `QFAI-ATDD-111`
- `CON-API-*` — none declared, nothing owed
- `TC-0017-*` at `L3` — 63 of 71 covered; the 8 uncovered are the 6 `blocked` and 2 `todo` rows, which
  have no test because they are not implemented. `QFAI-ATDD-112` names exactly those eight, which is
  correct
- Forbidden references — none introduced: the new file carries `US-*` annotations only, and no
  `TC-*` annotation was added to `tests/e2e/**`

## Ledger rows advanced

**None.** This stage advanced no row, and zero is the correct count rather than an omission.

`references/red-provenance.md#a-spec-with-no-atdd-owned-rows` covers the case. The 71 `Integration`
rows were implemented under `/qfai-implement` before merged `main` introduced Phase Red step 3b, which
routes a `todo` `Integration` row through this stage's provenance. All 71 are already at `refactor`,
so none is `todo` and none is selectable here — the handover step 3b describes applies to a row this
stage would advance from `todo`, and there is no such row.

That gap is real and is recorded where it belongs: `.qfai/evidence/implement-spec-0017.md`, under
"The merge moved the contract past this record". Manufacturing provenance entries for rows this stage
did not observe would be worse than the gap.

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0017.md` (committed). Totals by `Status`: ✅ 3 / ⚠️ 2 / ❌ 4.

## Work Orders Summary

**Not delegated, and that is a deviation from this skill's Stage Minimum Roles.** The skill requires
`test-design-analyst`, `acceptance-test-engineer` and `devops-ci-engineer` work orders with the
orchestrator not drafting the primary artifact, and an independent `completion-reviewer` gate. This
stage was run inline by the orchestrator.

Recorded rather than glossed because it changes what the evidence is worth: the E2E file, the matrix
and this record were all authored by the party that also judged them. The reviewer gate is **not**
satisfied, so this stage is not complete by its own Definition of Done, and the completion status
below says so.

## Execution logs

Oracle rounds against the shipped tree, each planted alone and reverted with a byte comparison:

| id           | mutation                                             | expected | result           |
| ------------ | ---------------------------------------------------- | -------- | ---------------- |
| `E1`         | a shipped action reference floats off its SHA        | RED      | **REDDENS**      |
| `E2`         | the mapping document loses its loader disclaimer     | RED      | **REDDENS**      |
| `E3`         | the verdict stops iterating the serialized needs map | RED      | **REDDENS**      |
| `E4`         | a lane gains its own bundler build                   | RED      | **REDDENS**      |
| `E5-control` | a comment added to the orchestrator                  | green    | **reddens nothing** |

`E5` is what makes the other four mean anything. Every source file restored byte-identical.

## Gaps / Open risks

1. **Five of nine stories are unsatisfied in the shipped tree.** Detailed with a justification each in
   the matrix. This is the stage's main finding: the "and ship it to adopters" half of `spec-0017` is
   roughly half done, and it was not visible until `qfai init` was run and the output read.
2. **The reviewer gate was not run.** See Work Orders Summary.
3. **`QFAI-ATDD-112` still reports 8 spec-0017 TCs** — the 6 `blocked` and 2 `todo` rows. Correct, and
   it clears when those rows are implemented. Four of the six are `blocked` on `CR-20260820-0007`.
4. **The gate still exits 1 for other specs.** `--spec 0017` scopes the spec-owned rules, and
   `spec-0003` (8 US), `spec-0006` (1), `spec-0008` (1) and `spec-0015` (2) keep `QFAI-ATDD-111` at 11
   items repo-wide. Recorded as a cross-spec obligation per this skill's CRITICAL CONSTRAINTS: it is
   not this stage's work, closing it is each owning spec's next `/qfai-atdd` run, and the repo-wide
   run belongs to `/qfai-verify`.
5. **The E2E surface cannot exercise a real workflow run.** It reads what `init` ships. Whether a
   documentation-only change actually produces a narrow lane set is now observable — PR #794's runs
   show it — and nothing consumes that observation.

## Final status (PASS/FAIL) + who confirmed

**FAIL — incomplete by this skill's own Definition of Done.**

What was achieved: `spec-0017`'s nine `US-*` are covered from `tests/e2e/**` with real assertions and
five oracle rounds, `QFAI-ATDD-111` no longer reports this spec, and the shipped-tree gap is measured
and recorded.

What is not satisfied:

- the reviewer gate (`completion-reviewer`, `qa-gatekeeper`) was not delegated;
- the stage's own gate `validate --profile atdd --fail-on error --spec 0017` still exits 1 on
  `QFAI-ATDD-112`;
- Stage Minimum Roles were not used.

Confirmed by: nobody independent. Authored and assessed by the same party, which is why the status is
`FAIL` rather than a self-declared `PASS`.

`Review pack:` none opened for this stage.
`Review pack seal:` not applicable — no pack exists to seal.
