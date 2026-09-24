# 07 Decisions

3 items (IDs: DR-0011-0001, DR-0011-0003, DR-0011-0004). DR-0011-0002 is not
used: rows of `tdd/test-list.md` cite it and no record declares it, so minting it
would give those citations a meaning they never had.

## Decisions

### DR-0011-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: TC-0011-0001..0008 are carried by `packages/qfai/tests/integration/implementSkillSpec0011.test.ts`, which is the file the eight ledger rows name and which carries their annotations. Each case reads the shipped `qfai-implement` SKILL.md and holds the rule its test case states. None of them runs the skill, so the rows stay at `exception` rather than `done`.
- Correction: this rationale previously named `skillRoster.test.ts`, `completionContract.test.ts`, `evidenceContract.test.ts`, `parallelDispatch.test.ts` and `uixDetection.test.ts` as the coverage the exception rested on. Those files test the sub-agent roster, the completion and evidence contracts, the dispatch rules and the UI-bearing classification; none of them carries a `TC-0011-0001..0008` annotation, so the exception read as granted on coverage that was not there.

### DR-0011-0003: A defective unit-layer test is fixed with ledger status untouched

- Status: accepted
- Date: 2026-09-24
- Context: a bug report can trace to a broken test rather than broken code: a
  wrong selector, a flaky wait, a wrong fixture, or an assertion that contradicts
  the spec. The obligation the ledger row records has not changed, so no status
  transition fits. The rule comes from decision D14 of
  `discussion-20260923171450572`, which has no policy record, and the pack is not
  tracked. This entry is therefore the tracked record for the rows this skill
  owns. The acceptance-layer half is spec-0008's.
- Evidence: `discussion-20260923171450572#REQ-0048` and `#DUS-003`; CLI-WF
  `### Stage result` (the `testFix` field and the two refusals it names for a
  test fix); CLI-WFFILE `### Vocabulary` (the `test_fix` stage kind).
- Decision:
  - `/qfai-implement` serves a `test_fix` work order for a `Unit` or `Component`
    row, and for an `Integration` row whose `TC-Refs` name only `L1` or `L2` test
    cases.
  - The fix stands only while the test's expectation still points at the same
    AC or BR. It carries an independent review and a re-run.
  - The row's `Status`, `TC-Refs`, `Layer` and `Boundary` are not edited. The
    re-run is appended to the row's evidence section as a re-verify record, in a
    form the ledger validator already reads.
  - A fix that changes what the expectation means goes back to `/qfai-sdd` as a
    `needs_repair` finding.
- Rejected: any test edit allowed without a status change
  - DO NOT: accept a rewritten assertion as a test fix without checking that it
    still points at the same AC or BR. Temptation: the test was wrong, so any edit
    that makes it pass looks like the fix.
- Rejected: the re-run recorded in the run evidence only
  - DO NOT: leave a changed test file with no re-verify record in the ledger's
    evidence. Temptation: the run evidence already holds the re-run, but the row
    then reads as stale and the final validate fails.
- Consequences: a `test_fix` stage moves no row, so BR-0011-0002 is untouched.
  Whether the meaning changed is the independent review's call; the core never
  judges it.
- Related: spec-0008 (the acceptance-layer half); CLI-WF `### Stage result`;
  CLI-WFFILE `### Vocabulary`.

### DR-0011-0004: A regression on a `done` row is fixed in production code, and the row stays `done`

- Status: accepted
- Date: 2026-09-24
- Context: an existing, correct test on a `done` row can start failing because
  production code regressed. The row's obligation still holds and its test is
  right, so neither an appended row nor a test fix fits, and a `done` row never
  moves back (BR-0011-0002; DR-0297 rejects a defect-reopen transition). The rule
  comes from decision D18 of `discussion-20260923171450572`, which has no policy
  record, and the pack is not tracked, so this entry is its tracked record.
- Evidence: `discussion-20260923171450572#REQ-0045` and `#REQ-0046`; CLI-WF
  `## Ledger row-set check`; CLI-WFFILE `### Vocabulary` (the `regression_fix`
  stage kind).
- Decision:
  - `/qfai-implement` serves a `regression_fix` work order by changing production
    code only, against the existing row.
  - The row's cells are not edited, and its `Status` stays `done`. No Change
    Request is filed and no evidence is deleted.
  - The same test turning GREEN again, plus the run's final verify, confirms the
    fix. The fix, an independent review and the re-run are recorded in the stage
    result and the run evidence.
  - The re-run is also appended to the row's evidence section as a re-verify
    record, in a form the ledger validator already reads.
- Rejected: append a regression row through `/qfai-sdd`
  - DO NOT: seed a new row for an obligation an existing row already holds.
    Temptation: a new row runs RED to GREEN, which looks like stronger evidence.
- Rejected: a Change Request for the regression
  - DO NOT: file a Change Request when nothing upstream changed. Temptation: it is
    how the shipped rules handle a regression found at a checkpoint.
- Rejected: the re-run recorded in the run evidence only
  - DO NOT: leave the row without a re-verify record. Temptation: the run evidence
    already holds the re-run. Where the project's `paths.srcDir` covers the fixed
    code, the changed code leaves the row stale and the final validate fails.
- Consequences: BR-0011-0002 and its forward-only lifecycle stand unchanged.
- Related: CLI-WF `## Ledger row-set check`; `_policies/08_Decisions.md` DR-0297.
