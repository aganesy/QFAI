# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0013 (UI/UX review -- ATDD-relevant parts)
- Old spec-0013 covered UI/UX review framework including ATDD integration
- ATDD acceptance test orchestration parts are now captured in this spec (spec-0008)

## Adopted

- AD-0008-0001: ATDD skill consolidation -- all acceptance test orchestration (E2E/API/Integration) unified under CAP-0008
- AD-0008-0002: Layer-annotation mapping -- strict annotation per test layer (US for E2E, TC for Integration, CON-API for API)

## Rejected

- RJ-0008-0001: Unit/Component test inclusion in ATDD
  - DO NOT include unit/component tests in this skill scope
  - Temptation: adding unit tests to ATDD for "completeness"
  - Reason: unit/component tests belong to `/qfai-implement` per separation of concerns

## ID Renumbering

| Old ID                       | New ID                      | Notes                             |
| ---------------------------- | --------------------------- | --------------------------------- |
| spec-0013 US/TC (ATDD parts) | US-0008-YYYY / TC-0008-YYYY | Renumbered to spec-0008 namespace |

## Post-Migration Changes

| Date       | Change Type | IDs Added                                                                          | Summary                                                                                                                      |
| ---------- | ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-01 | adopted     | US-0008-0006, AC-0008-0009, BR-0008-0007, EX-0008-0008, TC-0008-0011, TC-0008-0012 | テストケース品質深度チェック: Coverage Depth Matrix 必須化、正常系のみ不完全判定、test-design-analyst/qa-gatekeeper 責務拡張 |

## Triage

| Source                                                     | Subject                                                                                                                                                                           | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017 (CHG-003) | `/qfai-atdd` SKILL.md に `project_memory:` 宣言追加。author 前に open work-log entry を読む。kind 別 write-trigger に従う。handoff entry body を 5 セクション schema に従わせる。 | spec-0008     | UPDATE    | APPEND | pin-implied | Implementation-phase skill (REQ-0005 scope)。SKILL.md は配布物。subject-token overlap (`skill`, `atdd`)。新 CAP 不要。                                                                                                                                                                                                                                            |
| REQ-0024 (discussion-20260804173914356, CHG-007)           | worker-scoped credential-reuse rule as ATDD guidance (seven rules + companion injected-environment rule + credential-class script-naming rule)                                    | spec-0008     | UPDATE    | APPEND | -           | ATDD owns E2E / API / Integration orchestration, so acceptance-harness credential handling is its subject. Prose guidance only, backend-agnostic, names no browser backend; no validator, no finding code, no new test layer and no new annotation token, so the layer vocabulary does not grow. No size signal: ac 11→14 (threshold 30), tc 14→18 (threshold 50) |

## CHG-003 (v1.9.0) — Work-log Read Contract + project_memory Declaration

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- Obligation: `qfai-atdd` SKILL.md MUST gain a `project_memory:` YAML block enumerating the layers it reads. The skill MUST read open work-log entries (`status` ∈ `{active, handoff}` and `scope` ∈ `{global, <current-spec>}`) before authoring, and MUST cite consulted entry IDs in its completion report (REQ-0005). The skill MUST follow the 11-`kind` write-trigger SSOT (REQ-0004) and the handoff-brief body schema (REQ-0017).
- Cascade: SKILL.md declaration is validated by spec-0004's `qfai validate` (companion spec-0004 row). Reviewer-Gate `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` runs on this skill's outputs (companion spec-0015 row).
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017

## 2026-05-27 — v1.9.2 Second-Wave (spec-0008)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND (additive; preserves existing US/AC/BR/EX/TC numbering)
- Local ID ranges added: US-0008-0007, AC-0008-0010..0011, BR-0008-0008..0009, EX-0008-0009..0010, TC-0008-0013..0014

## Triage (2026-05-27 second wave)

Rows owned by this spec. `Approved By` is `-` throughout: every row is append-first, so no operation here is approval-gated.

| Source   | Subject                                                                                | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                   | DR-Ref  | Status |
| -------- | -------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------- | ------- | ------ |
| REQ-0157 | 01_Spec.md (Relevant Requirements + US range→0007 + Consumer-View copy-down)           | spec-0008     | UPDATE    | APPEND | -           | atdd scaffold bulk skeleton gen; cascade verified           | DR-0272 | PASS   |
| REQ-0157 | 02_User-stories.md (US-0008-0007)                                                      | spec-0008     | UPDATE    | APPEND | -           | scaffold user story; cascade verified                       | DR-0272 | PASS   |
| REQ-0157 | 03..06 (AC-0008-0010,0011 / BR-0008-0008,0009 / EX-0008-0009,0010 / TC-0008-0013,0014) | spec-0008     | UPDATE    | APPEND | -           | skeleton shape + idempotency + escalation; cascade verified | DR-0272 | PASS   |
| REQ-0157 | 07_Decisions.md (DR-0008-0003 cites DR-0272) + 08_Open-questions (OQ-0166)             | spec-0008     | UPDATE    | APPEND | -           | escalate-count resolved by DR-0272; cascade verified        | DR-0272 | PASS   |

