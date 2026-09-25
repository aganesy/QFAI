# Implement Evidence: spec-0004

## Objective

The `/qfai-implement` record for the spec-0004 rows this skill runs end to
end: the `unit` rows `TDD-0018` and `TDD-0072` of `TC-0004-0018`. They are
part of the removal of the work-log surface `.qfai/steering/`. The
`integration` rows of the same invocation keep their record in
`.qfai/evidence/atdd-spec-0004.md`.

## Items processed

| TDD-ID | TC-Refs | Layer | Final status |
| ------ | ------- | ----- | ------------ |
| TDD-0018 | TC-0004-0018 | unit | done after first full CI checkpoint; withdrawn by `CR-20260925-0010`, row tombstoned |
| TDD-0072 | TC-0004-0018 | unit | done after independent reviews and second full CI checkpoint |

## Grilling Session

This invocation's rows own two evidence files, so its block is written into
both, identical, together with its `grilling(…@2026-09-23T21:11:02.206Z/…)` Work Orders rows.

### /qfai-implement — run started 2026-09-23T21:11:02.206Z

Preflight: confidence high

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-23T21:17:21.288Z | working-tree+06abf1f7fee296b1615997d733c7f8ddec355d6811a72d6ced235b89f0f9e494 | 2026-09-23T21:18:12.657Z | TDD-0067 GREEN scope | empty | none in flight | 10 | 0 | 0 |
| S2 | adopted | 2026-09-23T23:38:13.576Z | working-tree+818c7ff482f03603ef6bd7274df9467e1a343433f9e477c424d4f0db1ea53e6f | 2026-09-23T23:38:13.644Z | TDD-0069 GREEN scope | empty | none in flight | 10 | 0 | 0 |
| S3 | adopted | 2026-09-24T00:51:55.975Z | working-tree+2d31f83a01de922411629aeea5788fc3beee710b71763d4d8200234911c37d55 | 2026-09-24T00:51:55.978Z | shared GREENs: asset withdrawal, init seed removal, copilot line | empty | none in flight | 12 | 0 | 0 |
| S4 | adopted | 2026-09-24T02:06:43.557Z | working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9 | 2026-09-24T02:06:43.560Z | TDD-0068 checkpoint failure: README citation | empty | none in flight | 5 | 0 | 0 |
| S5 | adopted | 2026-09-24T05:21:30.478Z | working-tree+fd08d44308fd2227144f6e4b1d1ec27c59f169dd130bc18a8a1f7e0d3874f37b | 2026-09-24T05:21:35Z | TDD-0018 / TDD-0072 unit rows: scope and TDD-0072 falsifiability ordering | empty | none in flight | 8 | 0 | 1 |

Note S5: writes that do not depend on Q6 ran while S5 was open with only Q6 pending, after D1–D7 were adopted: the creation of `.qfai/evidence/implement-spec-0004.md`, TDD-0018 `todo -> red` at 2026-09-24T05:20:43Z, and the rewrite of `packages/qfai/tests/validators/reviewerJustification.test.ts` at 2026-09-24T05:20:57Z, which rests on D2. No write that depends on Q6 (TDD-0072) came before the user's answer.

Escalated S5: Q6 — the order TDD-0072 runs in. No order closes on the single final-head CI run the user chose. DR-0004-0041 and DL-0027 start TDD-0072 only after TDD-0018 is `done`, and `done` waits for that CI run. TDD-0072's test cannot be written before it: its first run would pass with TDD-0018 at `refactor`, and `red-not-observable.md` then offers no lawful form, which is the `exception` DR-0004-0041 names. Written after it, the test moves the tree address that CI run covered. Ledger and evidence writes, and a mutation restored byte-for-byte, do not move the address; the new test does. So the author's option A needs a later tree and a second CI run. Option C is not offered: DL-0027 rejects a production path as `Satisfied-by` on a unit row, and `git log -S` shows the property came from spec-0004's own TDD-0015..0025 commit (75e53c184), so it is not state that no row created. Options for the user: (1, recommended) keep DR-0004-0041 and DL-0027. Every other row, TDD-0018 included, closes on the final CI run as decided. TDD-0072 then takes its cycle in its own test file, so TDD-0018's closed `Test file` is not edited, and it closes on a second CI run over that new head. That amends the run decision that all full-suite checkpoints close together, for this row only. (2) A Change Request amends DR-0004-0041, DL-0027 and `10_Plan.md` step 1 so that TDD-0072 cites TDD-0018 at `refactor`, takes its test in the same file now, and both close on the one CI run. That also departs from `red-not-observable.md`, which accepts "an earlier `done` sibling row", and no spec Change Request amends a shipped skill. Option 1 is recommended because it keeps every recorded spec decision and the skill as written, and costs one push and one CI run. User (AskUserQuestion, 2026-09-24): "2 回目の CI で閉じる (推奨)" ("close on a second CI (recommended)"), option 1: keep DR-0004-0041 and DL-0027 unchanged; every other row, TDD-0018 included, closes on the final CI as already decided; TDD-0072 then runs in a separate test file and closes on a second CI at the new head; the batch-close decision is relaxed for this row only.

### /qfai-implement — run started split-2026-09-25

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-25T00:04:49Z | 432346e11 | 2026-09-25T00:20:00Z | preflight | empty | none in flight | 7 | 0 | 0 |

Note S1: the run closes the cross-spec obligations of this change after the pull request was cut down to the work-log removal. `split-griller` put one round to the plan author's written positions and adopted D1, D2, D3, D-P, D4, D5 and D6. `Work resumed` is the `Raised at` of `CR-20260925-0006`, the record D1 asked for. The run key names the run, and no start time was recorded for it.

Note S1: D4 is amended twice. X4 of the run `xspec-2026-09-25` replaces its spec-0011 half. Its spec-0015 half lapsed: `3a8462986` reverted the closure of `spec-0015/TDD-0039`, which is `todo` at `03762f3cf`, so the row left the blocked set and is not reviewed.

### /qfai-implement — run started xspec-2026-09-25

Preflight: session opened

| Session | Ended | Ended at | Revision | Work resumed | Subject | Frontier | Lookups | Decisions | Open | Escalated |
| ------- | ----- | -------- | -------- | ------------ | ------- | -------- | ------- | --------- | ---- | --------- |
| S1 | adopted | 2026-09-25T04:26:25Z | 1e09c3067 | 2026-09-25T04:27:24Z | preflight | empty | none in flight | 5 | 0 | 0 |

Note S1: the session settled what the cross-spec entries owe once `CR-20260925-0010` withdrew the rows that raised them. `xspec-griller` put one round to the three options the orchestrator framed and adopted X1 to X5. The revision is `1e09c3067` with uncommitted edits to `atdd-spec-0013.md`, `skeleton.md` and the spec-0013 ledger. `Work resumed` is the `Raised at` of `CR-20260925-0010`, whose impact section X5 shapes. The run key names the run, and no start time was recorded for it.

## Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 21 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): In `cli/commands/validate.ts` remove only `"W-WORKLOG-*"` and `"W-PENDING-PROMOTION"` from the sdd family list and fix the comment above it; keep `R-HANDOFF-INCOMPLETE` and `R-WORKLOG-DRIFT` in `reviewer-gate-sdd`; the frozen code lists in `findingCodeGrammar.test.ts`, `issueCodeUniqueness.test.ts` and `ruleCodeUniqueness.test.ts` change only as far as they fail | `spec-0004/10_Plan.md` "Removing the work-log surface"; `tests/unit/validators-are-wired.test.ts` | Removing the call alone leaves `validateWorklogSurface` unwired, and that guard's allowlist may only shrink, so the module and the codes only it emits go with this row. The two `reviewer-gate-sdd` codes are re-emitted by `reviewerJustification.ts` and leave with TDD-0018 and `ADVISORY_FAILING_CODES` | PASS |
| 22 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Take exactly the retired rows' test edits `spec-0004/09_delta.md` lists: the TC-0004-0016, -0017, -0019, -0020, -0021 and -0027..-0031 annotations, US-0004-0029 and US-0004-0031 in the e2e carrier, and the TDD-0027..TDD-0031 entries of `KNOWN_TEST_FILE_DRIFT`; nothing more | `spec-0004/09_delta.md` "What happens to the retired rows' tests"; S1 D12 of the `/qfai-atdd` run | Those edits are paired with deleting `worklogSurface.test.ts`, which this row does; D12 puts retired annotations with the symbol removal | PASS |
| 23 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Defer `worklogEntries.ts`, Check 8b and its expected-state strings in `cli/commands/validate.ts`, `ADVISORY_FAILING_CODES`, the `assistantPaths.ts` constants, the init seed, the asset withdrawal, the docs and the dogfood re-pin to later rows; source comments naming `worklogSurface.ts` may point at a deleted file until a later row, and must be gone before the change's head | `spec-0004/10_Plan.md` removal order steps 2-7; `tdd/test-list.md` TDD-0018, TDD-0068..TDD-0072 | Each deferred item has a live row or a later plan step that owns it; `worklogEntries.ts` is still imported by `tddList.ts` | PASS |
| 24 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Measure the pre-existing failures from clean HEAD in a separate `git worktree` with junctioned `node_modules` and its own `dist/`, recorded by file and test name, then remove the worktree; add `tsc -p tsconfig.tests.json --noEmit` and `generate:rule-codes --check` to the checkpoint; a failure this change causes is owed by it | `references/checkpoint-verification.md`; `references/relevant-test-suite.md` | A separate worktree leaves this tree untouched and avoids the shared stash stack. Disagreeing position (backend-engineer `impl-row-0067`): measure on this worktree's tree before the change, because clean HEAD lacks the uncommitted spec-pack edits and would attribute their failures to this row; that run is kept as supplementary data | PASS |
| 25 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): The `## Cross-spec obligations` entry lists other specs' `done` rows found by matching the package fallback against `Test file`, and their selectors are re-run read-only before `completion-reviewer` sees them | `references/cross-spec-ownership.md` | The import walk from `validate.ts` cannot be completed (non-literal dynamic imports, e2e tests through `dist/`), so the rule widens to the package | PASS |
| 26 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): In `validate.profileCoverageNotice.test.ts` drop only the two work-log family assertions | `tests/integration/cli/commands/validate.profileCoverageNotice.test.ts` | They pin the two family entries this row removes; nothing else in that file names the surface | PASS |
| 27 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): That removal is the plan's own step 4, not a new obligation | `spec-0004/10_Plan.md` removal order step 4 | Step 4 removes the tests that pin the surface | PASS |
| 28 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Leave the free-text `W-PENDING-PROMOTION` in `args.test.ts` and the sdd preflight tests, the synthetic probe in `contractDeferralNotes.test.ts`, and the TC-0004-0015 title in `assistantTreeMigration.test.ts` (advisory only) | the four test files named | They use the string as data or name a code without depending on its emitter, so the removal does not change their result | PASS |
| 29 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): `worklogSchemaShipped.test.ts` stays until the asset-withdrawal row | `tdd/test-list.md` TDD-0068 | It pins the shipped schema asset, which TDD-0068 withdraws | PASS |
| 30 | implementation-reviewer | impl-s1-griller | grilling(S1@2026-09-23T21:11:02.206Z/agents): Add nothing the row's GREEN, the type check, the lint or the listed edits do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 38 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Remove from `tddList.ts` the Check 8b block "a stopped ledger owes a steering record", `blockedRowLabels`, `blockedWithoutWorklog`, `readSteeringIndex`, `BlockedWorklogGate`, `StoppedSpecIndex`, the `gate` wiring in `validateTddList` and the `gate` parameter of `validateSpecTddList`, and the `worklogEntries.js` and `PROJECT_STEERING_DIR` imports; keep the "parked items must be visible in CI" block and `TDDLIST_BLOCKED_MISSING_REF` | `spec-0004/10_Plan.md` "Removing the work-log surface"; `packages/qfai/src/core/validators/tddList.ts` | This is the plan's list for `tddList.ts`; `blockedRowLabels` has no other reader | PASS |
| 39 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Delete `src/core/worklogEntries.ts` in this row | `git grep worklogEntries` over `src`, `tests`, `scripts` | After the `tddList.ts` removal it has no importer, the plan lists it, and no later row owns it. Alternative considered: keep it as dead code until a later row | PASS |
| 40 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Remove the `QFAI-TDDLIST-015` and `QFAI-TDDLIST-016` expected-state entries and their comments from `cli/commands/validate.ts`, and regenerate `emittedRuleCodes.ts` | `tests/unit/issueCatalogHasEmitters.test.ts`; implement S1 decision 23 | A catalog entry whose code nothing emits fails that guard; S1 deferred these entries to this row | PASS |
| 41 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): In `tddListBlockedStatus.test.ts` remove the `QFAI-TDDLIST-015` describe block and the helpers only it used (the `node:fs/promises` mock, `SteeringSeed`, the `steering` parameter and `steeringIsRegularFile` option of `run()`, `entry()`, the `HANDOFF_REQUIRED_SECTIONS` import, the header lines on the steering setup), plus the imports that become unused (`vi`, `type * as FsPromises`); every other describe stays | `spec-0004/10_Plan.md` removal order step 4 | The plan removes the tests that pin the surface; left behind, the helpers and imports are unused and fail `eslint --max-warnings 0`. The unused imports were added by the griller | PASS |
| 42 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): The frozen code lists change only as far as they fail | `findingCodeGrammar.test.ts`, `issueCodeUniqueness.test.ts`, `ruleCodeUniqueness.test.ts` | The same rule S1 decision 21 set; 015 and 016 use the canonical grammar and sit on no pending list, so no change is expected | PASS |
| 43 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Defer the `assistantPaths.ts` constants, the skill text naming `QFAI-TDDLIST-015` with `implementWorklogObligation.test.ts`, `ADVISORY_FAILING_CODES`, the asset withdrawal, the docs, CHANGELOG, the dogfood re-pin and the remaining comments naming `worklogSurface.ts` to their later rows and plan steps; all must land before the change's head | `spec-0004/10_Plan.md` removal order steps 2-7 | Each has an owner later in the order. Griller advisory: until the spec-0011 row rewrites the skill text, the shipped skill still tells an agent to write a `.qfai/steering/` entry for a blocked row, and this run does not follow it | PASS |
| 44 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): `/qfai-atdd` takes TDD-0071's RED before this row's GREEN, and this GREEN then satisfies TDD-0071 as well | `.claude/skills/qfai-implement/references/red-not-observable.md`; the user's stop-at-`refactor` decision | Once this GREEN lands nothing reads `.qfai/steering/`, so TDD-0071 would pass on its first run. Its branch-2 route needs a `done` sibling, and no row reaches `done` before the head. Amended by the griller from the author's proposal (reclassify TDD-0071 as branch 2) | PASS |
| 45 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Run all three planned Oracle proof mutations and record in `Round 1: Oracle proof` that the scope-approval text "mutation 3 is gone" refers to an earlier, different mutation 3; mutation 1 is shown failing at the line-118 assertion, not on a type error | `### TDD-0069` Oracle proof plan and scope approvals | Mutation 3 is the only one that breaks what this GREEN changes; `/qfai-atdd` corrects its own record. Amended by the griller from the author's proposal (restore the blocked-row labels inside mutation 3 only) | PASS |
| 46 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Add nothing the row's GREEN, the type check, the lint or the listed edits do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 47 | implementation-reviewer | impl-s1-griller | grilling(S2@2026-09-23T21:11:02.206Z/agents): Local checkpoint set: the row's test, the test files whose static imports reach `tddList.ts`, `worklogEntries.ts`, `emittedRuleCodes.ts` or `cli/commands/validate.ts`, plus `ruleCodeUniqueness`, `validators-are-wired`, `issueCatalogHasEmitters`, `generateEmittedRuleCodes`, `implementWorklogObligation`, `gateGroupCoverage`, `findingCodeGrammar`, `issueCodeUniqueness` and `spec0004WorklogSurfaceRemoval` (TDD-0067 regression), with both type checks, the rule-code drift check, eslint and prettier | The user's local-checkpoint decision (AskUserQuestion, 2026-09-23) | The files that read source rather than import it are added by name, because a static-import scan cannot find them. The last four were added by the griller | PASS |
| 61 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D1: The asset round runs first, in this spec-0004 invocation, with `TDD-0068` as its owner round; spec-0003's rows run in a separate `/qfai-implement` invocation with its own run start, block and sessions in `atdd-spec-0003.md`: `TDD-0098` and `TDD-0099` consume the asset round, then the seed round (`TDD-0094`, consumed by `TDD-0096` and `TDD-0097`), then the copilot round (`TDD-0095`). Before the asset round, spec-0004 `TDD-0070` takes its branch-2 handover here and spec-0013 `TDD-0114` (`TDD-0048` before the renumber) takes its RED | `qfai-implement/SKILL.md` Spec Auto-Discovery (one spec at a time); `tmp/atdd-s1-settled.md` loop order | One invocation cannot span two specs, and the loop order puts spec-0004 before spec-0003. `TDD-0048` scans the whole shipped tree, schema asset included, so its RED has to precede the withdrawal; the other skill-text rows need not wait. `TDD-0070` is independent of these rounds and the loop order puts it before `TDD-0068`; its RED-not-observable form names pre-existing production state, because stop-at-`refactor` rules out a `done` sibling. The last two points were added by the griller | PASS |
| 62 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D2: Asset round: delete `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`, run `npm run generate:governed-manifest`, run `pnpm sync:ssot` and inspect its diff, delete the tracked symlink `.qfai/assistant/catalog/worklog-entry.schema.md`, delete `tests/assets/worklogSchemaShipped.test.ts` and its `typeCheckEnumeration.allowlist.ts` entry; `retireWithdrawnGovernedAssets` and the lock record stay | `spec-0004/10_Plan.md` removal order step 3; `spec-0003/10_Plan.md` "Removing the work-log seed" | The plan's step 3. `ci:gate:ssot` diffs `.qfai/` after the sync, so the tracked link goes in the same round; the retire pass is what deletes an adopter's unedited copy | PASS |
| 63 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D3: Seed round: remove from `init.ts` the seven symbols spec-0003's plan lists (`seedProjectSteering`, `buildProjectSteeringEntryTemplate`, `summarizeSeedDrift`, `readSeedBodyForDrift`, `SeedComparison`, `normalizeNewlines`, `SEED_DRIFT_MAX_BYTES`), the call and the three `projectSteeringResult` folds, the three imports, "steering" in the `--force` NOTE, and "steering" in the comments near lines 178, 642 and 1732; the legacy `.qfai/assistant/steering` code and comments (near 283 and 2625-2860) and `LEGACY_*` stay | `spec-0003/10_Plan.md` "Removing the work-log seed" | The plan's list, plus the comments that would describe behaviour init no longer has. The legacy layout is out of scope in the plan | PASS |
| 64 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D4: In the seed round, remove the `assistantPaths.ts` symbols that lose their last user: `PROJECT_STEERING_DIR`, `PROJECT_STEERING_TEMPLATES_SUBDIR`, `joinProjectSteering`, `WORKLOG_ENTRY_KINDS`, `WORKLOG_ENTRY_STATUSES`, `HANDOFF_REQUIRED_SECTIONS`, the types `WorklogEntryKind` and `WorklogEntryStatus`, and their comments; the `LEGACY_ASSISTANT_*` constants and the `joinLegacyAssistant*` functions stay byte-identical | `spec-0004/10_Plan.md` removal order step 2; `dist/index.d.ts` | They are internal, absent from the published type declarations, and have no user once init stops seeding; no other row owns `assistantPaths.ts` | PASS |
| 65 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D5: Seed-round test edits, exactly the `spec-0003/09_delta.md` list: the six `TC-0003-0022 (TDD-0022)` blocks and the `WORKLOG_ENTRY_STATUSES` import in `init.test.ts`, and its `joinProjectSteering` assertion; the file-level annotation, the `TC-0003-0022` describe block and the `joinProjectSteering` assertion in `initSpec0003.test.ts`; the carrier entry `QFAI:SPEC-0003:TC-0003-0022` in `tests/integration/qfai-traceability.md`; delete `tests/assets/initContractSteeringSeed.test.ts` and its allowlist entry. Afterwards confirm the selectors of TDD-0001..0015, TDD-0018..0021 and TDD-0023..0026 still resolve | `spec-0003/09_delta.md` retired-row edits | The delta assigns these to `/qfai-implement` in the change that removes the seed | PASS |
| 66 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D6: In `initGitignoreMigration.test.ts`, delete the `steering` constant, the `projectContent` read and its conditional; keep the agent and manifest assertions | `packages/qfai/tests/cli/initGitignoreMigration.test.ts` | Once nothing seeds `.qfai/steering/`, that branch can never run. Amended by the griller from the author's proposal (leave it as an advisory) | PASS |
| 67 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D7: Copilot round: remove only the work-log line `buildCopilotInstructions` writes (`init.ts` near line 8147); the legacy-layout lines after it stay | `spec-0003/10_Plan.md` "Removing the work-log seed" | The plan names that line alone | PASS |
| 68 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D8: Defer the skill-text rewrite with `implementWorklogObligation.test.ts` (spec-0011 and spec-0013 rows), `ADVISORY_FAILING_CODES` (TDD-0018), the root documents, `docs/finding-codes.md`, CHANGELOG and the dogfood re-pin. Between rounds the shipped skills cite a schema that no longer ships; this repository's `.github/copilot-instructions.md` already points at the deleted contract. Both are fixed in their steps before the change's head | `spec-0004/10_Plan.md` removal order steps 3, 6 and 7 | Each has an owner later in the order. The note on the root `.github/copilot-instructions.md` was added by the griller. Amended by S4 D4 (step 81): the one README paragraph that cites the withdrawn schema is removed in the asset round, in both READMEs; the rest of the README stays with step 6 | PASS |
| 69 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D9: Oracle proofs as planned: `TDD-0068`, `TDD-0098` and `TDD-0099` put the manifest entry and the asset back; `TDD-0094` and `TDD-0096` restore the seed call with its function; `TDD-0097` restores it only under `--force` and shows `TDD-0096` still passing; `TDD-0095` restores the line. Each restores from a copy of the pre-GREEN file and reverts to the GREEN copy | The handoff entries of the six rows | The mutations are the handoffs' own; restoring from copies keeps each revert exact | PASS |
| 70 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D10: Local checkpoint sets. Asset round: the static importers of `assistantAssetProvenance.ts`, `validators/assistantAssets.ts` and `governedAssistantManifest.ts`, the governed-manifest drift check, `assistantAnchorReferences`, `distributedSurfaceLeakage`, `tests/assets/assets.test.ts`, `init.test.ts`, `initSpec0003.test.ts`, `spec0004WorklogSurfaceRemoval`, `spec0004WithdrawnSchemaFinding`, `spec0003WithdrawnSchemaRetirement`, `node scripts/check-tracked-symlinks.mjs` and the tracked-tree diff after `sync:ssot`, excluding the later rows' deliberate REDs (`spec0011RecordHomes`, `spec0013RecordHomes`). Seed and copilot rounds: the static importers of `init.ts` and `assistantPaths.ts` after a `dist/` rebuild, `spec0003InitWorklogSurface.test.ts` narrowed per selector until `TDD-0095` is green, `agentsRulesSurface`, `outputLanguageSingleSource` and `initE2E`. Every round: both type checks, its drift checks, eslint and prettier; verify:pack is left to the head's CI | The user's local-checkpoint decision (AskUserQuestion, 2026-09-23) | Static-import scans miss the checks that read the shipped tree or the generated output as text, so those are added by name. The symlink check, the tracked-tree diff and the two schema-row tests were added by the griller | PASS |
| 71 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D11: Add nothing the rounds, the type checks or the lint do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 72 | implementation-reviewer | impl-s1-griller | grilling(S3@2026-09-23T21:11:02.206Z/agents): R-D12: `## Cross-spec obligations` gains code-ownership entries: spec-0003 `TDD-0098` and `TDD-0099` for the asset round, resolved by their own GREEN in the spec-0003 invocation; spec-0015 `TDD-0039` (`todo`, `Owning module` `init.ts`, no selector to re-run) for the seed round | `.claude/skills/qfai-implement/references/cross-spec-ownership.md` | The asset round changes what those rows assert before their own invocation takes them, and the seed round edits a module another spec's row owns. Added by the griller | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D1: Fix the README citation in the asset round (option A), not in step 6 (option B) | `### TDD-0068` local checkpoint, first run; S3 R-D10 (step 70); `references/checkpoint-verification.md` Pass criteria, per item; `spec-0004/10_Plan.md` removal order ("Only its head has to be green") | R-D10 puts `tests/assets/assets.test.ts` in this round's checkpoint set, and this round's deletion is what failed it, so the row owns the repair: fix it and re-run the whole set. Under B the row cannot pass a checkpoint its own set requires until step 6, and every review pinned to it waits too. The plan binds only the head, so an earlier README edit contradicts nothing. Not critical: no spec, contract or DR changes, the edit is an uncommitted working-tree change, and it rests on no product intent. The author recommended A | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D2: Delete only the paragraph that points at the seeded schema, identically in both READMEs (root lines 727-729, `packages/qfai/README.md` lines 721-723, with one of the blank lines beside it); the file-tree entry (root line 702, package line 696) and the rest of the section stay with step 6 | `packages/qfai/tests/assets/assets.test.ts` `extractPathReferences`; `scripts/check-readme-alignment.mjs`; S3 R-D8 (step 68) | The guard counts a reference only when it contains a `/`, so the bare tree line is not read and does not fail; the paragraph holds the only cited path. The alignment check holds the two files line for line, so both change together. R-D8 already accepts root documents that are stale between rounds, and the tree entry is one of them. Amended by the griller from the author's proposal. Disagreeing position (author `impl-row-0067`): delete the tree entry too, leaving `ui-definition-protocol.md` as the last entry, because it lists a file init no longer writes | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D3: The README edit is Round 1's Phase: Refactor change, recorded as the checkpoint repair. It opens no round, `Round 1: Revision` stays `working-tree+73bc7ce72b88241119b80e5b5eef327de074ad02bbc9152729d42e65e0221ba9`, and the step 80 build gate stands with no new one. Record the repair, then `Refactor verify command` / `result` / `revision` on the repaired tree, then the item reviews pinned to that revision, then the whole R-D10 set with its own `Checkpoint verification revision`; `green -> refactor` is written with the refactor record | `references/evidence-revision.md` "Which tree each gate item addresses"; `references/checkpoint-verification.md` "A repair that changed code owes its `Refactor verify` fields"; `references/execution-ledger.md` allowed transitions | `Revision` addresses the tree after implementation and before the refactor, which the GREEN observed; the final tree is carried by `Refactor verify revision`. Neither the selector nor the production change reads the README, so the GREEN observation is unchanged. The earlier "Refactor ... no change" line stays as written; the repair is appended after the failed run. Amended: the author ran the R-D10 set as the refactor-verify run on `working-tree+fd08d443…f37b`, and the item reviews then passed on that same address. That is equivalent on two points. First, the order: the checkpoint follows the reviews so that it runs on the tree the reviewers judged, and the reviews changed nothing and pinned the address the run was taken on. Second, the formal `Checkpoint verification` fields and seal are deferred to the final head's CI run, which is the user's decision recorded in `### TDD-0067` and the same deferral `TDD-0067`, `TDD-0069`, `TDD-0070` and `TDD-0071` carry; gate item 12 reads them only at `done`, and no row reaches `done` before that run. Still owed: (1) R-D10's tracked-tree diff after `sync:ssot` is missing from the fd08d443 run. Take it there (the sync chain, then the diff hashed equal before and after) and record it beside the refactor-verify record; the address must stay fd08d443, and if it moves the reviews are stale and the repair loop re-runs. The GREEN-time check on 73bc7ce7 does not carry, because nothing records that the READMEs are the only change between the two addresses. (2) Record both item-review verdicts in `### TDD-0068` with `Reviewed revision` fd08d443 and their audited evidence hashes; the section holds neither yet | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D4: Amend S3 R-D8 (step 68) in place: its deferral of the root documents no longer covers the one README paragraph D2 removes. Nothing else recorded needs an amendment: R-D10 stands and D1 serves it, `spec-0004/10_Plan.md` step 6 still owns the README rewrite, and the `### TDD-0068` records are appended to, not rewritten | step 68; step 70; `spec-0004/10_Plan.md` removal order step 6 | Without the note, step 68 reads as leaving every root-document edit to step 6, which the asset round no longer does. The amendment takes the in-place form the run already uses for a changed decision | PASS |
| 81 | qa-gatekeeper | impl-s4-griller | grilling(S4@2026-09-23T21:11:02.206Z/agents): D5: Add nothing the repair, the refactor re-verify and the checkpoint re-run do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D1: TDD-0018 and TDD-0072 keep their evidence in `.qfai/evidence/implement-spec-0004.md`. The edit that creates that file copies in this run's `### /qfai-implement — run started 2026-09-23T21:11:02.206Z` block (S1–S5, same heading and rows) and every `grilling(<Session>@2026-09-23T21:11:02.206Z/…)` Work Orders row, identical to this file. Every later write to either copy goes into both | `tdd/test-list.md` TDD-0018, TDD-0072; `qfai-implement/SKILL.md` "Record both sessions where the gate reads them"; `.qfai/evidence/` listing | Settled by lookup, confirming the author: both rows are Layer `unit` with no `Pre-split-evidence` marker, and `implement-spec-0004.md` does not exist yet. The gate compares every copy of this invocation's block and its grilling rows, and requires them identical | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D2: TDD-0018's test in `tests/validators/reviewerJustification.test.ts` takes the reversed oracle. One report holds an empty `justification:` on `R-WORKLOG-DRIFT`, and no issue with that code comes back. The `R-HANDOFF-INCOMPLETE` finding leaves the fixture. The same report holds an empty `justification:` on `R-PROMPT-SCANNER-DRIFT`, which must come back as an `error` issue with that code: that is the read control. The `it` is renamed for the new behaviour and the row's `Selector` takes the new name. The header comment (lines 4–5) and the comment at line 88 state the old set and are corrected in the same rewrite | `06_Test-Cases.md` TC-0004-0018; `10_Plan.md` "Tests for the work-log removal"; the atdd run's S1 decision that every absence oracle shows the read (step 7) | An absence oracle alone also passes over a run that read nothing. A control in the same report file proves the file was read. The control is `R-PROMPT-SCANNER-DRIFT` and not `R-REJECTED-READOPT`, because that is TDD-0072's predicate and its mutation would then fail TDD-0018 as well. The RED is natural: the current code returns the `R-WORKLOG-DRIFT` error. Amended by the griller: the control goes in the same report file, and the two comments are corrected | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D3: GREEN: remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from `ADVISORY_FAILING_CODES` in `reviewerJustification.ts` and from `reviewer-gate-sdd` in `cli/commands/validate.ts` (lines 622–623). `R-REJECTED-READOPT` stays in both. Correct the comments that list the old set: the source list at `reviewerJustification.ts` lines 17–21, its docblock at lines 139–142, and `justificationCatalog.ts` lines 8–10. `emittedRuleCodes.ts` is regenerated only if the rule-code drift check fails. In `ruleCodeUniqueness.test.ts` the two codes leave the `validators/reviewerJustification.ts` entry (lines 206, 209) when its census fails, and that entry's comment stops naming `worklogSurface.ts`, which no longer exists. `issueCodeUniqueness.test.ts:195` is not edited | `10_Plan.md` "What the validators of this spec lose" and removal order step 2; S1 steps 21 and 23 (P-D1); `src/core/emittedRuleCodes.ts` | The plan names these edits, and S1 deferred the two `reviewer-gate-sdd` entries to this row. The generated file lists none of the three codes today: the gate re-emits a code read from a report, which a static census cannot see, so regeneration has nothing to remove. A comment cannot fail, and `issueCodeUniqueness.test.ts` is otherwise outside the diff (`documentation-clarity.md`: leave everything outside the diff alone). Disagreeing positions (author `impl-row-0067`): regenerate `emittedRuleCodes.ts` as a GREEN step; edit the `issueCodeUniqueness.test.ts:195` comment | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D4: Leave untouched: `contractDeferralNotes.test.ts:525`, `justificationCatalog.test.ts:77`, `justificationRejectEmpty.test.ts:6` and `init.ts:2009`. The two comments this leaves stale, `justificationRejectEmpty.test.ts:6` and `issueCodeUniqueness.test.ts:195`, are recorded as an advisory and not as an obligation | The four sites; S3 R-D3 (step 63) | Line 525 is a synthetic probe source that does not read the real set. Line 77 asserts the catalog excludes `R-WORKLOG-DRIFT`, which stays true. Line 6 is a comment outside the diff. `init.ts:2009` belongs to the spec-0003 seed round. The plan names no test comment, so the two stale ones are recorded rather than fixed here. The author's proposal | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D5: TDD-0072's test is its own `it` with its own fixture: one report holding an empty `justification:` on `R-REJECTED-READOPT`, which must come back as an `error` issue with that code. It has no read control. Its falsifiability mutation is the one DR-0004-0041 names, removing `R-REJECTED-READOPT` from `ADVISORY_FAILING_CODES`, restored from a copy. Which file it goes in, and when it is written, follow the escalated Q6 | TC-0004-0018; `10_Plan.md` "Tests for the work-log removal"; DR-0004-0041 | The plan gives the rejection its own row because a gate that rejected nothing would pass TDD-0018. A separate fixture keeps each selector reading only its own finding. A presence oracle cannot pass over a run that read nothing, so no control is needed. The author's proposal, with the placement left to Q6 | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D6: TDD-0018's local checkpoint set: its test file; the test files that statically import `reviewerJustification.ts`, `validators/index.ts` or `cli/commands/validate.ts`; `ruleCodeUniqueness`, `issueCatalogHasEmitters`, `gateGroupCoverage`, `contractDeferralNotes` and `validate.profileCoverageNotice` by name; both type checks, the rule-code drift check, eslint and prettier. The importers of `emittedRuleCodes.ts` join only if the drift check makes this row regenerate it. The full suite waits for the final head's CI run | The atdd run's S1 N1 (the user's local-checkpoint answer); S3 R-D10 (step 70); `references/checkpoint-verification.md` per-item set | The set reaches every file the GREEN changes and every test that reads the edited lists as text or through the AST. Under D3 `emittedRuleCodes.ts` does not change, so its importers read nothing new. Amended by the griller from the author's proposal, which included every importer of `emittedRuleCodes.ts` | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/agents): D7: Add nothing the two rows, their checkpoints and the plan do not need | `.agents/rules/grilling.md` "The request bounds the tree" | An addition no part of the request needs is dropped | PASS |
| 84 | qa-gatekeeper | impl-s5-griller | grilling(S5@2026-09-23T21:11:02.206Z/user): Q6: TDD-0072 keeps the order DR-0004-0041 and DL-0027 record. Every other row, TDD-0018 included, closes on the final CI run as already decided. TDD-0072's test is written only after that, in its own test file annotated `QFAI:SPEC-0004:TC-0004-0018` and added to `tsconfig.tests.json`; its first run is classified with `Satisfied-by` TDD-0018 (`done`), its mutation is D5's, and it closes on a second CI run over the new head. The decision that all full-suite checkpoints close together is relaxed for TDD-0072 only | DR-0004-0041; `09_delta.md` DL-0027; `references/red-not-observable.md` "Classify first"; `references/evidence-revision.md` "What makes evidence stale" | Answered by the user through AskUserQuestion on 2026-09-24 (option 1, recommended by the griller). The recorded order needs TDD-0018 `done` first, `done` waits for the final CI, and the new test moves the address that run covered, so no order closed on one CI. A separate file leaves TDD-0018's closed `Test file` unedited. Rejected: a Change Request letting TDD-0072 cite TDD-0018 at `refactor`, which also departs from the shipped skill | PASS |
| 85 | delivery-planner | impl-scope-0018 | Scope approval TDD-0018 | `implement-spec-0004.md` `### TDD-0018`; `tests/validators/reviewerJustification.test.ts` (test hash `93364462…f067`, tree `working-tree+a093ad34…5693`); `spec-0004/06_Test-Cases.md` TC-0004-0018, `05_Examples.md` EX-0004-0016, `03_Acceptance-Criteria.md` AC-0004-0018, `04_Business-Rules.md` BR-0004-0017; implement S5 D2 | PASS, "Approve, then run". Hash and tree recomputed equal. `todo -> red` at step 2 is legal for a `todo` unit row; the `Selector` repair is legal; Round 1 is legal. Expected RED: fails at test line 62 with the control at line 60 passing. Advisories: at GREEN, name spec-0015 TDD-0019 and TDD-0028 in `## Cross-spec obligations` and re-run their selectors read-only (implement S1 decision 25); no test can fail on the `R-HANDOFF-INCOMPLETE` removal, recorded as an advisory and not adopted (a test for it would need a Change Request the request does not need) | PASS |
| 86 | qa-gatekeeper | atdd-red-gate | RED gate TDD-0018 | `implement-spec-0004.md` `### TDD-0018` Round 1 RED and its stripped run; `delivery-planner` PASS step 85; `tests/validators/reviewerJustification.test.ts` | PASS: RED reproduced at line 62 (`R-WORKLOG-DRIFT` still rejected) after the line 60 read control; revision and gate-form RED test hash recomputed equal; production lists unchanged; strip valid; Oracle proof plan re-adds the code to `ADVISORY_FAILING_CODES` | PASS |
| 87 | qa-gatekeeper | atdd-red-gate (phase build) | Build gate TDD-0018 | `implement-spec-0004.md` `### TDD-0018` Round 1 GREEN pair and Oracle proof; `Round 1: Revision` working-tree+63b9d538…; `reviewerJustification.ts`, `cli/commands/validate.ts`, `justificationCatalog.ts`, `ruleCodeUniqueness.test.ts` | PASS: GREEN re-run, exit 0, selector passing; revision and gate-form RED test hash recomputed equal; diffs match S5 D3 (exactly two codes out of each list, R-REJECTED-READOPT kept); the `ruleCodeUniqueness` comment rewrite is in scope, as the smallest true wording once `worklogSurface.ts` goes; Oracle proof re-adds `R-WORKLOG-DRIFT` and fails line 62 after the control | PASS |
| 88 | backend-engineer | impl-row-0067 | TDD-0018 Red steps 1-3, RED and stripped run, GREEN, Oracle proof, refactor and local checkpoint | `implement-spec-0004.md` `### TDD-0018`; implement S5 D2, D3 and D6 (step 84); scope approval (step 85); RED gate (step 86); build gate (step 87) | Ledger `todo -> red` 05:20:43Z and the `Selector` repaired 05:21:35Z; test rewritten to the reversed oracle with the `R-PROMPT-SCANNER-DRIFT` read control (test hash `93364462…f067`); RED at `working-tree+a093ad34…5693` failed at line 62 with the control at line 60 passing, and the stripped run passed; GREEN removed `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from `ADVISORY_FAILING_CODES` and `reviewer-gate-sdd`, corrected the comments, and updated the `ruleCodeUniqueness` census; the drift check passed, so `emittedRuleCodes.ts` was not regenerated; spec-0015 `TDD-0019` and `TDD-0028` re-run read-only and passed; GREEN at `working-tree+63b9d538…cfd5`; Oracle proof (`R-WORKLOG-DRIFT` put back) failed at line 62, then reverted; `red -> green` 05:37:31Z; 46-file checkpoint: 615 passed, 2 skipped; `green -> refactor` 05:41:03Z | PASS |
| 89 | implementation-reviewer | impl-review-0018 | Item review TDD-0018 | The diff of `reviewerJustification.ts`, `justificationCatalog.ts`, `cli/commands/validate.ts`, `reviewerJustification.test.ts` and `ruleCodeUniqueness.test.ts`; `implement-spec-0004.md` `### TDD-0018` | PASS at working-tree+63b9d538…cfd5 (HEAD `536fc4ddd`), 2026-09-24T05:45:09Z. Code quality audited evidence hash `fdb7b70cf4d2519432fffee6d895adb8630fa1c9efca909e257622e2351ba43f` | PASS |
| 89 | completion-reviewer | impl-cr-0018 | Item review TDD-0018 (attempt 1) | `implement-spec-0004.md` `### TDD-0018`; `tdd/test-list.md` TDD-0018; `spec-0004/03_Acceptance-Criteria.md` AC-0004-0018, `04_Business-Rules.md` BR-0004-0017, `05_Examples.md` EX-0004-0016, `06_Test-Cases.md` TC-0004-0018 | REVISE: F1, the cross-spec entry named only spec-0015 TDD-0019 and TDD-0028. Answered outside the section by widening the entry; no new production behaviour, so no round was opened | REVISE |
| 89 | completion-reviewer | impl-cr-0018 | Item review TDD-0018 (attempt 2) | As attempt 1, with the widened `## Cross-spec obligations` entry | PASS at working-tree+63b9d538…cfd5. Spec audited evidence hash `fdb7b70cf4d2519432fffee6d895adb8630fa1c9efca909e257622e2351ba43f` | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D1: revert `shippedWorkflowOwnership.test.ts` to `6a14f8e6` and raise one defect CR for spec-0003 `TDD-0045`, `TDD-0048` and `TDD-0054`, with the surviving mutants as its reproduction; re-run `TDD-0046`'s proof on `6a14f8e6` | `git show` of the test at `f52301317`, `848174196` and `origin/main`; `git log f52301317..432346e11` for the file; `cross-spec-ownership.md` step 3 | `CR-20260925-0006`. The defect is on main and the work-log removal did not cause it; a surviving original mutation is not re-approved until it is repaired, and a record is less than a test change plus a second cross-spec record. No disagreeing position | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D2: a mutation rebuilt at its current site counts as the original only when it breaks the predicate the row's `Oracle proof` or `Falsifiability command` names and nothing else, passes the Oracle Strength Check, and fails; `TDD-0054` fails the last test and goes to the D1 CR | `git log -S` and `git merge-base --is-ancestor` for the masking guard (`abccaca33`); `all-341-report.json` proofs `runs19`, `runs24` | The rule identifies a mutation by the predicate its proof names, not by the bytes it replaced. Author's position, rejected: accept `TDD-0054` as an equivalent mutant on `runs19`/`runs24`; no rule admits a substitute mutation on this route, and the masking guard predates the branch | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D3: revert the ten kept selector repairs (spec-0006 `TDD-0020`, spec-0015 `TDD-0020`, spec-0012 `TDD-0455`, `TDD-0463`, `TDD-0464`, `TDD-0472`, `TDD-0475`, `TDD-0480`, `TDD-0506`, `TDD-0508`) with `TDD-0496` and `TDD-0517`; the ten rows take a new CR carrying the drafted values | `selectorEntries` / `entryResolves` from `tddList.ts` at `f52301317` and HEAD; `grep` of `.qfai/decisions/` blocked tables; `cross-spec-ownership.md` step 3 | `CR-20260925-0007`. The re-run is read-only on another spec's ledger, the selectors were broken before the branch, and zero-test rows go to a CR. Author's position, rejected: keep them under a user instruction; none is on record | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D-P: replay the full recorded mutant set for spec-0006 `TDD-0030`..`TDD-0033` and `TDD-0038`..`TDD-0040`; a mutant with no needle is rebuilt under D2, and one that cannot be rebuilt or now survives stops the run | `implement-spec-0006.md` multi-mutant proofs; `unverified-original-proofs.md` | In these proofs the original mutation is the whole set, each mutant reaching its own assertion, so a partial replay leaves assertions unchecked. No disagreeing position | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D4: rewrite the `closed` tables of `atdd-spec-0003.md` and `atdd-spec-0011.md` in the fields `cross-spec-ownership.md` defines, with an exact `File` and no `closed`, and put their dependent rows through the same review | `git log -L` of both sections (`581ea5143`, `1fcaf0687`); `cross-spec-ownership.md` "The evidence entry" | These are this change's own entries, and an entry without a valid `Resolution` is a completion prohibition on its own rows. Amended as the second note under this run's table says. No disagreeing position | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D5: delete the 2026-09-25 steering-removal handoff note from the evidence directory | `git grep` for the file name; `git log --diff-filter=A` | Nothing cites it, its next-work list describes reruns that left the branch, and git history keeps the file. No disagreeing position | PASS |
| 90 | qa-gatekeeper | split-griller | grilling(S1@split-2026-09-25/agents): D6: renumber this change's spec-0013 ids to the next free ids on the merged tree through `/qfai-sdd` Phase 2b, repoint every reference, record the old-to-new correspondence in `spec-0013/09_delta.md`, and re-complete the rows | `git show f52301317` of `CR-20260913-0012` and `CR-20260923-0010`; `git grep origin/main` and `git grep HEAD` for the ids | An approved allocation gave these ids main's meaning first, and the shared branch's tip wins a TDD-ID conflict. Author's position, narrowed: the same route, but it also repoints the spec-0011, spec-0004 and SDD evidence references the plan missed. Adopted as `DR-0013-0017` | PASS |
| 91 | qa-gatekeeper | xspec-griller | grilling(S1@xspec-2026-09-25/agents): X1: the `## Cross-spec obligations` entries stay in their evidence files under the withdrawn rows' `TDD-ID`s, kept unique by their tombstones; each still needs `re-reviewed` or a `CR-*`, and each section gets one prose line citing the withdrawal CR | tally of `rows[].entries` over the nine review batches; `cross-spec-ownership.md` "The evidence entry"; `spec-traceability-rules.md` rules 3-4; `qfai-implement/SKILL.md` completion prohibition | The edit, not the row, leaves other specs' `done` rows certifying untested behaviour, and the edit stays. Positions rejected: re-home the entries under `TDD-0072`, which forced no change, or treat them as moot, for which no `Resolution` value exists and which contradicts the user decision that passing rows get completion review | PASS |
| 91 | qa-gatekeeper | xspec-griller | grilling(S1@xspec-2026-09-25/agents): X2: the completion review goes ahead with the ten rows the withdrawal deletes held out; each takes `CR-20260925-0010` once that CR is applied | the review input's rows matched against the withdrawal list | A deleted row certifies nothing, so a verdict spent on it confirms nothing; the CR that deletes the row is its true resolution. No disagreeing position | PASS |
| 91 | qa-gatekeeper | xspec-griller | grilling(S1@xspec-2026-09-25/agents): X3: the earlier runs stay the reviewer's input for a row only while its test and mutated-source hashes are unchanged on the final head; a row that differs is re-run | the review input's `testFileSha256` and mutated-source hashes against the post-withdrawal head | The rule re-runs against the changed tree, and the withdrawal changes it again; the check costs one comparison. Position rejected: making the CI full suite the resolution | PASS |
| 91 | qa-gatekeeper | xspec-griller | grilling(S1@xspec-2026-09-25/agents): X4: amend D4 of `split-2026-09-25`: the spec-0011 entry's dependent row, spec-0013 `TDD-0114` (formerly `TDD-0048`), is never re-completed and takes the withdrawal CR; the spec-0003 entry against spec-0015 `TDD-0039` is unchanged | `atdd-spec-0011.md` `## Cross-spec obligations`; `tmp/absence-plan.md` | D4 assumed the row would be re-completed on the changed tree, and the user's later decision removes the row. No disagreeing position | PASS |
| 91 | qa-gatekeeper | xspec-griller | grilling(S1@xspec-2026-09-25/agents): X5: the withdrawal CR's impact section says the code-ownership entries and their re-review are outside what it withdraws, and that it disposes of the ten blocked rows it deletes | `CR-20260925-0010` draft `## Impact scope` | Without that sentence, approving the withdrawal could later be read as withdrawing the review too. No disagreeing position | PASS |

