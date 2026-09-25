# 09 Delta

## 2026-09-25 — The direction rule binds the screen explorations, and the producer is `/qfai-sdd`

Two chains stated a rule the product had replaced. `US-0010-0008` said discussion
selects no direction at all, while the shipped skill has the user choose the brand
direction during discussion. `US-0010-0009` said discussion authors root
`DESIGN.md`, while `/qfai-sdd` Phase 0 authors it from the direction the pack
records.

Both chains now state the product as intended. Discussion carries the screen
explorations unranked and finalizes no design system. The brand direction is the
user's choice, recorded in `01_Context.md#Design Direction`, and `/qfai-sdd`
Phase 0 authors root `DESIGN.md` from it.

| Op ID  | Op Type | Target                                                                | Summary                                                                   |
| ------ | ------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| OP-001 | UPDATE  | 01_Spec.md (scope, applicable policy, REQ-0008)                       | the rule binds the screen explorations; the brand is recorded             |
| OP-002 | UPDATE  | US-0010-0008, AC-0010-0006, BR-0010-0006, EX-0010-0006                | the direction rule, narrowed to the screen explorations                   |
| OP-003 | UPDATE  | TC-0010-0006                                                          | four observable boundaries, one per ledger row                            |
| OP-004 | UPDATE  | US-0010-0009, AC-0010-0007, BR-0010-0007, EX-0010-0007, TC-0010-0007  | discussion records the direction; `/qfai-sdd` Phase 0 authors `DESIGN.md` |
| OP-005 | UPDATE  | 07_Decisions.md (DR-0010-0001)                                        | the decision narrowed the same way                                        |
| OP-006 | UPDATE  | tdd/test-list.md (TDD-0006, -0007, -0008, -0010, -0011, -0025, -0026) | reset to `todo` under the Change Request; four rows gain a `Boundary`     |

### Rejected

- Candidate: keep discussion free of every direction, brand included.
- Reason: no stage after discussion asks the user for the brand, so an
  assistant would pick it.
- DO NOT: let an assistant choose the brand direction on the user's behalf.
- Temptation: a pack that asks nothing about the brand looks simpler.

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

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

D4 named seven specs for Change Requests, and this spec is not one of them. The user added it on 2026-09-24 by answering `OQ-0020` with A, because this skill's contract changes.

| Source             | Subject                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                             | Depends-On |
| ------------------ | ----------------------------------------------------------- | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------- | ---------- |
| REQ-0055           | An orchestrated discussion covers only the unresolved scope | spec-0010     | UPDATE    | APPEND | -           | Decisions already settled are not asked again                         | REQ-0033   |
| REQ-0051, REQ-0052 | Orchestrated mode for `/qfai-discussion`                    | spec-0010     | UPDATE    | APPEND | -           | `qfai-discussion` is a skill a built-in plan dispatches (OQ-0015 = A) | REQ-0033   |

## 2026-09-24 — Intent-driven entry: change summary

- Appended: US-0010-0013; AC-0010-0013..0015; BR-0010-0013..0015; the
  `## Contract Realization` table in `04_Business-Rules.md`.
- No existing item changes. No decision record and no open question are added.
- The retired AC-0010-0002..0004 and BR-0010-0002..0004 are not reused.
- Size: AC 10 → 13, under the threshold.

## 2026-09-24 — Phase 2c.1 obligation amendment

- BR-0010-0013 and AC-0010-0013 are reworded, IDs kept. What the run has settled
  is read from the work order's `settled` field (CLI-WF `### Work order`), not
  from its `inputs`, which carry only file paths and digests.

## Change Requests

| CR ID            | Upstream artifact                                                                      | Mode      | Approved by | Applied at           |
| ---------------- | -------------------------------------------------------------------------------------- | --------- | ----------- | -------------------- |
| CR-20260924-0006 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-24T18:26:35Z |
| CR-20260925-0004 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-24T19:00:08Z |
| CR-20260912-0003 | `spec-0010` `US-0010-0008` and `US-0010-0009` chains                                   | re-derive | user        | 2026-09-25T00:21:41Z |
| CR-20260925-0006 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T02:36:35Z |
| CR-20260925-0010 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T03:00:14Z |
| CR-20260925-0009 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-25T03:23:20Z |
| CR-20260925-0012 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T06:04:36Z |

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- Change Request records `CR-20260924-0001`, `CR-20260924-0002` and `CR-20260925-0008` became `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010`; every reference here follows them.
