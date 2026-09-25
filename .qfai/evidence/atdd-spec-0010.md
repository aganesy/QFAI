# ATDD Evidence: spec-0010

## Ledger rows advanced

### TDD-0006

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The row's earlier selector named no case in its file, so the case was written and the selector points at it.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the screen-contract template ranks no exploration and names only the user's brand direction`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/discussionSkillTemplateIntegration.test.ts tests/e2e/discussionHardeningE2E.test.ts --testNamePattern='TC-0010-000' --reporter=verbose`
- RED result: exit 1; `AssertionError: a direction other than the user's brand direction: - Design direction (product intent, brand signals, anti-goals): `../04_Sources.md` ...: expected ... to match /01_Context\.md#Design Direction/`
- GREEN result: exit 0; 26 passed (26) across both files
- Changed files: `packages/qfai/assets/init/.qfai/assistant/skills/qfai-discussion/templates/uiux/40_screen_contracts.md` (the cross-reference names the user's brand direction in `01_Context.md` and calls `04_Sources.md` the reference registries), `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0007

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The earlier selector named no case in its file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the completion conditions keep explorations unranked and finalize no design system`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied. The first run failed on the test itself (it read a wrapped condition line by line); once it read each numbered condition whole it passed with the matrix unchanged.
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0008

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The earlier selector named no case in its file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the skill's planner-first guidance ranks no exploration and keeps the brand direction the user's`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied: exit 0 for this case on the first run
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0010

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0006 re-derived). The row had no test file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0006: the tree qfai init writes carries the same planner-first discussion guidance`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied: exit 0 for this case on the first run; init copies the skill, the matrix and the screen-contract template byte for byte
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0011

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: integration
- Reset by: `CR-20260912-0003` (option 1; TC-0010-0007 re-derived to `/qfai-sdd` Phase 0 as the producer). The row had no test file.
- Test file: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`
- Selector: `TC-0010-0007: the brand direction is recorded in 01_Context.md and Phase 0 authors DESIGN.md`
- RED command (cwd `packages/qfai`): as TDD-0006
- RED result: already satisfied: exit 0 for this case on the first run
- GREEN result: exit 0; 26 passed (26)
- Changed files: `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts`

### TDD-0025

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E
- Reset by: `CR-20260912-0003` (US-0010-0008 re-derived). The spec's plan names no spec-0018 journey for this story.
- Test file: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`
- Selector: `US-0010-0008: the installed discussion stage carries the screen explorations unranked`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0010DesignDirectionE2E.test.ts --testNamePattern=US-0010-0008 --reporter=verbose`
- RED result: exit 1, taken with the screen-contract template at its committed bytes; `AssertionError: expected '# Screen Contracts\n\n## Purpose\n\nD…' to match /^- Br…/01_Context\.md#Design Direction`
- GREEN result: exit 0; 2 passed (2)
- Changed files: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`, and the template change TDD-0006 records

### TDD-0026

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E
- Reset by: `CR-20260912-0003` (US-0010-0009 re-derived). The spec's plan names no spec-0018 journey for this story.
- Test file: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`
- Selector: `US-0010-0009: the installed stage records the user's direction for /qfai-sdd Phase 0 to author DESIGN.md`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0010DesignDirectionE2E.test.ts --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run
- GREEN result: exit 0; 2 passed (2)
- Changed files: `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts`

### TDD-0033

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E. Discharged by the spec-0018 US-0018-0004 journey, discussion variant, as spec-0018 `10_Plan.md` `### Which journey discharges which stage story` assigns it; the test also carries `QFAI:SPEC-0010:US-0010-0013`.
- Test file: `packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts`
- Selector: `US-0018-0004, discussion variant (spec-0010 TDD-0033)`
- RED command: `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018StopForMyDecisionE2E.test.ts --testNamePattern='US-0018-0004, discussion variant \(spec-0010 TDD-0033\)' --reporter=verbose` (cwd `packages/qfai`)
- RED result: exit 0 on the first run; already satisfied by spec-0018 TDD-0470, whose discussion work order carries `settled`, and by the discovery route returning the run to routing once its discussion stage is accepted
- GREEN result: exit 0; `✓ |e2e| tests/e2e/spec0018StopForMyDecisionE2E.test.ts > US-0018-0004, discussion variant (spec-0010 TDD-0033): the discussion stage gets what is settled and returns the run to routing`
- Production files: none

