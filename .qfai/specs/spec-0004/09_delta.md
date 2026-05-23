# 09 delta

## 2026-04-22

- Clarified: validate's prototyping responsibility is current skill/evidence/schema gating.
- Superseded: active references to the removed `prototypingRecommendation.ts` validator.
- Added: `packages/qfai/src/core/validators/prototypingEvidence.ts` as the current prototyping schema validator in the validate path.
- Preserved: `QFAI-UIE-001/002` and other deterministic validator slices as current machine-gate behavior.

## 2026-05-06 — CHG-001 — Absorbed validator subjects from spec-0017 (decomposition)

- Trigger: spec-0017 (CAP-0017 v2.0 / UX-loop redesign) violates `_policies/11_Slice-Policy.md` (1 spec = 1 CAP, 1 skill = 1 spec). Validator-side subjects belong to spec-0004 (validate territory).
- Posture: additive append; no purge in spec-0004. Backward compatibility for existing validators retained.
- Approved By: yusuke_senaga

### Triage

| Source                       | Subject                                     | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                  |
| ---------------------------- | ------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------ |
| spec-0017 REQ-0017-0015      | DCON-030 / 031 / 032 validators             | spec-0004     | UPDATE    | APPEND | yusuke_senaga | DESIGN.md / lock / mirror gate is validate |
| spec-0017 TC-0017-0015..0017 | prototypingEvidenceV3 schema validator      | spec-0004     | UPDATE    | APPEND | yusuke_senaga | review.json schema gate is validate        |
| spec-0017 AC-0017-0018       | layoutAntiPatternsDetected schema validator | spec-0004     | UPDATE    | APPEND | yusuke_senaga | lap-\* whitelist enforcement is validate   |
| spec-0017 AC-0017-0019       | designMdViolations schema validator         | spec-0004     | UPDATE    | APPEND | yusuke_senaga | violation shape gate is validate           |
| spec-0017 AC-0017-0020       | `findDesignMdViolations` purity contract    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | pure-fn determinism is validate            |

### Operations

| Op ID  | Op Type       | Target                                                | Summary                                                                                                                         |
| ------ | ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In + REQ-0025..0031 + Entry points) | DCON-030/031/032, prototypingEvidenceV3, lap whitelist, designMdViolations shape, findDesignMdViolations purity を Scope に追加 |
| OP-002 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0008..0014)        | DCON-030/031/032, prototypingEvidenceV3, lap whitelist, designMdViolations shape, findDesignMdViolations purity の AC layer     |
| OP-003 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0008..0013)             | mirror BR layer for OP-002                                                                                                      |
| OP-004 | UPDATE:APPEND | 05_Examples.md (EX-0004-0007..0012)                   | worked examples per AC-0004-0008..0014                                                                                          |
| OP-005 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0008..0014)                 | test coverage per AC; routes to existing tests under `packages/qfai/tests/core/validators/`                                     |

### Notes

- spec-0004 は CHG-001 から開始 (既存 CHG-NNN なし、本日 2026-05-06 が初 CHG)。
- `QFAI-PROT2-NNN` プレフィックスは distributed-surface 禁止リスト (`.agents/rules/distributed-surface.md`) のため、本 spec 文面では `QFAI-DCON-NNN` / `QFAI-PROT-NNN` のみ使用。
- spec-0017 番号は永久 gap として予約 (`_policies/11_Slice-Policy.md` §ID 安定性ルール 5)。
- 実装側 error code 整合: AC-0004-0011/0012/0013 は `QFAI-PROT-002` (per-iter shape) で発火 (実装は schema-v3-violation / lap-whitelist-violation / designMdViolations-shape-violation を 1 つの error code に集約)。
- 残課題 (Phase 8): (a) 実装の `designMdViolations` shape は `{kind, found}`、spec 文面の `{category, expected, found, location}` と齟齬。(b) `findDesignMdViolations(html, designMd)` 関数は現実装に存在しない。両者は別 spec / 別 phase で migration 予定。

## Triage

| Source                                                                                                       | Subject                                                                                                                                                                              | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008 (CHG-003) | `qfai validate` が 4-layer asset-tree enforcement、work-log frontmatter schema、drift/promote/stale/link checks、SKILL.md `project_memory:` 宣言、deprecated-path warning を実装する | spec-0004     | UPDATE    | APPEND | pin-implied | Primary capability owner (CAP-0004)。subject-token overlap (`validate`, `assistant`, `path`)。新 finding code 10+ を追加。 |
| REQ-0009 (CHG-003)                                                                                           | `assistantPaths.ts` SSOT module を validate 側 reader が import する (companion of spec-0003 row)                                                                                    | spec-0004     | UPDATE    | APPEND | pin-implied | Cross-spec module consumer。                                                                                               |

## CHG-003 (v1.9.0) — Assistant-layer Recut + Work-log Schema Validation

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-validate.md` (CLI-VAL、Contract Index)、`.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- New REQs (to be appended to `01_Spec.md#Relevant Requirements` in this CHG):
  - REQ-0034: 4-layer asset-tree enforcement (`constitution/`, `manifest/`, `catalog/`, `process/` 以外を reject)
  - REQ-0035: work-log frontmatter schema validation (`W-WORKLOG-SCHEMA`、severity warning、non-blocking)
  - REQ-0036: Reviewer-Gate drift findings (`R-WORKLOG-DRIFT`, `R-REJECTED-READOPT` — severity error, advisory-failing with mandatory non-empty `justification:` field)
  - REQ-0037: decision-promotion gate (`W-PENDING-PROMOTION` + dedicated section in validate report; satisfied when `07_Decisions.md` row + entry archive + `promoted-to` back-ref all present)
  - REQ-0038: stale-entry surfacing (`W-WORKLOG-STALE` for `status: active` entries with `updated` older than 90 days)
  - REQ-0039: link-integrity validation (`W-WORKLOG-BROKEN-LINK` for unresolved `links: [spec-NNNN, discussion-*, entry-XXXX]`)
  - REQ-0040: `D-DEPRECATED-PATH` warning during deprecation window; warning text MUST name sunset version (REQ-0018 of pack); escalates to error at sunset (REQ-0008)
  - REQ-0041: SKILL.md `project_memory:` declaration enforcement (REQ-0010); read of un-declared path is rejected
  - REQ-0042: `R-HANDOFF-INCOMPLETE` Reviewer-Gate finding for `kind: handoff` entries missing any of 5 required sections (canonical: `worklog-entry.schema.md#kind: handoff body`)
  - REQ-0043: `W-SKILL-DOC-BROKEN-REF` for SKILL.md references that do not resolve in current layout (NFR-0008)
  - REQ-0044: `W-USER-EDIT-PRESERVED` informational pass-through when `qfai init --upgrade-assistant-tree` preserves user edits
- Cascade:
  - companion row in spec-0003 (init seed → validate enforce)
  - companion row in spec-0015 (Reviewer-Gate input bundle + finding `justification:` schema)
  - companion rows in all skill specs (SKILL.md `project_memory:` block presence)
- Out-of-scope (this spec): seeding (spec-0003); agent implementation of drift heuristic (spec-0015)
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008
