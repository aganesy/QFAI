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
  **注 (2026-08-05 追記)**: この恒久予約は `_policies/10_delta.md` § CHG-007 / DR-0275 で撤廃され、
  `spec-0017` は `CAP-0017 = Repository Toolchain` として再採番された。上記行は 2026-05-06 時点の
  記録として保持する（現行の制約ではない）。
- 実装側 error code 整合: AC-0004-0011/0012/0013 は `QFAI-PROT-002` (per-iter shape) で発火 (実装は schema-v3-violation / lap-whitelist-violation / designMdViolations-shape-violation を 1 つの error code に集約)。
- 残課題 (Phase 8): (a) 実装の `designMdViolations` shape は `{kind, found}`、spec 文面の `{category, expected, found, location}` と齟齬。(b) `findDesignMdViolations(html, designMd)` 関数は現実装に存在しない。両者は別 spec / 別 phase で migration 予定。

## Triage

| Source                                                                                                       | Subject                                                                                                                                                                              | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008 (CHG-003) | `qfai validate` が 4-layer asset-tree enforcement、work-log frontmatter schema、drift/promote/stale/link checks、SKILL.md `project_memory:` 宣言、deprecated-path warning を実装する | spec-0004     | UPDATE    | APPEND | pin-implied | Primary capability owner (CAP-0004)。subject-token overlap (`validate`, `assistant`, `path`)。新 finding code 10+ を追加。                                                                                                                                                                                                                                       |
| REQ-0009 (CHG-003)                                                                                           | `assistantPaths.ts` SSOT module を validate 側 reader が import する (companion of spec-0003 row)                                                                                    | spec-0004     | UPDATE    | APPEND | pin-implied | Cross-spec module consumer。                                                                                                                                                                                                                                                                                                                                     |
| `discussion-20260804173914356#REQ-0012`, `#REQ-0013` (CHG-007)                                               | `pnpm ci:lint` lane inventory gains the workflow-hygiene lane                                                                                                                        | spec-0004     | UPDATE    | MODIFY | -           | Cascade from CHG-007. spec-0004 owns the ci:lint lane inventory, so a new lane is recorded here; the lane's own rule set and its shipped-file target are owned by spec-0017 and spec-0003. No validator and no finding code is added to `qfai validate` itself — the lane is a repository script, following the pack-location lane precedent (no contract file). |

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
  - REQ-0042: `R-HANDOFF-INCOMPLETE` Reviewer-Gate finding for `kind: handoff` entries missing any of 5 required sections (canonical reference: `.qfai/contracts/cli/worklog-entry.schema.md` under the "kind: handoff body — required sections" subsection)
  - REQ-0043: `W-SKILL-DOC-BROKEN-REF` for SKILL.md references that do not resolve in current layout (NFR-0008)
  - REQ-0044: `W-USER-EDIT-PRESERVED` informational pass-through when `qfai init --upgrade-assistant-tree` preserves user edits
- Cascade:
  - companion row in spec-0003 (init seed → validate enforce)
  - companion row in spec-0015 (Reviewer-Gate input bundle + finding `justification:` schema)
  - companion rows in all skill specs (SKILL.md `project_memory:` block presence)
- Out-of-scope (this spec): seeding (spec-0003); agent implementation of drift heuristic (spec-0015)
- Implementation-phase 詳細は本 PR で append 完了 (per-spec SDD pass landed in this PR):
  - US: US-0004-0028..0033 (work-log surface + reviewer bundle + skill enforcement + upgrade-tree)
  - AC: AC-0004-0015..0030 (no gaps; AC-0004-0026 is the ssot-guard SSOT-divergence acceptance)
  - BR: BR-0004-0014..0024 (mirror layer for the new ACs)
  - EX: EX-0004-0013..0031 (per-AC worked examples; gaps at EX-0004-0024..0025 only — see 05_Examples.md HTML comment)
  - TC: TC-0004-0015..0031 (validator finding-emit checks + cross-spec ssot-guard + per-format calendar-validity guard)
  - TDD: TDD-0015..0031 (RED→GREEN evidence in `tdd/test-list.md`)

### CHG-003 Operations (this PR)

