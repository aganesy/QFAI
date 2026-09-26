# Evidence: /qfai-sdd (spec-0014)

## Objective

- Spec target: spec-0014
- Objective: state what `/qfai-verify` reads on the story tree — Article V
  without the TC hop or the ledger, the spec and contract directories through
  `paths.*`, the policy files, `decisions.md` as its decision source, the
  constitution under `rule/`, and routing from the built-in defaults with
  `qfai.config.yaml` overrides — and record where each change lands.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456`, REQ-0001, REQ-0011, REQ-0013,
  REQ-0016 and REQ-0017
- `.qfai/evidence/sdd-batch-20260923100952585.md` — the batch record this run
  belongs to
- `.qfai/specs/spec-0014/01_Spec.md` to `06_Test-Cases.md`, `10_Plan.md`,
  `16_Traceability-ledger.md` and `tdd/test-list.md`
- `.qfai/specs/spec-0014/09_delta.md` — the `## Triage (2026-09-23 spec-to-story)`
  rows
- `.qfai/contracts/cli/qfai-init.md` — `#the-spec-tree`, `#configuration`
- `scripts/dogfood-backlog.json` — no `QFAI-TRACE-001` pin for this spec yet

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, source `discussion-pack`, 24
  imported requirements, no pack gaps and no carried-over open questions. It is
  the run taken after the Triage tables were persisted.

## Triage decisions

| Source                                                                                                              | Subject                                                                                                                                                                                                       | Operation | Sub-op | Approved By | Rationale                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0011, discussion-20260923063306456#REQ-0013 | `/qfai-verify` references: the TC chain and ledger (`references/articles.md`), the spec and contract directories and catalog steering files (`references/context-load.md`), the decision sources (`SKILL.md`) | UPDATE    | MODIFY | -           | Slice B, lands P7. The catalog steering files move with the relocation, which cannot land in this repository before P7 |
| discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017                                        | `/qfai-verify` loads constitution and manifest content from `rule/` and `qfai.config.yaml`                                                                                                                    | UPDATE    | MODIFY | -           | Slice B, lands P6, with this repository's P6 co-changes at `pnpm sync:ssot` time                                       |

The full Rationale of each row is in `09_delta.md`.

## Open questions

- OQ-0170 (`_policies`): how this repository migrates its own tree at the P7
  cutover. — Disposition: open
- OQ-0005 (this spec): CSS value auto-extraction precision. Untouched by this
  run. — Disposition: deferred

## Decisions made

- Q1: the `QFAI-TRACE-001` findings this spec's `03` and `04` edits raise are
  pinned in `scripts/dogfood-backlog.json` as a one-off exception, lifted when
  the linked files change or P7 retires the ledgers — decided by the user.
- G5-11: MODIFY rows with nothing to modify add items under the existing
  US-0014-0018 and keep their operation — adopted by agents.
- G5-8: `articles.md` restates Article V rather than spelling the chain —
  adopted by agents.
- P2C-16: AC-0014-0024 and BR-0014-0027 name `objective.md`, `initiative.md`
  and `principle.md` — adopted by agents.
- P3-D01: the skill cites `rule/agent-selection.md` for where the built-in
  defaults are read from — adopted by agents.
- P3-C1: no dogfood pin for `QFAI-ATDD-111` and `QFAI-ATDD-112`; pull request 2
  carries the ATDD and implementation tests — decided by the user.

## Work performed

- `.qfai/specs/spec-0014/01_Spec.md` — two Scope lines and two pack requirement
  lines
- `.qfai/specs/spec-0014/03_Acceptance-Criteria.md` — AC-0014-0023 to 0026
- `.qfai/specs/spec-0014/04_Business-Rules.md` — BR-0014-0026 to 0030
- `.qfai/specs/spec-0014/05_Examples.md` — EX-0014-0030 to 0034
- `.qfai/specs/spec-0014/06_Test-Cases.md` — TC-0014-0037 to 0041
- `.qfai/specs/spec-0014/tdd/test-list.md` — TDD-0042 to 0046 at `todo`
- `.qfai/specs/spec-0014/10_Plan.md` — the story-tree subsections
- `.qfai/specs/spec-0014/09_delta.md` — the Triage rows, and the section
  `## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands`:
  the landing of two rows, no REMOVE row, four co-change lines and one settled
  drift line
