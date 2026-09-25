# Evidence: /qfai-sdd (spec-0004)

This file holds one section set per `/qfai-sdd` run. The current run comes
first; earlier runs follow under `## Prior run`, unchanged.

## Objective

- Spec target: spec-0004
- Objective: apply `CR-20260923-0015` in mode `re-derive`. AC-0004-0041,
  BR-0004-0035, EX-0004-0044 and TC-0004-0076 state that a `blocked` row passes
  on a well-formed `Blocked-By`, naming what it waits on and the status it was
  blocked at, as `TDDLIST_BLOCKED_MISSING_REF` checks.

## Inputs reviewed

- `.qfai/decisions/CR-20260923-0015-spec-0004-passes-a-blocked-row-the-kept-check-fails.md`
- `discussion-20260923060900824` (REQ-0004), read as reference input
- `.qfai/specs/spec-0004/03..07`, `09_delta.md`, `10_Plan.md`, `tdd/test-list.md`
- `packages/qfai/src/core/validators/tddList.ts` (`BLOCKED_BY_DEPARTURE_RE`,
  `BLOCKED_DEPARTURE_STATUSES`, `parseBlockedBy`)
- `.qfai/assistant/skills/qfai-implement/references/obligation-columns.md`
  (`Blocked-By`)

## Preflight summary path

- Preflight run id `run-20260924050752306`: ready, 17 imported requirements,
  no pack gaps. No Triage row was added: the Change Request is the approval.

## Triage decisions

- none. A Change Request rerun records in `## Change Requests`, not in a
  Triage row.

## Open questions

- none

## Decisions made

- DR-0004-0043 / DL-0029: a `blocked` row passes on a well-formed
  `Blocked-By` — the check the spec keeps, stated as it is (CR-20260923-0015).

## Work performed

- `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`: AC-0004-0041's passing row
  has a well-formed `Blocked-By` instead of a filled one.
- `.qfai/specs/spec-0004/04_Business-Rules.md`: BR-0004-0035 requires a
  well-formed `Blocked-By` and names the five departure statuses.
- `.qfai/specs/spec-0004/05_Examples.md`: EX-0004-0044's first and third
  clauses use `spec-0004:TDD-0001 — blocked at todo`.
- `.qfai/specs/spec-0004/06_Test-Cases.md`: TC-0004-0076's first tree uses that
  value, and its third tree reuses the first row.
- `.qfai/specs/spec-0004/07_Decisions.md`: DR-0004-0043.
- `.qfai/specs/spec-0004/09_delta.md`: DELTA-0002 in `## Change Summary`,
  DL-0029, and a new `## Change Requests` table holding the CR.
- Phase 2b, read only: TDD-0069, TDD-0070 and TDD-0071 keep their boundaries
  and stay at `todo`. Only the fixture value behind TDD-0069 and TDD-0071
  changes, and TDD-0070's empty cell does not. No row is reset, retired or
  added, so `tdd/test-list.md` is unchanged.
- Phase 3 not entered: `10_Plan.md` says "a named `Blocked-By` passes", which
  the restated value satisfies.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- BR-0004-0035 keeps `Contract-Refs: CLI-VAL`. Its attributes resolve as
  before: `Status` value `blocked` and the `Blocked-By` column of the shipped
  `tdd/test-list.md` template, joined to `TDDLIST_BLOCKED_MISSING_REF`
  (DR-0004-0034). The five departure statuses the rule now names are
  `BLOCKED_DEPARTURE_STATUSES` in `tddList.ts`. No contract is written.

## Commands executed

```sh
node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error
npx prettier --write .qfai/specs/spec-0004/03_Acceptance-Criteria.md .qfai/specs/spec-0004/04_Business-Rules.md .qfai/specs/spec-0004/05_Examples.md .qfai/specs/spec-0004/06_Test-Cases.md .qfai/specs/spec-0004/07_Decisions.md .qfai/specs/spec-0004/09_delta.md
npx markdownlint-cli2 .qfai/specs/spec-0004/0[3-9]_*.md
node scripts/check-mdschema.mjs
node scripts/check-doc-clarity.mjs
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0004 --format text
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --format text
```

## Validate evidence paths

- Validate run id `run-20260924051018770`, scope `sdd, spec-0004`, after the
  Phase 2 and Phase 4 writes: pass, 0 errors, 43 warnings, 4 info. No finding
  names a changed item. The two on `06_Test-Cases.md` report the `validators`
  and `ssot-guard` Levels of other cases.
- Validate run id `run-20260924051021145`, scope `sdd`, whole repository:
  15 errors, all pinned and pre-existing — 12 `QFAI-TDDLIST-017` and 3
  `QFAI-ID-002`, none in spec-0004. 75 warnings, 4 info.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at             | Frontier                            | Evidence |
| ----- | ------- | -------- | -------------------- | ----------------------------------- | -------- |
| 2     | skipped | -        | 2026-09-23T20:05:55Z | empty: answered by CR-20260923-0015 | -        |
| 2c.1  | skipped | -        | -                    | empty: answered by DR-0004-0034     | -        |

- Batch record: none

## Work Orders Summary

| Step | Role (sub-agent)     | Agent instance         | Task title                                                                | Input (refs)                                                                              | Output (refs)                                                                                    | Status (PASS/REVISE/PENDING) |
| ---- | -------------------- | ---------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1    | requirements-analyst | cr-0004-author         | Change Request for the `Blocked-By` defect                                | `/qfai-atdd` run key `2026-09-23T19:33:24.738Z`; EX-0004-0044; BR-0004-0035; `tddList.ts` | `CR-20260923-0015`, Class `defect`, approved by yusuke_senaga                                    | PASS                         |
| 2    | requirements-analyst | cr-0004-author         | Phase 2 re-derive: AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076 | `CR-20260923-0015` `## Proposed change`                                                   | Files under Work performed; DR-0004-0043; validate sdd `--spec spec-0004`: 0 errors              | PASS                         |
| 3    | requirements-analyst | cr-0004-author         | Phase 2b and 2c read only; Phase 4 delta                                  | `tdd/test-list.md` TDD-0069..TDD-0071; DR-0004-0034                                       | No ledger write; DELTA-0002, DL-0029, `## Change Requests` row; CR `Resolution` and `Applied at` | PASS                         |
| 4    | completion-reviewer  | gate-cr0004-completion | Reviewer Gate for this rerun                                              | this section, `CR-20260923-0015`, `.qfai/specs/spec-0004/**`                              | `review-20260923201700600` R01: PASS, advisories A1-A3 only; `summary.json` overall PASS         | PASS                         |

## Gaps / Open risks

- The upstream requirement `discussion-20260923060900824#REQ-0004` says "a
  non-empty `Blocked-By`" in its acceptance sentence. The same requirement keeps
  `TDDLIST_BLOCKED_MISSING_REF` unchanged, which the restated items follow. The
  discussion pack is reference input and is not edited.
- The approved Triage row for REQ-0004 in `09_delta.md` keeps its wording, as
  approved rows do. DL-0029 records the correction.
- Reviewer Gate advisories (`review-20260923201700600` R01), none needing
  rework: in the CR, `Raised at` equals `Approved at` (A1), and `Applied at`
  precedes the last write to `04_Business-Rules.md` (A2). `10_Plan.md` and the
  approved Triage row keep the looser wording (A3).

## Final status

- Final status: PASS
- Rationale: completion-reviewer returned PASS (`review-20260923201700600`).
  The spec gate has 0 errors, and the whole repository has only the 15 pinned
  errors.

## Prior run (2026-09-23)

### Objective

- Spec target: spec-0004
- Objective: `qfai validate` stops reading the project-root work-log surface
  `.qfai/steering/`. The reviewer justification rule keeps
  `R-REJECTED-READOPT` only, and a `blocked` ledger row needs nothing beyond
  its `Blocked-By`.

### Inputs reviewed

- `discussion-20260923060900824` (REQ-0002, REQ-0003, REQ-0004, REQ-0006,
  REQ-0009, REQ-0010), read as reference input
- `.qfai/evidence/sdd-batch-20260923170018664.md` (Stage 1 digest, Phase 0 and
  Phase 1 records)
- `.qfai/specs/spec-0004/09_delta.md` `## Triage (2026-09-23)`
- `.qfai/specs/_policies/08_Decisions.md` DR-0296
- `.qfai/contracts/cli/qfai-validate.md` (CLI-VAL)
- `.qfai/specs/spec-0004/01..08`, `tdd/test-list.md`

### Preflight summary path

- Preflight run id `run-20260923170018664`: ready, 17 imported requirements,
  no blockers. Stage 1 Triage was taken against this run.
- Preflight run id `run-20260923172043151`, the latest: ready, 17 imported
  requirements, no pack gaps. Its summary differs from the earlier run's only
  in the run id.

### Triage decisions

| Source                                | Subject                                                                 | Operation | Sub-op | Approved By   | Rationale                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0002 | Remove schema, link, promotion and stale validation                     | UPDATE    | REMOVE | yusuke_senaga | The behaviour is removed; ten ledger rows and two E2E rows retired              |
| discussion-20260923060900824#REQ-0009 | Remove the handoff-brief check                                          | UPDATE    | REMOVE | yusuke_senaga | The brief goes with no replacement; TDD-0019 retired                            |
| discussion-20260923060900824#REQ-0003 | Narrow the justification rule to `R-REJECTED-READOPT`                   | UPDATE    | MODIFY | yusuke_senaga | TC-0004-0018 proves the kept half; TDD-0018 and TDD-0060 stay                   |
| discussion-20260923060900824#REQ-0003 | Reword the `R-WORKLOG-DRIFT` precedent in US-0004-0036 and BR-0004-0028 | UPDATE    | MODIFY | yusuke_senaga | Wording only                                                                    |
| discussion-20260923060900824#REQ-0002 | Re-parent AC-0004-0026 and EX-0004-0026                                 | UPDATE    | MODIFY | yusuke_senaga | The agent-catalog guard is not work-log behaviour                               |
| discussion-20260923060900824#REQ-0010 | Append AC-0004-0040, BR-0004-0034, EX-0004-0042, TC-0004-0074           | UPDATE    | APPEND | yusuke_senaga | Carries the absence signals of REQ-0002 and REQ-0010                            |
| discussion-20260923060900824#REQ-0006 | Append EX-0004-0043 and TC-0004-0075                                    | UPDATE    | APPEND | yusuke_senaga | The validate half of REQ-0006's acceptance                                      |
| discussion-20260923060900824#REQ-0004 | Append AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076           | UPDATE    | APPEND | yusuke_senaga | No item specifies `QFAI-TDDLIST-015` or `-016`; the row traces the code removal |

### Open questions

- none. This cycle opened no question. OQ-0168 and OQ-0169 stay `open` and are
  unrelated to it.

### Decisions made

- DR-0004-0015 / DL-0001: removed items are deleted with no marker — the
  approved Triage row is the record.
- DR-0004-0016 / DL-0002: one tombstone per retired TDD-ID, citing the Triage
  `Source` — keeps the allocation maximum.
- DR-0004-0017 / DL-0003: retired rows, their Evidence and their tests' fate are
  listed under `## Triage (2026-09-23)` — approved rows stay untouched.
- DR-0004-0018 / DL-0004: TDD-0018 reset to `todo` under DR-0296 — its evidence
  proves the reversed oracle.
- DR-0004-0019 / DL-0005: TC-0004-0018 splits into `worklog-drift-ignored`
  (TDD-0018) and `rejected-readopt-empty` (TDD-0072) — TDD-0018's test drives
  `R-WORKLOG-DRIFT`.
- DR-0004-0020 / DL-0006: Level `integration`, Layer `integration` — the pack's
  existing spelling.
- DR-0004-0021 / DL-0007: TDD-0072 Layer `validators` — one case, one group.
- DR-0004-0022 / DL-0008: Tier not re-derived on unchanged rows — avoids resets
  no Change Request drives.
- DR-0004-0023 / DL-0009: AC-0004-0040 under US-0004-0020, AC-0004-0041 under
  US-0004-0001 — no new story or E2E row.
- DR-0004-0024 / DL-0010: the unshipped-schema case is a second clause of
  AC-0004-0040 and BR-0004-0034 — as the Triage row places it.
- DR-0004-0025 / DL-0011: upstream requirements named as pack pairs with no
  local ID, `- Source:` on each new criterion — this spec's REQ-0010 is taken.
- DR-0004-0026 / DL-0012: changed lines in English — repository language.
- DR-0004-0027 / DL-0013: justification rule narrowed to `R-REJECTED-READOPT`
  — the approved MODIFY rows.
- DR-0004-0028 / DL-0014: every appended item kept — each answers an acceptance
  signal.
- DR-0004-0029 / DL-0015: the Tier limit stated in one ledger bullet — a limit
  must be readable as one.
- DR-0004-0030 / DL-0016: the contract's broader justification sentence stays
  — narrowing it is the user's decision. Superseded by DR-0004-0038.
- DR-0004-0031 / DL-0017: BR-0004-0034 binds CLI-VAL — the rule is about what
  `qfai validate` reads.
- DR-0004-0032 / DL-0018: the justification rule resolves to the set
  `reviewerJustification.ts` enforces — the contract sentence stays, and
  BR-0015-0013 relies on it. Superseded by DR-0004-0039.
- DR-0004-0033 / DL-0019: `QFAI-ASSETS-006` resolves through the existing
  validate surface — the code is not new.
