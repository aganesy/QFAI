# Evidence: /qfai-sdd (spec-0012)

## Objective

- Spec target: spec-0012
- Objective: state what `qfai prototyping` does when the UI contract
  `CON-UI-NNNN` replaces `spec-NNNN` as its unit — the renamed flag, config
  key, `show-spec` and `specsCovered` family, the lock frozen at the contract
  step, `.qfai/prototype`, and the design lock under
  `<paths.contractsDir>/design/` — and record how the approved removal of three
  examples and their test cases lands, in the batch run
  `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`: REQ-0001, REQ-0005,
  REQ-0014, REQ-0018
- `.qfai/evidence/sdd-batch-20260923100952585.md`, rulings X1–X14, the Phase
  0, 2, 2c, 3 and 4 decisions, P3-C1 to P3-C3
- `.qfai/specs/spec-0012/` 01–06, `09_delta.md`, `10_Plan.md`,
  `tdd/test-list.md`, `16_Traceability-ledger.md`
- `.qfai/contracts/cli/qfai-prototyping.md`,
  `.qfai/contracts/cli/qfai-prototyping-iterate.md`
- `.qfai/specs/_policies/09_Open-questions.md` (OQ-0170, OQ-0177, OQ-0179,
  OQ-0183)

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, 24 imported requirements,
  no blockers and no pack gaps.

## Triage decisions

| Source                                | Subject                                                                                                                                                                                                                                                                                                                                                                               | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001 | The prototyping unit becomes the UI contract `CON-UI-NNNN`: the flag, the config key, `qfai prototyping show-spec` and the `specsCovered` family are renamed to it, `specsCovered` and `frozenSpecsCovered` merge into one field with the fail-closed checks kept, and a `prototyping.json` record from before 2.0.0 hard-fails with a re-seed instruction while its evidence is kept | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover). Decided by the user (OQ-0179); N36 to N38 adopted. Size signal: 73 AC / 179 TC; the spec owns exactly CAP-0012, so no SPLIT. Re-check whether any TC's Level or obligation column changes when the items are written                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| discussion-20260923063306456#REQ-0014 | `DESIGN.md.lock` is frozen at the 03-contract step, not at Phase 0                                                                                                                                                                                                                                                                                                                    | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| discussion-20260923063306456#REQ-0018 | `.qfai/prototypes` becomes `.qfai/prototype`                                                                                                                                                                                                                                                                                                                                          | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. |
| discussion-20260923063306456#REQ-0005 | The design lock and `design-system.yaml` move to `03_contract/design/`                                                                                                                                                                                                                                                                                                                | UPDATE    | MODIFY | -             | Slice C, lands P7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260923063306456#REQ-0001 | Remove EX-0012-0147, EX-0012-0152 and EX-0012-0158 with TC-0012-0418, TC-0012-0423 and TC-0012-0429                                                                                                                                                                                                                                                                                   | UPDATE    | REMOVE | yusuke_senaga | Slice C, lands P7 with the prototyping rewrite and the tests annotating these TCs; their ledger rows are tombstoned. Each resolves a UI contract per spec, which ends when the unit is the UI contract. BR-0012-0030 keeps 11 other examples                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0170: how this repository migrates itself at the P7 cutover; every row
  of this spec depends on it — Disposition: open
- OQ-0177: placement of the multi-skill assistant files, which the P6 row
  follows — Disposition: resolved
- OQ-0179: the unit that replaces `spec-NNNN` in prototyping is the UI
  contract `CON-UI-NNNN` — Disposition: resolved
- OQ-0183: the readers of `primarySpecId` that no item covers — Disposition:
  open

## Decisions made

- OQ-0179 (user, Phase 0): the unit is the UI contract `CON-UI-NNNN`; the
  flag, the config key, `show-spec` and the `specsCovered` family are renamed
  to it.
- N34b (user, Phase 0): the REMOVE row for EX-0012-0147, EX-0012-0152 and
  EX-0012-0158 with their three test cases is approved.
- N36, N37, N38 (Phase 0): a record from before 2.0.0 hard-fails with a
  re-seed instruction; `specsCovered` and `frozenSpecsCovered` merge into one
  field; `show-spec` follows the unit.
- G7-1 and G7-3 (Phase 2): approach B, items changed in place with the
  story-tree clause beside the current one; only the contract sentence of the
  re-seed is stated.
- Phase 2c: the pin accepts only the full `CON-UI-NNNN` form (BR-0012-0055).
- P3-C1 to P3-C3 (user, Phase 3): three pull requests; this spec's rows land
  in the second.
- DELTA record: `09_delta.md`
  `## 2026-09-23 — Story-tree restructure (sdd-batch-20260923100952585)`.

## Work performed

- Phase 2: US-0012-0105, 0109..0111, 0113..0116, 0129, 0130, 0133 and 0138;
  AC-0012-0009, 0034..0038, 0040..0042, 0045..0052, 0059, 0063, 0065, 0067
  and 0072; BR-0012-0001, 0009, 0026..0032, 0034..0040, 0047, 0051, 0053, 0055
  and 0060, all changed in place; `01_Spec.md` Consumer View, Scope,
  Applicable NFR, Evidence Summary and requirement lines. No ID added or
  retired.