- Review cycle 1 fixes: `10_Plan.md` names the six keys of the
  `QFAI-TRACE-001` pin with their counts in the `tdd` and `full` profiles,
  the Q1 exception, and the re-pin a commit owes when it touches a keyed file;
  `09_delta.md` records it.

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0014 --format github
```

Run with the CLI built from this worktree's source, from the repository root,
scoped to this spec. GitHub shows at most ten annotations per level, so the
counts below are the run's own record, not the printed annotations.

## Validate evidence paths

- Validate run id `run-20260924142657707`, scope `--profile sdd --spec spec-0014`: pass, error=0,
  warning=29, info=4, after this cycle's fixes. The same warnings as the run before these fixes:
  - thirteen `QFAI-TRIAGE-010` on `_policies` rows no ledger carries
  - thirteen `W-WORKLOG-BROKEN-LINK` and one `W-WORKLOG-SCHEMA` on the work-log
    surface
  - one `QFAI-LINK-001` for integration links this Windows checkout cannot
    follow
  - one `QFAI-DCON-034` for the unreplaced sample brand

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ------------------------------------------ |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | batch record, #phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | batch record, #phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | batch record, #phase-3-grilling-decisions  |

Every escalated decision has the user's answer, so each row is `run`. Phase 0
and Phase 1 ran once for the batch and are recorded there.

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                                                                        | Output (refs)                                            | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries, `sdd-triage.md`                                                | Triage sections in the delta files, this spec's included | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                                                                       | REVISE (F1–F5), then PASS with named fixes N1–N4         | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G5                                 | Phase 2 item plan for spec-0008, 0011 and 0014      | Phase 2 plan brief, Triage, Phase 0 decisions                                                       | Item plan                                                | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                                                                    | Rulings X1–X14, node rulings, Q1–Q3                      | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G5                               | Phase 2 wave A: 01_Spec and 02–04                   | Write brief, plan, rulings                                                                          | spec-0014 01, 03, 04                                     | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G5                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                                                                       | spec-0014 05, 06, `tdd/test-list.md`                     | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                                                                          | The policy file names in AC-0014-0024 and BR-0014-0027   | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source                                                     | Elements, node rulings, P3-C1                            | PASS                         |
| 10   | solution-architect                                             | phase3-write-W4                                | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                                                                        | spec-0014 `10_Plan.md`; ledger cells                     | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                                                                                  | Plans conform; no new validate error                     | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D3                                | Phase 4: the delta record and this evidence file    | Batch record, Phase 2c and Phase 3 carry lists                                                      | spec-0014 `09_delta.md`; this file                       | PASS                         |
| 13   | test-design-analyst                                            | review1-fix-FA                                 | Review cycle 1 fixes for spec-0014                  | Review pack `review-20260924014832174`; review rulings (qa-gatekeeper finding on the TRACE-001 pin) | spec-0014 `10_Plan.md`, `09_delta.md`; this file         | PASS                         |

Step numbers follow the batch record. Its step 5, the Phase 2 Triage amendments,
changed no row of this spec.

## Gaps / Open risks

- The `QFAI-TRACE-001` pin is not in `scripts/dogfood-backlog.json` yet. Until
  pull request 2 adds it, the tdd and full dogfood lanes fail on the
  implementation files `16_Traceability-ledger.md` links. The plan names its
  keys and counts.
- The `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that TC-0014-0037 to 0041 and
  the E2E rows raise in the dogfood lanes clear only when pull request 2 carries
  the ATDD and implementation tests (P3-C1).
- The Reviewer Gate's re-review of this record has not run.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate's first cycle returned REVISE. This cycle's
  fixes are applied, and the re-review is pending.