- DR-0004-0034 / DL-0020: BR-0004-0035 binds CLI-VAL, and BR-0004-0017's join
  is recorded in this file only — the rule this run added names its contract.
- DR-0004-0035 / DL-0021: BR-0004-0028 and AC-0004-0026 are reconciled with no
  write.
- DR-0004-0036 / DL-0022: the plan states the order of the whole removal once
  — this spec's validators are what make the order matter.
- DR-0004-0037 / DL-0023: the removal's tests build their own trees — no third
  identical caller for a shared fixture.
- DR-0004-0038 / DL-0024, `[RE-OPEN]` of DR-0004-0030: the contract's
  justification sentence is narrowed to the codes that require a justification
  — approved by the user through AskUserQuestion on 2026-09-23, during the
  Reviewer Gate fix.
- DR-0004-0039 / DL-0025, `[RE-OPEN]` of DR-0004-0032: BR-0004-0017 and
  AC-0004-0018 resolve to the narrowed sentence with no join — the catalog codes
  stay in it, so BR-0015-0013 keeps its contract line.
- DR-0004-0040 / DL-0026: TC-0004-0018 takes Level `unit`, and TDD-0018 and
  TDD-0072 take Layer `unit` in place — the falsifying oracle is the returned
  justification issue, which is L1. Supersedes DR-0004-0021.
- DR-0004-0041 / DL-0027: TDD-0072 runs after TDD-0018 and cites it as
  `Satisfied-by` — on a `unit` row a `done` sibling is the only lawful form.
- DR-0004-0042 / DL-0028: TDD-0067..TDD-0071 stay as seeded — each observes
  one boundary.
- DR-0004-0038..DR-0004-0042 were taken in the Reviewer Gate fix, without a
  pre-draft grilling round: that round is keyed on a phase's first write, and
  a fix to a written artifact goes back through the reviewer. Cycle 2
  adjudicated each of them and found none critical (A2-DEC).
- Deviation from the approved Triage row: the row asks US-0004-0036 to cite
  BR-0004-0017, but a story may not cite a business rule
  (`TRACE_DOWNSTREAM_REF`, error). US-0004-0036 cites REQ-0036 instead, and
  BR-0004-0028 cites BR-0004-0017 as the row asks. Cycle 1 asked for it to be
  recorded as a deviation (A-0004-US); cycle 2 raised no finding against it.
- Recorded in this file only, because neither fixes anything in the spec pack:
  P3-D1 (the usage-reference check counts only what this change adds) and
  P3-D4 (new plan text goes in subsections inside the template's sections, in
  English). P3-D9 (earlier plan sections stay as they are) is a rejected option
  of DL-0022.

### Work performed

- `.qfai/specs/spec-0004/01_Spec.md`: removed REQ-0035, REQ-0037, REQ-0038,
  REQ-0039, REQ-0042; rewrote REQ-0036; added four
  `discussion-20260923060900824#REQ-*` lines; entry-point ranges to AC 0041,
  BR 0035, EX 0044, TC 0076.
- `.qfai/specs/spec-0004/02_User-stories.md`: removed US-0004-0029 and
  US-0004-0031; narrowed US-0004-0030; US-0004-0036 now cites REQ-0036.
- `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`: removed nine criteria;
  narrowed AC-0004-0018; re-parented AC-0004-0026; appended AC-0004-0040 and
  AC-0004-0041.
- `.qfai/specs/spec-0004/04_Business-Rules.md`: removed five rules; rewrote
  BR-0004-0017; BR-0004-0001 lists AC-0004-0026; BR-0004-0028's last bullet;
  appended BR-0004-0034 and BR-0004-0035.
- `.qfai/specs/spec-0004/05_Examples.md`: removed ten examples; rewrote
  EX-0004-0016; re-parented EX-0004-0026; appended EX-0004-0042..0044.
- `.qfai/specs/spec-0004/06_Test-Cases.md`: removed ten cases; rewrote
  TC-0004-0018; appended TC-0004-0074..0076.
- `.qfai/specs/spec-0004/07_Decisions.md`: DR-0004-0015..DR-0004-0031.
- `.qfai/specs/spec-0004/09_delta.md`: retired-row record, test fates, reset
  and added rows, Tier bullet, `## Decision Log` DL-0001..DL-0017.
- `.qfai/specs/spec-0004/tdd/test-list.md` (Phase 2b): 66 rows before, 60
  after. Deleted TDD-0016, -0017, -0019, -0020, -0021, -0027..-0031, -0059,
  -0061 and tombstoned them under `## TDD-ID reservations`; reset TDD-0018;
  added TDD-0067..TDD-0072.
- Phase 2c: `04_Business-Rules.md` BR-0004-0035 gains
  `Contract-Refs: CLI-VAL`, the phase's only write to an obligation.
  `07_Decisions.md` DR-0004-0032..0035, `09_delta.md` DL-0018..0021. No
  contract changed.
- Phase 3: `10_Plan.md` gains "Removing the work-log surface" under
  `## Implementation approach`, which states the order of the whole change
  once; "Tests for the work-log removal" under `## Test approach`; and four
  risk rows. `07_Decisions.md` DR-0004-0036 and DR-0004-0037, `09_delta.md`
  DL-0022 and DL-0023.
- Critical Constraint 10: no finding. The new plan text introduces no
  architectural element. It names code the change deletes, and the existing
  asset-provenance check the change relies on, so no usage reference is owed.
  The earlier sections were finalized by the runs that introduced them and were
  not re-audited (P3-D1).
- Phase 4: `09_delta.md` gains a `## Change Summary` with entry DELTA-0001,
  since the file had none, and a `## Update History` row for each of DL-0001 to
  DL-0023. The Triage rows and the dated history stay as written. No
  `## Change Requests` row: the approved Triage set is the change record
  (P1-D5). Phase 4 settles no design decision, so no grilling row.
- Reviewer Gate fix, cycle 1: `.qfai/contracts/cli/qfai-validate.md`
  `## Reviewer-Gate input bundle` narrows the justification requirement and
  its rejection to `R-REJECTED-READOPT`, the other codes the contract declares
  with a required justification, and the justification catalog codes. The user
  chose this through AskUserQuestion on 2026-09-23. `07_Decisions.md` gains
  DR-0004-0038 and DR-0004-0039, which mark DR-0004-0030 and DR-0004-0032
  superseded; `09_delta.md` gains DL-0024, DL-0025 and a `## Rejected`
  section carrying their `Re-opened by:` lines. `10_Plan.md` drops "a narrower
  justification sentence" from what the change leaves out, names both
  `joinProjectSteering` assertions in step 4, and states under the step list
  who clears `QFAI-ATDD-101`, `-102` and `-112` before step 7.
- Test-design review fix, cycle 1 (`test-design-analyst`, `tda-reviewfix`):
  TC-0004-0018 takes Level `unit`, and TDD-0018 and TDD-0072 take Layer
  `unit`, derived from the falsifying oracle (DR-0004-0040, DL-0026, which
  supersede DR-0004-0021 and DL-0007). `10_Plan.md` step 1 now says TDD-0072
  runs after TDD-0018 and cites it as `Satisfied-by` (DR-0004-0041,
  DL-0027). TDD-0067..TDD-0071 were reviewed and need no change
  (DR-0004-0042, DL-0028). Ledger: 60 rows before and after.

### Contract executability

- none

#### Obligation reconciliation (Phase 2c)

- BR-0004-0017 and AC-0004-0018: CLI-VAL, directly. `qfai-validate.md:45`
  and `:50` require a justification, and reject a report that lacks one, only
  for `R-REJECTED-READOPT`, the other codes the contract declares with one, and
  the justification catalog codes; any other code raises no justification
  error. `R-WORKLOG-DRIFT` is none of those, so a report carrying it raises no
  justification finding. The attribute is the finding's `justification:` field
  (`qfai-validate.md:45-48`). The contract sentence was narrowed for this, with
  the user's approval (DR-0004-0038, DR-0004-0039). BR-0004-0017 gains no
  `Contract-Refs` line (DR-0004-0034).
- BR-0004-0034 and AC-0004-0040: CLI-VAL. The five work-log codes and
  `.qfai/steering/` are realized by absence: the contract's scope line and codes
  table no longer name them. `QFAI-ASSETS-006` is reached by a join. The
  contract keeps the existing validate surface unchanged, `assistantAssets.ts`
  emits the code for a governed file in the unshipped state, and the shipped
  set is `SHIPPED_GOVERNED_ASSISTANT_FILES` in `governedAssistantManifest.ts`.
  No contract write (DR-0004-0033).
- BR-0004-0035 and AC-0004-0041: CLI-VAL, now named in the rule's
  `Contract-Refs`. The join runs from the existing validate surface to
  `TDDLIST_BLOCKED_MISSING_REF` in `tddList.ts`, over the `Status` value
  `blocked` and the `Blocked-By` column of the shipped `tdd/test-list.md`
  template (DR-0004-0034).
- BR-0004-0028: CLI-VAL. Its three-part content resolves to the
  `R-PROMPT-SCANNER-DRIFT` row (`qfai-validate.md:127`), and its rejection to
  `:50` and `:130-132`. No write (DR-0004-0035).
- AC-0004-0026, under BR-0004-0001: realized by the agent-catalog guard in
  `tests/codex/agents.test.ts`, with no contract. The attribute is the
  `developer_instructions` field of `agent-catalog.yml`, compared with the
  canonical agent body. No write (DR-0004-0035).
- API-row delta: vacuous. `_policies/05_Contracts.md` lists no API or DB
  contract, and nothing under `.qfai/contracts/` declares a `CON-API-*` or
  `CON-DB-*`. This phase wrote no contract, so its scope did not re-expand.

### Commands executed

```sh
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0004
node packages/qfai/dist/cli/index.mjs validate --profile tdd --fail-on error --spec spec-0004
node scripts/check-mdschema.mjs
npx prettier --write .qfai/specs/spec-0004/0[1-9]_*.md .qfai/specs/spec-0004/tdd/test-list.md
npx markdownlint-cli2 .qfai/specs/spec-0004/*.md .qfai/specs/spec-0004/tdd/*.md
npx prettier --write .qfai/specs/spec-0004/04_Business-Rules.md .qfai/specs/spec-0004/07_Decisions.md .qfai/specs/spec-0004/09_delta.md .qfai/specs/spec-0004/10_Plan.md
npx markdownlint-cli2 .qfai/specs/spec-0004/04_Business-Rules.md .qfai/specs/spec-0004/07_Decisions.md .qfai/specs/spec-0004/09_delta.md .qfai/specs/spec-0004/10_Plan.md
node scripts/check-doc-clarity.mjs
npx prettier --write .qfai/specs/spec-0004/09_delta.md
npx markdownlint-cli2 .qfai/specs/spec-0004/*.md .qfai/specs/spec-0004/tdd/*.md
node scripts/check-mdschema.mjs --scope all
node scripts/check-mermaid.mjs
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0004 --format text
```

### Validate evidence paths

- Validate run id `run-20260923182833014`, scope `sdd, spec-0004`, before the
  Phase 2 writes: pass, 0 errors, 54 warnings.
- Validate run id `run-20260923184059589`, scope `sdd, spec-0004`, after
  Phase 2 and 2b: pass, 0 errors, 45 warnings. The nine fewer warnings are
  `TDDLIST_UNKNOWN_LAYER` on the ten retired `validators` rows, less one for
  TDD-0072.
- Validate run id `run-20260923183836137`, scope `tdd, spec-0004`: fail,
  95 errors, 55 warnings. The errors this change owns are `QFAI-ATDD-101`,
  `QFAI-ATDD-102` and `QFAI-ATDD-112`: annotations still name the removed items
  until `/qfai-implement` makes the edits `09_delta.md` lists, and
  TC-0004-0074..0076 have no test until `/qfai-atdd` writes them. The rest
  (`QFAI-TDDLIST-007`, `-011`, `QFAI-TEST-003`, `TDDLIST_SELECTOR_UNRESOLVED`)
  are on rows and tests this change does not touch.
- Validate run id `run-20260923191414361`, scope `sdd, spec-0004`, after
  Phase 2c and Phase 3: pass, 0 errors, 45 warnings, 4 info. The findings are
  the same as after Phase 2 and 2b.
- Validate run id `run-20260923193800560`, scope `sdd, spec-0004`, after Phase 4: pass,
  0 errors, 45 warnings, 4 info. No finding is new. The whole-repository run is
  in the batch record.
- Final run `run-20260923214113936`, scope `sdd`, whole repository,
  after the Reviewer Gate closed: 15 errors repository-wide, all pinned and
  pre-existing. This spec's files carry 0 errors and 18 warnings. Details in the batch record.

### Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                | Evidence             |
| ----- | ------- | -------------------- | -------------------- | ----------------------- | -------------------- |
| 2     | run     | 2026-09-23T09:24:22Z | 2026-09-23T09:28:46Z | 17 settled, 0 escalated | #work-orders-summary |
| 2c.1  | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:08:30Z | 4 settled, 0 escalated  | #work-orders-summary |
| 3     | run     | 2026-09-23T10:05:29Z | 2026-09-23T10:10:19Z | 7 settled, 0 escalated  | #work-orders-summary |

- Batch record: `.qfai/evidence/sdd-batch-20260923170018664.md`

### Work Orders Summary

