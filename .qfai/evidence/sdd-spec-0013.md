# Evidence: /qfai-sdd (spec-0013)

## Objective

- Spec target: spec-0013
- Objective: state what `/qfai-sdd` does on the story tree — the concrete-first
  order, the tree and its templates, the two tables, ID allocation, business
  rules inside contracts, the edges BF → US → AC → EX ← BR, the moved assistant
  files and the per-flow gate — and record what the two approved REMOVE rows
  retire when they land at P7.

## Inputs reviewed

- `discussion-20260923063306456` (REQ-0001 to 0008, 0011 to 0014, 0017, 0022, 0023)
- `.qfai/specs/spec-0013/` (01 to 10 and `tdd/test-list.md`)
- `.qfai/specs/spec-0001/` (the layout, grammar and chain this spec writes)
- `.qfai/contracts/cli/qfai-validate.md`
- `.qfai/evidence/sdd-batch-20260923100952585.md`
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/` (`SKILL.md`,
  `references/`, `templates/`)
- `scripts/dogfood-backlog.json`

## Preflight summary path

- Preflight run id `run-20260923191813154`: ready, source `discussion-pack`, 24
  imported requirements, no pack gaps and no carried-over open questions. It is
  the run taken after the Triage tables were persisted.

## Triage decisions

| Source                                                                                                                                                                                                                                                                                                                 | Subject                                                                                                                                              | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0014                                                                                                                                                                                                                                                                                  | Concrete-first order: 01 policy, 02 business flow, stories, 03 contract with BRs                                                                     | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover). Size signal: 27 AC / 35 TC, above 30 AC after the rewrite; the spec owns exactly CAP-0013, so no SPLIT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0003, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0011, discussion-20260923063306456#REQ-0012, discussion-20260923063306456#REQ-0022, discussion-20260923063306456#REQ-0023 | `/qfai-sdd` writes the story tree, both tables and the paired templates; the five merged files state each fact once                                  | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover); the templates wait for the guard patterns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| discussion-20260923063306456#REQ-0004                                                                                                                                                                                                                                                                                  | `/qfai-sdd` allocates the BF, US, AC, EX, BR, DEC and OQ IDs                                                                                         | UPDATE    | APPEND | -             | Slice B, lands P7 (P4 merged into cutover)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| discussion-20260923063306456#REQ-0006                                                                                                                                                                                                                                                                                  | BRs are written inside the contract that enforces them                                                                                               | UPDATE    | APPEND | -             | Slice B, lands P7 (P4 merged into cutover)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| discussion-20260923063306456#REQ-0007, discussion-20260923063306456#REQ-0008                                                                                                                                                                                                                                           | Required edges become BF→US→AC→EX←BR                                                                                                                 | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| discussion-20260923063306456#REQ-0017                                                                                                                                                                                                                                                                                  | `change-classification.md` moves to `rule/`; `requirements-decomposition.md` moves to the qfai-sdd `references/`                                     | UPDATE    | MODIFY | -             | Slice B, lands P6. Adopted (OQ-0177). P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. |
| discussion-20260923063306456#REQ-0013, discussion-20260923063306456#REQ-0014                                                                                                                                                                                                                                           | Remove Contracts-first, the Outline, Slice, Plan and Delta phases, capability batch mode, capability-keyed auto-discovery and `spec-XXXX` generation | UPDATE    | REMOVE | yusuke_senaga | Slice B, lands P7 (P4 merged into cutover), with the SDD rewrite and the asset tests annotating these TCs; the template files go in spec-0003's template REMOVE row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| discussion-20260923063306456#REQ-0013                                                                                                                                                                                                                                                                                  | Remove US-0013-0013 with AC-0013-0022, AC-0013-0023, BR-0013-0018, EX-0013-0018, TC-0013-0030 and TC-0013-0031                                       | UPDATE    | REMOVE | yusuke_senaga | Slice C, lands P7 with the prototyping and SDD rewrite and the tests annotating these TCs; ledger rows TDD-0025 and TDD-0026 are tombstoned. Frontmatter on a spec file no longer marks a UI-bearing surface once the unit is the UI contract. TC-0013-0029 stays: its EX-Ref is EX-0013-0017, the active discussion pointer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                                                                                                                                                                                                                           | The scoped completion gate moves from `qfai validate --profile sdd --spec <spec-id>` to `--flow BF-NNNN`                                             | UPDATE    | MODIFY | -             | Slice C, lands P7 (P4 merged into cutover). Follows the user's Phase 2 grilling answer (Q2) and spec-0004's `--flow` rows. The skill gates on `--spec` today in `SKILL.md` (the per-spec Phase 2 gate) and `references/review-cycle-playbook.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Open questions