## Coverage Depth Matrix

See `.qfai/evidence/coverage-depth-spec-0010.md` (committed).
Totals: ✅ 5 / ⚠️ 46 / ❌ 23, with 196 not applicable, across 270 scored cells — 234 matrix cells (26 rows × 9 columns) and 36 business rule cells (12 rows × 3 columns).
The marks are derived from the pack and the TDD ledger by the rules that file states;
`Status` is a row verdict and is outside every total.

## Objective

Change Request `CR-20260912-0003`, option 1, approved action 9: `/qfai-atdd spec-0010` runs after the pack's re-derivation and its ledger resets, and regenerates the coverage record against the reset ledger.
The rows that request reset — TDD-0006, TDD-0007, TDD-0008, TDD-0010, TDD-0011, TDD-0025 and TDD-0026 — are closed with tests, each in its entry above.
This run writes no test and advances no ledger row.

## Inputs reviewed (files/paths)

- `.qfai/specs/spec-0010/02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `06_Test-Cases.md`
- `.qfai/specs/spec-0010/tdd/test-list.md`
- `.qfai/decisions/CR-20260912-0003-spec-0002-states-two-rules-the-product-replaced.md` (approved action 9, `## Resolution`)
- `.qfai/evidence/coverage-depth-spec-0010.md` as committed
- `qfai.config.yaml`, `.qfai/contracts/**` and every sibling `01_Spec.md`, for the surface opt-in and the contract references
- `.qfai/assistant/skills/qfai-atdd/SKILL.md`, `references/test-case-depth-checklist.md`, `references/volume-signals.md`, `references/cross-spec-obligations.md`, `references/pack-seal.md`

## Decisions made (with rationale)

- **This run regenerates the record and writes no test.** For spec-0010, approved action 9 names the rows its outcome resets, and each of them is already closed with a test. The other ATDD-owned `todo` rows predate the Change Request, and a pass over them is a separate `/qfai-atdd spec-0010` run. The stage verdict is therefore not done; see `## Final status`.
- **`US-0010-0013` is scored from the evidence TDD-0033 points to, not from the ledger token.** The token claims a failing first run and the entry records a passing one. The record states that a reader of the evidence overrides the ledger token, and the two reviewers accepted the call.
- **`Conditional branches` keeps the record's reading.** It is scored only where the rule text states its condition with `when`, `if`, `unless` or `until`, as in BR-0010-0012. Reading BR-0010-0007's surface qualifier and BR-0010-0013's work-order qualifier as conditions would move both cells to ⚠️. That reading would also have to be applied to the spec-0018 record, so it is left as an open advisory.

## Grilling Session

### /qfai-atdd — run started 2026-09-25T19:37:22.020Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

## Work performed (what changed, where)

- `.qfai/evidence/coverage-depth-spec-0010.md`, re-derived by `test-design-analyst#1` from `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `06_Test-Cases.md` and `tdd/test-list.md`:
  - The date the ledger was read moves to 2026-09-26.
  - Every cell the reset rows score holds: US-0010-0008, US-0010-0009, TC-0010-0006, TC-0010-0007, BR-0010-0006 and BR-0010-0007.
  - `US-0010-0013` `Normal path` and `Oracle strength` move from ✅ to ⚠️. Its one E2E row, TDD-0033, carries `RED:fail` in its `Evidence` cell, and the entry that cell points to records `exit 0 on the first run; already satisfied`. The record scores an already-satisfied row ⚠️, and a reader of the evidence overrides the ledger token, as the record states.
  - Matrix totals move from ✅ 6 / ⚠️ 30 to ✅ 4 / ⚠️ 32; the named ⚠️ list gains the two cells. The status counts and the business rule table are unchanged.
- This file: the totals under `## Coverage Depth Matrix`, and this section.

## Commands executed + key outputs

A mechanical re-derivation of every matrix cell and business rule cell, from the pack and the ledger by the record's stated rules, compared cell by cell with the committed record before the edit:

```text
$ node tmp/i2314-rederive.mjs
stories 13, cases 13, rules 12, ledger rows 29
matrix counts { '✅': 6, '⚠️': 30, '❌': 22, 'n/a': 176 } business rule counts { '✅': 1, '⚠️': 14, '❌': 1, 'n/a': 20 }
no difference between the record and the re-derivation
```

The script reads the ledger's `RED:` token and never the evidence it points to, so it could not see the TDD-0033 disagreement. After the edit it reports exactly the two `US-0010-0013` cells as different.

Scoped validation at `ef100ac951dc6634767490db74e9cae2f49068e6`, from a fresh package build:

<!-- qfai:not-a-citation .qfai/report/run-20260926044134588/ -->
```text
$ node packages/qfai/dist/cli/index.cjs validate --profile atdd --fail-on error --spec spec-0010
counts: info=2 warning=0 error=9
run-log: .qfai/report/run-20260926044134588
exit 1
```

- The nine errors are `QFAI-TEST-003` in spec-0004 and spec-0006 test files, listed under `## Cross-spec obligations`.
- No `QFAI-ATDD-131` or `QFAI-ATDD-133`: the record exists and this file links it with its totals.
- `QFAI-ATDD-119` (info): US-0010-0001 to US-0010-0007, US-0010-0010, TC-0010-0001, TC-0010-0005 and TC-0010-0008 are covered only by annotation carriers that declare no test.

Smoke check: this run wrote no test, so the target is spec-0010's existing acceptance suite, every `tests/e2e/**` and `tests/integration/**` file carrying a `QFAI:SPEC-0010:` annotation, at `ef100ac951dc6634767490db74e9cae2f49068e6` (exit 0):

```text
$ cd packages/qfai && NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0010DesignDirectionE2E.test.ts tests/e2e/spec0010DiscussionMockAndPointerE2E.test.ts tests/e2e/spec0010MockAnchorFormE2E.test.ts tests/e2e/spec0018StopForMyDecisionE2E.test.ts tests/integration/cli/commands/discussion.test.ts tests/integration/discussionEntryCheckSpec0010.test.ts tests/integration/discussionOperationsSpec0010.test.ts tests/integration/discussionSettledInputsSpec0010.test.ts tests/integration/discussionSkillTemplateIntegration.test.ts tests/integration/reviewerGateMockHrefDrift.test.ts tests/integration/spec0010DiscussionMockAndPointer.test.ts

 Test Files  11 passed (11)
      Tests  74 passed (74)
   Duration  32.14s
```

Repository gates: the change is two evidence files and one `CHANGELOG.md` entry, and touches no source or test. `prettier --check` passes on all three. markdownlint's configuration excludes `CHANGELOG.md` and both evidence files. Format, lint, typecheck and the full test suite are left to the pull request's CI.

## Test volume estimate

From `qa-strategist#1`. Signals are planning hints, not gates.
The surface opt-in is off repo-wide: `qfai.config.yaml` sets no `prototyping.primarySpecId`, `.qfai/contracts/ui/` does not exist, and no `01_Spec.md` declares `surface_type: ui-bearing` in frontmatter or a legacy prototyping heading. Every story therefore owes an E2E reference.

| Layer       | Raw count | Signal | Evidence                                                                                         | Notes                                                                                                                  |
| ----------- | --------: | -----: | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| E2E         |        13 |     50 | 13 required `US-0010-*`; no `L5` case                                                            | Above the 5–25 band: all 13 stories owe E2E coverage and no API obligation dilutes them. Accepted, nothing re-filed.     |
| API         |         0 |      0 | No `Contract-Refs` column, no `QFAI-CONTRACT-REF:` line; no `L4` case                            | Below the 10–40 band: the spec binds only the CLI contracts CLI-WF and CLI-WFFILE, which are neither `CON-API` nor `CON-DB`. |
| Integration |        13 |     50 | 10 cases with no `Level` (TC-0010-0001, TC-0010-0005 to TC-0010-0013) and 3 `L3`; no `CON-DB-*` | Inside the 40–80 band.                                                                                                 |

## Coverage obligations checklist

From `qa-strategist#1`.

