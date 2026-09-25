# Evidence: /qfai-sdd (spec-0003)

## Objective

- Spec target: spec-0003
- Objective: state what `qfai init` writes for the story-based spec tree — the
  `.qfai/spec/` seeds and path defaults, the skip on an old layout, the singular
  assistant-tree names, the managed `.gitignore` negation, the shipped
  migration skill and the retargeted `--upgrade-assistant-tree` — and the new
  ID shapes the guard pattern sets learn, and record how the three approved
  REMOVE rows land, in the batch run `sdd-batch-20260923100952585`.

## Inputs reviewed

- Discussion pack `discussion-20260923063306456` (24 REQ, NFR-0001..0010)
- `.qfai/evidence/sdd-batch-20260923100952585.md`, rulings X1–X14, the Phase
  0, 2, 2c, 3 and 4 decisions, P3-C1 to P3-C3
- `.qfai/specs/spec-0003/` 01–06, `09_delta.md`, `10_Plan.md`,
  `tdd/test-list.md`
- `.qfai/contracts/cli/qfai-init.md`,
  `.qfai/contracts/cli/qfai-migration-spec-to-story.md`
- `.qfai/specs/_policies/09_Open-questions.md` (OQ-0170, OQ-0177, OQ-0185)

## Preflight summary path

- Preflight run id `run-20260923191813154`, the run after the Triage was
  persisted: ready, 24 imported requirements, no blockers and no pack gaps. The
  Triage was drafted against `run-20260923180635586`, which reported the same.

## Triage decisions

| Source                                                                                                                                                     | Subject                                                                                                                                                                                                                                                                                                                                                                   | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005, discussion-20260923063306456#REQ-0022 | `qfai init` writes the `.qfai/spec/` tree and its templates, and `specsDir` defaults to `.qfai/spec`, `contractsDir` to `.qfai/spec/03_contract`; the singleton files are created only when absent and carry no BF, US, AC or EX instance. On an old layout init skips `.qfai/spec/`, still installs the migration skill, and prints the detected path and the skill name | UPDATE    | APPEND | -             | Slice A. Adopted (N09); the code waits for spec-0004's layout and unlisted-contract rows. Conservation pairs with this spec's template REMOVE row. Co-change: `scripts/fresh-init-findings.json`, the verify:pack baseline of a fresh init tree, is re-derived when init switches layout. Size signal: 38 AC / 58 TC, over both thresholds; the spec owns exactly CAP-0003, so no SPLIT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| discussion-20260923063306456#REQ-0024, discussion-20260923063306456#NFR-0004                                                                               | Post-build guard and smoke-test pattern set learn the DEC, OQ, BF, US, AC, EX and BR shapes, each with a sample-ID band                                                                                                                                                                                                                                                   | UPDATE    | MODIFY | -             | Slice A, additive. NFR-C0005: the three code sites and the rule document move in one PR with no template edit, so this lands before the P2 templates. REQ-0024 row 1 of 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0005                                                                               | Shipped rules `distributed-surface.md` and `temporary-files.md` cite `.qfai/spec/` in place of `.qfai/specs/` and `.qfai/contracts/`                                                                                                                                                                                                                                      | UPDATE    | MODIFY | -             | Slice C. This repository's `.agents/rules` masters are symlinks to these files, so the new text governs here at once; it lands with the P7 repository migration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| discussion-20260923063306456#REQ-0013                                                                                                                      | Remove the items for writing the spec-pack and `_policies` templates: 01_Spec, 06_Test-Cases, 10_Plan, 16_Traceability-ledger, test-list, 01_Spec-retired, 03_Capabilities and 11_Slice-Policy                                                                                                                                                                            | UPDATE    | REMOVE | yusuke_senaga | Slice C. This repository's self-validation reads these templates and their mdschema entries, so the row lands at P7 with the tests annotating these TCs. Replacement: this spec's structure-write APPEND row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| discussion-20260923063306456#REQ-0017                                                                                                                      | Remove `--upgrade-assistant-tree` writing the `process/migrations` memo, and the guard exception for the memo's file name                                                                                                                                                                                                                                                 | UPDATE    | REMOVE | yusuke_senaga | Lands P6 with the removal of `process/`; only asset tests pin it, and they go in the same change. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. |
| discussion-20260923063306456#REQ-0016                                                                                                                      | Remove the add-only merge of the shipped routing table into the project's routing file                                                                                                                                                                                                                                                                                    | UPDATE    | REMOVE | yusuke_senaga | Lands P6 with the built-in defaults; its asset tests go in the same change. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                       |
| discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017                                                                               | Assistant sync writes `rule/` and skill `references/`; routing defaults are built in; `kind` is read from the card frontmatter                                                                                                                                                                                                                                            | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                                                                                |
| discussion-20260923063306456#REQ-0018                                                                                                                      | `qfai init` writes singular names: `skill/`, `agent/`, `prompt/`, `steering/_template` and the integration link targets                                                                                                                                                                                                                                                   | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                                                                                |
| discussion-20260923063306456#NFR-0010, discussion-20260923063306456#REQ-0018                                                                               | The managed `.gitignore` block negates `.qfai/evidence/decision/` <!-- qfai:not-a-citation -->                                                                                                                                                                                                                                                                            | UPDATE    | MODIFY | -             | Slice B, lands P6. This repository's `.gitignore` gets the same negation from migration step 10, run on this repository first                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| discussion-20260923063306456#REQ-0019                                                                                                                      | `qfai init` ships and links `/qfai-migration-spec-to-story`; the migration reuses init's integration-directory and managed-block writers                                                                                                                                                                                                                                  | UPDATE    | APPEND | -             | Slice A; the code lands in P5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| discussion-20260923063306456#REQ-0017                                                                                                                      | `--upgrade-assistant-tree` is retargeted to the REQ-0017 destinations; files it does not recognise stay in place without a message                                                                                                                                                                                                                                        | UPDATE    | MODIFY | -             | Slice B, lands P6. Adopted (N10); a solution-architect position to list unrecognised files was not taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| discussion-20260923063306456#REQ-0018                                                                                                                      | US-0003-0003: `--force` leaves `skill.local/` untouched                                                                                                                                                                                                                                                                                                                   | UPDATE    | MODIFY | -             | Slice B, lands P6 with the rename. Adopted (N11): `skills.local` becomes `skill.local`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Open questions

