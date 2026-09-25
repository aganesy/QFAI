# Evidence: implement-spec-0015

## Objective

Take ledger row `TDD-0039` (`TC-0015-0007`, Integration, Boundary `legacy-profile-preservation`) from `todo` to `done`. `/qfai-atdd` authored its test and handed it over on the falsifiability branch.

## Items processed

| TDD-ID   | TC-Refs      | Final status | Evidence                                    |
| -------- | ------------ | ------------ | ------------------------------------------- |
| TDD-0039 | TC-0015-0007 | done         | `.qfai/evidence/atdd-spec-0015.md#tdd-0039` |

The row's RED, GREEN, refactor and review evidence lives in the ATDD file, which its `Layer` owns. The orchestrator wrote `refactor -> done` at 2026-09-25T09:57:29.473Z, after both reviews passed and the off-boundary checkpoint reused the Refactor verify run.

## Grilling Session

### /qfai-implement — run started 2026-09-25T09:18:06.277Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |

## Plan phase

A named-row invocation: the handover is confirmed, not re-planned.

| Role                          | Instance              | Verdict | Summary |
| ----------------------------- | --------------------- | ------- | ------- |
| `delivery-planner` (blocking) | `delivery-planner#2`  | PASS    | TDD-0039 exists at `todo` with no blocker. It is T2, forms no T1 group and runs alone. No Change Request resets it: CR-20260913-0007 seeded it fresh and resets only TDD-0006 and TDD-0007. It is not a per-item checkpoint boundary: other rows stay `todo`, the edit stays inside `packages/qfai`, and it is the first row this run completes |
| `test-design-analyst`         | `test-design-analyst#2` | PASS    | Every one of spec-0015's 36 test cases and 16 active stories has a row, and the spec binds no API or DB contract. TDD-0039 is on the right layer, and its selector is distinct from TDD-0006's and TDD-0007's. Advisory: the one recorded mutation reaches only the forced refresh, so the boundary's negative controls — a mismatching receipt and an overwritten adopter file — each get a mutation run too |

## Skeleton

`.qfai/evidence/skeleton.md` records the one entrypoint, `qfai`, as applicable and passed. Re-run for this invocation:

```text
$ node scripts/smoke-qfai-cli.mjs
smoke-qfai-cli: qfai -> US-0003-0001 reached; the dry run planned 325 path(s)
exit=0
```

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | delivery-planner | delivery-planner#2 | /qfai-implement plan: confirm the TDD-0039 handover | test-list.md, atdd-spec-0015.md#tdd-0039, spec-0015 CRs, skeleton.md | #plan-phase | PASS |
| 2 | test-design-analyst | test-design-analyst#2 | /qfai-implement plan: coverage and layer check over the spec-0015 ledger | test-list.md, 02_User-stories.md, 06_Test-Cases.md, test-layers.md | #plan-phase | PASS |
| 3 | - | n/a | grilling(-@2026-09-25T09:18:06.277Z/none): none | - | - | PASS |
| 4 | backend-engineer | backend-engineer#1 | /qfai-implement red step 3c: TDD-0039 falsifiability mutation and negative controls | atdd-spec-0015.md#tdd-0039 Satisfied-by, init.ts | atdd-spec-0015.md#tdd-0039 Round 1 falsifiability fields | PASS |
| 5 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement red: judge TDD-0039 Round 1 falsifiability evidence | atdd-spec-0015.md#tdd-0039 on the mutated tree | PASS; audited evidence hash 7fe699eeb699e557529d4af67133b5c02d059c148dfb2845d8cbc15aef365d8e | PASS |
| 6 | backend-engineer | backend-engineer#1 | /qfai-implement green: restore init.ts and take the GREEN | tmp copy of the original init.ts | atdd-spec-0015.md#tdd-0039 Round 1 Revision, Oracle proof, GREEN pair | PASS |
| 7 | qa-gatekeeper | qa-gatekeeper#1 | /qfai-implement build: judge TDD-0039 Round 1 GREEN | atdd-spec-0015.md#tdd-0039 on the restored tree | PASS; audited evidence hash 2192a163bb87cef45af8757bacd2ee25aa9c536df27129e8891194c2a62d5ff5 | PASS |
| 8 | orchestrator | orchestrator | /qfai-implement refactor: file-scoped verify, no source edit | agentDelegationSpec0015.test.ts | atdd-spec-0015.md#tdd-0039 Refactor verify fields | PASS |
| 9 | completion-reviewer | completion-reviewer#1 | /qfai-implement review: TDD-0039 Round 1 completion review | atdd-spec-0015.md#tdd-0039, review-20260925095540157 | PASS at working-tree+1cda4571992ac33ee7a03251103234a974ec4497334d81556381b96a2325a113, audited evidence hash 6c510ae7f9261098d99f2444fb888e24c6e6584893a230ad4021711059cc93ee; advisories in #record-defects | PASS |
| 10 | implementation-reviewer | implementation-reviewer#1 | /qfai-implement review: TDD-0039 Round 1 code quality review | the test diff, review-20260925095540157 | PASS at the same revision and hash; no findings | PASS |
| 11 | orchestrator | orchestrator | /qfai-implement checkpoint: off-boundary, reuse the Refactor verify run; `refactor -> done` | atdd-spec-0015.md#tdd-0039 | Checkpoint verification fields and seal | PASS |

