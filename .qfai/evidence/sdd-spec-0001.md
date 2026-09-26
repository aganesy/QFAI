# Evidence: /qfai-sdd (spec-0001)

## Objective

- Spec target: spec-0001
- Objective: state the story tree beside the spec-pack structure — layout, the
  two tables, ID grammar, the chain BF → US → AC → EX ← BR, test annotation
  layers, the mdschema entries and the `rule/ skill/ agent/ prompt/` assistant
  tree — and record what the approved REMOVE row retires when it lands at P7.

## Inputs reviewed

- `discussion-20260923063306456` (REQ-0001 to 0009, 0011 to 0013, 0017, 0018,
  0022; NFR-0006)
- `.qfai/specs/spec-0001/` (01 to 10 and `tdd/test-list.md`)
- `.qfai/specs/_policies/` (03, 06, 07, 09, 10, 11)
- `.qfai/contracts/cli/qfai-validate.md`, `.qfai/contracts/cli/qfai-init.md`
- `.qfai/evidence/sdd-batch-20260923100952585.md`
- `packages/qfai/src/core/ids.ts`, `packages/qfai/src/core/businessFlow.ts`,
  `packages/qfai/src/core/validators/upstreamSsotGuard.ts`,
  `packages/qfai/tests/integration/specPackSpec0001.test.ts`

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage was
  persisted: ready, 24 imported requirements, no blockers and no pack gaps. The
  Triage was drafted against `run-20260923180635586`, which reported the same.

## Triage decisions

| Source                                                                                                                                                                                            | Subject                                                                                                                                                                                                                            | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0003                                                                                                                      | Story tree `.qfai/spec/`: three layers, flow and story directories, a story directory holding exactly three files                                                                                                                  | UPDATE    | APPEND | -             | Slice A. New-layout items stand beside the old ones until P7. Conservation: every old-structure obligation is restated here or retired by this spec's REMOVE row, none dropped silently. Agents adopted this split over SUPERSEDE without a user question: this spec also owns the chain, escalation hook, drift protocol, governance and assistant tree, and the positional capability gate ignores `Status`. Size signal: 12 AC / 24 TC today, about 30 AC / 45 TC at the peak while both layouts coexist; the spec owns exactly CAP-0001, so no SPLIT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0011                                                                               | Policy layer files, contract layer (index, `tech.md`, `structure.md`, five directories), `decisions.md` and `open-questions.md`                                                                                                    | UPDATE    | APPEND | -             | Slice A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| discussion-20260923063306456#REQ-0004, discussion-20260923063306456#REQ-0006, discussion-20260923063306456#REQ-0007, discussion-20260923063306456#REQ-0008, discussion-20260923063306456#REQ-0009 | ID grammar BF / US / AC / EX / BR; chain BF→US→AC→EX←BR; tests annotate BF, AC and EX                                                                                                                                              | UPDATE    | APPEND | -             | Slice A. Conservation pairs with this spec's REMOVE row, which retires the old ID formats and the US→AC→BR→EX→TC chain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| discussion-20260923063306456#REQ-0022, discussion-20260923063306456#NFR-0006                                                                                                                      | This spec owns the mdschema manifest: one entry and one paired template per new-tree file                                                                                                                                          | UPDATE    | APPEND | -             | Slice A. No active spec owns the mdschema manifest today (zero item references)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018                                                                                                                      | Assistant tree becomes `rule/`, skill `references/`, `agent/`, `skill/` and `prompt/`                                                                                                                                              | UPDATE    | MODIFY | -             | Slice B, lands P6; the old names end in the same phase. The mechanical path rewrite also covers `qfai-grill` and `qfai-grilling`, whose SKILL.md cite `constitution/` and `catalog/`; no spec owns those two skills, a follow-up outside this run. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. |
| discussion-20260923063306456#REQ-0012, discussion-20260923063306456#REQ-0013                                                                                                                      | Remove the old-layout items: 01_Spec, 06_Test-Cases, 10_Plan, 16_Traceability-ledger, test-list, 01_Spec-retired, CAP, Slice-Policy, lifecycle `Status`, `spec_required_files.json`, the old ID formats and the TC chain           | UPDATE    | REMOVE | yusuke_senaga | Slice C. This repository's self-validation reads all of these, so the row lands in the change that deletes `specLayout` and the validators, together with the tests annotating these TCs; the Article V chain in `constitution.md` is rewritten in that change. 33 live ledger rows are tombstoned under `## TDD-ID reservations`. Replacements: this spec's three APPEND rows. By the user's Phase 2 grilling answer (Q3) the row also covers spec-pack layout detection — the US-0001-0002 chain (AC-0001-0003, BR-0001-0004, BR-0001-0005, EX-0001-0004, EX-0001-0005, with TC-0001-0003 and TC-0001-0004) — and the `_policies` reference direction — the US-0001-0005 chain (AC-0001-0007, BR-0001-0014, BR-0001-0015, EX-0001-0011, EX-0001-0024, with TC-0001-0010 and TC-0001-0011); both retire at P7                                                                                                                                                                                                                                                                                  |
| discussion-20260923063306456#REQ-0012                                                                                                                                                             | Drift protocol: a change request is a `decisions.md` row, the protected set is re-keyed to the story tree, `contractsDir` and both tables, and appending a change-request row or changing a change-request row's Status is allowed | UPDATE    | MODIFY | -             | Slice C. This spec owns the drift protocol. Adopted (N07)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Open questions