- None opened in this spec's `08_Open-questions.md`.
- OQ-0170: how this repository migrates itself at the P7 cutover; the rows
  landing at P7 depend on it — Disposition: open
- OQ-0177: placement of the multi-skill assistant files, which the P6 rows
  follow — Disposition: resolved
- OQ-0185: no test case covers `qfai init` and `qfai validate` on an
  unmigrated project whose config has no `paths.specsDir` — Disposition:
  resolved by user answer U2, which drops the check: 2.x does not support an
  unmigrated tree

## Decisions made

- N09 (Phase 0): init seeds `.qfai/spec/` create-only; on an old layout it
  skips the tree and still installs the migration skill.
- N10, N11 (Phase 0): `--upgrade-assistant-tree` leaves files it does not
  recognise in place without a message; `skills.local` becomes `skill.local`.
- X1, X2, X3, X7, X8 (Phase 2): layout-conditioned clauses beside the current
  ones; existing TCs and ledger rows unchanged; REMOVE items untouched until
  landing; the sample band on every numeric segment; init keeps its wider
  old-layout predicate.
- Phase 2c: the old-layout skip lands at P3 with the seeding; the override
  keys sit under the init contract's Configuration.
- P3-D02 (Phase 3): the path defaults switch in the P3 seeding commit, and the
  init contract's phase label was corrected to match.
- P3-C1 to P3-C3 (user, Phase 3): three pull requests.
- D1 (Reviewer Gate): the guard cases keep one row per band, each shape its
  own `it.each` test with one Selector entry, RED per entry. Dissent: the
  completion reviewer wanted one row per shape.