| Obligation                  | Home                   | Test                                                                                                   | State                                                      |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| US-0010-0001 to US-0010-0007 | `tests/e2e/**`         | Annotation carrier only (`QFAI-ATDD-119`); TDD-0018 to TDD-0024 `todo`                                  | Open; outside this run                                     |
| US-0010-0008, US-0010-0009  | `tests/e2e/**`         | `packages/qfai/tests/e2e/spec0010DesignDirectionE2E.test.ts` (TDD-0025, TDD-0026)                      | Closed; reset by the Change Request, scored in this record |
| US-0010-0010                | `tests/e2e/**`         | Annotation carrier only (`QFAI-ATDD-119`); TDD-0027 `todo`                                              | Open; outside this run                                     |
| US-0010-0011                | `tests/e2e/**`         | `packages/qfai/tests/e2e/spec0010MockAnchorFormE2E.test.ts`; TDD-0028 `todo`                           | A test exists and its row is still open; outside this run  |
| US-0010-0012                | `tests/e2e/**`         | `packages/qfai/tests/e2e/spec0010DiscussionMockAndPointerE2E.test.ts`; TDD-0029 `todo`                 | A test exists and its row is still open; outside this run  |
| US-0010-0013                | `tests/e2e/**`         | `packages/qfai/tests/e2e/spec0018StopForMyDecisionE2E.test.ts` (TDD-0033)                              | Closed; outside this run                                   |
| TC-0010-0001, TC-0010-0005  | `tests/integration/**` | Annotation carrier only (`QFAI-ATDD-119`); rows TDD-0001 and TDD-0005 run `tests/assets/uiuxSidecar.test.ts` | Closed rows, carrier-only annotation; outside this run     |
| TC-0010-0006, TC-0010-0007  | `tests/integration/**` | `packages/qfai/tests/integration/discussionSkillTemplateIntegration.test.ts` (TDD-0006 to TDD-0011)    | Closed; reset by the Change Request, scored in this record |
| TC-0010-0008                | `tests/integration/**` | Annotation carrier only (`QFAI-ATDD-119`); TDD-0012 `todo`                                              | Open; outside this run                                     |
| TC-0010-0009 to TC-0010-0016 | `tests/integration/**` | TDD-0013 to TDD-0017 and TDD-0030 to TDD-0032                                                           | Closed; outside this run                                   |
| `CON-API-*`, `CON-DB-*`     | —                      | None referenced                                                                                        | Nothing owed                                               |

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | test-design-analyst | test-design-analyst#1 | /qfai-atdd coverage: regenerate the spec-0010 Coverage Depth Matrix against the reset ledger | spec-0010 02, 03, 04, 06, tdd/test-list.md; `CR-20260912-0003` action 9; `tmp/i2314-rederive.mjs` | `.qfai/evidence/coverage-depth-spec-0010.md`: date, `US-0010-0013` two cells, totals, ⚠️ list | PASS |
| 2 | qa-strategist | qa-strategist#1 | /qfai-atdd coverage: Test Volume Estimate and obligations checklist | spec-0010, qfai.config.yaml, .qfai/contracts/**, volume-signals.md | #test-volume-estimate, #coverage-obligations-checklist | PASS |
| 3 | - | n/a | grilling(-@2026-09-25T19:37:22.020Z/none): none | - | - | PASS |
| 4 | completion-reviewer | completion-reviewer#1 | /qfai-atdd P8 stage review, round 1 | this file and the matrix at ef100ac951dc6634767490db74e9cae2f49068e6; spec-0010 pack; `CR-20260912-0003` | REVISE: 11 ATDD-owned rows still `todo`; 23 ❌ cells open; the acceptance suite run not recorded. The TDD-0033 scoring accepted | REVISE |
| 5 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-atdd stage gates, round 1 | the same | REVISE: the acceptance suite run not recorded; no passing status while the ❌ cells and carrier-only obligations remain. Residue attribution and record consistency confirmed | REVISE |

## Cross-spec obligations

The scoped gate exits 1 on nine `QFAI-TEST-003` findings. Each is a `describe.skip` in a test file another spec owns, which this run did not touch and may not edit.