| Step | Role (sub-agent)      | Agent instance       | Task title                                                                                                                                                          | Input (refs)                                                                                                            | Output (refs)                                                                                                                                                                                                                                                                                                                                                                             | Status (PASS/REVISE/PENDING) |
| ---- | --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-reviewer | p2-griller           | grilling(2/agents): delete removed items with no in-file marker                                                                                                     | S4-D1                                                                                                                   | `sdd-triage.md` defines delete and the Triage row is the record; a gap note is work history; a kept heading trips the orphan and trace checks; author agreed                                                                                                                                                                                                                              | PASS                         |
| 2    | requirements-reviewer | p2-griller           | grilling(2/agents): twelve tombstones, one ID per bullet; TDD-0019 cites `#REQ-0009`, the rest `#REQ-0002`                                                          | S4-D2                                                                                                                   | The allocation rule reads one ID per tombstone and the removal path is a Triage row, not a CR; author agreed                                                                                                                                                                                                                                                                              | PASS                         |
| 3    | requirements-reviewer | p2-griller           | grilling(2/agents): retired-row list under `## Triage (2026-09-23)`, naming the rewrite owed on `reviewerJustification.test.ts:47`                                  | S4-D3                                                                                                                   | Approved rows stay untouched; the list carries the `spec-0004/TDD-NNNN` name, the Evidence cell and each test's fate; griller added the TDD-0018 test rewrite; author agreed with the list                                                                                                                                                                                                | PASS                         |
| 4    | requirements-reviewer | p2-griller           | grilling(2/agents): reset TDD-0018 to todo under DR-0296, prior evidence kept                                                                                       | S4-D4                                                                                                                   | Its done evidence proves the reversed oracle, and an upstream reset is the only lawful exit from done; author agreed                                                                                                                                                                                                                                                                      | PASS                         |
| 5    | requirements-reviewer | p2-griller           | grilling(2/agents): TDD-0018 takes Boundary `worklog-drift-ignored`; new TDD-0072 takes `rejected-readopt-empty`                                                    | S4-D5                                                                                                                   | TDD-0018's test already drives `R-WORKLOG-DRIFT`; disagreeing position: requirements-analyst (TDD-0018 `rejected-readopt-empty`, TDD-0072 `worklog-drift-ignored`)                                                                                                                                                                                                                        | PASS                         |
| 6    | requirements-reviewer | p2-griller           | grilling(2/agents): new cases Level `integration`; TDD-0067..0071 Layer lowercase `integration`                                                                     | S4-D6                                                                                                                   | Matches the pack's TC-0004-0055..0073 and TDD-0032..0053; disagreeing position: requirements-analyst (Layer `Integration`)                                                                                                                                                                                                                                                                | PASS                         |
| 7    | requirements-reviewer | p2-griller           | grilling(2/agents): TDD-0072 Layer `validators`                                                                                                                     | S4-D7                                                                                                                   | Rows of one case stay in one group; moving TDD-0018 would need a CR; author agreed                                                                                                                                                                                                                                                                                                        | PASS                         |
| 8    | requirements-reviewer | p2-griller           | grilling(2/agents): do not re-derive Tier on unchanged rows                                                                                                         | S4-D8                                                                                                                   | A raised Tier on a done row is an upstream reset no CR drives; author agreed                                                                                                                                                                                                                                                                                                              | PASS                         |
| 9    | requirements-reviewer | p2-griller           | grilling(2/agents): AC-0004-0040 under US-0004-0020, AC-0004-0041 under US-0004-0001                                                                                | S4-D9                                                                                                                   | A new story would add an E2E row the Triage does not list; author agreed                                                                                                                                                                                                                                                                                                                  | PASS                         |
| 10   | requirements-reviewer | p2-griller           | grilling(2/agents): the unshipped-schema finding is a second clause of AC-0004-0040 and BR-0004-0034                                                                | S4-D10                                                                                                                  | The Triage row places TC-0004-0075 there; author agreed                                                                                                                                                                                                                                                                                                                                   | PASS                         |
| 11   | requirements-reviewer | p2-griller           | grilling(2/agents): `## Relevant Requirements` lines for `#REQ-0002`, `-0004`, `-0006`, `-0010`, no local ID; `- Source:` on each new AC                            | S4-D11, Shared convention                                                                                               | Each target names every upstream requirement it answers; spec-0004's REQ-0010 is taken; disagreeing position: requirements-analyst (no Relevant Requirements line, `- Source:` only)                                                                                                                                                                                                      | PASS                         |
| 12   | requirements-reviewer | p2-griller           | grilling(2/agents): changed text in English; REQ-0036 and BR-0004-0017 whole, BR-0004-0028 its last bullet                                                          | S4-D12                                                                                                                  | Repository language rule; untouched text stays; author agreed                                                                                                                                                                                                                                                                                                                             | PASS                         |
| 13   | requirements-reviewer | p2-griller           | grilling(2/agents): narrowing texts; BR-0004-0017 ends "`R-WORKLOG-DRIFT` is no longer a Reviewer-Gate code; a report carrying it raises no justification finding." | S4-D13                                                                                                                  | The author's texts, except the last BR sentence, which read as if the code were still live; disagreeing position: requirements-analyst ("`R-WORKLOG-DRIFT` is not checked by this rule")                                                                                                                                                                                                  | PASS                         |
| 14   | requirements-reviewer | p2-griller           | grilling(2/agents): keep every appended item, with the S4-D5 pairing and S4-D6 spelling                                                                             | APPEND texts                                                                                                            | Each answers an acceptance signal of REQ-0002, REQ-0004, REQ-0006 or REQ-0010; author agreed                                                                                                                                                                                                                                                                                              | PASS                         |
| 15   | requirements-reviewer | p2-griller           | grilling(2/agents): seed Tier only on new and reset rows, and state the limit and why in one `09_delta.md` ledger bullet                                            | X-D6                                                                                                                    | No CR drives the other rows, and re-deriving would reset untouched done rows; griller's new decision                                                                                                                                                                                                                                                                                      | PASS                         |
| 16   | requirements-reviewer | p2-griller           | grilling(2/agents): leave the broader justification sentence in `qfai-validate.md`; BR-0004-0017 states the narrow rule                                             | N1                                                                                                                      | Narrowing the contract is outside the approved contract list, so it would be critical; griller's new decision                                                                                                                                                                                                                                                                             | PASS                         |
| 17   | requirements-reviewer | p2-griller           | grilling(2/agents): BR-0004-0034 `Contract-Refs: CLI-VAL`                                                                                                           | N3                                                                                                                      | The rule states what `qfai validate` reads; griller's new decision                                                                                                                                                                                                                                                                                                                        | PASS                         |
| 18   | requirements-analyst  | p2-author-0004       | Phase 2 and 2b draft: spec-0004 `01..09`, `tdd/test-list.md`                                                                                                        | settled decisions of steps 1-17                                                                                         | Files under Work performed; DR-0004-0015..0031, DL-0001..0017; ledger 66 → 60 rows; US-0004-0036 cites REQ-0036, not BR-0004-0017 (`TRACE_DOWNSTREAM_REF`); two annotation carriers added to the test fates; validate sdd 0 errors                                                                                                                                                        | PASS                         |
| 19   | solution-architect    | p2c3-author          | Phase 2c and Phase 3 open decisions                                                                                                                                 | Phase 2 texts of BR-0004-0017, -0028, -0034, -0035, AC-0004-0018, -0026, -0040, -0041; `10_Plan.md`; `qfai-validate.md` | P2C-D3..D5 and P3-D1..D9 with positions; no critical recommendation                                                                                                                                                                                                                                                                                                                       | PASS                         |
| 20   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): the justification rule resolves by a join to the set `qfai validate` enforces; no write                                                        | P2C-D3                                                                                                                  | Keeps the sentence DR-0004-0030 kept, which BR-0015-0013's rejection also relies on. Griller amended the join to name the enforced set exactly; disagreeing position: solution-architect (the set described as the codes a contract declares)                                                                                                                                             | PASS                         |
| 21   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): `QFAI-ASSETS-006` resolves through the existing validate surface; no contract row                                                              | P2C-D4                                                                                                                  | The code is not new, and a row in the table of new codes would misfile it; author agreed                                                                                                                                                                                                                                                                                                  | PASS                         |
| 22   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): `Contract-Refs: CLI-VAL` on BR-0004-0035 only; BR-0004-0017's join is recorded in the evidence                                                 | P2C-D5                                                                                                                  | The line goes on the rule this run added, as on BR-0004-0034; a reworded rule needs no new line for a recorded join; disagreeing position: solution-architect (the line on BR-0004-0017 as well)                                                                                                                                                                                          | PASS                         |
| 23   | architecture-reviewer | p2c3-griller         | grilling(2c/agents): reconcile BR-0004-0028 and AC-0004-0026, writing nothing                                                                                       | N2C-1                                                                                                                   | Both were changed by this run and were missing from the author's list; found by griller                                                                                                                                                                                                                                                                                                   | PASS                         |
| 24   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the usage-reference check counts only elements this change adds, which is none                                                                  | P3-D1                                                                                                                   | The template defines an element as one "this plan introduces" (`10_Plan.md:17-20`); author agreed                                                                                                                                                                                                                                                                                         | PASS                         |
| 25   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the order of the whole removal lives in this plan, and the other plans cite it                                                                  | P3-D2                                                                                                                   | This spec owns every validator that makes the order matter, and six copies drift; author agreed                                                                                                                                                                                                                                                                                           | PASS                         |
| 26   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the seven-step order, with only the head of the change required to be green                                                                     | P3-D3                                                                                                                   | Griller amended five points: TDD-0072 and TDD-0070 record RED under `red-not-observable.md`, with no skill named per test; the helpers, imports and comment sites only the removed code reaches; symbols, not line ranges; the spec-0006 pointers are already rewritten; a re-pin may only lower a count. Disagreeing position: solution-architect (line ranges, none of the five stated) | PASS                         |
| 27   | architecture-reviewer | p2c3-griller         | grilling(3/agents): new plan text goes in subsections inside the template's sections, in English                                                                    | P3-D4                                                                                                                   | Keeps clear of the plan heading checks by construction, and follows the repository language; author agreed                                                                                                                                                                                                                                                                                | PASS                         |
| 28   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the plan names the removed validator code, the tests for TC-0004-0018 and TC-0004-0074..0076, four risk rows and what the change leaves out     | P3-D6                                                                                                                   | Covers the two Check 8b blocks, the AST check on `R-REJECTED-READOPT`, the test and row coupling, and the dogfood ratchet; author agreed                                                                                                                                                                                                                                                  | PASS                         |
| 29   | architecture-reviewer | p2c3-griller         | grilling(3/agents): no shared fixture for a populated `.qfai/steering/` tree                                                                                        | P3-D8                                                                                                                   | The three trees differ, so there is no third identical caller; author agreed                                                                                                                                                                                                                                                                                                              | PASS                         |
| 30   | architecture-reviewer | p2c3-griller         | grilling(3/agents): the earlier plan sections stay as they are                                                                                                      | P3-D9                                                                                                                   | The request does not cover them; author agreed                                                                                                                                                                                                                                                                                                                                            | PASS                         |
| 31   | solution-architect    | p2c3-author          | Phase 2c and Phase 3 draft: spec-0004                                                                                                                               | settled steps 20-30                                                                                                     | BR-0004-0035 `Contract-Refs`, `07_Decisions.md` DR-0004-0032..0037, `09_delta.md` DL-0018..0023, `10_Plan.md`; Critical Constraint 10: no finding; validate sdd 0 errors                                                                                                                                                                                                                  | PASS                         |
| 32   | requirements-analyst  | p4-author            | Phase 4 delta update: spec-0004                                                                                                                                     | `09_delta.md` DL-0001..0023, `## Triage (2026-09-23)`                                                                   | `09_delta.md` `## Change Summary` DELTA-0001, `## Update History`; markdownlint 0 errors; validate sdd `--spec spec-0004`: 0 errors                                                                                                                                                                                                                                                       | PASS                         |
| 33   | test-design-analyst   | tda-reviewfix        | Test-design review fix, Reviewer Gate cycle 1 (F-B2)                                                                                                                | `.qfai/specs/spec-0004/03..06`, `tdd/test-list.md`, `09_delta.md`, `10_Plan.md`; cycle-1 R01 F-B3, R03 A1               | TC-0004-0018 Level `unit`; TDD-0018 and TDD-0072 Layer `unit`; `10_Plan.md` step 1 orders TDD-0072 after TDD-0018; DR-0004-0040..0042, DL-0026..0028; ledger 60 rows before and after                                                                                                                                                                                                     | PASS                         |
| 34   | completion-reviewer   | gate-c1-completion   | Reviewer Gate cycle 1                                                                                                                                               | this file, `.qfai/specs/spec-0004/**`, the batch record                                                                 | `review-20260923104053101` R01: REVISE — F-B1 delivery-planner Triage gate; F-B2 test-design-analyst; F-B3 illegal Layer on TDD-0072                                                                                                                                                                                                                                                      | REVISE                       |
| 35   | architecture-reviewer | gate-c1-architecture | Reviewer Gate cycle 1                                                                                                                                               | this file, `.qfai/specs/spec-0004/**`, the batch record                                                                 | `review-20260923104053101` R02: REVISE — DR-0296 wording; reconcile the CLI-VAL justification sentence with AC-0004-0018                                                                                                                                                                                                                                                                  | REVISE                       |
| 36   | qa-gatekeeper         | gate-c1-qa           | Reviewer Gate cycle 1                                                                                                                                               | this file, `.qfai/specs/spec-0004/**`, the batch record                                                                 | `review-20260923104053101` R03: PASS                                                                                                                                                                                                                                                                                                                                                      | PASS                         |
| 37   | completion-reviewer   | gate-c2-completion   | Reviewer Gate cycle 2                                                                                                                                               | this file, `.qfai/specs/spec-0004/**`, the batch record, the cycle-1 answered demands                                   | `review-20260923121814101` R01: PASS, advisories only                                                                                                                                                                                                                                                                                                                                     | PASS                         |
| 38   | architecture-reviewer | gate-c2-architecture | Reviewer Gate cycle 2                                                                                                                                               | this file, `.qfai/specs/spec-0004/**`, the batch record, the cycle-1 answered demands                                   | `review-20260923121814101` R02: PASS, advisories only                                                                                                                                                                                                                                                                                                                                     | PASS                         |
| 39   | qa-gatekeeper         | gate-c2-qa           | Reviewer Gate cycle 2                                                                                                                                               | this file, `.qfai/specs/spec-0004/**`, the batch record, the cycle-1 answered demands                                   | `review-20260923121814101` R03: PASS, advisories only; `summary.json` overall PASS                                                                                                                                                                                                                                                                                                        | PASS                         |