- D9 (Reviewer Gate): the smoke scan moves into
  `packages/qfai/tests/helpers/distributedSurfaceScan.ts`, which owns TDD-0109
  and 0110.
- D11 (Reviewer Gate): TC-0003-0072 is `integration`.
- U2 (user, Reviewer Gate): 2.x does not support an unmigrated tree; the plan's
  risk row is accepted on that answer.
- D15 (cycle-2 Reviewer Gate): TC-0003-0069 stays `unit`; its source-text
  oracle follows the TC-0003-0048 convention.
- DELTA record: `09_delta.md`
  `## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands`.

## Work performed

- Phase 2: US-0003-0029..0031, AC-0003-0039..0046, BR-0003-0049..0059 and
  EX-0003-0052..0069 added; existing US, AC, BR and EX items changed by a
  layout-conditioned clause; `01_Spec.md` Scope, Applicable Contracts and the
  pack requirement lines.
- Phase 2b and 2c: TC-0003-0059..0078 and ledger rows TDD-0094..0122 added at
  `todo`; TDD-0119..0121 are the E2E rows of US-0003-0029..0031.
- Phase 3: `10_Plan.md` `### Story-tree layout` subsections; `Owning module`
  cells of the new ledger rows.
- Phase 4: `.qfai/specs/spec-0003/09_delta.md` batch record — landing of 12
  Triage rows, the items three REMOVE rows retire, co-changes and the recorded
  drift; this file, which replaces the record of the earlier cycle.
- Reviewer Gate corrections, recorded under
  `### Corrections from the Reviewer Gate (2026-09-24)` in `09_delta.md`:
  TC-0003-0071 and 0072 and ledger rows TDD-0109 to 0112; the plan's P1 row,
  test approach, memo-exception row and U2 risk row; the drift note on the guard
  split closed and the OQ-0185 note resolved.

## Contract executability

- none

## Commands executed

```sh
qfai validate --profile sdd --fail-on error --spec spec-0003 --format github
```

Run with the CLI built from this worktree's source. The counts below are read
from the run log the command names.

## Validate evidence paths

- Validate run id `run-20260924142946288`, scope `sdd, spec-0003`: pass, 0
  errors, 31 warnings. The warnings are the same findings as the run before the Reviewer Gate corrections; none is new.

## Pre-draft Grilling

| Phase | Session | Ended at             | Wrote at             | Frontier                 | Evidence                                                   |
| ----- | ------- | -------------------- | -------------------- | ------------------------ | ---------------------------------------------------------- |
| 2     | run     | 2026-09-23T20:48:12Z | 2026-09-23T20:58:00Z | 112 settled, 0 escalated | sdd-batch-20260923100952585.md#phase-2-grilling-decisions  |
| 2c.1  | run     | 2026-09-23T22:25:00Z | 2026-09-23T22:27:00Z | 34 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-2c-grilling-decisions |
| 3     | run     | 2026-09-24T00:29:24Z | 2026-09-24T00:35:00Z | 31 settled, 0 escalated  | sdd-batch-20260923100952585.md#phase-3-grilling-decisions  |

- Batch record: `.qfai/evidence/sdd-batch-20260923100952585.md`

Each row reads `run` for its pre-draft session. P3-C2 and P3-C3 were answered
after the first Phase 3 plan draft; `phase3-consolidate` aligned the plans with
P3-C2. Phases 0 and 1 ran once for the batch, which records their sessions and
the later user answers.

## Work Orders Summary