| Op ID  | Op Type       | Target                                                                                   | Summary                                                                                                                        |
| ------ | ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| OP-006 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0034..0044)                                       | 11 v1.9.0 finding-code / schema requirements appended                                                                          |
| OP-007 | UPDATE:APPEND | 02_User-stories.md (US-0004-0028..0033)                                                  | new US for work-log surface + reviewer bundle + skill enforcement + upgrade-tree                                               |
| OP-008 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0015..0030; no gaps — AC-0004-0026 covers ssot-guard) | per-REQ acceptance criteria including per-field date/scope/blocking/id-format sub-criteria                                     |
| OP-009 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0014..0024)                                                | mirror BR layer for OP-008                                                                                                     |
| OP-010 | UPDATE:APPEND | 05_Examples.md (EX-0004-0013..0031; gaps at 0024..0025 only)                             | worked examples per AC                                                                                                         |
| OP-011 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0015..0031; ssot-guard Level enum + TC-0004-0026)              | validator finding-emit + cross-spec ssot-guard + per-format calendar-validity guard; Level enum extended with `ssot-guard` row |
| OP-012 | UPDATE:APPEND | tdd/test-list.md (TDD-0015..0031)                                                        | RED→GREEN evidence rows; layer covers validators / ssot-guard                                                                  |

- Source: REQ-0001, REQ-0003, REQ-0006, REQ-0007, REQ-0008, REQ-0010, REQ-0014, REQ-0015, REQ-0018, NFR-0008

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves all existing AC/BR/EX/TC numbering. NFR-0101 (SSOT-sync mirror) and NFR-0103 (validate warning names sunset version) absorbed into BR layer via BR-0004-0026 / BR-0004-0027.
- Approved By: yusuke_senaga

### Triage

| Source                                  | Subject                                                                                                                                        | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| REQ-0120 (discussion-20260523221141355) | `validate.json` profile disambiguation (profile-suffixed + always-latest with explicit `profile` field; legacy path deprecated until `1.10.0`) | spec-0004     | UPDATE    | APPEND | yusuke_senaga | validate output path semantics are spec-0004 owned (CAP-0004); deprecation pattern reuses BR-0004-0021 sunset-named contract |
| REQ-0102 (discussion-20260523221141355) | SSOT-sync invariant — `pnpm ci:lint` lane enforces pair-changed `findDesignMdViolations.ts` ↔ `generator-prompt.md`                            | spec-0004     | UPDATE    | APPEND | yusuke_senaga | validate lane extension lives in spec-0004 territory; mirrors `.agents/rules/distributed-surface.md` layer-1/2/3 pattern     |
| REQ-0125 (discussion-20260523221141355) | `R-PROMPT-SCANNER-DRIFT` finding code with mandatory `justification:` 3-part contract                                                          | spec-0004     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate finding shape enforcement is spec-0004 (mirrors BR-0004-0017 R-WORKLOG-DRIFT pattern)                          |
| NFR-0101 (SSOT-sync mirror enforced)    | absorbed into BR-0004-0027 (SSOT-sync pair-changed CI lane)                                                                                    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | NFR realized as BR-layer mechanical guarantee                                                                                |
| NFR-0103 (warning names sunset version) | absorbed into BR-0004-0026 (legacy validate.json deprecation window)                                                                           | spec-0004     | UPDATE    | APPEND | yusuke_senaga | NFR realized through existing sunset-named-in-warning pattern (BR-0004-0021)                                                 |

### CHG-005 Operations (this PR)

| Op ID  | Op Type       | Target                                                                                  | Summary                                                                                                                                                                        |
| ------ | ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OP-013 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0120 / REQ-0102 / REQ-0125; Entry-points ranges) | 3 new REQs appended; range expanded to US-0036 / AC-0035 / BR-0029 / EX-0036 / TC-0064                                                                                         |
| OP-014 | UPDATE:APPEND | 02_User-stories.md (US-0004-0034..0036)                                                 | profile-suffixed validate output + SSOT-sync pair-changed lane + R-PROMPT-SCANNER-DRIFT justification user stories                                                             |
| OP-015 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0031..0035)                                          | per-REQ acceptance criteria including pair-changed pass-cases (neither / both edited) and deprecation-window escalation                                                        |
| OP-016 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0025..0029)                                               | mirror BR layer for OP-015; reuses BR-0004-0017 (justification non-empty) and BR-0004-0021 (sunset named) patterns                                                             |
| OP-017 | UPDATE:APPEND | 05_Examples.md (EX-0004-0032..0036)                                                     | worked examples per AC                                                                                                                                                         |
| OP-018 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0055..0064)                                                   | test coverage per AC — TC level pinned `integration` (per spec-0004 catalog) for end-to-end profile-suffixed wiring and CI-lane behavior; `validators` for finding-emit checks |