### Gaps / Open risks

- US-0004-0036 cites REQ-0036 rather than BR-0004-0017, a deviation from the
  approved Triage row recorded under `## Decisions made`.
- `/qfai-implement`: TDD-0072's `Satisfied-by` on TDD-0018 holds only if
  TDD-0018's GREEN is what edits `ADVISORY_FAILING_CODES` — dropping
  `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` and keeping
  `R-REJECTED-READOPT`. Then TDD-0072's mutation boundary sits in code that
  round wrote. Name the predicate (`ADVISORY_FAILING_CODES.has`) beside the row
  ID in the evidence (A2-SAT).
- TDD-0018's `Selector` still names the reversed-oracle test ("emits error when
  R-WORKLOG-DRIFT carries empty justification"), and `--profile tdd` reports
  `TDDLIST_STALE_STATUS` on it. `/qfai-implement` owes the rewrite: Phase Red
  on TDD-0018 takes RED on the rewritten test, and TDD-0072's falsifiability
  rests on that test.
- `tests/integration/qfai-traceability.md` still lists
  `QFAI:SPEC-0004:TC-0004-0018`. TC-0004-0018 is now a unit case, so no gate
  reads the line and it reads as integration coverage. Drop it in plan step 4,
  which already edits that file.
- The test fates in `09_delta.md` also name the annotation carriers
  `tests/integration/qfai-traceability.md` and
  `tests/e2e/qfai-traceability.md`, found by the tdd-profile run.
- Until `/qfai-implement` and `/qfai-atdd` run, `--profile tdd` and `full`
  report `QFAI-ATDD-101`, `-102` and `-112` for this spec, and
  `rowNamesItsTestFile.test.ts` fails. The pull request head has to be green.

### Final status

- Final status: PASS
- Rationale: every routed blocking reviewer returned PASS in cycle 2
  (`review-20260923121814101`), and only the 15 pinned pre-existing errors
  remain repository-wide.

---

## Prior run (2026-09-24, intent-driven entry)

### Objective

Apply the approved UPDATE rows of the 2026-09-24 intent-driven entry Triage to spec-0004.

### Inputs reviewed

- `discussion-20260923171450572` (reference, not normative)
- `.qfai/specs/spec-0004/09_delta.md` `## Triage (2026-09-24 intent-driven entry)`
- `.qfai/contracts/cli/qfai-workflow.md`, `workflow-files.schema.md`, `qfai-init.md`, `qfai-validate.md`

### Preflight summary path

- Stage 0: `run-20260924042956656`; ready, 68 REQs, no blockers.
- After Triage: `run-20260924050220859`; ready, 68 REQs, no blockers.

### Triage decisions

| Source   | Subject     | Operation | Sub-op | Approved By | Rationale |
| -------- | ----------- | --------- | ------ | ----------- | --------- |
| REQ-0043 | The triage approval check resolves a cited workflow authorization and uses the one approval set | UPDATE | APPEND | - | A row citing a workflow authorization must resolve to a recorded `human_decision` under `.qfai/evidence/workflow/<runId>/` for the same operation and capability. A legacy row keeps the `Approved By` check. The validator's own copy of the approval set gives way to `requiresApproval()`. Size signal: AC 39 is over 30 and TC 50 sits at the threshold, over it after this append. spec-0004 owns only CAP-0004, so there is no split |
| REQ-0065, REQ-0057 | `qfai validate` checks installed plans under `process/workflows` as a governed layer | UPDATE | APPEND | - | CLI-INIT defines the layer; spec-0004 owns the validator behavior. The four boundaries are an edited plan, a deleted recorded layer, an ungoverned `process/migrations/` edit, and a clean fresh install. |

### Open questions

- Recorded in `.qfai/specs/spec-0004/08_Open-questions.md` where this change opened or resolved one; the source pack's deferred OQs that this batch settled are cited from the settled sets in the Work Orders Summary below.

### Decisions made

- User decisions this batch used: CREATE CAP-0018 approved; OQ-0020 = A; OQ-0012 = A; TD-22 English seeds; N47 = C (spec-0018 not UI-bearing); J2 = B; Y1 = A; P04 = B (draft PR, merge only when every lane is green); the pack's D1..D18.
- Every other decision was adopted from the griller's recommendation and is listed as a `grilling(<phase>/agents)` row in the Work Orders Summary.
- Recorded decisions for this spec live in `07_Decisions.md` and the Decision Log of `09_delta.md`.

### Work performed

- Phase 2 Slice: `01`..`06` appended/amended per the approved Triage rows (see `09_delta.md` change summary).
- Phase 2b: `tdd/test-list.md` delta rows appended; column-only re-runs for `Blocked-By` and `Test file` (Phase 3 P01/P02).
- Phase 2c: reconciled against CLI-WF / CLI-WFFILE / CLI-INIT / CLI-VAL through the Phase 2c checkpoints recorded below (contract writes W01..W16 recorded in the batch record).
- Phase 3: `10_Plan.md` subsection `### Intent-driven entry (CAP-0018)` in all four sections; Plan gate PASS on cycle 2 (cycle 2).
- Phase 4: `09_delta.md` change summary lines for each phase.

### Contract executability

- none (no `db/` contract authored or changed)

### Commands executed