| Step | Role (sub-agent)                                               | Agent instance                                 | Task title                                                | Input (refs)                                                               | Output (refs)                                                              | Status (PASS/REVISE/PENDING) |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| 1    | requirements-analyst                                           | triage-author                                  | Draft, revise and persist the Stage 1 Triage table        | Pack REQ/NFR, active spec summaries                                        | `09_delta.md` `## Triage (2026-09-23 spec-to-story)`                       | PASS                         |
| 2    | delivery-planner                                               | triage-gate                                    | Blocking gate on the Triage table, two rounds             | Triage drafts rev 1 and rev 2                                              | REVISE (F1–F5), then PASS with named fixes N1–N4                           | PASS                         |
| 3    | requirements-analyst                                           | phase2-plan-G3                                 | Phase 2 item plan for spec-0003, spec-0006, spec-0007     | Phase 2 plan brief, Triage, Phase 0 decisions                              | G3 item plan (orchestrator scratchpad)                                     | PASS                         |
| 4    | architecture-reviewer                                          | phase2-griller                                 | Phase 2 griller ruling across eight groups                | Eight item plans                                                           | Rulings X1–X14, node rulings, Q1–Q3                                        | PASS                         |
| 6    | requirements-analyst                                           | phase2-writeA-G3                               | Phase 2 wave A: 01_Spec and 02–04                         | Write brief, plans, rulings                                                | `01_Spec.md`, 02–04                                                        | PASS                         |
| 7    | test-design-analyst                                            | phase2-writeB-G3                               | Phase 2 wave B: 05, 06 and the Phase 2b ledger            | Wave A output                                                              | 05, 06, `tdd/test-list.md`                                                 | PASS                         |
| 8    | solution-architect, architecture-reviewer, test-design-analyst | phase2c-author, phase2c-griller, phase2c-write | Phase 2c obligation reconciliation                        | Carry list, Phase 2 output                                                 | Init contract corrections; EX/TC pairs and ledger rows                     | PASS                         |
| 9    | solution-architect, architecture-reviewer                      | phase3-author, phase3-griller                  | Phase 3 pre-draft grilling                                | Phase 2 items, contracts, plan template, source                            | Elements, node rulings P3-D02 and P3-D12, P3-C1                            | PASS                         |
| 10   | solution-architect                                             | phase3-write-W3                                | Phase 3: `10_Plan.md` and the `Owning module` cells       | Phase 3 rulings, write brief                                               | `10_Plan.md`; ledger cells; init contract Configuration label              | PASS                         |
| 11   | solution-architect                                             | phase3-consolidate                             | Align every plan with P3-C2; Plan gate                    | Seven plans, P3-C2                                                         | 195 files conform; no new validate error                                   | PASS                         |
| 12   | requirements-analyst                                           | phase4-write-D3                                | Phase 4: the delta record                                 | Batch record, Phase 2c and Phase 3 carry lists                             | `09_delta.md` batch record                                                 | PASS                         |
| 13   | requirements-analyst                                           | phase4-wrapup                                  | Phase 4 wrap-up: open questions and this file             | Batch record Phase 4 decisions, `09_delta.md`                              | OQ-0185; this file                                                         | PASS                         |
| 14   | test-design-analyst                                            | review-fix-FC                                  | Reviewer Gate corrections: D1, D9, D11, U2, R02 finding 8 | Review pack `review-20260924014832174`, rulings D1–D11, user answers U1–U3 | `spec-0003` 06, `tdd/test-list.md`, `10_Plan.md`, `09_delta.md`; this file | PASS                         |
| 266  | requirements-analyst                                          | review2-fix-X                                 | Cycle-2 corrections: D15 and grilling timing              | Review pack `review-20260924053652061`, ruling D15                        | `06_Test-Cases.md`, `09_delta.md`, this file                               | PASS                         |

Step numbers are the batch record's; step 5 amended no row of this spec.

## Gaps / Open risks

- The drift recorded in `09_delta.md`: EX-0003-0019 names a seeded
  `.qfai/steering/README.md` that AC-0003-0018 and the init contract say is
  not written; AC-0003-0019's current clause reads as a move; TC-0003-0055 and
  TC-0003-0073 cover the same example after landing.
- `repairIntegrationWrappers` may leave a link into `skills/` unrepointed at
  migration step 9; a risk row in the plan, tested by TC-0018-0067.
- `QFAI-ATDD-111` and `QFAI-ATDD-112` fire for this spec's new cases until
  `/qfai-atdd` and `/qfai-implement` write their tests in the same pull
  request (P3-C1).

## Final status

- Final status: REVISE
- Rationale: Reviewer Gate pending.
