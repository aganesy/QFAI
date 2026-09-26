# Evidence: /qfai-sdd (spec-0006)

## Objective

- Spec target: spec-0006
- Objective: state `qfai doctor`'s directory checks and skill-manifest probe by
  their `paths.*` keys, so they hold on the story tree and the singular
  assistant tree, and record the removal of the capability-catalog check at
  P7.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456` (24 REQ, NFR-0001..0008)
- `.qfai/evidence/sdd-batch-20260923100952585.md`, rulings X1–X14, the Phase
  0, 2, 2c and 3 decisions, P3-C1 to P3-C3
- `.qfai/specs/spec-0006/` 01–06, `09_delta.md`, `10_Plan.md`,
  `tdd/test-list.md`
- `.qfai/contracts/cli/qfai-doctor.md`
- `.qfai/specs/_policies/09_Open-questions.md` (OQ-0170)
- Source read to check claims: `packages/qfai/src/core/doctor.ts`,
  `packages/qfai/src/core/doctor/workflowsIntegrity.ts`,
  `packages/qfai/src/cli/commands/doctor.ts`

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage was
  persisted: ready, 24 imported requirements, no blockers and no pack gaps. The
  Triage was drafted against `run-20260923180635586`, which reported the same.

## Triage decisions

| Source                                                                                                              | Subject                                                                                                                                               | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0013 | Doctor directory and path checks follow `.qfai/spec` and `03_contract`, and the `spec.capCatalogSpecColumn` check and its autoremediation are removed | UPDATE    | MODIFY | -           | Slice C. Adopted (N12). No spec item describes the capability-catalog check, so nothing is removed from this spec; the code and its tests go in the P7 change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| discussion-20260923063306456#REQ-0018                                                                               | The skill-manifest probe follows `assistant/skill`                                                                                                    | UPDATE    | MODIFY | -           | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. |

## Open questions

- OQ-0170: how this repository migrates itself at the P7 cutover; the P7 half
  of this spec's first row depends on it — Disposition: open

## Decisions made

- N12 (Phase 0): the capability-catalog check and its autoremediation step
  are removed at P7.
- X1, X2 (Phase 2): wording that names a configuration key and holds in both
  layouts is rewritten in place; existing TCs and ledger rows unchanged.
- Phase 3: doctor adds no story-tree path of its own and reads every directory
  through `config.ts#resolvePath`.
- P3-C1 to P3-C3 (user, Phase 3): three pull requests.
- DELTA-0002: `09_delta.md` `## 2026-09-24 — spec-to-story batch record`.

## Work performed

- Phase 2: US-0006-0002, US-0006-0010, AC-0006-0003, AC-0006-0019,
  BR-0006-0016, EX-0006-0008 and EX-0006-0019 rewritten in place; four lines
  in `01_Spec.md`. No item or ledger row added.
- Phase 3: `10_Plan.md` `### Story-tree layout` subsections.
- Phase 4: `.qfai/specs/spec-0006/09_delta.md` DELTA-0002 and batch record —
  landing of 2 Triage rows, co-changes, 2 drift lines.

## Contract executability

- none

## Commands executed

```sh
qfai validate --profile sdd --fail-on error --spec spec-0006 --format github
```

Run with the CLI built from this worktree's source. The counts below are read
from the run log the command names.

## Validate evidence paths

- Validate run id `run-20260924142956379`, scope `sdd, spec-0006`: fail, 2
  errors, 33 warnings. The two errors are `QFAI-TDDLIST-017` on TC-0006-0029
  and TC-0006-0030, present before this batch; no new error. The warnings are the same findings as the run before the Reviewer Gate corrections; none is new.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ---------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | sdd-batch-20260923100952585.md#phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-3-grilling-decisions  |

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                            | Input (refs)                                      | Output (refs)                                        | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table    | Pack REQ/NFR, active spec summaries               | `09_delta.md` `## Triage (2026-09-23 spec-to-story)` | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds         | Triage drafts rev 1 and rev 2                     | REVISE (F1–F5), then PASS with named fixes N1–N4     | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G3                                 | Phase 2 item plan for spec-0003, spec-0006, spec-0007 | Phase 2 plan brief, Triage, Phase 0 decisions     | G3 item plan (orchestrator scratchpad)               | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups            | Eight item plans                                  | Rulings X1–X14, node rulings, Q1–Q3                  | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G3                               | Phase 2 wave A: 01_Spec and 02–04                     | Write brief, plans, rulings                       | `01_Spec.md`, 02–04                                  | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G3                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger        | Wave A output                                     | 05                                                   | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                    | Carry list, Phase 2 output                        | Contract corrections; no change to this spec         | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                            | Phase 2 items, contracts, plan template, source   | Elements, node rulings, P3-C1                        | PASS                         |
| 10   | solution-architect                                             | phase3-write-W1..W7                            | Phase 3: `10_Plan.md` and the `Owning module` cells   | Phase 3 rulings, write brief                      | `10_Plan.md`                                         | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate                | Seven plans, P3-C2                                | 195 files conform; no new validate error             | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D2                                | Phase 4: delta record and this evidence               | Phase 4 brief, batch record, Phase 2c and 3 notes | `09_delta.md` DELTA-0002 and batch record; this file | PASS                         |

## Gaps / Open risks

- AC-0006-0003 and EX-0006-0008 report a missing `paths.specsDir` directory as
  a warning, while doctor reports it at `info` when the key holds its default.
  Open.
- TC-0006-0003's current test cannot fail; the P7 replacement is the first
  that can.
- The baseline `QFAI-TDDLIST-017` errors on TC-0006-0029 and TC-0006-0030 are
  outside this batch's rows.

## Final status

- Final status: REVISE
- Rationale: Reviewer Gate pending.