- OQ-0170: how this repository migrates its own tree at the P7 cutover; the
  landing drops the spec-pack clauses — Disposition: open
- OQ-0173: next-ID allocation across parallel branches — Disposition: resolved
- OQ-0175: how CI enforces append-only rows — Disposition: resolved
- OQ-0177: final placement of each multi-skill assistant file — Disposition:
  resolved

## Decisions made

- Q3 (user): the REMOVE row also covers the layout-detection chain
  (US-0001-0002) and the `_policies` reference-direction chain (US-0001-0005);
  both retire at P7.
- X1: a story-tree clause beside the unchanged spec-pack clause, conditioned on
  the detected layout; new items where an approved REMOVE row retires the old
  one.
- G1-4: the Escalation Hook retires with `01_Spec.md`, which the row names.
- G1-6: BR-0001-0009 changed in place, layout-conditioned.
- G1-8: contract-layer schema patterns use a `{contractsDir}` token.
- G1-14: the assistant tree gets AC-0001-0030 and 0031 (X12).
- P2C-13: BR-0001-0038 counts IDs named in `decisions.md` rows, so a retired ID
  is never reissued.
- P2C-O1 (user): a change to `decisions.md` confined to `Change request:` rows
  needs no authorising row.
- Phase 3: elements E1, E2 and E3 land at P3 with their first consumers;
  `buildContractIndex` is not extended before P7.
- P3-C1, P3-C2, P3-C3 (user): three pull requests; the ATDD and implement tests
  land in the P2–P8 pull request with no dogfood pin.
- D5 (Reviewer Gate): TC-0001-0086 and 0087 read `documentsWithoutOneEntry`,
  exported by `check-mdschema.mjs`, instead of `mdschemaSchemas.test.ts`;
  TC-0001-0087 is L1.
- D11 (Reviewer Gate): TC-0001-0025 is L3; the family cases stay L1 on texts
  passed to E2's `buildStoryTreeModel(files)`.
- U2 (user, Reviewer Gate): X8 stands; no fallback to the old default path
  when `paths.specsDir` is absent.
- D12 (cycle-2 Reviewer Gate): `readFileAtBase` reads at the merge base, and
  `upstreamSsotGuard.ts` uses it for the base-without-story-tree predicate.

## Work performed

- `.qfai/specs/spec-0001/01_Spec.md` to `06_Test-Cases.md`: US-0001-0010 to
  0017, AC-0001-0013 to 0031, BR-0001-0025 to 0051, EX-0001-0025 to 0097,
  TC-0001-0025 to 0097; story-tree clauses in US-0001-0007, US-0001-0009,
  AC-0001-0009 and BR-0001-0009, 0017, 0018, 0019.
- `.qfai/specs/spec-0001/tdd/test-list.md`: TDD-0034 to 0114 at `todo`.
- `.qfai/specs/spec-0001/10_Plan.md`: `### Story-tree layout` subsections.
- `.qfai/specs/spec-0001/09_delta.md`: change summary entry DELTA-0001-0002 and
  `## 2026-09-23 — Spec-to-story restructure: record of this run`.
- Reviewer Gate corrections, recorded under that record's
  `### Corrections from the Reviewer Gate (2026-09-24)`: AC-0001-0028,
  BR-0001-0047, EX-0001-0086, 0087 and TC-0001-0086, 0087 name
  `documentsWithoutOneEntry`; TC-0001-0025, 0041, 0042 and 0087 change Level,
  with TDD-0034, 0050, 0051 and 0096; `10_Plan.md` names the function, E2's
  `buildStoryTreeModel(files)`, `contractReferences.ts` as an E2 consumer,
  the exported `resolveTestKind` and the X8 answer.

