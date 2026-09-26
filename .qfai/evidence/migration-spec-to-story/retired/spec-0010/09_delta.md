# 09 Delta

## 2026-09-24 — Separate the four discussion output checks for story-tree migration

AC-0010-0001 previously combined screen contracts, the review bundle, root DESIGN.md, and legacy sidecar absence. The latter three already have distinct criteria. DR-0010-0007 assigns each active check to one story and keeps the original IDs for their respective checks.

| Op            | Target                                                    | Disposition and successor                                                        |
| ------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| UPDATE:MODIFY | AC-0010-0001 / BR-0010-0001 / EX-0010-0001 / TC-0010-0001 | Screen contracts only; US-0010-0006.                                             |
| UPDATE:MODIFY | AC-0010-0005                                              | Review bundle existence and best-of-history content; US-0010-0007.               |
| UPDATE:KEEP   | AC-0010-0007 / AC-0010-0008                               | Root DESIGN.md under US-0010-0009 and legacy sidecar absence under US-0010-0010. |

## 2026-09-22 — The five stories whose sidecar moved now name where it went

`AC-0010-0008` forbids five legacy sidecars, and five user stories were written
around them. Two named a forbidden file outright; three asked for the content one
carried without naming it.

**None of the five is retired.** Every obligation is still owed — only the file
that carried it moved, and the canonical sidecar index records where each went.

| Story          | What it asks for                                                               | Where it is recorded now                          |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `US-0010-0001` | product intent, must-keep interactions, brand signals, differentiation targets | `04_Sources.md`                                   |
| `US-0010-0002` | adopted and rejected reference signals                                         | `04_Sources.md`, framed as inputs to deviate from |
| `US-0010-0003` | anti-goals and recurrence prevention notes                                     | `04_Sources.md`                                   |
| `US-0010-0004` | the axes a critique is scored on                                               | the fixed evaluator axes in the prototyping skill |
| `US-0010-0005` | examples of good and of lenient critique                                       | the same fixed axes                               |

Retiring them would have dropped five live requirements because their vehicle
changed. Each is restated against its current home, and none names a file the
pack forbids.

| Op ID  | Op Type | Target                                  | Summary                                     |
| ------ | ------- | --------------------------------------- | ------------------------------------------- |
| OP-001 | UPDATE  | 02_User-stories.md (US-0010-0001..0005) | each story names where its obligation lives |

## 2026-09-22 — Retired the criteria about sidecars this pack forbids

`AC-0010-0008` states that `30_exploration_brief.md`, `33_exploration_rubric.md` and
`34_evaluator_calibration.md` are not created, and `packages/qfai/tests/assets/uiuxSidecar.test.ts`
holds their absence from the distributed assets. Three criteria still said what each
of those files must contain. A criterion conditioned on a file the pack forbids can
neither fail nor pass, so a reader counting this pack's criteria counted three that
decided nothing.

They are not contradictions the way `AC-0010-0001` was, which is why they were left
standing when that one was restated. `AC-0010-0005` and `AC-0010-0009` already cover
the two sidecars a discussion pack writes today.

| Op ID  | Op Type | Target                                         | Summary                                    |
| ------ | ------- | ---------------------------------------------- | ------------------------------------------ |
| OP-001 | DELETE  | 03_Acceptance-Criteria.md (AC-0010-0002..0004) | the three criteria about the dropped files |
| OP-002 | DELETE  | 04_Business-Rules.md (BR-0010-0002..0004)      | the rules that hung off them               |
| OP-003 | DELETE  | 05_Examples.md (EX-0010-0002..0004)            | the examples that hung off those rules     |
| OP-004 | DELETE  | 06_Test-Cases.md (TC-0010-0002..0004)          | the cases that hung off those examples     |
| OP-005 | DELETE  | tdd/test-list.md (TDD-0002..0004, TDD-0009)    | the ledger rows citing those cases         |

The user-story layer was repaired separately; see the entry above it.

## 2026-04-22