- Notes:
  - REQ-0157 が "default deferred to /qfai-sdd" としていた escalate-cycle count は DR-0272 (既定 3, `atdd.scaffoldEscalateCycles` 可変) で確定。
  - Required edges US-0008-0007 → AC-0008-0010/0011 → BR-0008-0008/0009 → EX-0008-0009/0010 → TC-0008-0013/0014; TC は normal (0013) AND error/boundary (0014) を両方カバー。
- Source: REQ-0157 (discussion-20260527075558258)

## 2026-08-05 — CHG-007 — Worker-scoped credential-reuse rule as ATDD guidance (spec-0008)

- Discussion pack: `.qfai/discussion/discussion-20260804173914356/`
- Policy record: `_policies/10_delta.md` § `2026-08-05 — CHG-007` (Triage Table row `REQ-0024 → spec-0008 UPDATE:APPEND`)
- Operation: UPDATE:APPEND (additive; preserves every existing US/AC/BR/EX/TC ID and sentence)
- Local ID ranges added: US-0008-0008, AC-0008-0012..0014, BR-0008-0010..0012, EX-0008-0011..0013, TC-0008-0015..0018
- Approved By: `-` (append-first; no AskUserQuestion-gated operation in this row)
- Triage row: recorded in this file's `## Triage` table (canonical column set), appended rather than duplicated as a second section.

### CHG-007 Operations (spec-0008)

| Op ID  | Op Type       | Target                                                                                            | Summary                                                                                              |
| ------ | ------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope In bullet; Relevant Requirements: REQ-0024; US range → 0008; CHG-007 copy-down) | guidance contract を execution SSOT に copy-down                                                     |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0008-0008)                                                                 | worker-scoped credential-reuse guidance user story                                                   |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0008-0012..0014)                                                    | rule set present / backend-agnostic + vocabulary frozen / adopter-only script-naming and layer scope |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0008-0010..0012)                                                         | mirror BR layer                                                                                      |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0008-0011..0013)                                                               | worked examples per BR                                                                               |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0008-0015..0018)                                                             | normal (0015) + error (0016) + boundary (0017, 0018) coverage                                        |
| OP-007 | UPDATE:APPEND | 08_Open-questions.md (OQ-0007 resolution note)                                                    | OQ-0007 は upstream で resolved (backend-agnostic guidance only) — residual なしを記録               |
| OP-008 | UPDATE:APPEND | 10_Plan.md (CHG-007 How section)                                                                  | How-only 実装ノート                                                                                  |
| OP-009 | UPDATE:APPEND | tdd/test-list.md (TDD-0015..0018)                                                                 | ledger rows for TC-0008-0015..0018 (Status `todo`)                                                   |

- Notes:
  - **Prose only.** No validator, no new finding code, no new test layer, no new annotation token. NFR-0015 (the layer vocabulary does not grow) is the binding constraint, and the layer-policy loader reads only `catalog/test-layers.md` plus its legacy fallback, so a skill reference artifact is invisible to it by construction.
  - **Backend-agnostic.** OQ-0007 resolved to backend-agnostic guidance only; a recorded decision rejects hard-coding a browser backend. The guidance therefore names none, and any worked example is one illustration among possible backends with nothing named, installed or pinned. TC-0008-0016 carries a planted-name negative case so a green scan is not vacuous.
  - **Companion rule** (caller-injected environment identifier forbids provisioning / teardown) is recorded in the same artifact, per the upstream requirement.
  - **Script-naming rule** (`OQ-0014` resolved to document rather than adopt) ships as adopter guidance only; QFAI keeps its own script names.
  - **Not dogfooded, and it says so.** QFAI's own suite has zero credentials, so the rules cannot be verified by execution here — only by inspection. That is why the upstream priority is `should`, and the guidance states the position rather than hiding it.
  - **RJ-0008-0001 respected.** The guidance obliges E2E / API / Integration only. No unit or component obligation is introduced; unit and component tests remain `/qfai-implement` territory.
- Source: REQ-0024 (discussion-20260804173914356)

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

D4 named seven specs for Change Requests, and this spec is not one of them. The user added it on 2026-09-24 by answering `OQ-0020` with A, because this skill's contract changes.