## Ledger rows advanced

| TDD-ID | Obligation | Layer | RED provenance | Entry |
| ------ | ---------- | ----- | -------------- | ----- |
| `TDD-0018` | `TC-0004-0018` | unit | implement-authored RED, gated | [TDD-0018](#tdd-0018) |
| `TDD-0072` | `TC-0004-0018` | unit | satisfied by done sibling TDD-0018; mutation proof | [TDD-0072](#tdd-0072) |

### TDD-0018

- TDD-ID: TDD-0018
- Layer: unit
- Test file: packages/qfai/tests/validators/reviewerJustification.test.ts
- Selector: TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification
- TC-ref: TC-0004-0018
- Boundary: `worklog-drift-ignored`
- EX-ref: EX-0004-0016; AC-ref: AC-0004-0018; BR-ref: BR-0004-0017
- DR-ID: DR-0296, the reset that returned the row to `todo`. The earlier
  cycle (v1.9.0, the reversed oracle) is recorded only in the ledger's former
  `Evidence` cell, so no round block of it exists; this cycle is Round 1.
- qa-gatekeeper: PASS x2 (instance `atdd-red-gate`, Round 1 — qa-gatekeeper#1, RED phase gate before the production change, reviewed revision working-tree+a093ad344349cfa5341a32d348c9b32852a17d9572b5e811997a0ee495e65693 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5; qa-gatekeeper#2, build-phase GREEN + oracle proof, reviewed revision working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5)
- Phase Red step 1: the selector is one entry over one boundary
  (`worklog-drift-ignored`). No other spec's `done` row names the test file or
  `src/core/validators/reviewerJustification.ts`.
- Phase Red step 2: ledger `todo -> red` at 2026-09-24T05:20:43Z. `DR-ID` keeps
  `DR-0296`.
- Phase Red step 3 (implement S5 D2, Work Orders step 84): the `TC-0004-0018`
  test in `packages/qfai/tests/validators/reviewerJustification.test.ts` is
  rewritten to the reversed oracle.
  - One report holds an empty `justification:` on `R-WORKLOG-DRIFT` and one on
    `R-PROMPT-SCANNER-DRIFT`. The `R-HANDOFF-INCOMPLETE` finding is gone from
    the fixture.
  - Read control: the `R-PROMPT-SCANNER-DRIFT` finding must come back as one
    `error` issue, which only a run that read the report produces.
  - Absence: no issue with code `R-WORKLOG-DRIFT` comes back.
  - The `it` is renamed for the new behaviour. The header comment and the
    comment above the `R-AUTOPILOT-POLICY-WIDENED` case are corrected.
  - The ledger `Selector` was repaired to the new name at
    2026-09-24T05:21:35Z: the old name no longer resolved against the file.
  - `npx tsc -p tsconfig.tests.json --noEmit` exit 0; eslint and prettier on the
    test file exit 0. `new RegExp(selector).test(selector)` is `true`, and the
    selector matches one `it`.
- Scope-approval subject (the RED has not been run):
  - Test hash (gate form): 93364462a9d8f5c33af5fb9108d7571d92b88178f554a62aca6ebbe7efa7f067
  - Tree: working-tree+a093ad344349cfa5341a32d348c9b32852a17d9572b5e811997a0ee495e65693
    (HEAD `536fc4ddd`, taken twice with equal results)
- Test manifest:

```text
packages/qfai/tests/validators/reviewerJustification.test.ts
```
- Scope approval (`delivery-planner`):
  - Approver: `delivery-planner`, instance `impl-scope-0018`
  - Verdict: PASS ("Approve, then run"), Work Orders step 85
  - Covers: test hash `93364462…f067` at tree `working-tree+a093ad34…5693`,
    recomputed equal by the approver, and the single selector entry above.
  - Findings: `todo -> red` at step 2 is legal for a `todo` unit row, the
    `Selector` repair is legal, and Round 1 is legal. The RED is expected to
    fail at test line 62 with the control at line 60 passing.
  - Advisories: at GREEN, name spec-0015 `TDD-0019` and `TDD-0028` in
    `## Cross-spec obligations` and re-run their selectors read-only (implement
    S1 decision 25). No test can fail on the `R-HANDOFF-INCOMPLETE` removal;
    covering it would need a Change Request the request does not need, so it is
    recorded here and not adopted.

- Planned RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/validators/reviewerJustification.test.ts --reporter=verbose -t "TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification"`
  (also the GREEN command). Expected: an assertion failure on the absence
  assertion, because the current code still rejects the empty
  `R-WORKLOG-DRIFT` justification; the read control passes before it.
- Planned GREEN (implement S5 D3): remove `R-WORKLOG-DRIFT` and
  `R-HANDOFF-INCOMPLETE` from `ADVISORY_FAILING_CODES` in
  `reviewerJustification.ts` and from `reviewer-gate-sdd` in
  `cli/commands/validate.ts`; correct the comments that list the old set.
- Planned Oracle proof: put `R-WORKLOG-DRIFT` back into
  `ADVISORY_FAILING_CODES` in `packages/qfai/src/core/validators/reviewerJustification.ts`,
  the row's `Owning module`, restored from a copy. The selector must fail on
  the absence assertion while the read control still passes.

#### Round 1

- Round 1: RED revision: working-tree+a093ad344349cfa5341a32d348c9b32852a17d9572b5e811997a0ee495e65693
- Round 1: RED test hash: 93364462a9d8f5c33af5fb9108d7571d92b88178f554a62aca6ebbe7efa7f067
- Round 1: RED test manifest:

```text
packages/qfai/tests/validators/reviewerJustification.test.ts
```

- Round 1: RED command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/validators/reviewerJustification.test.ts --reporter=verbose -t "TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification"`
- Round 1: RED result: FAIL — run at 2026-09-24T05:28:27Z (vitest start 14:28:27
  local), after the scope PASS. The test hash and the tree address were
  recomputed equal to the approved values first, and no other test process was
  running. Exit 1: the selector executed and failed on the absence assertion
  at line 62, with the read control at line 60 passing before it. The
  received value is the `error` the current code raises for the empty
  `R-WORKLOG-DRIFT` justification. The three other tests in the file are
  outside the selector and skipped.

<!-- qfai:not-a-citation .qfai/review/review-2026-05-23/reviewer-completion.json -->
```text
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > returns no issues when .qfai/review/ is absent
 × |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification 20ms
   → expected [ { code: 'R-WORKLOG-DRIFT', …(5) } ] to deeply equal []
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on non-advisory codes regardless of justification
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on R-AUTOPILOT-POLICY-WIDENED with empty justification (auxiliary warning-class)

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification
AssertionError: expected [ { code: 'R-WORKLOG-DRIFT', …(5) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "category": "canonical",
+     "code": "R-WORKLOG-DRIFT",
+     "file": ".qfai/review/review-2026-05-23/reviewer-completion.json",
+     "message": "Reviewer finding R-WORKLOG-DRIFT requires a non-empty justification (.qfai/review/review-2026-05-23/reviewer-completion.json).",
+     "rule": "reviewerJustification.empty",
+     "severity": "error",
+   },
+ ]

 ❯ tests/validators/reviewerJustification.test.ts:62:21
     60|       expect(control.map((i) => i.severity)).toEqual(["error"]);
     61|       const drift = issues.filter((i) => i.code === "R-WORKLOG-DRIFT");
     62|       expect(drift).toEqual([]);
       |                     ^
     63|     } finally {
     64|       await rm(root, { recursive: true, force: true });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  14:28:27
   Duration  1.00s (transform 127ms, setup 70ms, import 159ms, tests 22ms, environment 0ms)

exit=1
```

- Round 1: RED failure mode: assertion
- Round 1: RED assertion-stripped result: both assertions of the selector
  neutralised in compilable form as below, the RED command re-run unchanged,
  and the selector executed and passed. The file was restored at once from its
  RED copy: it compared byte-equal, the test hash recomputed to
  `93364462…f067`, and the tree address returned to the RED revision.

```diff
@@ -57,9 +57,9 @@ describe("reviewerJustification validator", () => {
       // Read control: a code that still requires a justification is rejected, so
       // the report was read.
       const control = issues.filter((i) => i.code === "R-PROMPT-SCANNER-DRIFT");
-      expect(control.map((i) => i.severity)).toEqual(["error"]);
+      void [control.map((i) => i.severity), ["error"], expect];
       const drift = issues.filter((i) => i.code === "R-WORKLOG-DRIFT");
-      expect(drift).toEqual([]);
+      void [drift, []];
     } finally {
       await rm(root, { recursive: true, force: true });
     }
```

```text
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > returns no issues when .qfai/review/ is absent
 ✓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification 10ms
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on non-advisory codes regardless of justification
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on R-AUTOPILOT-POLICY-WIDENED with empty justification (auxiliary warning-class)

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  14:28:43
   Duration  422ms (transform 110ms, setup 57ms, import 132ms, tests 12ms, environment 0ms)

exit=0
```

- `qa-gatekeeper` (routing phase `red`), qa-gatekeeper#1 on the Round 1 RED: PASS (instance `atdd-red-gate`, reviewed revision working-tree+a093ad344349cfa5341a32d348c9b32852a17d9572b5e811997a0ee495e65693 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Precondition: the `delivery-planner` PASS (`impl-scope-0018`, step 85) covers test hash `93364462…f067` at `working-tree+a093ad34…5693`, and the RED ran on both after it.
  - Freshness: the live tree addresses to the `Round 1: RED revision` directly. The RED test hash recomputes to `93364462…f067` in the gate form (Git mode `100644`), which is what `artifactRecord` in `tddList.ts` recomputes. The manifest is the one test file. It imports only `src` modules and `node:` built-ins, so no test-owned artifact is missing from it.
  - Before the passing code: `reviewerJustification.ts` is unchanged against HEAD, and `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` are still in `ADVISORY_FAILING_CODES` (lines 23 and 25) and in `reviewer-gate-sdd` (`cli/commands/validate.ts` lines 622 and 623). No seam was needed: the test calls `validateReviewerJustification`, which exists.
  - Observation: the gatekeeper re-ran the RED command. The module loads. The read control at line 60 passed: `R-PROMPT-SCANNER-DRIFT` came back as one `error`, so the report was read. The failure is the absence assertion at line 62 inside the selector: `expected [ { code: 'R-WORKLOG-DRIFT', … } ] to deeply equal []`, the `error` the current code raises for the empty justification. That is the predicate TC-0004-0018 (`worklog-drift-ignored`) removes. The selector has one entry, and the other three tests are skipped by the filter.
  - Strip: the diff reaches only this `it`. Both verdicts are discarded, the operands and the `validateReviewerJustification` call are kept, and `expect` stays referenced. The command is unchanged, and the output names the selector as passing.
  - Scope against TC-0004-0018 / EX-0004-0016 / AC-0004-0018 / BR-0004-0017, with S5 D2: the reversed oracle, the control in the same report file, and a control code that is not the TDD-0072 predicate. Nothing else is asserted.
  - Oracle proof plan: put `R-WORKLOG-DRIFT` back into `ADVISORY_FAILING_CODES` in `reviewerJustification.ts`, the `Owning module`, restored from a copy. That is the code this round's GREEN removes. The selector must fail at line 62 while the control passes. The command is the RED command, which is also the GREEN command. Acceptable.
  - Advisory: the `R-HANDOFF-INCOMPLETE` removal has no discriminating test, as the scope approval records. It is not adopted, since covering it needs a Change Request.
- Production change (Phase Green step 1), against HEAD `536fc4ddd`, per
  implement S5 D3 (Work Orders step 84), after the RED gate
  (`qa-gatekeeper#1`, step 86):
  - `packages/qfai/src/core/validators/reviewerJustification.ts`:
    `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` leave
    `ADVISORY_FAILING_CODES`; `R-REJECTED-READOPT` stays. The source-list
    comment above the set and the docblock of
    `validateReviewerJustification` stop naming the two codes.
  - `packages/qfai/src/cli/commands/validate.ts`: `R-HANDOFF-INCOMPLETE` and
    `R-WORKLOG-DRIFT` leave `reviewer-gate-sdd`; `R-REJECTED-READOPT` stays.
  - `packages/qfai/src/core/validators/justificationCatalog.ts`: the docblock
    stops naming the `R-WORKLOG-DRIFT` family.
  - `packages/qfai/src/core/emittedRuleCodes.ts`: not regenerated.
    `node scripts/generate-emitted-rule-codes.mjs --check` printed
    `src/core/emittedRuleCodes.ts is in sync (500 codes).`
  - `packages/qfai/tests/validators/ruleCodeUniqueness.test.ts`: its
    dynamic-site census failed on the two removed codes ("pins the codes
    reachable behind every allowed dynamic expression"), so they leave the
    `validators/reviewerJustification.ts` entry. The entry's comment stops
    naming the deleted `worklogSurface.ts`. It now says `reviewerGate.ts` owns
    the first two codes as literals and `R-REJECTED-READOPT` reaches the gate
    only from a reviewer report, which is what the source shows. After the
    edit the file passes (10 tests).
  - Checks on this tree: both type checks exit 0; eslint and prettier on the
    four changed files exit 0.
- Round 1: Revision: working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5
- Round 1: GREEN command: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/validators/reviewerJustification.test.ts --reporter=verbose -t "TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification"`
- Round 1: GREEN result: PASS — the restored run after the Oracle proof below was
  reverted. The GREEN file was byte-equal to its copy, the tree address
  equal to `Round 1: Revision` before the mutation and after the revert, and
  the RED test hash still `93364462…f067`.

```text
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > returns no issues when .qfai/review/ is absent
 ✓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification 11ms
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on non-advisory codes regardless of justification
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on R-AUTOPILOT-POLICY-WIDENED with empty justification (auxiliary warning-class)

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  14:33:48
   Duration  517ms (transform 149ms, setup 72ms, import 166ms, tests 12ms, environment 0ms)

exit=0
```

- Round 1: Oracle proof: `cd packages/qfai && NO_COLOR=1 npx vitest run tests/validators/reviewerJustification.test.ts --reporter=verbose -t "TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification"` — FAIL: the selector's absence assertion failed at line 62 after `R-WORKLOG-DRIFT` was restored to `ADVISORY_FAILING_CODES`.
- Round 1: Oracle proof detail: The mutation put `R-WORKLOG-DRIFT` back
  into `ADVISORY_FAILING_CODES` in
  `packages/qfai/src/core/validators/reviewerJustification.ts`, the row's
  `Owning module`. Command: the GREEN command above. Exit 1 on the absence
  assertion at line 62; the read control at line 60 passed before it.
  Reverted by restoring the GREEN copy.

```diff
@@ -20,6 +20,7 @@ import { exists, issue } from "./utils.js";
 //   3. The 8-code spec governance catalog (AC-0015-0018) sourced
 //      from `justificationCatalog.ts`.
 const ADVISORY_FAILING_CODES = new Set<string>([
+  "R-WORKLOG-DRIFT",
   "R-REJECTED-READOPT",
   // Second-wave Reviewer-Gate findings that MUST carry a non-empty
   // justification. Empty / whitespace-only justifications are treated
```

<!-- qfai:not-a-citation .qfai/review/review-2026-05-23/reviewer-completion.json -->
```text
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > returns no issues when .qfai/review/ is absent
 × |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification 18ms
   → expected [ { code: 'R-WORKLOG-DRIFT', …(5) } ] to deeply equal []
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on non-advisory codes regardless of justification
 ↓ |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > does not fire on R-AUTOPILOT-POLICY-WIDENED with empty justification (auxiliary warning-class)

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |validators| tests/validators/reviewerJustification.test.ts > reviewerJustification validator > TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification
AssertionError: expected [ { code: 'R-WORKLOG-DRIFT', …(5) } ] to deeply equal []

- Expected
+ Received

- []
+ [
+   {
+     "category": "canonical",
+     "code": "R-WORKLOG-DRIFT",
+     "file": ".qfai/review/review-2026-05-23/reviewer-completion.json",
+     "message": "Reviewer finding R-WORKLOG-DRIFT requires a non-empty justification (.qfai/review/review-2026-05-23/reviewer-completion.json).",
+     "rule": "reviewerJustification.empty",
+     "severity": "error",
+   },
+ ]

 ❯ tests/validators/reviewerJustification.test.ts:62:21
     60|       expect(control.map((i) => i.severity)).toEqual(["error"]);
     61|       const drift = issues.filter((i) => i.code === "R-WORKLOG-DRIFT");
     62|       expect(drift).toEqual([]);
       |                     ^
     63|     } finally {
     64|       await rm(root, { recursive: true, force: true });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 3 skipped (4)
   Start at  14:33:45
   Duration  449ms (transform 116ms, setup 61ms, import 136ms, tests 19ms, environment 0ms)

exit=1
```

- Advisories (not adopted):
  - No test can fail on the `R-HANDOFF-INCOMPLETE` removal from
    `ADVISORY_FAILING_CODES`; covering it would need a Change Request the
    request does not need (scope approval, Work Orders step 85).
  - Two comments still name the old set and are outside this row's edits:
    `tests/integration/validators/justificationRejectEmpty.test.ts:6` and
    `tests/core/issueCodeUniqueness.test.ts:195` (implement S5 D4).

- `qa-gatekeeper` (routing phase `build`), qa-gatekeeper#2 on the Round 1 GREEN and Oracle proof: PASS (instance `atdd-red-gate`, reviewed revision working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5 at HEAD 536fc4ddda6894af728745a0765999aa82438ec5).
  - Freshness: the live tree addresses to `Round 1: Revision` `63b9d538…bfcfd5` directly. The RED test hash recomputes to `93364462…f067` in gate form, so the test did not move under the RED.
  - GREEN: `Round 1: GREEN command` equals the RED command. The gatekeeper re-ran it: exit 0, and the verbose output names the selector as passing, with the other three tests skipped by the filter.
  - Production change against S5 D3, checked on `git diff HEAD`: `reviewerJustification.ts` loses exactly `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from `ADVISORY_FAILING_CODES`, `R-REJECTED-READOPT` stays, and only the source-list comment and the docblock D3 names change. `cli/commands/validate.ts` loses exactly those two entries from `reviewer-gate-sdd`, with `R-REJECTED-READOPT` kept; its other hunks belong to the earlier rows. `justificationCatalog.ts` changes only its docblock. `emittedRuleCodes.ts` is not regenerated, and the drift check is recorded in sync, as D3 expected.
  - `ruleCodeUniqueness.test.ts`, the scope question: in scope. D3 conditions the edit on the census failing, and it removes exactly the two codes from the `validators/reviewerJustification.ts` entry. D3 also asks the entry comment to stop naming `worklogSurface.ts`. Dropping that name alone would have left "those codes belong to `reviewerGate.ts`, which owns them as literals", which is false for `R-REJECTED-READOPT`: a source search finds `R-CERTIFY-VERIFY-CIRCULAR` and `R-PROMPT-SCANNER-DRIFT` as literals in `reviewerGate.ts` (lines 149, 189) and no emitter of `R-REJECTED-READOPT`. The rewrite is the smallest wording that stays true, it is inside the diff D3 already opens, and it adds no behaviour.
  - Oracle proof: `R-WORKLOG-DRIFT` goes back into `ADVISORY_FAILING_CODES` in `reviewerJustification.ts`, the `Owning module`. That is the code this round removed, it is not a load failure, and it ran the recorded GREEN command. It fails on the absence assertion at line 62 after the line 60 control passed, and the output names this row's selector. The revert is recorded byte-equal, with the address back at `63b9d538…`, which the gatekeeper confirmed. It was judged on its record, since the gatekeeper was limited to the selector here.
  - Cross-spec: spec-0015 `TDD-0019` and `TDD-0028` (`done`) are named in `## Cross-spec obligations` with their read-only re-runs on `63b9d538…`, as the scope approval advised. The gatekeeper did not re-run them, which was outside the permitted command.
  - Advisories carried: the `R-HANDOFF-INCOMPLETE` removal has no discriminating test, and the two out-of-diff stale comments stand under S5 D4.
- Ledger write: `red -> green` at 2026-09-24T05:37:31Z, after `qa-gatekeeper#2`
  passed the build gate (Work Orders step 87), with the `Evidence` pointer.
- Refactor (Phase: Refactor step 1): no change. The GREEN removes two set
  members and corrects comments; nothing left needs renaming, merging or
  moving.
- Relevant suite resolution (implement S5 D6): the reverse walk cannot be
  completed, as recorded for `TDD-0067`, so the local per-row set the user
  chose applies. It is this row's test file; the 45 other test files whose
  static imports reach `src/core/validators/reviewerJustification.ts`,
  `src/core/validators/index.ts` or `src/cli/commands/validate.ts`; and
  `ruleCodeUniqueness`, `issueCatalogHasEmitters`, `gateGroupCoverage`,
  `contractDeferralNotes` and `validate.profileCoverageNotice` by name, which
  are already among them or read the edited lists as text. 46 files. The
  importers of `emittedRuleCodes.ts` do not join: the drift check passed and
  the file did not change. The full package suite runs on the final head's CI.
  This deviates from the widen-to-package rule of
  `references/relevant-test-suite.md`, as recorded for `TDD-0067`.
- Refactor verify command: `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`; `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`; `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`; `./node_modules/.bin/eslint --max-warnings 0`; `./node_modules/.bin/prettier --check`; `cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose` (the 46 files listed below).
- Refactor verify scope: from the repository root, in this order, with no
  other test process running:
  1. `cd packages/qfai && npx tsc -p tsconfig.json --noEmit`
  2. `cd packages/qfai && npx tsc -p tsconfig.tests.json --noEmit`
  3. `cd packages/qfai && node scripts/generate-emitted-rule-codes.mjs --check`
  4. `./node_modules/.bin/eslint --max-warnings 0` and
     `./node_modules/.bin/prettier --check` on
     `packages/qfai/src/core/validators/reviewerJustification.ts`,
     `packages/qfai/src/core/validators/justificationCatalog.ts`,
     `packages/qfai/src/cli/commands/validate.ts`,
     `packages/qfai/tests/validators/reviewerJustification.test.ts` and
     `packages/qfai/tests/validators/ruleCodeUniqueness.test.ts`
  5. The 46-file run, verbatim:

```text
cd packages/qfai && NO_COLOR=1 npx vitest run --reporter=verbose tests/assets/assets.test.ts tests/cli/commands/validate.test.ts tests/cli/commands/validateTextFormat.test.ts tests/cli/githubAnnotationCap.test.ts tests/cli/githubAnnotationEscaping.test.ts tests/cli/report.test.ts tests/cli/validateRunIncomplete.test.ts tests/core/discussionDesignMdParse.test.ts tests/core/findingCodeGrammar.test.ts tests/core/frozenSurfaceReachability.test.ts tests/core/gateGroupCoverage.test.ts tests/core/issueCodeUniqueness.test.ts tests/core/layerCoverage.test.ts tests/core/specScopeValidate.test.ts tests/core/traceabilityIntegrity.test.ts tests/core/validationTimings.test.ts tests/e2e/spec0004ProfileSuffixedValidateE2E.test.ts tests/e2e/spec0013UiContractPrimaryTasksE2E.test.ts tests/e2e/spec0015GovernanceAndHandoffE2E.test.ts tests/e2e/spec0015HygieneLaneToReviewerGateE2E.test.ts tests/e2e/spec0015ReviewerGateFindingsE2E.test.ts tests/integration/cli/commands/validate.legacyPathEvidenceGate.test.ts tests/integration/cli/commands/validate.legacyValidateJsonConfig.test.ts tests/integration/cli/commands/validate.profileCoverageNotice.test.ts tests/integration/cli/commands/validate.reviewArtifactsProfiles.test.ts tests/integration/cli/commands/validate.sddProfileLedgerSeed.test.ts tests/integration/cli/commands/validate.strictFailOnPrecedence.test.ts tests/integration/cli/commands/validate.tddProfileAtddGates.test.ts tests/integration/cli/commands/validate.tddProfileTableArity.test.ts tests/integration/cli/commands/validateSaasPackage.passes.test.ts tests/integration/contractDeferralNotes.test.ts tests/integration/reviewerGatePromptScannerDrift.test.ts tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts tests/integration/spec0004ProfileSuffixedValidate.test.ts tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts tests/integration/spec0004WithdrawnSchemaFinding.test.ts tests/integration/spec0004WorklogSurfaceRemoval.test.ts tests/integration/spec0015GovernanceAndHandoff.test.ts tests/integration/validators/hygieneLaneIngestion.test.ts tests/integration/validators/justificationRejectEmpty.test.ts tests/unit/issueCatalogHasEmitters.test.ts tests/validators/importLite.test.ts tests/validators/reviewerJustification.test.ts tests/validators/ruleCodeUniqueness.test.ts tests/validators/uix/nonUiOverfire.test.ts
```

- Refactor verify result: every command exited 0. The type checks printed no
  diagnostic, and the drift check printed
  `src/core/emittedRuleCodes.ts is in sync (500 codes).` eslint and prettier
  reported no finding. The vitest run (start 14:38:41 local) printed
  `Test Files  46 passed (46)` and `Tests  615 passed | 2 skipped (617)`, exit
  0. Its verbose output names this row's selector as passed, and the spec-0013
  `TDD-0022` selector among the static importers. The 2 skipped tests are in
  `validate.profileCoverageNotice.test.ts` and carry no selector of this row.
  The tree address was equal before step 1 and after step 5.
- Refactor verify revision: working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924165136990 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 11f68927651ebe78ea1d578c1441b58474c57611ad09368c3af85d37e67e1167
- Prototype parity: n/a (not UI-affecting)
- Prototype parity rationale: `structure.md` declares
  `ui_paths: none`, and no `<contractsDir>/ui/**` contract exists, so no clause
  of `references/ui-affecting.md` selects the row. Evaluated at working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5.
- Prototype parity reviewed revision: working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5
- Code quality review: PASS
- Code quality review context: implementation-reviewer instance `impl-review-0018`, 2026-09-24T05:45:09Z, Round 1.
- Code quality reviewed revision: working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5
- Code quality audited evidence hash: b50eadcdd33d36fade703849fa99ba5b6488bcac4648ea346ac37ae088b57749
- Code quality review pack: .qfai/review/review-20260924165136990 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 11f68927651ebe78ea1d578c1441b58474c57611ad09368c3af85d37e67e1167
- Historical reviewer feedback (attempt 1): completion-reviewer REVISE (instance
  `impl-cr-0018`). F1: the `## Cross-spec obligations` entry was too narrow.
  Answered outside this section: the entry now covers every other spec's `done`
  row under `packages/qfai/`, with the rows in the checkpoint set named and the
  rest left to the CI full-suite checkpoint. No new production behaviour, so no
  round was opened.
- Historical reviewer feedback (attempt 2): completion-reviewer PASS (instance `impl-cr-0018`), reviewed revision working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5.
- Spec reviewed revision: working-tree+63b9d5384b13883d4bd889c2bce67aea49f61b4073591f3527e76605e8bfcfd5
- Spec review: PASS
- Spec audited evidence hash: b50eadcdd33d36fade703849fa99ba5b6488bcac4648ea346ac37ae088b57749
- Spec review pack: .qfai/review/review-20260924165136990 <!-- qfai:not-a-citation -->
- Spec review pack seal: 11f68927651ebe78ea1d578c1441b58474c57611ad09368c3af85d37e67e1167
- Checkpoint: deferred. The checkpoint fields and seal are written from the
  final head's CI run (the user's decision, recorded in `### TDD-0067` of
  `atdd-spec-0004.md`).
- Ledger write: `green -> refactor` at 2026-09-24T05:41:03Z, after the refactor record above.
- Checkpoint timing: this row stops at `refactor`, and its checkpoint fields
  and seal are written from the final head's CI run (the user's decision,
  recorded in `### TDD-0067` of `atdd-spec-0004.md`).

- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/validators/reviewerJustification.test.ts --reporter=verbose; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — file-scoped run: 1 file, 4 test(s) passed, selector named in verbose output; CI run https://github.com/aganesy/QFAI/actions/runs/36026684599: all nine test slices and ci-pass passed at b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d.
- Checkpoint verification revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Checkpoint verification seal: 9fbbe571d84987a7d05c2950598a008a65f180885332a02a34a0a347117ca4dc

### TDD-0072

- TDD-ID: TDD-0072
- Layer: unit
- TC-ref: TC-0004-0018
- Boundary: `rejected-readopt-empty`
- Test file: packages/qfai/tests/validators/reviewerRejectedReadopt.test.ts
- Selector: TC-0004-0018: rejects an empty R-REJECTED-READOPT justification

#### Round 1

- Round 1: Satisfied-by: TDD-0018 (`done` before this test was written). The shared validator still rejects an empty `R-REJECTED-READOPT` justification while the retired work-log codes are ignored.
- Phase Red: The independent test and `tsconfig.tests.json` entry were added after the first full CI checkpoint passed at `d1aef569c06201a083942a3376ab8fbfd15854b7`. The first run passed. No natural RED is claimed.
- Round 1: RED test hash: 373f531deb31d86e4304b1903e93dc096b4832f8102a0c2eb33521b43b7b8028
- Round 1: RED test manifest: packages/qfai/tests/validators/reviewerRejectedReadopt.test.ts
- Round 1: RED failure mode: falsifiability
- Round 1: Falsifiability revision: working-tree+e7ae0726ffdb1e0424411df03027ddc85ab388f5b30dc64183e8d72ebbd60deb
- Mutation: remove only `R-REJECTED-READOPT` from `ADVISORY_FAILING_CODES` in `reviewerJustification.ts`. This changes the owned predicate, not the test or fixture.
- Round 1: Falsifiability command: `corepack pnpm -C packages/qfai exec vitest run tests/validators/reviewerRejectedReadopt.test.ts --reporter=dot`
- Round 1: Falsifiability result: FAIL, exit 1, with this named selector and assertion output:

```text
FAIL |validators| tests/validators/reviewerRejectedReadopt.test.ts > TC-0004-0018: rejects an empty R-REJECTED-READOPT justification
AssertionError: expected [] to deeply equal [ Array(1) ]
- Expected [{ "code": "R-REJECTED-READOPT", "severity": "error" }]
+ Received []
tests/validators/reviewerRejectedReadopt.test.ts:22:70
Test Files 1 failed (1); Tests 1 failed (1)
```

- Mutation restoration: the original source bytes were written back in `finally`. The address before mutation and after restoration was `working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa` (`ADDRESS_EQUAL=True`).
- Round 1: Revision: working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa
- Round 1: GREEN command: `corepack pnpm -C packages/qfai exec vitest run tests/validators/reviewerRejectedReadopt.test.ts --reporter=dot`
- Round 1: GREEN result: PASS, exit 0 after restoration:

```text
|validators| tests/validators/reviewerRejectedReadopt.test.ts > TC-0004-0018: rejects an empty R-REJECTED-READOPT justification
Test Files 1 passed (1); Tests 1 passed (1)
```

- qa-gatekeeper: PASS x2 (independent instance `spec0003_qa_build`, Round 1 qa-gatekeeper#1 RED/falsifiability observation at `working-tree+e7ae0726ffdb1e0424411df03027ddc85ab388f5b30dc64183e8d72ebbd60deb`; Round 1 qa-gatekeeper#2 restored GREEN and Oracle strength at `working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa`). Both attempts reviewed the named selector, test hash, mutation, assertion failure and byte restoration; reviewed revision `working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa`.
- Round 1: Oracle proof: `corepack pnpm -C packages/qfai exec vitest run tests/validators/reviewerRejectedReadopt.test.ts --reporter=dot` equals the GREEN command. With `R-REJECTED-READOPT` removed from `ADVISORY_FAILING_CODES`, the runner named `TC-0004-0018: rejects an empty R-REJECTED-READOPT justification`, reported `AssertionError: expected [] to deeply equal [ Array(1) ]` at line 22, and exited 1. After byte restoration, the same selector passed (1/1, exit 0).
- Refactor: no production or test refactor was needed after the focused test.
- Refactor verify command: `corepack pnpm check-types`; `corepack pnpm lint`; `corepack pnpm format:check`; `corepack pnpm -C packages/qfai exec vitest run tests/validators/reviewerRejectedReadopt.test.ts --reporter=dot`.
- Refactor verify result: types and lint passed; the focused test passed. The full format check initially found the ledger row and passed after formatting it. The final full-suite checkpoint is the second CI run.
- Refactor verify revision: working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa
- Round 1: reviewer verdict: PASS
- Round 1: Review pack: .qfai/review/review-20260924191914961 <!-- qfai:not-a-citation -->
- Round 1: Review pack seal: 6745bb45b6893d5a16f20f97cd1c7a9bdc4638a8b55c26bebf029c8a0a3c82dc
- Spec review: PASS
- Spec reviewed revision: working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa
- Spec audited evidence hash: fba48102d910e87c8da299c66f15b683ec47c56738a32c8877b281bc8429545b
- Spec review pack: .qfai/review/review-20260924191914961 <!-- qfai:not-a-citation -->
- Spec review pack seal: 6745bb45b6893d5a16f20f97cd1c7a9bdc4638a8b55c26bebf029c8a0a3c82dc
- Spec record re-attestation: 270c018051fe0586faeb36abf3f6b2356f2ab88976e9f8b2b93bed5ff8132ad6
- Spec record re-attestation pack: .qfai/review/review-20260925045433000 <!-- qfai:not-a-citation -->
- Spec record re-attestation pack seal: 997f37775dbe17fa0e492b93da2b60fa5064b6b942c928e5042b01ba6e67b09c
- Code quality review: PASS
- Code quality reviewed revision: working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa
- Code quality audited evidence hash: fba48102d910e87c8da299c66f15b683ec47c56738a32c8877b281bc8429545b
- Code quality review pack: .qfai/review/review-20260924191914961 <!-- qfai:not-a-citation -->
- Code quality review pack seal: 6745bb45b6893d5a16f20f97cd1c7a9bdc4638a8b55c26bebf029c8a0a3c82dc
- Code quality record re-attestation: 270c018051fe0586faeb36abf3f6b2356f2ab88976e9f8b2b93bed5ff8132ad6
- Code quality record re-attestation pack: .qfai/review/review-20260924195452260 <!-- qfai:not-a-citation -->
- Code quality record re-attestation pack seal: 37e0c51c61375b71c13c3deba9ac367b3598f0824213cfdf0facaa6020952c03
- Prototype parity reviewed revision: working-tree+139a02682c2218f2acdbd06cb4cb1799ae85f0b7995226830784cec5c229afaa
- Prototype parity: n/a (not UI-affecting)
- Ledger write: `todo -> red -> green -> refactor -> done`; the final transition followed both independent PASS reviews, sealed pack and the second full CI run on e605d324931e202ab520c5a87eff039898e72d58.
- Checkpoint verification command: `corepack pnpm -C packages/qfai exec vitest run tests/validators/reviewerRejectedReadopt.test.ts --reporter=dot; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:core; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:validators; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:integration; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:e2e; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:cli; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:unit; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:scripts; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-fix; QFAI_TEST_MAX_WORKERS="$(nproc)" pnpm -C packages/qfai test:pr-merge`
- Checkpoint verification result: PASS — focused run: one file, one named test; CI run https://github.com/aganesy/QFAI/actions/runs/36048572836: all nine test slices and ci-pass passed at e605d324931e202ab520c5a87eff039898e72d58.
- Checkpoint verification revision: e605d324931e202ab520c5a87eff039898e72d58
- Checkpoint verification seal: 4c367f25dba616b520ae51340a79448314a16b6a645810e2c8e26d802adbbb9f
Rows closed under DR-0298, one entry per row.

### TDD-0087

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageApprovalSet.test.ts`
- Selector: `TC-0004-0084: QFAI-TRIAGE-005 on exactly the rows requiresApproval() is true for`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageApprovalSet.test.ts --testNamePattern='TC-0004-0084: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the validator's own approval set held the same five operations, and its separate branch the same `UPDATE:REMOVE`
- GREEN result: exit 0; 1 passed (1), after the validator dropped its own set
- Changed files: `packages/qfai/src/core/validators/specPack.ts` (`APPROVAL_REQUIRED_OPS` and the `UPDATE:REMOVE` condition replaced by `requiresApproval()`), `packages/qfai/tests/integration/validators/triageApprovalSet.test.ts`, `packages/qfai/tests/helpers/triageFixture.ts`
- Regression: `tests/validators/specPack/triageSection.test.ts`, `tests/integration/sddTriageSection.test.ts`, `tests/integration/sddSkillTriagePhase.test.ts` and `tests/unit/cliMessageLanguage.test.ts` pass unchanged.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0079

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageLegacyApproval.test.ts`
- Selector: `TC-0004-0078: a DELETE row with - in Authorization-Ref raises QFAI-TRIAGE-005 as without the column`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageLegacyApproval.test.ts --testNamePattern='TC-0004-0078: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); the triage validator reads columns by header name, so an `Authorization-Ref` column holding `-` changes nothing
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/triageLegacyApproval.test.ts`
- Note: the case holds once `QFAI-TRIAGE-011` lands: a `-` reference is never checked.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0080

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageNoApprovalRow.test.ts`
- Selector: `TC-0004-0079: an UPDATE / APPEND row whose Authorization-Ref resolves to no file raises no triage finding`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageNoApprovalRow.test.ts --testNamePattern='TC-0004-0079: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed (1)); no reference is read today
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/triageNoApprovalRow.test.ts`
- Note: the case holds once `QFAI-TRIAGE-011` lands: `requiresApproval()` is read before the reference, and is false for this row.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0081

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: E2E
- Test file: `packages/qfai/tests/e2e/spec0018DeliverAFeatureE2E.test.ts`
- Selector: `US-0018-0001, authorization variant (spec-0004 TDD-0081): after the run finishes, validate resolves a CREATE row citing the run's create decision`
- RED command (cwd `packages/qfai`, after `./node_modules/.bin/tsup`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/e2e/spec0018DeliverAFeatureE2E.test.ts --testNamePattern='US-0018-0001, authorization variant \(spec-0004 TDD-0081\)' --reporter=verbose`
- RED result: already satisfied by TDD-0073..0078, TDD-0091..0092 and TDD-0082. The first run exited 1 at `spec0018DeliverAFeatureE2E.test.ts:280` only because the test's own filter also counted the `error_code` detail line of the one expected finding; with the filter reading finding lines alone, the case passed with no production change
- GREEN result: exit 0; `Tests  1 passed | 4 skipped (5)`
- Changed files: `packages/qfai/tests/e2e/spec0018DeliverAFeatureE2E.test.ts`, `packages/qfai/tests/helpers/triageFixture.ts` (`writeTriagePack` split out of `seedTriageProject`)
- Note: the journey runs a feature to `qfai_done`, then cites the run's tracked `create` decision from a `CREATE` row. The row whose Rationale names the bound CAP raises nothing, and a control row naming an unbound CAP raises `QFAI-TRIAGE-011` on the Binding check, so the pass is not vacuous.
- Evidence file: this spec has no ATDD evidence file, and creating one owes a committed Coverage Depth Matrix (`QFAI-ATDD-133`), so the entry is recorded here.

### TDD-0083

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0080: An edited plan is reported as a differing governed file`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0080: ' --reporter=verbose`
- RED result: exit 1 against the sources before the governed-layer change; `AssertionError: expected [] to deeply equal [ Array(1) ]`
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/assistantAssetProvenance.ts` and `packages/qfai/src/core/governedAssistantManifest.ts` (spec-0003's U4 change: the plans are a governed layer and ship in the governed list), `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0087 entry gives.

### TDD-0084

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0081: A deleted plans layer is reported once, against the layer`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0081: ' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ [ 'QFAI-ASSETS-007', …(1) ] ]` (still red after the layer joined the list: the recorded layer was read as the key's first segment, `process`)
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/src/core/validators/assistantAssets.ts` (the recorded and present layer reads go through `governedLayerOf`), `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0087 entry gives.

### TDD-0085

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0082: Nothing under process/migrations is reported`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0082: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); `process/migrations/` was never governed, and stays outside the list
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0087 entry gives.

### TDD-0086

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Selector: `TC-0004-0083: A fresh init tree has no finding under process/workflows`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/workflowPlanProvenance.test.ts --testNamePattern='TC-0004-0083: ' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (Tests 1 passed); it is the guard on the plan's risk row, and it stays green once the plans are governed
- GREEN result: exit 0; 1 passed (1)
- Changed files: `packages/qfai/tests/integration/validators/workflowPlanProvenance.test.ts`
- Evidence file: recorded here for the reason the TDD-0087 entry gives.

### TDD-0088

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0085 create-row: two CAPs cited and one bound raise no QFAI-TRIAGE-011 or QFAI-TRIAGE-005`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0085 create-row: two CAPs cited and one bound raise no QFAI-TRIAGE-011 or QFAI-TRIAGE-005' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed); nothing read the column yet, and the case holds that a passing reference raises nothing once it is read
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0089

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0085 column-position: the column after Depends-On raises no QFAI-TRIAGE-011 or QFAI-TRIAGE-005`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0085 column-position: the column after Depends-On raises no QFAI-TRIAGE-011 or QFAI-TRIAGE-005' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed); nothing read the column yet, and the case holds that a passing reference raises nothing once it is read
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0090

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 resolves-malformed: a value outside the two-segment grammar names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 resolves-malformed: a value outside the two-segment grammar names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: run-2026092404571299/create-0001: expected [] to deeply equal [ { severity: 'error', …(2) } ]`
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0091

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 resolves-outside: a run directory linked outside the workflow directory names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 resolves-outside: a run directory linked outside the workflow directory names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised); the outside record is a complete passing record, so only a refusal before it is read yields Resolves
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0092

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 resolves-missing: a well-formed value with no record file names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 resolves-missing: a well-formed value with no record file names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0073

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 resolves-unparsable: a record that is not JSON names the Resolves check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 resolves-unparsable: a record that is not JSON names the Resolves check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0074

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 kind: a request_scope record names the Kind check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 kind: a request_scope record names the Kind check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0075

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 operation: a record whose operation is null names the Operation check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 operation: a record whose operation is null names the Operation check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0076

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 binding-create: a slot bound to a CAP the Rationale does not cite names the Binding check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 binding-create: a slot bound to a CAP the Rationale does not cite names the Binding check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0077

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 answerer: an answeredBy differing only in case names the Answerer check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 answerer: an answeredBy differing only in case names the Answerer check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0078

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0087: a year-old record whose capability text differs from today's raises no QFAI-TRIAGE-011`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0087: a year-old record whose capability text differs from today'\''s raises no QFAI-TRIAGE-011' --reporter=verbose`
- RED result: already satisfied: exit 0 on the first run (1 passed); after the change the case still passes because no check compares the record with the catalog or its date
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

### TDD-0082

- Closed: `exception` under DR-0298 on 2026-09-25. Per-row review waived.
- Layer: Integration
- Test file: `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`
- Selector: `TC-0004-0086 operation-non-create: a DELETE row carrying a reference names the Operation check`
- RED command (cwd `packages/qfai`): `NO_COLOR=1 node node_modules/vitest/vitest.mjs run tests/integration/validators/triageAuthorizationRef.test.ts --testNamePattern='TC-0004-0086 operation-non-create: a DELETE row carrying a reference names the Operation check' --reporter=verbose`
- RED result: exit 1; `AssertionError: expected [] to deeply equal [ { severity: 'error', …(2) } ]` (no QFAI-TRIAGE-011 was raised)
- GREEN result: exit 0; the selector passed (1 passed)
- Changed files: `packages/qfai/src/core/validators/triageAuthorizationRef.ts` (new: the five checks), `packages/qfai/src/core/validators/specPack.ts` (`validateTriageAuthorizationRefs` over every Triage table), `packages/qfai/src/cli/commands/validate.ts` (expected state for QFAI-TRIAGE-011), `packages/qfai/src/core/emittedRuleCodes.ts` (regenerated), `packages/qfai/tests/integration/validators/triageAuthorizationRef.test.ts`

## Test results summary

Recorded per row under `## Ledger rows advanced`.

## Exception items

None.

## Cross-spec obligations

Code-ownership entries from `/qfai-implement` (`references/cross-spec-ownership.md`).
No other spec's `done` row names a changed file in `Owning module` or `Test file`.
The reverse walk cannot be completed, so the package fallback matches every `done`
row of another spec whose `Test file` is a test module under `packages/qfai/`.
Each blocked row's selector, and its recorded proof where it has one, was re-run
read-only on a clean clone at `03762f3cf`, and `completion-reviewer` ruled every row
from those results. The head `9f96f2b70` differs from `03762f3cf` only in CI files
and `CHANGELOG.md`, so each ruling holds there.

`CR-20260925-0010` deleted the source row `TDD-0018`. The production edits it made
stay, so its entries stay under the retired id, which the tombstone in
`.qfai/specs/spec-0004/tdd/test-list.md` keeps unique.

### Files the source rows changed

- `TDD-0018`: `packages/qfai/src/cli/commands/validate.ts`, `packages/qfai/src/core/emittedRuleCodes.ts`, `packages/qfai/src/core/validators/index.ts`, `packages/qfai/src/core/validators/justificationCatalog.ts`, `packages/qfai/src/core/validators/reviewerJustification.ts`, `packages/qfai/src/core/validators/tddList.ts`, `packages/qfai/src/core/validators/worklogSurface.ts`, `packages/qfai/tests/core/findingCodeGrammar.test.ts`, `packages/qfai/tests/core/issueCodeUniqueness.test.ts`, `packages/qfai/tests/integration/cli/commands/validate.profileCoverageNotice.test.ts`, `packages/qfai/tests/integration/validators/justificationRejectEmpty.test.ts`, `packages/qfai/tests/validators/reviewerJustification.test.ts`, `packages/qfai/tests/validators/ruleCodeUniqueness.test.ts`, `packages/qfai/tsconfig.tests.json`

### Entries

| TDD-ID | Blocked spec | Blocked TDD-IDs | File | Change required | Obligation at risk | Resolution |
| ------ | ------------ | --------------- | ---- | --------------- | ------------------ | ---------- |
| TDD-0018 | spec-0002 | 2 rows: TDD-0001, TDD-0011 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0001, TDD-0011 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0002 | 1 row: TDD-0008 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes, but its case checks three file names in `SKILL.md` and does not observe TC-0002-0008 (no winner in discuss). The approved option 1 records that the product contradicts the TC and resets the row. See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260912-0003 |
| TDD-0018 | spec-0002 | 1 row: TDD-0012 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes, but the CR records that this wording test passes while contradicting the acceptance criterion on `prototyping.yaml` requiredness (TC-0002-0011). See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260912-0003 |
| TDD-0018 | spec-0002 | 2 rows: TDD-0009..0010 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Not `done` at `03762f3cf`: `CR-20260924-0003`, applied on main, reset the row, and its blocked table names it. A row that is not `done` certifies nothing the change can break. See `### Re-run results: spec-0002` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260924-0003 |
| TDD-0018 | spec-0003 | 42 rows: TDD-0001, TDD-0018..0021, TDD-0023..0027, TDD-0029..0031, TDD-0033..0044, TDD-0046..0047, TDD-0049..0053, TDD-0055, TDD-0058..0063, TDD-0092..0094 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0001, TDD-0018..0020, TDD-0027, TDD-0029..0031, TDD-0033..0044, TDD-0046..0047, TDD-0049..0053, TDD-0055, TDD-0058..0063, TDD-0092..0094 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-a` confirmed each holds. See `### Re-run results: spec-0003` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0003 | 3 rows: TDD-0045, TDD-0048, TDD-0054 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The recorded mutation still survives on the current test (`init.ts` `6465aa79`, test `6a14f8e6`), so the test cannot fail on the predicate the row proves. The CR names the row. See `### Re-run results: spec-0003` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0006 |
| TDD-0018 | spec-0003 | 6 rows: Withdrawn TDD-0094 (never merged), TDD-0095..0099 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Deleted with its test by `CR-20260925-0010` (its X2 disposition), so the row certifies nothing. See `### Re-run results: spec-0003` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0010 |
| TDD-0018 | spec-0006 | 23 rows: TDD-0012..0019, TDD-0021..0031, TDD-0033, TDD-0038..0040 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0029..0031, TDD-0033, TDD-0038..0040 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-a` confirmed each holds. See `### Re-run results: spec-0006` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0006 | 1 row: TDD-0020 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. The CR is still `open`. See `### Re-run results: spec-0006` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0007 |
| TDD-0018 | spec-0006 | 1 row: TDD-0032 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes (2/2), but mutants R20 to R29 of the recorded set have no record, so the full set cannot be replayed. The CR names the row. See `### Re-run results: spec-0006` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0016 |
| TDD-0018 | spec-0008 | 2 rows: TDD-0013..0014 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0013..0014 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0008` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0010 | 6 rows: TDD-0001, TDD-0005, TDD-0013..0015, TDD-0017 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0010` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0010 | 3 rows: TDD-0006..0008 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0010` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260912-0003 |
| TDD-0018 | spec-0010 | 1 row: TDD-0016 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes, but TC-0010-0012 expects pack finalization to write `currentId`. The case drives `qfai discussion use`, and no stage code writes the pointer. See `### Re-run results: spec-0010` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0013 |
| TDD-0018 | spec-0011 | 3 rows: TDD-0021..0023 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Deleted with its test by `CR-20260925-0010` (its X2 disposition), so the row certifies nothing. See `### Re-run results: spec-0011` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0010 |
| TDD-0018 | spec-0012 | 133 rows: TDD-0286, TDD-0293..0294, TDD-0336, TDD-0338..0339, TDD-0343, TDD-0345, TDD-0350, TDD-0355, TDD-0360..0361, TDD-0363..0364, TDD-0367..0369, TDD-0371..0383, TDD-0385..0388, TDD-0403..0408, TDD-0417..0419, TDD-0425..0427, TDD-0430..0435, TDD-0439..0442, TDD-0444..0452, TDD-0454, TDD-0458, TDD-0460..0462, TDD-0466..0471, TDD-0473..0474, TDD-0476, TDD-0479, TDD-0481..0485, TDD-0487..0488, TDD-0490..0495, TDD-0497, TDD-0501..0505, TDD-0509..0515, TDD-0518..0527, TDD-0561..0577 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0469, TDD-0471, TDD-0497, TDD-0514..0515, TDD-0561..0577 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-a` and `xspec-cr-b` confirmed each holds. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0012 | 3 rows: TDD-0496, TDD-0516..0517 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Not `done` at `03762f3cf`: `CR-20260923-0001`, applied on main, reset the row, and its blocked table names it. A row that is not `done` certifies nothing the change can break. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260923-0001 |
| TDD-0018 | spec-0012 | 25 rows: TDD-0337, TDD-0366, TDD-0389..0400, TDD-0415..0416, TDD-0421..0424, TDD-0428..0429, TDD-0437..0438, TDD-0443 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0001 |
| TDD-0018 | spec-0012 | 23 rows: TDD-0295, TDD-0340..0341, TDD-0344, TDD-0346, TDD-0348..0349, TDD-0351, TDD-0353..0354, TDD-0356..0359, TDD-0362, TDD-0365, TDD-0370, TDD-0453, TDD-0456..0457, TDD-0459, TDD-0465, TDD-0486 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0002 |
| TDD-0018 | spec-0012 | 1 row: TDD-0342 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0003 |
| TDD-0018 | spec-0012 | 1 row: TDD-0507 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0004 |
| TDD-0018 | spec-0012 | 4 rows: TDD-0489, TDD-0498..0500 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0005 |
| TDD-0018 | spec-0012 | 8 rows: TDD-0455, TDD-0463..0464, TDD-0472, TDD-0475, TDD-0480, TDD-0506, TDD-0508 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. The CR is still `open`. See `### Re-run results: spec-0012` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260925-0007 |
| TDD-0018 | spec-0013 | 2 rows: TDD-0110..0111 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0110..0111 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0013` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0013 | 12 rows: TDD-0019..0030 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Not `done` at `03762f3cf`: `CR-20260913-0009`, applied on main, reset the row, and its blocked table names it. A row that is not `done` certifies nothing the change can break. See `### Re-run results: spec-0013` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0009 |
| TDD-0018 | spec-0014 | 3 rows: TDD-0018..0019, TDD-0034 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0019 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0014 | 1 row: TDD-0033 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector selects no test at `03762f3cf` (zero-selected capture), so no current run can confirm the obligation. The CR's `## Blocked downstream items` table names the row. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0002 |
| TDD-0018 | spec-0014 | 1 row: TDD-0009 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes, but TC-0014-0009 expects a REVISE to block verify. The selected blocks assert stale-sidecar migration errors. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0005 |
| TDD-0018 | spec-0014 | 1 row: TDD-0035 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes, but TC-0014-0035 runs the command. The cases call `runPrototypingCertify` directly, bypassing `src/cli/main.ts`, which this change edited. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0005 |
| TDD-0018 | spec-0014 | 1 row: TDD-0036 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | The selector passes, but the cases bypass the command line as for TDD-0035, and the row aggregates the refusal and promotion boundaries the CR splits. See `### Re-run results: spec-0014` in `.qfai/evidence/atdd-spec-0004.md` | CR-20260913-0005 |
| TDD-0018 | spec-0015 | 21 rows: TDD-0011..0012, TDD-0017..0035 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0015` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0016 | 28 rows: TDD-0001..0028 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0016` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |
| TDD-0018 | spec-0017 | 6 rows: TDD-0016, TDD-0030, TDD-0033..0035, TDD-0070 | the paths listed for it under `### Files the source rows changed` | Remove `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` from the codes an empty `justification:` is rejected on, and from the `reviewer-gate-sdd` family list | Matched through the package fallback. At `03762f3cf` every selector passes. The recorded proof of TDD-0016, TDD-0030, TDD-0033..0035, TDD-0070 replays as recorded (`qa-gatekeeper` PASS). `xspec-cr-c` confirmed each holds. See `### Re-run results: spec-0017` in `.qfai/evidence/atdd-spec-0004.md` | re-reviewed |

- `spec-0015/TDD-0039` left the blocked set. `3a8462986` reverted its closure, and the
  row is `todo` at `03762f3cf`, so no re-run or review is owed for it.
- `TDD-0094` in the spec-0003 `re-reviewed` line is main's row. `Withdrawn TDD-0094
  (never merged)` is this change's row, which main's row replaced under that id.
- The spec-0002 `TDD-0009` and `TDD-0010` and spec-0013 `TDD-0019` … `TDD-0030` lines
  keep rows the earlier `TDD-0018` table named. Main reset them before the re-run.
- Seven rows whose selector passes take a CR: spec-0002 `TDD-0008` and `TDD-0012`,
  spec-0004 `TDD-0050`, spec-0010 `TDD-0016`, and spec-0014 `TDD-0009`, `TDD-0035` and
  `TDD-0036`. `xspec-cr-c` ruled that each pass does not show the obligation holds, for
  the reason in its line, and the CR records the same gap. No user has adjudicated these
  seven rulings.
- `CR-20260925-0007` is still `open`. Its eight spec-0012 rows and spec-0006 `TDD-0020`
  stay blocked until the user approves it.
- The per-spec results are under `## Cross-spec obligations` in
  `.qfai/evidence/atdd-spec-0004.md`, which holds the same rows for `TDD-0067` …
  `TDD-0069`.

## Commands executed

Recorded per row under `## Ledger rows advanced`.

## First full CI checkpoint

- Revision: b35f3efd5daa8a02a78e61a889dd7fc0721e3a9d
- Run: https://github.com/aganesy/QFAI/actions/runs/36026684599
- Result: PASS — build, lint, types, all nine package test slices, Node floor tests, and ci-pass succeeded.
- Rows closed: TDD-0018.
- Second full CI checkpoint: https://github.com/aganesy/QFAI/actions/runs/36048572836 passed at e605d324931e202ab520c5a87eff039898e72d58; TDD-0072 closed.

## Record defects

- `record:QFAI-TDDLIST-008`, `TDD-0072`, Round 1: the first sealed review pack recorded an audited evidence hash computed with fields after the `Prototype parity` review boundary. The canonical phase evidence and coverage slice hash to `270c018051fe0586faeb36abf3f6b2356f2ab88976e9f8b2b93bed5ff8132ad6`. Both reviewers independently re-attested PASS against that hash in new sealed packs, leaving the first pack intact. The record defect is closed.