- Phase 2b: no row; examples, test cases and both ledgers unchanged (X2).
- Phase 3: `10_Plan.md` `### Story-tree layout` subsections.
- Phase 4: `.qfai/specs/spec-0012/09_delta.md` batch record — landing of 5
  Triage rows, the items the REMOVE row retires, co-changes and the recorded
  drift; this file, which replaces the record of the earlier cycles.

## Contract executability

- none

## Commands executed

```sh
qfai validate --profile sdd --fail-on error --spec spec-0012 --format text
node 'C:\Users\pc\AppData\Local\Temp\claude\C--Users-pc-Documents-GitHub-QFAI--claude-worktrees-qfai-specs-restructure-ec45fd\f0bdcc77-8dc1-4976-973b-d9ca34906cef\scratchpad\cli\index.cjs' validate --profile sdd --fail-on error --spec spec-0012 --format github
```

Run with the CLI built from this worktree's source.

## Validate evidence paths

- Validate run id `run-20260924104214698`, scope `sdd, spec-0012`: fail, 8 errors,
  35 warnings, 4 info. The eight errors are `QFAI-TDDLIST-017` on the ledger
  rows of TC-0012-0319 to TC-0012-0335, present before this batch; no new error.
- GitHub-format validate run id `run-20260924154353881`, scope `sdd,
  spec-0012`: exit 1, 9 errors, 35 warnings, 4 info. Eight errors are the
  same `QFAI-TDDLIST-017` baseline. The ninth is
  `TRACE_SHARED_SCOPE_VIOLATION` on `_policies/10_delta.md` for
  `BR-0004-0081`, outside this spec's owned files.
- After the shared policy delta was corrected, GitHub-format run
  `run-20260924154552753` exited 1 with 8 errors, 35 warnings and 4 info.
  The eight errors are the same pre-existing `QFAI-TDDLIST-017` rows; the
  shared-scope error is gone.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ---------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | sdd-batch-20260923100952585.md#phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-3-grilling-decisions  |

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

Each row reads `run` for its pre-draft session. Phase 3's P3-C2 and P3-C3
were settled after the first draft and applied in consolidation. Phases 0 and
1 ran once for the batch and are in the batch record.

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                    | Output (refs)                                        | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries             | `09_delta.md` `## Triage (2026-09-23 spec-to-story)` | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                   | REVISE (F1–F5), then PASS with named fixes N1–N4     | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G7                                 | Phase 2 item plan for spec-0012                     | Phase 2 plan brief, Triage, Phase 0 decisions   | G7 item plan (orchestrator scratchpad)               | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                | Rulings X1–X14, node rulings G7-1 and G7-3           | PASS                         |
| 5    | requirements-analyst                                           | triage-amend                                   | Persist Phase 2 Triage amendments                   | Griller ruling, user answers Q2, Q3             | This spec's Triage rows among others                 | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G7                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plans, rulings                     | `01_Spec.md`, 02–04                                  | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                      | Full-form pin (BR-0012-0055); contract corrections   | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source | Elements, node rulings, P3-C1                        | PASS                         |
| 10   | solution-architect                                             | phase3-write-W6                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                    | `10_Plan.md`                                         | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                              | 195 files conform; no new validate error             | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D5                               | Phase 4: the delta record                           | Batch record, Phase 2c and Phase 3 notes        | `09_delta.md` batch record                           | PASS                         |
| 13   | requirements-analyst                                           | phase4-wrapup                                  | Phase 4 wrap-up: open questions and this file       | Batch record Phase 4 decisions, `09_delta.md`   | OQ-0183; this file                                   | PASS                         |
| 266  | requirements-analyst                                           | review2-fix-Y                                 | Apply the cycle-2 spec-0012 review findings         | R01 #14 and R02 #9, cycle 2                     | `exitCodes.ts` in the P7 plan; GitHub-format validate run recorded | PASS                         |

Step numbers are the batch record's. Step 7 wrote nothing here: no example,
test case or ledger row changed.

## Gaps / Open risks

- The drift recorded in `09_delta.md`: REQ-0012-0078 names a
  `--check-convergence` input path the record is not at; the `## Entry points`
  ranges in `01_Spec.md` stop well short of the IDs the spec holds;
  BR-0012-0034 lists four hard-stop classes where AC-0012-0045 lists eight;
  `readUiContractScreenContracts` drops a contract whose screens all repeat
  another file's; the plan cites a test file that does not exist.
- OQ-0183: `QFAI-CFG-LINK-001`, the handoff schema field and
  `prototyping rescope --remove` still read `primarySpecId`.
- `QFAI-TDDLIST-017` on this spec's ledger predates this run and stays in the
  `sdd` gate's error count.
- 53 existing test cases are rewritten with their tests at P7, and their
  ledger rows are re-verified then.

## Final status

- Final status: REVISE
- Rationale: Reviewer Gate pending.