## Commands executed

- `node scripts/smoke-qfai-cli.mjs` — exit 0 (see `#skeleton`).

## Record defects

Entries from the first Round 1 review of `TDD-0039`. Its two packs, `review-20260925094011727` and the re-attestation `review-20260925095125208`, wrote every response field as a Markdown list item. The completion gate reads a field only at the start of a line, so neither pack could carry the verdict. Both were set aside unedited, and the round was reviewed again in full in `review-20260925095540157`.

- `record:unchecked`, `TDD-0039`, Round 1, completion-reviewer F1: the row-level `qa-gatekeeper` verdict was split across two labels. Repaired: one `qa-gatekeeper: PASS x2 (...)` line names both gates.
- `record:unchecked`, `TDD-0039`, Round 1, completion-reviewer F3: `coverage-depth-spec-0015.md` said the row was `todo` in its TC-0015-0007 slice and BR-0015-0005 row, and the stage `Gaps / Open risks` said falsifiability was unproved. Repaired to what the evidence records.
- `record:unchecked`, `atdd-spec-0015.md` `Gaps / Open risks`, Round 1, implementation-reviewer: said `init` runs four times; the test runs it five times. Repaired.
- `record:QFAI-TDDLIST-008`, `TDD-0039`, Round 1: `Round 1: GREEN result` said the other tests "were skipped" without a count, which the gate reads as a result that did not pass. Repaired to `1 passed, 16 skipped`. Open: the build-phase `qa-gatekeeper` hash `2192a163…` covered the old text, so the entry closes on that role's record re-attestation.
- `record:unchecked`, `TDD-0039`, Round 1, completion-reviewer F2: `Satisfied-by` is recorded twice, bare at the handover and as `Round 1: Satisfied-by` at step 3c, with the same value. `red-provenance.md` lists the field unprefixed and `round-evidence.md` puts it in the round block, so the two skill references disagree. Open until they agree.

Entries from the reviews of the run started 2026-09-25T13:56:41.487Z, for `TDD-0038` and `TDD-0054` to `TDD-0058` in `.qfai/evidence/atdd-spec-0015.md`. Each is repaired, with a record re-attestation, before spec-0015 completion is declared.

- `record:unchecked`, `TDD-0054` to `TDD-0058` and `TDD-0038`, Round 1: the row-level verdict is a bare `qa-gatekeeper: PASS`, with the attempt and revisions on a separate `qa-gatekeeper attempts:` line. `round-evidence.md` asks for one `qa-gatekeeper: PASS x2 (...)` line naming the attempt, the round and both revisions.
- `record:falsifiability-gate-order`, the same rows, Round 1: backend-engineer#1 reverted each mutation and took the GREEN before qa-gatekeeper#3 judged. The gatekeeper rebuilt each mutated tree and reproduced its recorded address and failure, so the observation stands, but Phase Red step 3c routes the gatekeeper while the mutation is still in the tree.

- `record:unchecked`, `TDD-0054`, `TDD-0056` and `TDD-0057`, Round 1: in each first pack (`review-20260925142100002`, `review-20260925142100004`, `review-20260925142100005`) one response carried text after the role on its `Reviewer role:` line, which the completion gate reads as an exact field. The three packs were set aside unedited. The same reviewers re-issued their verdicts, unchanged in ruling and at the same revision and audited evidence hash, into `review-20260925143600001` to `review-20260925143600003`, and each row names its new pack and seal. Repaired.

## Advisories carried out of this run