- Clarified: discussion-generated prototyping hints are downstream references only.
- Superseded: discussion-side wording that implied a current public `full-harness` mode engine.
- Retained: 3-layer evaluation family, design-system generation, trend-derived axis generation.

## 2026-05-06 — CHG-001 — Absorbed DESIGN.md authoring + legacy sidecar drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                          |
| ------ | ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | DESIGN.md draft authoring + legacy sidecar drop bullets; US range → US-0010-0010 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0010-0009..0010)            | DESIGN.md draft authoring + legacy sidecar drop                                  |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0010-0007..0008)     | DESIGN.md draft as discussion phase output + legacy sidecar non-emission         |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0010-0007..0008)          | mirror BR layer for OP-003                                                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0010-0007..0008)                | worked examples per AC                                                           |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0010-0007..0008)              | test coverage per AC                                                             |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0010-0007..0008) | TDD ledger sync                                                                  |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Cross-spec downstream consumers (e.g. `/qfai-sdd` Phase 0 lock, `/qfai-implement` design-system input) are recorded in the receiving specs (spec-0013 / spec-0011) without back-references here, per editorial convention §15.

## Triage

| Source             | Subject                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                             |
| ------------------ | ----------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0010 (CHG-003) | `/qfai-discussion` SKILL.md に `project_memory:` 宣言を追加 | spec-0010     | UPDATE    | APPEND | pin-implied | Discussion skill は worklog-writer ではない (REQ-0005 Notes で明示除外) が、`project_memory:` 宣言義務は適用される。subject-token overlap (`skill`)。 |

## CHG-003 (v1.9.0) — project_memory Declaration (discussion skill)

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Obligation: `qfai-discussion` SKILL.md MUST gain a `project_memory:` YAML block enumerating the layers it reads (typically `manifest/`, `catalog/`, `process/`; `constitution/` is implicitly always-loaded). Discussion is intentionally excluded from the worklog-write contract per REQ-0005 Notes (it authors a discussion pack and does not modify code).
- Cascade: SKILL.md declaration is validated by spec-0004's `qfai validate`.
- Source: REQ-0010

## 2026-05-27 — v1.9.2 Second-Wave (spec-0010)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing US/AC/BR/EX/TC numbering. New local IDs: US-0010-0011..0012, AC-0010-0009..0012, BR-0010-0009..0012, EX-0010-0009..0013, TC-0010-0009..0013, TDD-0013..0017, DR-0010-0005..0006.
- Approved By: pin-implied (feature/v1.9.2)

| Operation | Sub-op | Target                                                     | Source (REQ)       | Rationale        | DR-Ref           | Status |
| --------- | ------ | ---------------------------------------------------------- | ------------------ | ---------------- | ---------------- | ------ |
| UPDATE    | APPEND | 01_Spec.md (Relevant Reqs, Consumer View, US range → 0012) | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0010-0011..0012)                    | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0010-0009..0012)             | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0010-0009..0012)                  | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0010-0009..0013)                        | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0010-0009..0013, Type-classified)     | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0010-0005..0006)                       | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (OQ-0156/0157 resolved)               | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | 10_Plan.md (Second-Wave How)                               | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |
| UPDATE    | APPEND | tdd/test-list.md (TDD-0013..0017)                          | REQ-0154, REQ-0155 | cascade verified | DR-0265, DR-0266 | PASS   |

- Notes:
  - REQ-0155 spans spec-0010 (writer) and spec-0013 (reader) — same Source REQ, file-local IDs per spec. Reader side declared in spec-0013.
  - `R-MOCK-HREF-DRIFT` (template ↔ `QFAI-MOCK-010` SSOT-sync) and `QFAI-MOCK-010` validator implementation enforcement route through spec-0004; this slice owns the discussion-side template + SKILL.md authoring surface and the pointer-writer behavior.
- Source: REQ-0154, REQ-0155 (discussion-20260527075558258)

## Triage (2026-09-23 spec-to-story)

| Source                                                                       | Subject                                                                                                      | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Depends-On                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018 | `research-first-protocol.md` moves to `rule/`; the `project_memory` layer list and the `skill/` paths follow | spec-0010     | UPDATE    | MODIFY | -           | Slice B, lands P6. Adopted (OQ-0177). P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |

## 2026-09-24 — Spec-to-story run: change summary, landing and recorded drift

Run: `/qfai-sdd` batch `sdd-batch-20260923100952585`, from the discussion pack
`discussion-20260923063306456`. The row is the one under
`## Triage (2026-09-23 spec-to-story)` above. No approved Change Request
ordered this run.

### Change summary

- `01_Spec.md` Evidence Summary: the two skill paths gain the `skill/` path
  beside the current one (ruling X1). Relevant Requirements gains the
  REQ-0017 and REQ-0018 pair.
- US-0010-0004 and US-0010-0005: the reviewer-prompt path is rewritten in
  place as `<paths.skillsDir>/qfai-prototyping/references/reviewer-prompt.md`,
  which is true before and after the rename (X1).
- `10_Plan.md` gains a `### Story-tree layout` subsection under Implementation
  approach, Test approach and Risk mitigation, and a `## NFR approach` section
  it lacked: how NFR-0001 to NFR-0003 are met, each with the test case whose
  failure measures a breach. The NFRs themselves are unchanged.
- No AC, BR, EX or TC changed, and no ledger row was added or changed: no
  spec-0010 item names `research-first-protocol.md` (Phase 2 node G6-10).

### Landing

The work lands in three pull requests: P1 on its own and merged first; P2 to
P8 in one pull request that also carries the `/qfai-atdd` and
`/qfai-implement` tests; then the removal of the migration-memo guard
exception on its own.

| Triage row (Source)                                          | Phase | Pull request | What the landing change carries                                                                                                                                                          |
| ------------------------------------------------------------ | ----- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0017, REQ-0018 (`research-first-protocol.md` to `rule/`) | P6    | P2 to P8     | The protocol moves from `constitution/` to `rule/`, and the discussion skill's citation of it (its step 1) follows. Drops the current `skills/` paths from `01_Spec.md` Evidence Summary |

No row removes an item, so nothing is retired and no ledger row is tombstoned.

### Co-changes the landing carries

- The co-change list in the Triage row's Rationale, at P6.
- Two source files that name the old path:
  - `packages/qfai/src/core/validators/researchSummary.ts`, whose remediation
    message cites the protocol;
  - `packages/qfai/src/core/governedAssistantManifest.ts`, regenerated rather
    than edited.
- Four asset tests under `packages/qfai/tests/assets/` read the protocol by
  path: `researchFirstOwner.test.ts`, `researchFirstProtocolWiring.test.ts`,
  `discussionGrilling.test.ts` and `assets.test.ts`. They are repointed with
  their assertions unchanged. The Triage row's co-change list does not name
  them.
- The rewrite of the discussion skill's own path is covered by spec-0001's
  row.

### Recorded drift

- The Triage row says the `project_memory` layer list follows the move, and
  the CHG-003 record above says the skill's `project_memory` block enumerates
  the layers it reads. The shipped block holds no layer list: it holds three
  prose rules. OQ-0186 resolves the wording as the step 1 citation of
  `research-first-protocol.md`, which follows the move to `rule/`. No layer
  list is added.
- `QFAI-TDDLIST-017` reports TC-0010-0006's four ledger rows (TDD-0006,
  TDD-0007, TDD-0008, TDD-0010) for naming no Boundary. It predates this run.
  Open: outside this run's row.

### Adopted

- The move is text only and adds no case (G6-10). The asset tests are
  repointed rather than widened.

### Rejected

- Candidate: keep a link at the old `constitution/` path during the rename.
- Reason: no window accepts both assistant-tree layouts (Phase 0 node N05).
- DO NOT: leave a second route to the protocol.
- Temptation: a link keeps every existing citation working without a sweep.

- Candidate: let each repointed test accept either path.
- Reason: a test that accepts both passes over a move that left a copy
  behind.
- DO NOT: write an either-path assertion.
- Temptation: it keeps the tests green on both sides of the rename commit.