- OQ-0170: how this repository migrates its own tree at the P7 cutover; the
  landing drops the spec-pack clauses — Disposition: open
- OQ-0172: renumbering when a business flow splits or reorders — Disposition:
  open
- OQ-0173: next-ID allocation across parallel branches — Disposition: resolved
- OQ-0176: the rule fields in each contract form — Disposition: resolved
- OQ-0177: final placement of each multi-skill assistant file — Disposition:
  resolved
- OQ-0179: the unit that replaces `spec-NNNN` in prototyping — Disposition:
  resolved

## Decisions made

- N34 (user): the REMOVE row for US-0013-0013 with its AC, BR, EX and TC is
  approved.
- Q2 (user): the scoped gate takes `--flow BF-NNNN`; `--spec` exits 2 on a story
  tree.
- X1 and G8-1: a story-tree clause beside the unchanged spec-pack clause; new
  items where an approved REMOVE row retires the old one.
- G8-2: new criteria under existing stories, no new story.
- G8-3: the first REMOVE row covers every listed item, including the first of
  each duplicated AC heading.
- G8-7: a triage record is a `decisions.md` row naming the operation, the BF or
  US and the REQ pair.
- G8-8 and G8-9: retired IDs are never reissued; the allocation shortcut lifts
  when a merge has to renumber a colliding ID.
- G8-10: the skill owns the content of its templates.
- P3-D11: the four "fails the check" rows are tested by an oracle over the
  product artifact, with no new finding family.
- P3-C1, P3-C2, P3-C3 (user): three pull requests; the ATDD and implement tests
  land in the P2–P8 pull request with no dogfood pin.
- Phase 4: TDD-0042, the E2E row of US-0013-0013, joins TDD-0025 and TDD-0026 on
  the retirement list.
- Review rulings applied in cycle 1: D2 (one ledger row per check; each
  file of the four is a selector entry), and each split row's owner matches its
  oracle.

## Work performed

- `.qfai/specs/spec-0013/01_Spec.md` to `06_Test-Cases.md`: AC-0013-0028 to
  0036, BR-0013-0021 to 0034, EX-0013-0021 to 0034, TC-0013-0036 to 0058;
  story-tree clauses in US-0013-0001, 0005, 0009, AC-0013-0015, BR-0013-0002,
  0012 and EX-0013-0012.
- `.qfai/specs/spec-0013/tdd/test-list.md`: TDD-0044 to 0077 at `todo`, and
  TDD-0078 from the review cycle below.
- `.qfai/specs/spec-0013/10_Plan.md`: `### Story-tree layout` subsections.
- `.qfai/specs/spec-0013/09_delta.md`:
  `## 2026-09-23 — Spec-to-story restructure: record of this run`.
- Review cycle 1 fixes:
  - `tdd/test-list.md`: TDD-0059 gains the `Boundary` slug
    `outside-tech-md` and keeps `-` as its owner, since its oracle reads four
    templates; TDD-0078 `tech-md-outside-standard-commands` is added at
    `todo`, owned by the `tech.md` template (review ruling D2)
  - `10_Plan.md`: the P3-D11 table splits the TDD-0059 row, and a second table
    names the finding family behind TC-0013-0051 (the duplicate-ID error) and
    TC-0013-0056 (`skillDocReferences.ts`)
  - `09_delta.md`: the record states the same

## Contract executability

- none

## Commands executed

```sh
npx qfai validate --profile sdd --fail-on error --spec spec-0013 --format github
```

Run with the CLI built from this worktree's source, from the repository root,
scoped to this spec. GitHub shows at most ten annotations per level, so the
counts below are the run's own record, not the printed annotations.

## Validate evidence paths