- TDD-0007's test also asserts the numeric-target fields of this row's boundary (test-design-analyst#2). For TDD-0007's own run, or `/qfai-sdd`.
- "Upgrade" in AC-0015-0009 and BR-0015-0005 is read as forced reinit; `--upgrade-assistant-tree` has no case (completion-reviewer F6, coverage-depth finding 5). For `/qfai-sdd`.
- The `openRowAlreadyTested` allowlist test is not in this row's checkpoint command set (completion-reviewer F4). CI runs it.

- `BR-0015-0018` says each of the two entry skills carries "its profile", while the shipped `qfai-run` routing entry deliberately names none. The test and TC-0015-0038 accept both. For `/qfai-sdd` (implementation-reviewer, `TDD-0055`).
- The cross-stage clause of `BR-0015-0020`, "whichever stage it was recorded in", is asserted by no test. Pinning it is a Change Request to TC-0015-0040 (implementation-reviewer, `TDD-0057`).

## Ledger rows advanced

### TDD-0038

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/spec0015GovernanceAndHandoff.test.ts`
- Selector: `QFAI:SPEC-0015:TC-0015-0034`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/spec0015GovernanceAndHandoff.test.ts --testNamePattern='QFAI:SPEC-0015:TC-0015-0034' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed | 22 skipped (23)); the validator's partial-population branch and the test predate this row
- GREEN result: exit 0; 1 passed
- Changed files: none; `packages/qfai/tests/assets/openRowAlreadyTested.test.ts` drops this row from its open-but-tested backlog
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0054

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/autopilotBindingExceptionSpec0015.test.ts`
- Selector: `TC-0015-0037: a run's valid binding supplies primarySpecId, and with no binding it stays hard-required`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/autopilotBindingExceptionSpec0015.test.ts --testNamePattern='TC-0015-0037: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-operating-baseline.md has ## Default Autopilot Policy inside a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md` (`## Default Autopilot Policy inside a run`), `packages/qfai/tests/integration/autopilotBindingExceptionSpec0015.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0055

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/routingManifestEntrySkillsSpec0015.test.ts`
- Selector: `TC-0015-0038: qfai-run routes the orchestrator only, qfai-maintain an author and an independent reviewer on default`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/routingManifestEntrySkillsSpec0015.test.ts --testNamePattern='TC-0015-0038: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: agent-routing.yml has a qfai-run entry: expected undefined to be defined`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/manifest/agent-routing.yml` (`qfai-run` entry), `packages/qfai/assets/init/.qfai/assistant/skills/qfai-run/**` (the entry skill the routing entry names), `packages/qfai/tests/integration/routingManifestEntrySkillsSpec0015.test.ts`
- Note: `qfai-run` routes one `route` phase naming only `orchestrator`, and names no `review_profile`: a profile would oblige the skill to declare that profile's reviewers, which the spec's "no authoring or reviewing role" excludes. The skill declares no `routing-profile:` either, so the two sides agree.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0056

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/autopilotAuthorizationBucketsSpec0015.test.ts`
- Selector: `TC-0015-0039: ask-user by a human_decision, hard-required by request_scope or the binding, auto-decide by none, --auto by nothing`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/autopilotAuthorizationBucketsSpec0015.test.ts --testNamePattern='TC-0015-0039: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-operating-baseline.md has ## Default Autopilot Policy inside a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md` (`## Default Autopilot Policy inside a run`), `packages/qfai/tests/integration/autopilotAuthorizationBucketsSpec0015.test.ts`
- Note: `packages/qfai/src/core/validators/autopilotPolicy.ts` is unchanged in its judgement; it gains the two new skills' own hard-required inputs (`change request`, `edit target`), which the shipped-bucket pin in `tests/assets/assets.test.ts` requires of every skill.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0057

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/actorHistoryRunSpec0015.test.ts`
- Selector: `TC-0015-0040: the history travels with every work order, and an author or recommender is never its own independent reviewer`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/actorHistoryRunSpec0015.test.ts --testNamePattern='TC-0015-0040: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-delegation-baseline.md has ### Actor history in a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-delegation-baseline.md` (`## Inside a workflow run`), `packages/qfai/tests/integration/actorHistoryRunSpec0015.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0058

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/grillingInRunSpec0015.test.ts`
- Selector: `TC-0015-0041: settled is taken as settled, only the remaining frontier is worked, and the session split stands`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/grillingInRunSpec0015.test.ts --testNamePattern='TC-0015-0041: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: constitution/shared-skill-delegation-baseline.md has ### Grilling in a run: expected '' not to be '' // Object.is equality`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-delegation-baseline.md` (`## Inside a workflow run`), `packages/qfai/tests/integration/grillingInRunSpec0015.test.ts`
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

## Shipped-skill shape

Adding `qfai-run` put it, and the earlier `qfai-maintain`, under the asset
guards every shipped skill answers to. Both now carry an Inputs Priority
section, the delegation guardrail subsections, a Work Orders Summary, a
smoke-check override, a hard-required entry, and a reviewer remit row in the
delegation baseline. The guards run for this: `tests/assets/assets.test.ts`,
`completionContractSmokeCheck.test.ts`, `reviewerRoundBudget.test.ts`,
`skillInputsPriority.test.ts`, all passing for both skills.