| Finding | Contract ID | Test file | Owning spec | Why not this stage's work | Closed by |
| ------- | ----------- | --------- | ----------- | ------------------------- | --------- |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:41 | spec-0004 | A skipped acceptance test of spec-0004's own stories | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:67 | spec-0004 | A skipped acceptance test of spec-0004's own stories | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0004SaasPackageAndPackLocationE2E.test.ts:88 | spec-0004 | A skipped acceptance test of spec-0004's own stories | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:45 | spec-0004 | A skipped acceptance test of spec-0004's own cases | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:62 | spec-0004 | A skipped acceptance test of spec-0004's own cases | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/integration/spec0004SaasPackageAndPackLocation.test.ts:77 | spec-0004 | A skipped acceptance test of spec-0004's own cases | spec-0004's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:41 | spec-0006 | A skipped acceptance test of spec-0006's own stories | spec-0006's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:60 | spec-0006 | A skipped acceptance test of spec-0006's own stories | spec-0006's next `/qfai-atdd` run |
| QFAI-TEST-003 | - | packages/qfai/tests/e2e/spec0006DoctorRemediationE2E.test.ts:78 | spec-0006 | A skipped acceptance test of spec-0006's own stories | spec-0006's next `/qfai-atdd` run |

## Gaps / Open risks

- **TDD-0033's `Evidence` cell disagrees with its entry.** The cell reads `RED:fail GREEN:pass TIER:T2`; the entry records a first run that passed. The ledger is `/qfai-implement`'s to correct; an already-satisfied E2E row takes `RED:falsifiability` with its argument. Until then the record scores the row from the entry.
- **TDD-0028 and TDD-0029 are `todo` although E2E tests already carry their stories.** Advancing them is a later run's work.
- **Seven closed rows carry `RED:n-a` on a layer where the grammar refuses it**: TDD-0007, TDD-0008, TDD-0010, TDD-0011, TDD-0031 and TDD-0032 (Integration) and TDD-0026 (E2E). Their marks are already ⚠️, so the record is unaffected.
- **spec-0010's ATDD stage is not done.** The ATDD-owned rows TDD-0012, TDD-0018 to TDD-0024 and TDD-0027 to TDD-0029 are still `todo`. The 23 ❌ cells are their open gaps, and 11 obligations are covered only by carriers (`QFAI-ATDD-119`). The next `/qfai-atdd spec-0010` run owes their tests and RED provenance.
- `Conditional branches` for BR-0010-0007 and BR-0010-0013 is `n/a` under the record's reading; see `## Decisions made (with rationale)`.
- The cross-spec residue here is `QFAI-TEST-003`. `references/cross-spec-obligations.md` names only `QFAI-ATDD-113`, `QFAI-ATDD-115` and `QFAI-TEST-001` as attributable residue, so these rows rest on its general rule for a finding reported against a repo-level path.

## Execution logs

- `tmp/i2314-rederive.mjs`: the mechanical re-derivation.
- `tmp/i2314-suite.txt`: the acceptance suite run.
- `tmp/i2314-validate2.txt`: the scoped validation.

These are scratch files and are not tracked. The recorded output above is the durable copy.

## Final status (PASS / PASS with cross-spec obligations / FAIL) + who confirmed

FAIL — spec-0010's ATDD stage is not done. TDD-0012, TDD-0018 to TDD-0024 and TDD-0027 to TDD-0029 are still `todo`, and 11 obligations are covered only by carriers.

The coverage record regeneration approved action 9 asks for is complete. The record matches the ledger, with the `US-0010-0013` correction recorded above. The scoped gate's nine errors belong to spec-0004 and spec-0006 and are recorded under `## Cross-spec obligations`.

P8 review, series `.qfai/evidence/atdd-spec-0010.md + <role> + 1`:

| Round | Pack | completion-reviewer | qa-gatekeeper | Reviewed revision | Audited evidence hash |
| ----- | ---- | ------------------- | ------------- | ----------------- | --------------------- |
| 1 | `review-20260926044258281` | REVISE (`completion-reviewer#1`) | REVISE (`qa-gatekeeper#1`) | ef100ac951dc6634767490db74e9cae2f49068e6 | 6cadca39b5ffa77002280fcc7b6a752e9d59a791e7d7d1275b5934a1fff631f8 |

Seal of the round 1 pack: e4641a2fa67e9133fb750c910eebc53678c8285a2ef5380504d8b0fd4f53c8da