- Validate run id `run-20260924142654635`, scope `--profile sdd --spec spec-0013`: fail, error=3,
  warning=30, info=4, after this cycle's fixes. The 3 errors are the known `QFAI-ID-002`
  duplicate headings AC-0013-0008, 0009 and 0010, pinned in
  `scripts/dogfood-backlog.json` and cleared when the first REMOVE row lands.
  Errors and warnings are the same set the run before these fixes reported.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                                    |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | --------------------------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | `.qfai/evidence/sdd-batch-20260923100952585.md#phase-2-grilling-decisions`  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | `.qfai/evidence/sdd-batch-20260923100952585.md#phase-2c-grilling-decisions` |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | `.qfai/evidence/sdd-batch-20260923100952585.md#phase-3-grilling-decisions`  |

Each row reads `run` for its pre-draft session. Phase 3's P3-C2 and P3-C3
were settled after the first draft and applied in consolidation.

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                          | Input (refs)                                                                                        | Output (refs)                                                               | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table  | Pack REQ/NFR, active spec summaries, `sdd-triage.md`                                                | Triage section in `spec-0013/09_delta.md`                                   | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds       | Triage drafts rev 1 and rev 2                                                                       | REVISE (F1–F5), then PASS with named fixes N1–N4                            | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G8                                 | Phase 2 item plan for spec-0013 (grilling round 1)  | Phase 2 plan brief, Triage, Phase 0 decisions                                                       | G8 item plan (orchestrator scratchpad)                                      | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups          | Eight item plans                                                                                    | Rulings X1–X14, G8 node rulings, Q1–Q3                                      | PASS                         |
| 5    | requirements-analyst                                           | triage-amend                                   | Persist Phase 2 Triage amendments                   | Griller ruling, user answer Q2                                                                      | The `--flow` gate row in `spec-0013/09_delta.md`                            | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G8                               | Phase 2 wave A: `01_Spec.md` and 02–04              | Write brief, G8 plan, rulings                                                                       | `spec-0013/01_Spec.md` to `04_Business-Rules.md`                            | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G8                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger      | Wave A output                                                                                       | `spec-0013/05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`          | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                  | Carry list, Phase 2 output                                                                          | Contract corrections, including the `#flow-scope` anchor BR-0013-0034 cites | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                          | Phase 2 items, contracts, plan template, source                                                     | Elements, node rulings, P3-C1                                               | PASS                         |
| 10   | solution-architect                                             | phase3-write-W1..W7                            | Phase 3: `10_Plan.md` and the `Owning module` cells | Phase 3 rulings, write brief                                                                        | `spec-0013/10_Plan.md`; ledger cells                                        | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate              | Seven plans, P3-C2                                                                                  | 195 files conform; no new validate error                                    | PASS                         |
| 12   | requirements-analyst                                           | phase4-writer-D1                               | Phase 4: delta record and this evidence             | Batch record, Phase 2–3 carry lists, Phase 4 brief                                                  | `spec-0013/09_delta.md`; this file                                          | PASS                         |
| 13   | test-design-analyst                                            | review1-fix-FA                                 | Review cycle 1 fixes for spec-0013                  | Review pack `review-20260924014832174`; review rulings D2 (qa-gatekeeper owner and P3-D11 findings) | spec-0013 `tdd/test-list.md`, `10_Plan.md`, `09_delta.md`; this file        | PASS                         |

## Gaps / Open risks

- The three `QFAI-ID-002` errors on `03_Acceptance-Criteria.md` stay, pinned in
  `scripts/dogfood-backlog.json`, until the first REMOVE row lands at P7.
- TDD-0057's oracle fails against today's skill tree, because
  `templates/change-request.md` and `references/spec-traceability-rules.md`
  still name `.qfai/decisions/`; the P7 skill rewrite clears it.
- The P6 move of `change-classification.md` also reaches files this spec's plan
  does not name: `constitution/workflow.md`, the `qfai-verify` skill,
  `init.ts`, `governedAssistantManifest.ts` and
  `changeTypeTagVocabulary.test.ts`.
- Open drift recorded in `09_delta.md`: the contradiction between the second
  AC-0013-0010, AC-0013-0011 and AC-0013-0016; ACs no BR cites; what a review
  pack covers per flow.
- The new L3 rows stay `todo` until the ATDD and implement passes of the P2–P8
  pull request.

## Final status

- Final status: REVISE
- Rationale: the Reviewer Gate's first cycle returned REVISE. This cycle's
  fixes are applied, and the re-review is pending.