| Source                                 | Subject                                                                                        | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                          | Depends-On        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| REQ-0038                               | The ATDD side of the seam-only round trip                                                      | spec-0008     | UPDATE    | APPEND | -           | The acceptance stage asks implement for a seam-only work order, returns to the same stage instance and takes RED at the assertion before it hands over the full work. It reuses the existing red-provenance branch | REQ-0033          |
| REQ-0048                               | `test_fix` for a defective E2E, API or Integration test                                        | spec-0008     | UPDATE    | APPEND | -           | ATDD owns those rows under the ledger's layer ownership, and D14 names ATDD as the one who fixes acceptance tests                                                                                                  | REQ-0033, OQ-0009 |
| REQ-0035                               | The ATDD stage result reports a failure at the intended assertion as `expected_red`            | spec-0008     | UPDATE    | APPEND | -           | An import, collection or start-up failure is `unrun` or `blocked`, never RED                                                                                                                                       | REQ-0033          |
| REQ-0037, REQ-0051, REQ-0052, REQ-0056 | Orchestrated mode for `/qfai-atdd`, with the layer decision never served from the shared cache | spec-0008     | UPDATE    | APPEND | -           | `qfai-atdd` is a skill a built-in plan dispatches (OQ-0015 = A). The run's `accepted_with_debt` outcome maps onto ATDD's existing "PASS with cross-spec obligations" state                                         | REQ-0033          |
| NFR-0003                               | `qfai-atdd/SKILL.md` grows by at most the one citation line                                    | spec-0008     | UPDATE    | APPEND | -           | The file is at 797 of its 800 lines                                                                                                                                                                                | -                 |

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-24
- Primary: Behavior
- Tags: @docs, @test
- Summary: the five rows of `## Triage (2026-09-24 intent-driven entry)` applied.
  `/qfai-atdd` gains its orchestrated mode, the ATDD side of the seam-only round
  trip, the `expected_red` report and `test_fix` for acceptance-layer rows.
- Appended: US-0008-0009, US-0008-0010; AC-0008-0015..0023; BR-0008-0013..0021;
  DR-0008-0004. Modified: none. Existing IDs and sentences are unchanged.
- Resolved pack question: `discussion-20260923171450572#OQ-0009`, recorded in
  `08_Open-questions.md` under `## Resolved (2026-09-24 intent-driven entry)`.
- Size: AC 14 → 23, under the threshold of 30.
- Reserved IDs: none.

- Phase 2c.1 (obligation reconciliation): no wording changes. BR-0008-0017 still holds when a seam-only result comes back `blocked` or `unrun`: CLI-WF `### Stage result` has the core keep the acceptance attempt open and reissue the seam-only work order after `resume`. BR-0008-0016 was re-read against the debt-resolution rule of CLI-WF `## Completion` and needs no change.

## Update History

| Date       | DL      | Summary                                                                               |
| ---------- | ------- | ------------------------------------------------------------------------------------- |
| 2026-09-24 | DL-0001 | DR-0008-0004: A defective acceptance-layer test is fixed with ledger status untouched |

## Decision Log

One entry per `07_Decisions.md` record added on 2026-09-24.

### DL-0001

DR-0008-0004: A defective acceptance-layer test is fixed with ledger status untouched.

#### Meta

```yaml
id: DL-0001
date: 2026-09-24
primary: Behavior
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - .qfai/specs/spec-0008
  - packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md
notes: The acceptance-layer half of decision D14; the unit-layer half is spec-0011's
```

#### Migration / Follow-ups

- No migration required. A `test_fix` stage moves no ledger row, and existing rows
  are unchanged.

#### Rejected

- option: allow any test edit without a status change
  reason: an edit that makes a test pass can change what it verifies
  do_not: accept a rewritten assertion without checking that it cites the same AC or BR
  temptation: the test was wrong, so any passing edit looks like the fix
- option: record the re-run in the run evidence only
  reason: the changed test file leaves the row stale and the final validate fails
  do_not: leave a changed test file with no re-verify record in the ledger's evidence
  temptation: the run evidence already holds the re-run

## Change Requests

| CR ID            | Upstream artifact                                                                      | Mode      | Approved by | Applied at           |
| ---------------- | -------------------------------------------------------------------------------------- | --------- | ----------- | -------------------- |
| CR-20260924-0008 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-24T18:26:35Z |
| CR-20260925-0018 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-24T19:00:08Z |
| CR-20260925-0020 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T02:36:35Z |
| CR-20260925-0022 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T03:00:14Z |
| CR-20260925-0009 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-25T03:23:20Z |
| CR-20260925-0012 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T06:04:36Z |
| CR-20260925-0013 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-25T07:34:27Z |
| CR-20260925-0023 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-25T10:20:50Z |

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- Change Request records `CR-20260924-0001`, `CR-20260924-0002` and `CR-20260925-0008` became `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010`; every reference here follows them.

A later `origin/main` took more of these IDs, and the intent-driven ones moved again to
the next free ones:

- `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010` became `CR-20260924-0007`,
  `CR-20260924-0008` and `CR-20260925-0022`. `CR-20260925-0003`..`CR-20260925-0007` and
  `CR-20260925-0015` became `CR-20260925-0017`..`CR-20260925-0021` and `CR-20260925-0023`.
  Every reference here follows them.
