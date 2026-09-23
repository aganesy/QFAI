# Evidence: /qfai-sdd (spec-0004)

This file holds one section set per `/qfai-sdd` run. The current run comes
first; earlier runs follow under `## Prior run`, unchanged.

## Objective

- Spec target: spec-0004
- Objective: apply `CR-20260923-0011` in mode `re-derive`. AC-0004-0041,
  BR-0004-0035, EX-0004-0044 and TC-0004-0076 state that a `blocked` row passes
  on a well-formed `Blocked-By`, naming what it waits on and the status it was
  blocked at, as `TDDLIST_BLOCKED_MISSING_REF` checks.

## Inputs reviewed

- `.qfai/decisions/CR-20260923-0011-spec-0004-passes-a-blocked-row-the-kept-check-fails.md`
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
  `Blocked-By` — the check the spec keeps, stated as it is (CR-20260923-0011).

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
| 2     | skipped | -        | 2026-09-23T20:05:55Z | empty: answered by CR-20260923-0011 | -        |
| 2c.1  | skipped | -        | -                    | empty: answered by DR-0004-0034     | -        |

- Batch record: none

## Work Orders Summary

| Step | Role (sub-agent)     | Agent instance         | Task title                                                                | Input (refs)                                                                              | Output (refs)                                                                                    | Status (PASS/REVISE/PENDING) |
| ---- | -------------------- | ---------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| 1    | requirements-analyst | cr-0004-author         | Change Request for the `Blocked-By` defect                                | `/qfai-atdd` run key `2026-09-23T19:33:24.738Z`; EX-0004-0044; BR-0004-0035; `tddList.ts` | `CR-20260923-0011`, Class `defect`, approved by yusuke_senaga                                    | PASS                         |
| 2    | requirements-analyst | cr-0004-author         | Phase 2 re-derive: AC-0004-0041, BR-0004-0035, EX-0004-0044, TC-0004-0076 | `CR-20260923-0011` `## Proposed change`                                                   | Files under Work performed; DR-0004-0043; validate sdd `--spec spec-0004`: 0 errors              | PASS                         |
| 3    | requirements-analyst | cr-0004-author         | Phase 2b and 2c read only; Phase 4 delta                                  | `tdd/test-list.md` TDD-0069..TDD-0071; DR-0004-0034                                       | No ledger write; DELTA-0002, DL-0029, `## Change Requests` row; CR `Resolution` and `Applied at` | PASS                         |
| 4    | completion-reviewer  | gate-cr0004-completion | Reviewer Gate for this rerun                                              | this section, `CR-20260923-0011`, `.qfai/specs/spec-0004/**`                              | `review-20260923201700600` R01: PASS, advisories A1-A3 only; `summary.json` overall PASS         | PASS                         |

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