## Contract executability

- none

## Commands executed

```sh
qfai validate --profile sdd --fail-on error --spec spec-0001 --format github
```

Run with the CLI built from this worktree's source. The counts below are read
from the run log the command names.

## Validate evidence paths

- Validate run id `run-20260924142942787`, scope `sdd, spec-0001`: fail, 1
  error, 32 warnings. The error is `QFAI-REVIEW-004` on the review pack
  `review-20260924014832174`, which has no `summary.json` until the
  orchestrator writes its summary. The warnings are the same findings as the run before the Reviewer Gate corrections; none is new.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                                    |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | --------------------------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | `.qfai/evidence/sdd-batch-20260923100952585.md#phase-2-grilling-decisions`  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | `.qfai/evidence/sdd-batch-20260923100952585.md#phase-2c-grilling-decisions` |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | `.qfai/evidence/sdd-batch-20260923100952585.md#phase-3-grilling-decisions`  |

The table records the pre-draft sessions. P3-C2 and P3-C3 were answered after
the first Phase 3 plan draft; `phase3-consolidate` aligned the plans with P3-C2.
Their timing and the user answers are recorded in the batch record.

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                                    | Input (refs)                                                               | Output (refs)                                                                 | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table            | Pack REQ/NFR, active spec summaries, `sdd-triage.md`                       | Triage section in `spec-0001/09_delta.md`                                     | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds                 | Triage drafts rev 1 and rev 2                                              | REVISE (F1–F5), then PASS with named fixes N1–N4                              | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G1                                 | Phase 2 item plan for spec-0001 (grilling round 1)            | Phase 2 plan brief, Triage, Phase 0 decisions                              | G1 item plan (orchestrator scratchpad)                                        | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups                    | Eight item plans                                                           | Rulings X1–X14, G1 node rulings, Q1–Q3                                        | PASS                         |
| 5    | requirements-analyst                                           | triage-amend                                   | Persist Phase 2 Triage amendments                             | Griller ruling, user answer Q3                                             | Q3 note on the spec-0001 REMOVE row                                           | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G1                               | Phase 2 wave A: `01_Spec.md` and 02–04                        | Write brief, G1 plan, rulings                                              | `spec-0001/01_Spec.md` to `04_Business-Rules.md`                              | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G1                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger                | Wave A output                                                              | `spec-0001/05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`            | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                            | Carry list, Phase 2 output                                                 | Contract corrections, BR-0001-0019 and 0038 alignment                         | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                                    | Phase 2 items, contracts, plan template, source                            | Elements E1–E5, node rulings, P3-C1                                           | PASS                         |
| 10   | solution-architect                                             | phase3-write-W1..W7                            | Phase 3: `10_Plan.md` and the `Owning module` cells           | Phase 3 rulings, write brief                                               | `spec-0001/10_Plan.md`; ledger cells                                          | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate                        | Seven plans, P3-C2                                                         | 195 files conform; no new validate error                                      | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D1                               | Phase 4: delta record and this evidence                       | Batch record, Phase 2–3 carry lists, Phase 4 brief                         | `spec-0001/09_delta.md`; this file                                            | PASS                         |
| 13   | test-design-analyst                                            | review-fix-FC                                  | Reviewer Gate corrections: D5, D11, U2, R02 findings 6 and 16 | Review pack `review-20260924014832174`, rulings D1–D11, user answers U1–U3 | `spec-0001` 03–06, `tdd/test-list.md`, `10_Plan.md`, `09_delta.md`; this file | PASS                         |
| 266  | requirements-analyst                                          | review2-fix-X                                 | Cycle-2 corrections: D12 and grilling timing                 | Review pack `review-20260924053652061`, ruling D12                        | `10_Plan.md`, `09_delta.md`, this file                                         | PASS                         |

## Gaps / Open risks

- Open drift recorded in `09_delta.md`: the stale drift-protocol path in
  US-0001-0007 Notes; BR-0001-0019's incomplete spec-pack exception list; the
  drift gate's owner-versus-downstream blind spot; Owning module cells that name
  a module other than the one holding the code.
- The new L1, L3 and E2E rows stay `todo` until the ATDD and implement passes of
  the P2–P8 pull request.
- Family cases moved to L3 because their decision needs the disk: TC-0001-0041
  and 0042, the unlisted contract, which reads `api/` through
  `buildContractIndex`.

## Final status

- Final status: REVISE
- Rationale: Reviewer Gate pending.