- `node packages/qfai/dist/cli/index.cjs sdd preflight --fail-on error` (Stage 0) and again after Triage
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --spec spec-0004 --fail-on error --format text`
- `node packages/qfai/dist/cli/index.cjs validate --profile sdd --fail-on error --format github`
- `node scripts/check-mdschema.mjs`, `node scripts/check-mermaid.mjs`, `node_modules/.bin/prettier --check`
- The repository build was used rather than `npx qfai`, which resolves a stale published copy; `packages/qfai/dist` was rebuilt from HEAD source with tsup.

### Validate evidence paths

- Spec-scoped validation: `run-20260924143644958`, pass, error=0, warning=53.
- Batch-wide sdd validation: `run-20260924145952965`, fail, error=27, warning=85. Twelve errors were pending review summaries; the other 15 are pre-existing pins in `scripts/dogfood-backlog.json`. The skill stop condition of error=0 was not met.

### Pre-draft Grilling

| Phase | Session | Ended at | Wrote at | Frontier | Evidence |
| ----- | ------- | -------- | -------- | -------- | -------- |
| 2     | run     | 2026-09-23T23:20:27.401Z | 2026-09-23T23:28:21.687Z | 34 settled (J2 by the user), 0 escalated | #work-orders-summary |
| 2c.1   | run     | 2026-09-24T01:02:25.952Z | 2026-09-24T01:03:17.857Z | 20 settled, 0 escalated | #work-orders-summary |
| 2c.2   | run     | 2026-09-24T01:21:57.179Z | 2026-09-24T01:22:52.841Z | 6 settled, 0 escalated | #work-orders-summary |
| 3      | run     | 2026-09-24T02:07:28.733Z | 2026-09-24T02:34:07.860Z | 19 settled (P04 by the user), 0 escalated | #work-orders-summary |
| 3 (P20) | run | 2026-09-24T05:22:38Z | 2026-09-24T05:31:37.988Z | 1 settled, 0 escalated | #work-orders-summary |
| 2c.6   | skipped | - | 2026-09-24T05:31:37.988Z | empty: answered by CLI-INIT ### Plan provenance and the upgrade record and validators/assistantAssets.ts (code facts only) | - |

- Batch record: `sdd-batch-20260924045712999.md` (Phase 0 and Phase 1).

### Work Orders Summary

| Step | Role (sub-agent) | Agent instance | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE/PENDING) |
| ---- | ---------------- | -------------- | ---------- | ------------ | ------------- | ---------------------------- |
| 1 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X01 Contract citation form | settled recommendation and cited specifications | Decision: A `## Contract Realization` table at the end of `04_Business-Rules.md` for each added or modified BR; `## Applicable Contracts` in `01_Spec.md`; `Contract-Refs` untouched, or `-` on new table rows; reason: S06; the template admits only `CON-*`; disagreeing: none | PASS |
| 2 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X02 No cross-spec BR citation | settled recommendation and cited specifications | Decision: A wave-2 spec cites contracts, pack IDs and policy DRs, never another spec's BR, AC or TC ID; reason: S22 applied inside wave 2; lets all nine run in parallel; disagreeing: none | PASS |
| 3 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X03 Shared-asset owner map | settled recommendation and cited specifications | Decision: The SA-03 map, and each Scope's In and Out lines per RA-12. **One correction:** the `agents/openai.yaml` clause of REQ-0051 is spec-0003's (what `init` writes), so it goes in spec-0001's Out line; reason: One owner per line of each shared file; disagreeing: SA (the `openai.yaml` bullet in spec-0001; not taken) | PASS |
| 4 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X04 Operations tables | settled recommendation and cited specifications | Decision: One BR per skill spec, "the table lists exactly the operations CLI-WFFILE `### Vocabulary` assigns"; the literal set in one L3 TC. The skill set is defined by reference, "every skill a built-in plan names", which includes `qfai-maintain` (its file is spec-0018's), recorded as DR-0001-0010; reason: Trigger (b) fails closed on a missing table; S16; disagreeing: none | PASS |
| 5 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X05 orchestrated-mode.md and the ceiling | settled recommendation and cited specifications | Decision: One reference per stage skill; exactly one added SKILL.md line; every other SKILL.md edit in place. NFR-0003 in `## Applicable NFR` with its measurement, no BR; reason: `qfai-implement` reaches exactly 800; disagreeing: none | PASS |
| 6 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X06 The DTC-19 carve-out | settled recommendation and cited specifications | Decision: One BR in each of spec-0001, spec-0011 and spec-0013, each scoped to its own lines and citing DR-0297; implemented as one change; reason: DR-0297 says the four rules change together; disagreeing: none | PASS |
| 7 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X07 needs_repair owner | settled recommendation and cited specifications | Decision: Adopt, as R1. The findings listed on a `needs_repair` result are routing data, not run debts; reason: As SA wrote it, the sentence would make every repair finding a `debt-open` that no rule ever resolves, because CLI-WF defines no resolution (only `debt-open`, "a debt is unresolved"). So `finish` could never complete after any repair loop; disagreeing: SA (findings as ordinary `debts`; not taken as worded) | PASS |
| 8 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X08 Authorization-Ref grammar | settled recommendation and cited specifications | Decision: Adopt, as R2 and R3; the spec-0004 matrix gains `resolves-malformed`; reason: The value comes from a file, which is a trust boundary. Validation there is on the safety floor (`minimal-implementation.md` § 2), and neither contract fixes the value form: CLI-WFFILE says only "minted by the core, unique within the run"; disagreeing: none | PASS |
| 9 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X09 Next free IDs | settled recommendation and cited specifications | Decision: The RA rule: above the highest ID cited anywhere, ranges included, above every approved unapplied CR, skipping annotation strings in tests. The RA table is adopted, re-checked at write time; reason: The same hazard the traceability rules fix for `TDD-*`; disagreeing: TD (the F16 table, which for spec-0012 collides with CR-20260923-0001 at US-0012-0143, EX-0012-0187..0189 and TC-0012-0484..0488, and for spec-0013 with CR-20260913-0012 at BR/EX-0013-0021 and TC-0013-0036/0037; not taken) | PASS |
| 10 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X10 Story granularity | settled recommendation and cited specifications | Decision: One new story per journey the skill takes part in; a MODIFY adds none. Each new story gets an E2E row `Blocked-By` spec-0018, discharged by the spec-0018 journey through that stage, annotated with both story IDs; reason: N34; one journey per story; disagreeing: none | PASS |
| 11 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X11 AC form and Source | settled recommendation and cited specifications | Decision: A heading, a `- US-Refs:` line and a `gherkin` block with `# Source:`; a modified item keeps its ID and gains no Source; reason: The reader selects blocks by info string; disagreeing: none | PASS |
| 12 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X12 BR kinds | settled recommendation and cited specifications | Decision: Contract-surface and full rules; every BR with an AC, an EX and a TC; reason: S05; `QFAI-COV-102..104`; disagreeing: none | PASS |
| 13 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X13 Relevant Requirements | settled recommendation and cited specifications | Decision: A `### discussion-20260923171450572 (2026-09-24)` table, pack-qualified; existing lists not renumbered; reason: Local numbers collide with pack numbers (spec-0004 `REQ-0043`, three local `REQ-0013`); disagreeing: none | PASS |
| 14 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X14 Recording D5, D13, D14, D18 | settled recommendation and cited specifications | Decision: The RA table: D5 and D13 cited in `## Applicable Policy` (DR-0299, DR-0297); D14 as DR-0008-0004 and DR-0011-0015; D18 as DR-0011-0016; each with a DL twin. **Plus** the J2 user answer as DR-0015-0010 with DL-0002; reason: A fresh clone cannot read the pack; two owners of one policy DR are forbidden; disagreeing: none | PASS |
| 15 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X15 Open questions | settled recommendation and cited specifications | Decision: Each file keeps its own convention; no new OQ row; reason: Four files state rows only while unresolved; disagreeing: none | PASS |
| 16 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X16 09_delta.md | settled recommendation and cited specifications | Decision: `## Change Summary` (items, resolved pack OQs, size line where over, reserved ranges) and `## Decision Log` where a DR is added; triage rows not edited; reason: The rows are the approved record; disagreeing: none | PASS |
| 17 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X17 Level and directory of skill-text TCs | settled recommendation and cited specifications | Decision: `L3`, with the test under `packages/qfai/tests/integration/**`, never `tests/assets/**`; reason: An L3 oracle reads a shipped file, and an annotation under `tests/assets/` answers no layer (`test-layers.md` `### Annotation routing`); disagreeing: the brief (`tests/assets/**`) | PASS |
| 18 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X18 New test files | settled recommendation and cited specifications | Decision: One new file per spec and subject; existing files are edited only for the rewritten MODIFY TCs whose rows carry no Revision; reason: A changed test file stales a `done` row (`QFAI-TDDLIST-009`); disagreeing: none | PASS |
| 19 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X19 Matrix TCs | settled recommendation and cited specifications | Decision: Matrix only where each boundary has its own runtime observable: spec-0004's two matrices (the passing and the `QFAI-TRIAGE-011` matrix, with `resolves-malformed` added by X08); reason: One file read is one observation; disagreeing: none | PASS |
| 20 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X20 Append layout per file | settled recommendation and cited specifications | Decision: The TD-04 table, including spec-0010's new table under a heading not named "Test Case Table"; new rows spell `L1`..`L3`; reason: The parser reads only inside that section; disagreeing: none | PASS |
| 21 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X21 Kept failures | settled recommendation and cited specifications | Decision: The skill's half only, per the TD-05 table, plus the spec-0012 non-UI stop (F2); reason: The core's refusals are spec-0018's tests; disagreeing: none | PASS |
| 22 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X22 No payload JSON in stage references | settled recommendation and cited specifications | Decision: Fields in prose or a table; examples only in `qfai-run`'s reference; reason: Keeps the spec-0018 parser test off wave-2 assets; disagreeing: none | PASS |
| 23 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X23 Properties an existing guard holds | settled recommendation and cited specifications | Decision: No new TC for the line ceiling, the description length and `<`/`>`, the emitted-code registry, or manifest well-formedness. The `disable-model-invocation` row is settled by A5; reason: N46; disagreeing: none | PASS |
| 24 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X24 MODIFY TCs | settled recommendation and cited specifications | Decision: Rewrite a TC in place only when the MODIFY makes its `Expected` false; otherwise add one; the re-observation is recorded in the Phase 2b evidence as owed to the row's test owner; reason: Backward transitions are forbidden (BR-0011-0002); disagreeing: none | PASS |
| 25 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X25 Blocked-By spec-0018 | settled recommendation and cited specifications | Decision: A TC whose oracle reads a spec-0018 asset, and every new story's E2E row, is `Blocked-By` `spec-0018`; reason: S22, S28; disagreeing: none | PASS |
| 26 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X26 Phase 2b is a delta | settled recommendation and cited specifications | Decision: Rows appended only; no pinned finding is repaired; every profile is run after Phase 2b so no count moves. Correction to the brief recorded: spec-0013 carries no `QFAI-TDDLIST-017`; its sdd pin is 3 × `QFAI-ID-002`; reason: The request bounds the tree; any pinned-count change fails CI; disagreeing: none | PASS |
| 27 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X27 CI sequencing | settled recommendation and cited specifications | Decision: **Delivery constraint:** this batch's SDD commits reach CI only together with its ATDD work, in the same push to the pull request, so the annotated tests exist when the `full` lane runs. Owner: the orchestrator, with the delivery-planner for Phase 3. No carrier edit, no re-pin; reason: Otherwise `QFAI-ATDD-111`/`-112` fire under `full` against held-at-zero or pinned counts; disagreeing: none | PASS |
| 28 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): X28 The Stage 0 reuse key | settled recommendation and cited specifications | Decision: CLI-WF has no `inputSnapshotDigest` (the `### Work order` fields are identity, `inputs` digests, `scope.digest` and the rest), and none is added. The Stage 0 output the stage already writes records its own key over the REQ-0056 list, using the digest function the core uses. A later stage recomputes the key and compares before reusing. No new field, file or writer, and no contract revision. The BR names what the key covers (RA-03), and the TC asserts the rule text (TD-03); reason: The field SA cited does not exist; REQ-0056 asks only for validate-then-reuse; disagreeing: SA (key on `inputSnapshotDigest`; not taken, the field does not exist) | PASS |
| 29 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): B1 One approval set | settled recommendation and cited specifications | Decision: BR-0004-0039, citing CLI-VAL. The TC asserts the flagged rows per operation, not the absence of the constant from source; reason: A source grep is not an oracle; disagreeing: none | PASS |
| 30 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): B2 QFAI-TRIAGE-011 checks | settled recommendation and cited specifications | Decision: One BR naming the check set closed (S16), with one EX per check. Two `L3` matrix TCs: the passing one (`create-row`, `spec-row`, `column-position`) and the failing one (`resolves-missing`, `resolves-unparsable`, `resolves-malformed` from R2, `kind`, `operation`, `binding-create`, `binding-spec`, `answerer`). `Answerer` is an exact comparison with the part of `Approved By` before `@`. A CREATE Rationale citing two CAPs passes when either is bound, which is CLI-VAL membership as written. **Level stays `L3`**: no pure-check split is introduced; reason: The oracle reads files; a pure-check design is not asked for; disagreeing: TD (a possible L1 split left for SA; closed as not needed) | PASS |
| 31 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): B3 Code registry and message | settled recommendation and cited specifications | Decision: `core/emittedRuleCodes.ts`; English message; no allowlist entry; moved into the delta table once emitted; reason: NFR-0017; disagreeing: none | PASS |
| 32 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): B4 Non-rules and the legacy path | settled recommendation and cited specifications | Decision: AC-0004-0042 and AC-0004-0043; the TD-03 single-row TCs (dash value, non-approval row, no staleness); reason: CLI-VAL; disagreeing: none | PASS |
| 33 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): B5 Fixture format | settled recommendation and cited specifications | Decision: Fixtures write only the fields the validator reads, and each record also validates against `authorization.schema.json`; `Blocked-By` spec-0018; reason: The fixture cannot drift from the format; disagreeing: none | PASS |
| 34 | architecture-reviewer (griller) | p2-w2-griller | grilling(2/agents): B6 Records, OQ, IDs, size, Phase 2b | settled recommendation and cited specifications | Decision: DR-0299 in `## Applicable Policy`; OQ-0006 in `## Resolved (2026-09-24 intent-driven entry)`; the RA IDs; size line; one row per matrix boundary and per single TC; the tdd count of 104 unchanged; reason: X09, X16, X26; disagreeing: none | PASS |
| 35 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K1 regression_fix receipts | settled recommendation and cited specifications | Decision: Contract: `regressionFix: { testId, rerunRef, reviewRef }` on a `regression_fix` result, and `invalid-input` reason `regression-fix-receipt`. BR-0018-0039 unchanged; BR-0011-0019 names the field; TC-0018-0068 gains the refusal pair; reason: D18 names the same test, and only a field carries that; it mirrors `testFix`; disagreeing: none | PASS |
| 36 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K2 Direct-exclusion seeds | settled recommendation and cited specifications | Decision: Rewrite ROUTE-044, ROUTE-045, ROUTE-022 and ROUTE-024 to cover the four missing direct-exclusion classes while keeping the 24 fault and 64 route seed counts; reason: REQ-0007 requires a routing seed for each excluded class. Those four seeds duplicate cases already carried by ROUTE-014, ROUTE-021 or ROUTE-031 after the user chose English-only prompts, so their slots can cover environment settings, SQL files, generated files and QFAI-owned skills or constitution. Each rewritten seed forbids `direct`; disagreeing: SA proposed recording a gap and adding no seed; rejected because it would leave four required classes untested | PASS |
| 37 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K3/K4 Non-CREATE approvals in a run | settled recommendation and cited specifications | Decision: `Authorization-Ref` is valid only on CREATE rows. Other approval-required operations keep the Stage 1 human question; the answer reaches the next attempt through `authorizationRefs`, and the row copies `answeredBy@date` into `Approved By` for the existing validator check; reason: D5 and REQ-0042/0043 require a reference for the routing-time CREATE approval, while DR-0299 preserves the existing questions for the other operations. DPOL-04 requires a recorded human answer without requiring a second carrier on those rows; one CLI-VAL change removes an unreachable Binding branch; disagreeing: RA proposed a new question kind, operation and target fields, and a Binding branch for every approval; rejected as more mechanism than the request needs | PASS |
| 38 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K5 The shared-obligation Boundary rule | settled recommendation and cited specifications | Decision: **A new rule, BR-0013-0036** (AC-Refs AC-0013-0034): a seeded row on an obligation that already has a row names a `Boundary`, and each existing sibling lacking one gains its slug, with `Status` and `Evidence` unchanged. EX-0013-0028's `BR-Ref` names BR-0013-0028 and BR-0013-0036; reason: BR-0013-0028's title says seeding changes no existing row; the slug is the one change to an existing row, so as a bullet it would contradict its own BR; disagreeing: SA (a bullet on BR-0013-0028; not taken) | PASS |
| 39 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K6 The owner of a missing environment | settled recommendation and cited specifications | Decision: Merged. Contract: CLI-WF `### Stage result` states `resolvingOwner`'s domain, a skill a plan names or `operator`. Obligation: BR-0014-0030 is **split**. Three repair kinds return `needs_repair` with `resolvingOwner` `qfai-sdd`, `qfai-atdd` or `qfai-implement`. A missing environment is not a repair: verify returns `blocked`, blocker `stage-blocked`, cleared by `operator`. AC-0014-0027 is reworded to match; reason: The field needs a domain the core can dispatch to, and the environment case already fits the blocker set (REQ-0039); disagreeing: none | PASS |
| 40 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K7 A blocked seam-only result | settled recommendation and cited specifications | Decision: Contract, the seam paragraph: a `blocked` or `unrun` seam-only result blocks the run like any result; the parent acceptance attempt stays open; once `resume` clears it, `next` reissues the seam-only work order as a new attempt; a `needs_repair` seam result routes by its `debts` (R1). No BR changes; one TC in spec-0011; reason: What `next` issues is the core's behaviour; disagreeing: none | PASS |
| 41 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): K8 BR-0001-0019's "three" | settled recommendation and cited specifications | Decision: RA-07 A: BR-0001-0019 says the drift protocol's minimal whitelist keeps every exception it lists and gains the two bugfix exceptions (DR-0297); EX-0001-0015 changes only if it counts entries; reason: The spec owns the change to the whitelist, not a copy of it; disagreeing: none | PASS |
| 42 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-09 The unrecorded stop | settled recommendation and cited specifications | Decision: BR-0018-0076: "at the next `resume`"; reason: CLI-WF fires `running → interrupted` from `resume` only (N28); disagreeing: none | PASS |
| 43 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-10 Choosing between runs | settled recommendation and cited specifications | Decision: BR-0018-0066: the worktree's one non-terminal run is what "continue" resumes, so REQ-0002's choice is never put; reason: `run-active` and `identity-mismatch` rule out two candidates (N09, N10); disagreeing: none | PASS |
| 44 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-11 start inputs | settled recommendation and cited specifications | Decision: BR-0018-0011 names `request`, `completionTarget` and `harness`, and says the scope is fixed at routing; reason: CLI-WF `### start`; disagreeing: none | PASS |
| 45 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-12 Debt resolution | settled recommendation and cited specifications | Decision: Option C. **Contract** (CLI-WF `## Completion`): a debt is resolved when the `finish` validate, or a later accepted result of the stage kind that detected it, no longer reports its `findingCode` at its `path`; otherwise it stays `debt-open` with its `resolvingOwner`. **Obligation** (BR-0018-0026): a debt only another spec can resolve keeps the run from completing, as REQ-0037 states, and is repaired by that spec outside the run; reason: Without a resolution, completion is unreachable after any debt; closes the wave-2 advisory; disagreeing: none | PASS |
| 46 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-13 The request-kind clause | settled recommendation and cited specifications | Decision: Contract, the `scope-escape` row of `### Route proposal`: "…, or `requestKind` is not `change`"; reason: It writes down what S27 and DR-0018-0013 already took the row to say; disagreeing: none | PASS |
| 47 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-14 A replan's list | settled recommendation and cited specifications | Decision: Contract: each `priorStageReceiptRefs` entry of a work order is `{ ref, validity }`, with `validity` `valid`, `stale` or `unknown`; the remaining obligations are `ledger.rowIds`. BR-0018-0045 cites it; reason: REQ-0039's list becomes observable on the work order after a replan; disagreeing: none | PASS |
| 48 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-15 R5 narrowed | settled recommendation and cited specifications | Decision: Contract (`## Fail-closed`): a `reviewer-missing` message names `qfai init --force` when the shipped routing entry is absent, and otherwise names the manifest file and the dropped reviewer; reason: `--force` restores an absent entry but not a dropped reviewer. The user's J2 answer concerned what a plain upgrade leaves behind, and K17 of wave 3 already applies this line to R4; disagreeing: none | PASS |
| 49 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-16 The diagnosis names its rows | settled recommendation and cited specifications | Decision: Contract: `diagnosis` gains `matchedRowIds`; cause candidates and impact are content of the record `reproductionRef` names. BR-0011-0016 says so; reason: The core needs the row IDs to bind the `regression_fix` or `test_fix` work order (`ledger.rowIds`); disagreeing: none | PASS |
| 50 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-17 Evidence against write-scope | settled recommendation and cited specifications | Decision: Contract (`### Stage result`), **corrected**: `changedFiles` lists every changed path git does not ignore, and each must lie in a write area. A file a stage writes that git ignores is named in `artifactRefs`, is not a changed file, and is outside `write-scope`. BR-0011-0015: "changes no tracked project file"; reason: SA's directory list ("`.qfai/evidence/` apart from `workflow/`") is wrong. The managed `.gitignore` re-includes tracked governance evidence under `.qfai/evidence/` (`implement-*.md`, `atdd-*.md`, `change-request-*.md`, `decision-*.md`, `decisions/`, `prototyping/grilling.md`), which a stage writes and git tracks. The ignore status is the boundary `finish`'s diff already uses; disagreeing: SA (the directory list; corrected) | PASS |
| 51 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-18 The row digest | settled recommendation and cited specifications | Decision: Contract (`## Ledger row-set check`): the digest covers the row's cells and serves resume reconciliation; `accept` refuses only the two listed changes; any other cell edit is the stage owner's, judged by review; reason: The C3/E4 test fixes edit `Test file` and `Selector`; disagreeing: none | PASS |
| 52 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-19 Missing realization rows | settled recommendation and cited specifications | Decision: Rows added in spec-0018 (13) and spec-0015 (BR-0015-0003); reason: Phase 2c diffs the tables; disagreeing: none | PASS |
| 53 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-20 Lock keys on Windows | settled recommendation and cited specifications | Decision: Contract (CLI-INIT `### Windows parity`): "lock keys are project-relative paths with `/`"; reason: BR-0003-0058 states it, and no contract did; disagreeing: none | PASS |
| 54 | architecture-reviewer (griller) | p2c-griller | grilling(2c.1/agents): 2C-SA-21 Settled inputs | settled recommendation and cited specifications | Decision: Contract (`### Work order`): `settled`, listing the checked proposal's routing result ID and every answered question as `{ questionId, text, chosen }`. It is runtime only, and the tracked summary copies none of it. BR-0010-0013, AC-0010-0013, BR-0015-0021 and BR-0018-0058 cite it; reason: `inputs` is `{ path, digest }` and no file holds the answers; one field, no new file or writer; NFR-0014 holds, since the work order is under `.qfai/runs/`; disagreeing: none | PASS |
| 55 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-01 Record areas | settled recommendation and cited specifications | Decision: W14, narrowed as above: a separate `recordAreas` keyed on stage kind and bound spec; approval records, `workflow/` and spec `01`..`05`/`07`/`08`/`10` never included; the announcement and `scope.digest` cover the authorized scope only; reason: W05 needs the stage's own tracked records to pass `write-scope`; SA's wording let a stage write approval records and other specs' evidence; disagreeing: SA (the whole tracked evidence tree; narrowed) | PASS |
| 56 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-02 ROUTE-028 | settled recommendation and cited specifications | Decision: Rewrite ROUTE-028, keeping the counts at 24 and 64: one non-terminal run beside a terminal one, conversation binding missing; expected `requestKind: "resume"`, `requiresHumanInput: false`, `must: ["resume_checkpoint"]`, and a `forbid` token for resuming the terminal run, typed in the vocabulary by N41's rule; reason: The seed expects a choice between two live runs, which `run-active` makes unreachable (BR-0018-0066, 2C-SA-10); it stays distinct from ROUTE-027, which has no distractor; disagreeing: none | PASS |
| 57 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-03 DR-0018-0012's counts | settled recommendation and cited specifications | Decision: Four D5 rewrites (ROUTE-014, 035, 055, 056); the K2 bullet (ROUTE-044, 045, 022, 024) unchanged; a new ROUTE-028 bullet; Context counts matched. The DL-0012 twin matches; reason: The record must state what was rewritten; disagreeing: none | PASS |
| 58 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-04 The safety-relevant floor | settled recommendation and cited specifications | Decision: No fixed number anywhere. The floor is whatever N42's rule derives from the rewritten seed file and the typed vocabulary, recomputed before the delivery-planner records the list (by 2026-11-09). N42's "24" is superseded as a planning figure; OQ-0018-0015's text says "derived by the rule"; reason: Both inputs are still changing, and a literal floor in a TC would fail a correct recompute; disagreeing: none | PASS |
| 59 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-05 spec-0013 titles | settled recommendation and cited specifications | Decision: Accept, with one word more: BR-0013-0028 and AC-0013-0034 read "no existing row's status or evidence"; reason: It restates K5's outcome; the only edit to an existing row is the `Boundary` slug, which W11 leaves to the stage owner; disagreeing: none | PASS |
| 60 | architecture-reviewer (griller) | p2c-griller | grilling(2c.2/agents): 2C2-SA-06 spec-0017 is reached | settled recommendation and cited specifications | Decision: Recorded: W13 reaches BR-0017-0071's realization row; re-read with no amendment. The 2c.1 "not reached" line is corrected; reason: BR-0017-0071's realization names CLI-INIT `### Windows parity`; disagreeing: none | PASS |
| 61 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P01 Blocked-By on todo rows | settled recommendation and cited specifications | Decision: **SA-05 A.** The Phase 2b re-run clears `Blocked-By` on every `todo` row of this batch that holds a bare spec ID: the E2E rows of both directions, and the TCs X25 marked `Blocked-By spec-0018`. The order lives in the plans: TD-05's tiers in `## Test approach`, SA-04's units in `## Implementation approach`, and spec-0018's per-journey prerequisite rows as `spec-NNNN:TDD-NNNN`. An implementer who really blocks a row writes the grammatical cell then. **X25 is amended accordingly**; reason: `obligation-columns.md`: "Required on `blocked` rows, blank otherwise", in the form `<blocker> — blocked at <status>`. That no validator parses a `todo` cell (`parseBlockedBy` runs only on `blocked` rows) does not make the value grammatical. X25, my own wave-2 node, was wrong against it; disagreeing: TD (keep the cells; not taken) | PASS |
| 62 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P02 Test-module granularity | settled recommendation and cited specifications | Decision: **TD-10 A.** Test modules one per BR, and several TCs in one module only when they share a BR. The Phase 2b re-run rewrites spec-0018's `Test file` column, splitting `decide.test.ts` (273 rows) and `cli.test.ts` (75) by BR. **`Owning module` stays as seeded (SA-01)**: `decide.ts` whole, the production write set unchanged. For wave-2 and wave-3 specs the ledgers hold `Test file` `-`, and each plan names its modules per BR. **X18 is clarified**: "one new file per spec and subject" means per BR group, never one file per spec; reason: `test-layers.md`: "Default: one test module per `TC-*` … Grouping … when they verify the same BR … Above that, split by BR … A single `Test file` value shared by every row of a spec is an anti-pattern … `qfai-sdd` should emit a per-item `Test file`". SA-01 concerns the production file, which this leaves alone; disagreeing: none | PASS |
| 63 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P03 Journeys for the unreached stories | settled recommendation and cited specifications | Decision: Adopted as **three variants of existing spec-0018 journeys**, recorded in spec-0018 `06` `## E2E journeys`: a `discovery` variant through the discussion stage (US-0010-0013), a `feature` variant with `prototype_decision_needed` (US-0012-0144), and a handover variant asserting the deterministic half (US-0001-0010: a result with an unissued work-order ID is refused and nothing changes, and `qfai-run` is installed where the entry check points; the model's pickup stays release evidence). Each is annotated with the stage story's ID. **No new spec-0018 story or ledger row**: the E2E rows are the stage specs' own, which already exist. **No upgrade journey for US-0003-0029**: K01 of wave 3 settled that it is discharged by the spec-0018 journey whose first step runs `qfai init`, with the upgrade half held in L3 rows. TD-03's mapping table goes in spec-0018's plan; reason: Within the request: X10 already committed the spec-0018 journeys to discharge each stage story, and `QFAI-ATDD-111` needs them. Marking the stories `planned` would defer obligations the approved triage carries; disagreeing: TD (new journeys with ledger rows, and the upgrade journey; not taken) | PASS |
| 64 | architecture-reviewer (griller) | p3-griller | grilling(3/user): P04 X27 and pushes | working notes | B: push freely to a draft PR, merge only when every lane is green (user); decision and reason recorded in this row | PASS |
| 65 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P05 Coverage Depth Matrix pins | settled recommendation and cited specifications | Decision: The push that adds a spec's first matrix (spec-0001, 0004, 0010, 0011, 0012, 0015) also re-pins `full` with `--profile full --pin`, which strikes that spec's `QFAI-ATDD-131` entry. The six plans say so in `## Test approach`. No matrix is written in SDD; reason: The backlog rule re-pins a file that improves in the same change, and a count below its pin fails; disagreeing: none | PASS |
| 66 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P06 Units and tiers | settled recommendation and cited specifications | Decision: **Both, reconciled.** SA's six units are the implementation order in `## Implementation approach`; TD's five tiers are the green order in `## Test approach`. U1 = tier 1; U2, U3, U4 = tier 2; U6 = tiers 3 and 4, with the stage E2E rows closing at tier 5. **The Windows job (U5) lands after U1 and U4**, once its suite entries resolve (BR-0017-0074, TC-0017-0095), and does not wait for the journeys. The routing eval comes last, at release; reason: The Windows job needs its suites, not the journeys; disagreeing: TD (Windows at tier 5 after the journeys; not taken) | PASS |
| 67 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P07 Plan headings and form | settled recommendation and cited specifications | Decision: Under each existing section, one English subsection **`### Intent-driven entry (CAP-0018)`**, in all four sections and all eleven existing plans. A line this change makes false is rewritten in place, in English (TD-01; G14 in spec-0001). Legacy text and legacy risk rows are not touched. A risk section without the four columns gets its new rows as a four-column table inside the subsection (RA-01). spec-0018's new plan needs no subsection; reason: The validator's `QFAI-PLAN-003` matches `changelog`, `history` and `update history`, not a date, so both headings pass. A subject-named heading states what the plan covers, not when, which suits OC-04 (history belongs in `07` and `09`); disagreeing: RA, TD (`(2026-09-24)`; not taken) | PASS |
| 68 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P08 Risk-row ownership and form | settled recommendation and cited specifications | Decision: RA-04 A: one risk row per limit, in the plan that owns its record or mechanism; others cite it in an NFR bullet; L4 and L6 get two rows each, one per failure. RA-05 ratings (`low`/`med`/`high`, as `likelihood / impact`) and observable triggers. **Batch-level risks:** X27's row is in spec-0018's plan only, written from P04's answer. **RA-06's other two rows are dropped**: the `Blocked-By` cycle is removed by P01, and the module names are fixed by P02's re-run. spec-0008's third row (RA-10) is reworded to "the order is spec-0018's plan (P06)", since its cell is cleared; reason: One owner per mitigation stops five copies drifting; a resolved risk is not a risk; disagreeing: SA (X27 in every plan that adds E2E or ATDD rows; not taken) | PASS |
| 69 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P09 NFR approach | settled recommendation and cited specifications | Decision: RA-02 A: the three groups; group 2 (NFR-0002, 0015, 0017 wherever a shipped asset or an operator string changes) cites the existing guard. RA-03 A: a measurement is an observation that exists or is scheduled. NFR-0006, 0008 and 0018 are measured at a release step, with no claim before it (OC-80); reason: N46; OC-80; disagreeing: none | PASS |
| 70 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P10 spec-0018's new 10_Plan.md | settled recommendation and cited specifications | Decision: Three authors, one file, written in sequence to avoid conflicting edits. The solution-architect creates the file and writes `## Implementation approach` (the seven elements with their usages, U1..U6, the SSOT-modules step, and what it leaves out). Then the test-design-analyst writes `## Test approach` (TD-31, the tiers, the P03 mapping and variants, the fault-seed index, the eval). Then the requirements-analyst writes `## NFR approach` and `## Risk mitigation` (RA-18 rows, minus the two dropped under P08); reason: Each section is its owner's; disagreeing: none | PASS |
| 71 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P11 Elements, usages and what each plan leaves out | settled recommendation and cited specifications | Decision: Adopted as proposed: spec-0018's seven elements with at least three usages each; spec-0001 and spec-0003 each introduce one element; the others none, said in one line; the leave-out lists; the CLI-WF/CLI-WFFILE SSOT-modules move in U1; reason: The template's element rule; disagreeing: none | PASS |
| 72 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P12 Y1 in the plans | settled recommendation and cited specifications | Decision: spec-0014's and spec-0017's plans record Y1 = A with the counts (4 and 3) and the trigger "count differs, or `build` gains `origin/main`". Both record the CI gap that the dogfood lanes cannot run `QFAI-TRACE-001`; reason: Records the user's answer and decides nothing; disagreeing: none | PASS |
| 73 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P13 CR-20260913-0005's ID clash | settled recommendation and cited specifications | Decision: Out of this batch: one risk row in spec-0014's plan saying the CR takes the next free TDD ID at its approval; reason: Not this batch's change; disagreeing: none | PASS |
| 74 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P14 Windows job test approach | settled recommendation and cited specifications | Decision: Adopted, with P06's land order. spec-0003's tests go in `tests/integration/init/`; links are created in temp dirs; CRLF comes from fixtures; the temp root is read from the environment; the build is in the job; the trial run sets the baseline under Y6; reason: S24, S30, Y6; disagreeing: none | PASS |
| 75 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P15 The routing eval | settled recommendation and cited specifications | Decision: Adopted: the deterministic halves are CI rows; the runner is manual, run last at release; the record carries the three digests; two open inputs (OQ-0018-0013, OQ-0018-0015); English only; reason: N40, N42, N45, M20; disagreeing: none | PASS |
| 76 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P16 Known findings each plan records | settled recommendation and cited specifications | Decision: Adopted; the X27 line is written from P04's answer (under B, the expected-findings list per push); reason: A reviewer must not read them as new; disagreeing: none | PASS |
| 77 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P17 spec-0017 Tier | settled recommendation and cited specifications | Decision: Raise the seven spec-0017 rows to T2 in the P02 re-run **only if** the Phase 2b seeding rule ("seed `Tier` … from … what the item touches") names CI infrastructure as a raising factor; the test-design-analyst checks its text at write time and otherwise leaves `-`; reason: It applies an existing seeding rule, or nothing; disagreeing: none | PASS |
| 78 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P18 Per-spec risk and NFR rows | settled recommendation and cited specifications | Decision: Adopted as listed, with the P08 rewording for spec-0008 and the P04 answer for any X27 citation; reason: P08, P09; disagreeing: none | PASS |
| 79 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P19 Per-spec test approaches | settled recommendation and cited specifications | Decision: Adopted as listed, with three changes: TD-21's US-0003-0029 journey is K01's, not an upgrade journey (P03); each spec's order line cites P06; each module list is per BR (P02); reason: P02, P03, P06; disagreeing: TD (the upgrade journey; not taken) | PASS |
| 80 | architecture-reviewer (griller) | p3-griller | grilling(3/agents): P20 validator treats process/workflows as a governed layer; owner spec-0004 (new approval-free UPDATE/APPEND row) | settled recommendation and cited specifications | Decision: Use the full governed-layer provenance check for `process/workflows` through one shared path-to-layer helper; add the approval-free spec-0004 UPDATE/APPEND row and reconcile it at checkpoint 2c.6.; reason: The existing CLI-INIT contract makes plans a governed layer, while validate currently reads only first path segments.; disagreeing: none | PASS |

### Gaps / Open risks

- Pushes before ATDD and implementation land show `QFAI-ATDD-111/112` and RED acceptance tests; each push lists its expected findings in the relevant Plan under `Findings carried on purpose` and merge waits for every lane to be green (P04 = B).
- The push carrying this batch re-pins `full` for `discussion-20260418170937652` (pinned 2, now 0) and strikes the first-matrix `QFAI-ATDD-131` pins (spec-0001, 0004, 0010, 0011, 0012, 0015).

### Final status

- Final status: REVISE
- Rationale: reviewer findings are being addressed; the batch-wide sdd validation still contains pinned errors.

# Run: re-derive under CR-20260925-0010 (2026-09-25)

## Objective

- Spec target: spec-0004
- Mode: `re-derive`, driven by the approved
  `.qfai/decisions/CR-20260925-0010-withdraw-the-work-log-absence-obligations.md`
  (step 3 of its rerun plan).
- Objective: withdraw the obligations whose only content is that the work-log
  surface is absent or that repeat an existing test, narrow TC-0004-0018 and
  its chain to `R-REJECTED-READOPT`, and keep TDD-0072.

## Inputs reviewed

- `CR-20260925-0010`, whole record, and the approved Triage group G2.
- The amended pack `discussion-20260923060900824` (commit `4c2c398b4`):
  REQ-0002, REQ-0003, REQ-0004, REQ-0006 and REQ-0010, `10_Policy.md`,
  `99_delta.md` `## Drift Events`, and `03_Story-Workshop.md` DUS-002.
- Review pack `review-20260925045812201`: `R01` advisory 1 and `R02`
  advisories 4 and 5, carried to this re-derive.
- `.qfai/specs/spec-0004/**`, `.qfai/contracts/cli/qfai-validate.md`
  `## Reviewer-Gate input bundle`.
- `.qfai/evidence/atdd-spec-0004.md` and `.qfai/evidence/implement-spec-0004.md`
  (`### TDD-0018`, `### TDD-0067`..`### TDD-0072`).
- The tests the ledger names, and the candidates for the BR-0004-0001 binding:
  `tests/cli/validateRunIncomplete.test.ts`, `tests/core/specScopeValidate.test.ts`,
  `tests/core/gateGroupCoverage.test.ts`, `tests/core/validationTimings.test.ts`.
- `tests/core/tddListBlockedStatus.test.ts` and
  `tests/core/assistantAssetProvenance.test.ts`, which keep the remaining
  behaviour tested.
- `.qfai/assistant/skills/qfai-sdd/SKILL.md`; references `sdd-triage.md`,
  `spec-traceability-rules.md`, `sdd-pre-draft-grilling.md`; template
  `templates/evidence/sdd-spec.md`.

## Preflight summary path

- Preflight run id `run-20260925143420772` (Stage 0): ready, source
  `discussion-pack`, selected pack `discussion-20260923060900824`, 17 imported
  requirements, no pack gaps, no blockers.
- Preflight run id `run-20260925150016061`, after Triage: the same result.

## Triage decisions

| Source                                | Subject                                                                                                                                           | Operation | Sub-op | Approved By                            | Rationale                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | -------------------------------------- | ---------------------------------------------------------------------------------- |
| discussion-20260923060900824#REQ-0002 | Remove AC-0004-0040, BR-0004-0034, EX-0004-0042, EX-0004-0043, TC-0004-0074, TC-0004-0075; TDD-0067, TDD-0068; ledger rows 17-19 and 24-25 removed | UPDATE    | REMOVE | user (Claude Code structured question) | No absence test is asked for; `QFAI-ASSETS-006` is the generic, tested check      |
| discussion-20260923060900824#REQ-0004 | Remove AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076; TDD-0069..0071; ledger rows 20 and 26 removed                                        | UPDATE    | REMOVE | user (Claude Code structured question) | Two rows prove an absence; TDD-0070 repeats an existing test                      |
| discussion-20260923060900824#REQ-0003 | Narrow AC-0004-0018, BR-0004-0017, EX-0004-0016, TC-0004-0018; TDD-0018 deleted, TDD-0072 kept                                                      | UPDATE    | MODIFY | user (Claude Code structured question) | Keeps the `R-REJECTED-READOPT` boundary, which predates the change                 |
| discussion-20260923060900824#REQ-0002 | Adjust `01_Spec.md`; re-point ledger row 21 (BR-0004-0001); restate row 22's Notes (BR-0004-0017)                                                   | UPDATE    | MODIFY | user (Claude Code structured question) | Row 21 bound a deleted file                                                        |

- Persisted in `09_delta.md` as `## Triage (2026-09-25)`, under
  `## Change Summary` and above `## Triage (2026-09-23)`, with `Depends-On`
  `-` on every row.
- Approved by the user through a Claude Code structured question at
  2026-09-25T04:52:16Z. That one structured answer approved the Change Request
  (G0) and all four spec groups, G1 to G4, together.

## Open questions

- none

## Decisions made

- DR-0004-0044 / DL-0030: the work-log absence obligations are withdrawn.
  - Supersedes DR-0004-0018..0020, DR-0004-0023, DR-0004-0024, DR-0004-0028,
    DR-0004-0031, DR-0004-0033, DR-0004-0034, DR-0004-0037 and
    DR-0004-0041..0043.
  - Amends DR-0004-0025, DR-0004-0027, DR-0004-0036 and DR-0004-0040.
- Three readings differ from the Change Request's Triage draft, each by a
  stated rule:
  - DR-0004-0028 ("Keep every appended item") is superseded, though the draft
    did not list it: it decided the items this run removes.
  - DR-0004-0040 is amended, not superseded. It is what makes TC-0004-0018 a
    `unit` case and TDD-0072 a `unit` row, and both stay.
  - The four discussion-requirement lines of `01_Spec.md` stay. DR-0004-0025,
    which the draft did not supersede, names each requirement this spec
    answers, and DL-0011 rejected leaving them out. Each requirement's
    behaviour clause still describes `qfai validate`. Only the range lines
    change.
- The BR-0004-0001 binding is a fact settled by reading the tests: it names
  `tests/core/specScopeValidate.test.ts`, which runs the real
  `validateProject` over the `sdd` profile and asserts findings from its
  validators. The Change Request's candidate,
  `tests/cli/validateRunIncomplete.test.ts`, mocks `validateProject`.
  `tests/core/validate.test.ts` does not exist.
- DR-0004-0045 / DL-0031: `[RE-OPEN]` of DR-0004-0028 (DL-0014 had rejected
  dropping items that assert existing behaviour).
- DR-0004-0046 / DL-0032: `[RE-OPEN]` of DR-0004-0032 (DL-0018 had rejected
  dropping the `R-WORKLOG-DRIFT` clause).
- DR-0004-0047 / DL-0033: `[RE-OPEN]` of DR-0004-0040 (DL-0026 had rejected
  retiring TDD-0018).
- Each re-open carries the user's approval of the Change Request, and
  `09_delta.md` `## Rejected` points back at each through `Re-opened by:`.

## Work performed

- Phase 2:
  - `01_Spec.md`: the range lines end at AC-0004-0039, BR-0004-0033,
    EX-0004-0041 and TC-0004-0073.
  - `03_Acceptance-Criteria.md`: AC-0004-0018 loses its `R-WORKLOG-DRIFT` And;
    AC-0004-0040 and AC-0004-0041 removed.
  - `04_Business-Rules.md`: BR-0004-0017 loses its second sentence;
    BR-0004-0034 and BR-0004-0035 removed.
  - `05_Examples.md`: EX-0004-0016 loses its second And; EX-0004-0042..0044
    removed.
  - `06_Test-Cases.md`: TC-0004-0018 has one boundary, Type `error`;
    TC-0004-0074..0076 removed.
  - `16_Traceability-ledger.md`: rows 17-20 and 24-26 removed; BR-0004-0001
    bound to `packages/qfai/tests/core/specScopeValidate.test.ts`;
    BR-0004-0017 Notes restated. `validate.ts` changed on the branch, so the
    binding needs no `Proof`.
  - `07_Decisions.md`: 13 records marked superseded, four amended, four added.
- Phase 2b:
  - `tdd/test-list.md`: TDD-0018 and TDD-0067..TDD-0071 deleted; six tombstones
    added under the existing `## TDD-ID reservations`.
  - TDD-0072 unchanged, `done`, `Boundary` `rejected-readopt-empty`.
  - Downstream ledger sweep: no row is reset. A cell-by-cell comparison with
    `HEAD` shows the other 54 rows unchanged; prettier only re-padded the
    table.
  - Each deleted row's `Evidence` cell is copied verbatim into the Triage
    section of `09_delta.md`.
- Phase 3: `10_Plan.md` step 1 writes only TDD-0072; step 4 also deletes the
  withdrawn tests; the paragraph after step 7 no longer mentions step 1's
  annotations; `### Tests for the work-log removal` names the tests that keep
  the remaining behaviour covered. Critical Constraint 10: no finding, because
  the edit adds no architectural element.
- Phase 4: `09_delta.md` gains DELTA-0003 in `## Change Summary`,
  `## Triage (2026-09-25)`, DL-0030..DL-0033 with their `## Update History`
  rows, three `## Rejected` candidates with `Re-opened by:`, pointers in
  DL-0014, DL-0018 and DL-0026, and the `CR-20260925-0010` row in
  `## Change Requests` (`Applied at` `-`).
- Carried reviewer advisories:
  - `R02` advisory 4 (REQ-0004's positive half): recorded in the Triage
    section. `tddListBlockedStatus.test.ts` ("accepts ... with its departure
    status") covers it; no item is added.
  - `R01` advisory 1 and `R02` advisory 5: the Triage section records that
    DAC-002-03, the two DUS-002 edge seeds and the DUS-002 idempotency seed
    derive no test or example here. Their `QFAI-ASSETS-006` half is the generic
    check `assistantAssetProvenance.test.ts` covers.
- Tests to delete, owned by other stages, in the same commit:

  | Deleted row | Owner             | Test file                                                                     | `it` blocks                                                                                                           |
  | ----------- | ----------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
  | TDD-0067    | `/qfai-atdd`      | `packages/qfai/tests/integration/spec0004WorklogSurfaceRemoval.test.ts`       | the whole file: "TC-0004-0074: validate --profile full reports no work-log code and no .qfai/steering/ path"          |
  | TDD-0068    | `/qfai-atdd`      | `packages/qfai/tests/integration/spec0004WithdrawnSchemaFinding.test.ts`      | the whole file: "TC-0004-0075: validate --profile full reports a remaining catalog/worklog-entry.schema.md ..."       |
  | TDD-0069    | `/qfai-atdd`      | `packages/qfai/tests/integration/spec0004BlockedRowNeedsOnlyBlockedBy.test.ts` | the whole file: "TC-0004-0076: a blocked row with a well-formed Blocked-By and no .qfai/steering/ raises no error"   |
  | TDD-0070    | `/qfai-atdd`      | `packages/qfai/tests/integration/spec0004BlockedRowEmptyBlockedBy.test.ts`    | the whole file: "TC-0004-0076: a blocked row with an empty Blocked-By raises TDDLIST_BLOCKED_MISSING_REF naming the row" |
  | TDD-0071    | `/qfai-atdd`      | `packages/qfai/tests/integration/spec0004SteeringUnreadableBlockedRow.test.ts` | the whole file: "TC-0004-0076: a well-formed blocked row beside an unreadable .qfai/steering/ file: ..."             |
  | TDD-0018    | `/qfai-implement` | `packages/qfai/tests/validators/reviewerJustification.test.ts`                | "TC-0004-0018: raises no justification finding when R-WORKLOG-DRIFT carries an empty justification" and its comment (lines 46-66), the header sentence (lines 4-5), the annotation at line 7; three tests stay |

  The five integration files also leave `packages/qfai/tsconfig.tests.json`
  (`/qfai-implement`).
- Phase 0 and Phase 1 were not entered: no contract and no `_policies` file
  changed.

## Contract executability

- none

### Obligation reconciliation (Phase 2c)

- BR-0004-0017 and AC-0004-0018, narrowed: they resolve to
  `.qfai/contracts/cli/qfai-validate.md` `## Reviewer-Gate input bundle`, which
  requires a justification for `R-REJECTED-READOPT`, the other codes the
  contract declares with one, and the justification catalog codes, and raises
  no justification error for any other code (DR-0004-0038, DR-0004-0039). No
  join and no write.
- BR-0004-0034 and BR-0004-0035 are removed, so their `Contract-Refs: CLI-VAL`
  bindings go with them. The contract names neither the work-log codes nor
  `.qfai/steering/`, so nothing there changes.
- API-row delta: vacuous. `_policies/05_Contracts.md` lists no API or DB
  contract that this spec binds, and this phase wrote no contract.

## Commands executed

```sh
cd packages/qfai && ./node_modules/.bin/tsup
node packages/qfai/dist/cli/index.mjs sdd preflight --fail-on error
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --spec spec-0004 --format text
node packages/qfai/dist/cli/index.mjs validate --profile tdd --spec spec-0004 --format text
node packages/qfai/dist/cli/index.mjs validate --profile sdd --fail-on error --format text
node packages/qfai/dist/cli/index.mjs sdd preflight
./node_modules/.bin/prettier --write <the edited spec files>
./node_modules/.bin/markdownlint-cli2 <the edited spec files>
node scripts/check-mdschema.mjs
node scripts/check-mermaid.mjs
node scripts/check-doc-clarity.mjs
```

## Validate evidence paths

- Validate run id `run-20260925143505667`, scope `sdd`, `--spec spec-0004`,
  before any write: pass, 0 errors, 29 warnings, 4 info.
- Validate run id `run-20260925145134630`, scope `sdd`, `--spec spec-0004`,
  after the writes: pass, 0 errors, 29 warnings, 4 info. The same findings.
- Validate run id `run-20260925145446615`, scope `tdd`, `--spec spec-0004`, on
  the spec files of `HEAD`: 92 errors, 52 warnings, 6 info.
- Validate run id `run-20260925145137204`, scope `tdd`, `--spec spec-0004`,
  after the writes: 97 errors, 52 warnings, 6 info.
  - The five new errors are `QFAI-ATDD-102`, one per `spec0004*` integration
    file above: each still carries an annotation for a removed test case. They
    clear when the files are deleted.
  - No `TDDLIST_TEST_FILE_MISSING` and no `QFAI-TRACE-001` fires. The other 92
    are the baseline's; one `TDDLIST_SELECTOR_UNRESOLVED` message now names row
    23 instead of row 24, because a row above it was deleted.
  - `QFAI-TRACE-003` fires before and after. The comparison with the
    merge-base reads no AC content from `03_Acceptance-Criteria.md`, whose
    headings carry no `:` after the ID, so the `QFAI-TRACE-001` check does not
    run for this spec at all.
- Validate run id `run-20260925145843475`, scope `sdd`, whole repository:
  11 errors, all the pinned `QFAI-TDDLIST-017` in spec-0006, spec-0010 and
  spec-0012.
- After `/qfai-atdd` deleted the ten test files and `/qfai-implement` made its
  test edits, with the package rebuilt:
  - Validate run id `run-20260925155739310`, scope `sdd`, `--spec spec-0004`: 1 error,
    `QFAI-REVIEW-007` on this spec's review pack while its `summary.json`
    reads `PENDING`. The warnings are the same as before the run.
  - Validate run id `run-20260925155741749`, scope `tdd`, `--spec spec-0004`: 92 errors, the
    same count as on `HEAD`, `QFAI-TRACE-003` among them. No `QFAI-ATDD-102`
    and no `TDDLIST_TEST_FILE_MISSING`.
  - Validate run id `run-20260925155923587`, scope `sdd`, whole repository:
    15 errors: the 11 pinned `QFAI-TDDLIST-017` and one `QFAI-REVIEW-007` per
    pending pack.
- `check-mdschema`: 49 files conform. `check-mermaid`: 50 diagrams parse.
  markdownlint: 0 errors. `check-doc-clarity`: no local identifiers.

## Pre-draft Grilling

| Phase | Session | Ended at | Wrote at             | Frontier                                                                 | Evidence |
| ----- | ------- | -------- | -------------------- | ------------------------------------------------------------------------ | -------- |
| 2     | skipped | -        | 2026-09-25T05:46:18Z | empty: answered by CR-20260925-0010, approved by the user                | -        |
| 2c.1  | skipped | -        | -                    | empty: answered by DR-0004-0038 and DR-0004-0039; no contract changed    | -        |
| 3     | skipped | -        | 2026-09-25T05:46:18Z | empty: answered by CR-20260925-0010, approved by the user                | -        |

- Batch record: none
- These rows belong to this run. The user settled every decision the phases
  write through `CR-20260925-0010` and its Triage group G2, approved at
  2026-09-25T04:52:16Z, so no session was opened.
- The readings listed under `## Decisions made` follow stated rules or are
  facts read from the tests. None is critical, and none reopens anything the
  user decided.
- `Wrote at` is the time of the post-write validate run, run id
  `run-20260925144618761`: both phases wrote between spec-0003's last write
  and that run.
- Phase 2c made no mutation. Phase 2b and Phase 4 run no session. Phase 0 and
  Phase 1 were not entered.

## Work Orders Summary

| Step | Role (sub-agent)         | Agent instance       | Task title                                                                     | Input (refs)                                                                               | Output (refs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Status (PASS/REVISE/PENDING) |
| ---- | ------------------------ | -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst     | sdd-withdraw-author  | Stage 0 preflight, and the rerun after Triage                                  | the amended pack                                                                           | Run ids `run-20260925143420772` and `run-20260925150016061`: ready, 17 requirements, no pack gaps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | PASS                         |
| 2    | requirements-analyst     | sdd-withdraw-author  | Persist Triage group G2 as `## Triage (2026-09-25)`                            | `CR-20260925-0010`; approved Triage draft G2                                               | `09_delta.md` `## Triage (2026-09-25)` and the `## Change Requests` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | PASS                         |
| 3    | requirements-analyst     | sdd-withdraw-author  | Phase 2 and 2b: remove and narrow the items, re-bind BR-0004-0001, tombstone   | settled by `CR-20260925-0010`                                                              | `01`..`07`, `16_Traceability-ledger.md`, `tdd/test-list.md`; validate sdd `--spec spec-0004`: the baseline findings only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PASS                         |
| 4    | requirements-analyst     | sdd-withdraw-author  | Phase 2c read-only reconciliation, Phase 3 and Phase 4                         | CLI-VAL; `10_Plan.md`; `09_delta.md`                                                       | No contract write; plan steps 1 and 4; DELTA-0003, DL-0030..0033, `## Rejected` candidates; Critical Constraint 10: no finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | PASS                         |
| 5    | delivery-planner         | withdraw-triage-gate | Triage gate (`slice-and-scope`, blocking)                                      | `09_delta.md` `## Triage (2026-09-25)`                                                     | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | PASS                         |
| 6    | solution-architect       | withdraw-design-gate | `design` span gate (blocking)                                                  | spec-0004 `01`..`10`, `16`, `tdd/test-list.md`                                             | PASS at `working-tree+eb4bd304c565980e33a307009fd7feaae29669bd17e814e36e7121b58e1c6cd3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | PASS                         |
| 7    | completion-reviewer      | -                    | Reviewer Gate                                                                  | review pack `review-20260925150500004`                                                     | not yet run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PENDING                      |
| 8    | qa-gatekeeper            | -                    | Reviewer Gate: the ledger, the traceability ledger and coverage changed        | review pack `review-20260925150500004`                                                     | not yet run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PENDING                      |
| 9    | architecture-reviewer    | -                    | Reviewer Gate: CLI-VAL bindings and the implementation binding changed         | review pack `review-20260925150500004`                                                     | not yet run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PENDING                      |
| 10   | test-design-analyst      | withdraw-tda         | Test-design check of the withdrawal (`design` span)                            | `03`..`06`, `16_Traceability-ledger.md`, `tdd/test-list.md`, `coverage-depth-spec-0004.md` | PASS with corrections: every surviving AC keeps an EX and a TC, and every TC a ledger row at its layer, as at `HEAD`; no example or TC asks for an absence test; AC-0004-0018..TC-0004-0018 has one boundary, `rejected-readopt-empty`, covered by TDD-0072 at `unit`; TDD-0018, TDD-0067..0071 tombstoned. Corrected three stale sentences of `coverage-depth-spec-0004.md` (the deleted TDD-0018 named as owned, TDD-0072 as unwritten, BR-0004-0017's positive cell credited to the withdrawn boundary) and the stale Gaps bullet. Not corrected, as on `main`: AC-0004-0018's non-empty-justification pass has no TC, and US-0004-0020 has no AC | PASS                         |
| 11   | requirements-analyst     | sdd-withdraw-author  | Low fix L3: Notes of the AC-0004-0018 binding                                  | `16_Traceability-ledger.md` row AC-0004-0018                                               | Notes read "An empty `R-REJECTED-READOPT` justification is an error."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | PASS                         |
| 12   | requirements-analyst     | sdd-withdraw-author  | Low fix (architecture advisory): DR-0004-0038 `Amended by`                     | DR-0004-0038; BR-0004-0017                                                                 | `07_Decisions.md` DR-0004-0038 `Amended by: DR-0004-0044`: BR-0004-0017 lost its `R-WORKLOG-DRIFT` sentence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | PASS                         |
| 13   | requirements-analyst     | sdd-withdraw-author  | Low fix (Triage-gate advisory): approval note and post-deletion validate lines | this block; runs after the test deletion                                                   | This block `## Triage decisions` (one answer approved G0 and G1 to G4), `## Validate evidence paths` (post-deletion runs), and the `QFAI-ATDD-102` line of `## Gaps / Open risks`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | PASS                         |
| 14   | test-design-analyst      | withdraw-tda         | Coverage-depth corrections: three sentences                                    | `.qfai/evidence/coverage-depth-spec-0004.md`                                               | Three sentences of `coverage-depth-spec-0004.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | PASS                         |
| 15   | test-design-analyst      | withdraw-tda         | Low fix: the coverage-depth line of `## Gaps / Open risks`                     | `.qfai/evidence/coverage-depth-spec-0004.md`                                               | This block `## Gaps / Open risks`, the coverage-depth line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                         |
| 16   | acceptance-test-engineer | withdraw-atdd        | Coverage-depth paragraph restored byte-for-byte                                | `.qfai/evidence/coverage-depth-spec-0004.md`                                               | One paragraph of `coverage-depth-spec-0004.md`, byte-identical to its earlier text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | PASS                         |
| 17   | backend-engineer         | withdraw-impl        | Both READMEs drop `steering/` (pack REQ-0012)                                  | `discussion-20260923060900824#REQ-0012`                                                    | `README.md` and `packages/qfai/README.md`, edited together                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                         |

## Gaps / Open risks

- `.qfai/evidence/coverage-depth-spec-0004.md` was recomputed by the stage
  that owns it. It scores no row for TC-0004-0074..0076 or their rules, and
  scores BR-0004-0017 on TDD-0072 alone; this run does not edit it.
- The five `QFAI-ATDD-102` errors of this spec cleared when the test files were
  deleted and `reviewerJustification.test.ts` was edited; the post-deletion
  runs above show none.
- `QFAI-TRACE-003` predates this run and keeps `QFAI-TRACE-001` from running
  for spec-0004, so the re-bound BR-0004-0001 row is not checked by the gate.
  Fixing the AC heading shape is outside this Change Request.
- The pack's `## Rejected Decisions` and the older DL entries still describe
  the absence tests. They stay as history.
- `CR-20260925-0010` `Applied at` is still `-`; the `## Change Requests` row
  copies it.
- Not independent reviewers for this pack: `sdd-withdraw-author`.

## Final status

- Final status: REVISE
- Rationale: the spec side is written and validates as before, but the routed
  gates and reviewers are `PENDING`, so the stage is not done.