- Notes:
  - Sunset version `1.10.0` is the next minor after the pinned branch (`feature/v1.9.1`); the literal string is the only versioned token allowed in spec text per `.agents/rules/distributed-surface.md` exception for npm-version markers.
  - Parallel pack pieces: spec-0012 receives the iterate-side scanner/prompt implementation; spec-0006 receives the `qfai doctor` playwright probe rebuild; spec-0013 receives the SDD UI contract template `primary_tasks:` slot; spec-0015 receives the Reviewer-Gate cycle + drift finding emission.
  - 9 deferred-OQ decisions made upstream by the orchestrator are reflected verbatim in REQ text (OQ-0111 = option A profile-suffixed path; legacy path sunset = `1.10.0`).
- Source: REQ-0120, REQ-0102, REQ-0125 (discussion-20260523221141355); NFR-0101, NFR-0103

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR | Rationale                                                                                                                                                                                  | Approver |
| ------------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| UPDATE:APPEND | spec-0004   | REQ-0150  | spec-0006 CHG-005 cycle で REQ/AC/TC composite ID が doctor.ts コメントに leak し manual reviewer audit でのみ検出された defect を lint-shipping `src-comment` lane で automation 化する。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0004)

| Operation | Sub-op | Target                                                                                                                | Source (REQ)                 | Rationale        | DR-Ref                    | Status |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- | ------------------------- | ------ |
| UPDATE    | APPEND | 01_Spec.md (Scope.In + Relevant Requirements + Entry-points ranges → US-0039 / AC-0039 / BR-0033 / EX-0041 / TC-0073) | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0004-0037..0039)                                                                               | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0004-0036..0039)                                                                        | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0004-0030..0033)                                                                             | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0004-0038..0041)                                                                                   | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0004-0067..0073)                                                                                 | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0004-0014)                                                                                        | REQ-0166, REQ-0164, REQ-0167 | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (OQ-0158/0159/0167 resolved notes)                                                               | REQ-0164, REQ-0167           | cascade verified | DR-0267, DR-0268, DR-0274 | PASS   |

- Notes:
  - REQ-0166 spans BOTH specs: this is the VALIDATE-PROFILE side (`qfai validate --profile saas-package`); the CERTIFY side (`certify --scope saas-package`) is owned by spec-0014 (same Source REQ, file-local IDs). The skip set named by `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) must match the certify-side `notes:`.
  - Contract references: `_policies/05_Contracts.md` §CHG-006 — CLI-HANDOFF (cross-skill handoff schema), DCON-005 (design-system attestation, REFERENCE no-schema-change), CLI-VAL (`--profile saas-package` + `auditProfile.ts` dual-shape per DR-0268). Glossary §CHG-006 — `saas-package profile`, `R-PACK-LOCATION-DRIFT`, `D-SAAS-PACKAGE-VERIFY-SKIPPED`, `QFAI-AUD-020`.
  - REQ-0164: `auditProfile.ts` is a NEW validator module (to be created); accepts string-only AND structured `{id,label,acceptance}` (DR-0268 closed schema); `QFAI-AUD-020` names `3..7` band (DR-0267). OQ-0158 / OQ-0159 resolved by the cited DRs.
  - REQ-0167: `packages/qfai/scripts/check-pack-locations.mjs` is a NEW lint script (to be created) wired into `pnpm ci:lint` (no contract file; recorded under `_policies/07_Constraints.md` OC-65). OQ-0167 lint-scope dimension resolved by DR-0274; the register's `sdd lint --fix` OQ-0167 remains separately deferred.
  - One-minor deprecation window per OC-63 applies to the new `D-*` findings.
- Source: REQ-0166, REQ-0164, REQ-0167 (discussion-20260527075558258)
