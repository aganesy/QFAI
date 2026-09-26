# 09 Delta

## 2026-09-04

- `CR-20260904-0003` (`confirm-only`, `/qfai-sdd 0004`): this spec's
  `iter-NN/review.json` schema disagreed with
  `core/validators/prototypingEvidence.ts` in three places, and the
  implementation is canonical for all three (operator decision).
  `AC-0004-0012`'s eight `lap-*` IDs named navigation and interaction defects
  while `assets/validators/layoutAntiPatterns.json` — what `loadKnownLapIds`
  resolves against — names layout archetypes; seven of eight had no
  counterpart, so every ID the criterion listed except
  `lap-008-no-back-affordance` was rejected by the shipped gate. The criterion
  now points at the registry and lists its IDs with their scopes.
  `AC-0004-0013`'s `designMdViolations` shape was
  `{category, expected, found, location}` with any extra field rejecting; the
  validator checks `{kind, found}` and ignores the rest, and the criterion now
  says so. `04_Business-Rules.md` and `05_Examples.md` said `prose` where the
  validator requires `proseCritique` — 17 occurrences plus `REVIEW_KNOWN_KEYS`,
  so a payload written to the spec was rejected twice.

  **Upstream artifacts changed:** `03_Acceptance-Criteria.md`,
  `04_Business-Rules.md`, `05_Examples.md`, `08_Open-questions.md`. All are
  upstream SSOT under `drift-protocol.md:63-65`, which is why this took a
  Change Request. Each corrected criterion records what it used to say.

  No DERIVED artifact changed, and no test: `06_Test-Cases.md` cites the
  criteria by ID rather than restating the shapes, and the tests already assert
  the implementation's shape — which is what this CR makes canonical.

  **Not settled:** two product questions the choice does not answer are open as
  `OQ-0168` (is the navigation-defect family separately worth detecting? seven
  of those IDs have no detector today and none was deliberately retired) and
  `OQ-0169` (should a reviewer supply `expected` and `location`? the gate drops
  both, so a violation is reported without a location). Filed from **#1105**.

- `CR-20260904-0001` (`confirm-only`, `/qfai-sdd 0004`): `TDD-0011`, `TDD-0012`
  and `TDD-0013` were `done` against
  `packages/qfai/tests/core/prototypingEvidence.negative.test.ts`, which holds
  no `QFAI-PROT-002` assertion; `16_Traceability-ledger.md`'s `REQ-0020` row
  cited the same file. All four now name
  `packages/qfai/tests/validators/prototypingEvidence.test.ts`, and one test was
  added there for `EX-0004-0010`'s payload so `TDD-0011`'s selector resolves.
  **Upstream artifacts changed:** `16_Traceability-ledger.md`'s `REQ-0020` row,
  above. Only `tdd/test-list.md`'s `Test file` column is writable without the
  drift path; `drift-protocol.md:63-65` puts every other file under
  `.qfai/specs/**` — this ledger included — under upstream SSOT, so repointing
  that row is an upstream change and is covered by `CR-20260904-0001`'s approval
  and by this `confirm-only` rerun. An earlier revision of this entry said
  "Nothing upstream of `tdd/test-list.md` changed" while recording the ledger
  edit two sentences above; that was self-contradictory and is withdrawn.

  No DERIVED artifact changed: `03`, `04`, `05` and `06` are untouched, and
  "v1.x-shaped" in `TC-0004-0011` is not a version check — `EX-0004-0010`
  defines it as a payload missing the required keys.

  **Scope of the confirm-only:** this rerun confirms only that the corrected
  ledger rows describe the tests that exist. It does **not** certify the rest of
  the pack. Three divergences between this spec's `review.json` schema and the
  shipped validator were found while recording it and are tracked in **#1105**:
  `04:60` / `05:68` name the prose key `prose` where the validator requires
  `proseCritique`; `03:58` defines `designMdViolations` as
  `{category, expected, found, location}` where `prototypingEvidence.ts:79-87`
  checks `{kind, found}`; and seven of `AC-0004-0012`'s eight `lap-*` names
  differ from `assets/validators/layoutAntiPatterns.json`. Choosing a canonical
  side for each needs its own Change Request.

## 2026-04-22

- Clarified: validate's prototyping responsibility is current skill/evidence/schema gating.
- Superseded: active references to the removed `prototypingRecommendation.ts` validator.
- Added: `packages/qfai/src/core/validators/prototypingEvidence.ts` as the current prototyping schema validator in the validate path.
- Preserved: `QFAI-UIE-001/002` and other deterministic validator slices as current machine-gate behavior.

## 2026-05-06 — CHG-001 — Absorbed validator subjects from spec-0017 (decomposition)

- Trigger: spec-0017 (CAP-0017 v2.0 / UX-loop redesign) violates `_policies/11_Slice-Policy.md` (1 spec = 1 CAP, 1 skill = 1 spec). Validator-side subjects belong to spec-0004 (validate territory).
- Posture: additive append; no purge in spec-0004. Backward compatibility for existing validators retained.
- Approved By: yusuke_senaga

## Triage (CHG-001)

| Source                       | Subject                                     | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                  |
| ---------------------------- | ------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------ |
| spec-0017 REQ-0017-0015      | DCON-030 / 031 / 032 validators             | spec-0004     | UPDATE    | APPEND | yusuke_senaga | DESIGN.md / lock / mirror gate is validate |
| spec-0017 TC-0017-0015..0017 | prototypingEvidenceV3 schema validator      | spec-0004     | UPDATE    | APPEND | yusuke_senaga | review.json schema gate is validate        |
| spec-0017 AC-0017-0018       | layoutAntiPatternsDetected schema validator | spec-0004     | UPDATE    | APPEND | yusuke_senaga | lap-\* whitelist enforcement is validate   |
| spec-0017 AC-0017-0019       | designMdViolations schema validator         | spec-0004     | UPDATE    | APPEND | yusuke_senaga | violation shape gate is validate           |
| spec-0017 AC-0017-0020       | `findDesignMdViolations` purity contract    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | pure-fn determinism is validate            |

## CHG-001 Operations

| Op ID  | Op Type       | Target                                                | Summary                                                                                                                         |
| ------ | ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In + REQ-0025..0031 + Entry points) | DCON-030/031/032, prototypingEvidenceV3, lap whitelist, designMdViolations shape, findDesignMdViolations purity を Scope に追加 |
| OP-002 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0004-0008..0014)        | DCON-030/031/032, prototypingEvidenceV3, lap whitelist, designMdViolations shape, findDesignMdViolations purity の AC layer     |
| OP-003 | UPDATE:APPEND | 04_Business-Rules.md (BR-0004-0008..0013)             | mirror BR layer for OP-002                                                                                                      |
| OP-004 | UPDATE:APPEND | 05_Examples.md (EX-0004-0007..0012)                   | worked examples per AC-0004-0008..0014                                                                                          |
| OP-005 | UPDATE:APPEND | 06_Test-Cases.md (TC-0004-0008..0014)                 | test coverage per AC; routes to existing tests under `packages/qfai/tests/core/validators/`                                     |

## CHG-001 Notes

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

## Triage (CHG-005)

| Source                                  | Subject                                                                                                                                        | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| REQ-0120 (discussion-20260523221141355) | `validate.json` profile disambiguation (profile-suffixed + always-latest with explicit `profile` field; legacy path deprecated until `1.10.0`) | spec-0004     | UPDATE    | APPEND | yusuke_senaga | validate output path semantics are spec-0004 owned (CAP-0004); deprecation pattern reuses BR-0004-0021 sunset-named contract |
| REQ-0102 (discussion-20260523221141355) | SSOT-sync invariant — `pnpm ci:lint` lane enforces pair-changed `findDesignMdViolations.ts` ↔ `generator-prompt.md`                            | spec-0004     | UPDATE    | APPEND | yusuke_senaga | validate lane extension lives in spec-0004 territory; mirrors `.agents/rules/distributed-surface.md` layer-1/2/3 pattern     |
| REQ-0125 (discussion-20260523221141355) | `R-PROMPT-SCANNER-DRIFT` finding code with mandatory `justification:` 3-part contract                                                          | spec-0004     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate finding shape enforcement is spec-0004 (mirrors BR-0004-0017 R-WORKLOG-DRIFT pattern)                          |
| NFR-0101 (SSOT-sync mirror enforced)    | absorbed into BR-0004-0027 (SSOT-sync pair-changed CI lane)                                                                                    | spec-0004     | UPDATE    | APPEND | yusuke_senaga | NFR realized as BR-layer mechanical guarantee                                                                                |
| NFR-0103 (warning names sunset version) | absorbed into BR-0004-0026 (legacy validate.json deprecation window)                                                                           | spec-0004     | UPDATE    | APPEND | yusuke_senaga | NFR realized through existing sunset-named-in-warning pattern (BR-0004-0021)                                                 |

## CHG-005 Operations

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

## Triage (2026-09-11)

| Source   | Subject                                                    | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                              |
| -------- | ---------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| REQ-0028 | `proseCritique` schema check states a cap, not a word band | spec-0004     | UPDATE    | MODIFY | -           | Impact cascade from REQ-0012-0059: the validator spec restates the retired band in its requirement, criterion and rule |

## Triage (2026-09-12)

| Source   | Subject                                                                        | Existing Spec | Operation | Sub-op | Approved By      | Rationale                                                                                                                     |
| -------- | ------------------------------------------------------------------------------ | ------------- | --------- | ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| REQ-0029 | The `layoutAntiPatternsDetected` whitelist is the registry, not a numeric band | spec-0004     | UPDATE    | MODIFY | CR-20260912-0001 | The acceptance criterion was already registry-anchored; the requirement, the rule and the example still stated `lap-001..008` |

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                              | Subject                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Depends-On                                     |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0003, discussion-20260923063306456#REQ-0004                                        | Layout and ID findings: a story directory holds exactly three files and no subdirectory; a malformed, duplicate or prefix-mismatched ID                                                                                                                                                                                                                                                                                                                                                                          | spec-0004     | UPDATE    | APPEND | -             | Slice A. Size signal: 39 AC / 50 TC today, above 55 AC / 60 TC after these appends; the spec owns exactly CAP-0004, so no SPLIT                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | -                                              |
| discussion-20260923063306456#REQ-0005                                                                               | Unlisted-contract finding; new-layout validators read `03_contract/`, including the `tech.md` Standard commands for `QFAI-ASSETS-003`                                                                                                                                                                                                                                                                                                                                                                            | spec-0004     | UPDATE    | APPEND | -             | Slice A; the code lands in P3, selected by the detected layout. Conservation pairs with this spec's REMOVE row, which retires the `.qfai/contracts` and `catalog/tech.md` reads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | -                                              |
| discussion-20260923063306456#REQ-0011                                                                               | `decisions.md` and `open-questions.md` carry exactly four columns and the status vocabulary                                                                                                                                                                                                                                                                                                                                                                                                                      | spec-0004     | UPDATE    | APPEND | -             | Slice A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | -                                              |
| discussion-20260923063306456#REQ-0011                                                                               | Rows of `decisions.md` and `open-questions.md` are only appended; only Status changes                                                                                                                                                                                                                                                                                                                                                                                                                            | spec-0004     | UPDATE    | APPEND | -             | Slice B. Adopted (OQ-0175): the check runs in the `drift` gate through `gitChanges.ts`, over both tables, with no exception for an ID change; an unresolvable base gives no finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | OQ-0175                                        |
| discussion-20260923063306456#REQ-0008                                                                               | An EX with zero or several AC-Refs, and an AC with no EX                                                                                                                                                                                                                                                                                                                                                                                                                                                         | spec-0004     | UPDATE    | APPEND | -             | Slice A                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | -                                              |
| discussion-20260923063306456#REQ-0006, discussion-20260923063306456#REQ-0007                                        | A BR with no EX, an EX cited by no BR, and a citation of an EX that does not exist                                                                                                                                                                                                                                                                                                                                                                                                                               | spec-0004     | UPDATE    | APPEND | -             | Slice B                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | OQ-0176                                        |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0010                                        | Test-obligation findings per layer (BF to E2E, AC to integration or API, EX to any test) with a `decisions.md` exemption: a `Test exception:` row holds only while DONE, does not cascade, and exempted items are listed at info. A BF or AC annotation outside its layer's directory is an error, and so is an annotation naming an undeclared ID                                                                                                                                                               | spec-0004     | UPDATE    | APPEND | -             | Slice B. Adopted (OQ-0178, N04, N18): the directory decides a test's layer through the existing crosswalk; BF counts only from `e2e/`, AC only from `integration/` or `api/`, EX from any selected test file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | OQ-0178                                        |
| discussion-20260923063306456#REQ-0021, discussion-20260923063306456#NFR-0007                                        | The old layout is an error that names the path and `/qfai-migration-spec-to-story`                                                                                                                                                                                                                                                                                                                                                                                                                               | spec-0004     | UPDATE    | APPEND | -             | Slice A; switched on at P7 as the last commit of the cutover                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | -                                              |
| discussion-20260923063306456#NFR-0005                                                                               | `qfai validate --fail-on error` on each version's own fresh-init tree has a complete-run median at most 120% of the P1 baseline                                                                                                                                                                                                                                                                                                                                                                                  | spec-0004     | UPDATE    | APPEND | -             | Slice A; record the P1 integration commit baseline first, diagnose at P3 and gate the merge at P8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -                                              |
| discussion-20260923063306456#REQ-0024, discussion-20260923063306456#NFR-0004                                        | `lint-shipping` ID classes learn the new shapes                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | spec-0004     | UPDATE    | MODIFY | -             | Slice A, additive; one pattern set with the other two guards. REQ-0024 row 2 of 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -                                              |
| discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018 | Validators read `kind` from the card frontmatter and assistant files from `rule/`, and write `report/spec-coverage`; the allowlist accepts `skill.local`; the text-output grammar moves into the validate contract and its language pin into `repository-language.md`                                                                                                                                                                                                                                            | spec-0004     | UPDATE    | MODIFY | -             | Slice B, lands P6; the old paths end in the same phase. Adopted (OQ-0177, N11): `cli-ux-guidelines.md` is absorbed. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0012, discussion-20260923063306456#REQ-0013 | Remove the old validators' items: spec-pack required files, layered traceability, TC and ledger checks, contract-annotation coverage, TRIAGE-_, SPLIT-_, the retired-spec schema, the `.qfai/contracts` and `catalog/tech.md` reads, and the old business-flow checks: `QFAI-BFLOW-005` and `QFAI-BFLOW-006` in `businessFlow.ts` and `businessFlowTraceability.ts`, which read `_policies/04_Business-Flow.md`, and the flow scan in `atddTraceability.ts`. The flow-annotation reader stays for the ID grammar | spec-0004     | UPDATE    | REMOVE | yusuke_senaga | Slice C. This repository's self-validation runs these validators, so the row lands when they and the tests annotating these TCs are deleted. Replacements: this spec's APPEND rows. The user widened the row to the old business-flow checks on 2026-09-24 (batch record P4-C1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | OQ-0170                                        |
| discussion-20260923063306456#REQ-0012                                                                               | `QFAI-DRIFT-001` reads `Change request:` rows, which authorise while WIP or DONE; the protected set is the story tree, `contractsDir` and both tables; a change confined to `Change request:` rows (appending one at any Status, or changing its Status) is allowed                                                                                                                                                                                                                                              | spec-0004     | UPDATE    | APPEND | -             | Slice C. Adopted (N07)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | OQ-0170                                        |
| discussion-20260923063306456#REQ-0004, discussion-20260923063306456#REQ-0011                                        | The work-log schema is re-keyed to BF and DEC IDs and to `decisions.md`                                                                                                                                                                                                                                                                                                                                                                                                                                          | spec-0004     | UPDATE    | MODIFY | -             | Slice C. Adopted (N06): scope, promotion and links follow the new IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | OQ-0170                                        |
| discussion-20260923063306456#REQ-0011                                                                               | Validator-read table rows open with a keyword and a colon (`Test exception:`, `Change request:`, `Unadjudicated:`) followed by the IDs, and Status alone decides whether a row holds; an `Unadjudicated:` row at TODO or WIP is an error                                                                                                                                                                                                                                                                         | spec-0004     | UPDATE    | APPEND | -             | Slice A. Adopted (N08)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | -                                              |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | `qfai validate --flow BF-NNNN` scopes the run to one business flow; `qfai validate --spec` on a story tree exits 2                                                                                                                                                                                                                                                                                                                                                                                               | spec-0004     | UPDATE    | APPEND | -             | Slice A, selected by the detected layout. Decided by the user in the Phase 2 grilling (Q2): `--flow BF-NNNN` replaces `--spec`, and skills gate per flow. Conservation pairs with this spec's `--spec` REMOVE row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | -                                              |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | Remove the `--spec <spec-id>` scope of `qfai validate`                                                                                                                                                                                                                                                                                                                                                                                                                                                           | spec-0004     | UPDATE    | REMOVE | yusuke_senaga | Slice C, lands P7. Decided by the user in the Phase 2 grilling (Q2): `--flow BF-NNNN` replaces `--spec`, and skills gate per flow; the answer approves this row. No item in this spec states the scope today, so the row removes the flag in code and the tests that pin it. Replacement: this spec's `--flow` APPEND row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | OQ-0170                                        |

## 2026-09-24 — spec-to-story batch record

The record of the `/qfai-sdd` batch run `sdd-batch-20260923100952585` for this
spec. Its rows are under `## Triage (2026-09-23 spec-to-story)` above, and every
decision it applies is in `.qfai/evidence/sdd-batch-20260923100952585.md`.
Nothing is retired or tombstoned by this record: a REMOVE row's items stay until
the change that lands the row (ruling X3).

### What this run changed

- Added: US-0004-0040..0048, AC-0004-0041..0075, BR-0004-0043..0081,
  EX-0004-0046..0089, TC-0004-0074..0117, and ledger rows TDD-0067..0162, all at
  `todo`. The last ID of each range came from the second Reviewer Gate. TDD-0150..0158 are the E2E rows of US-0004-0040..0048.
  AC-0004-0070, BR-0004-0076, EX-0004-0080, TC-0004-0108 and TDD-0140 were
  withdrawn after the Reviewer Gate and are not reissued (see the corrections
  at the end of this record).
- Changed by adding a clause marked "on the story tree" or "with the
  `rule/ skill/ agent/ prompt/` assistant tree" beside the current one (ruling
  X1): US-0004-0028, US-0004-0029, US-0004-0031; AC-0004-0015, AC-0004-0017,
  AC-0004-0020, AC-0004-0024, AC-0004-0026; BR-0004-0014, BR-0004-0015,
  BR-0004-0016, BR-0004-0019, BR-0004-0023; EX-0004-0013, EX-0004-0015,
  EX-0004-0018, EX-0004-0026.
- Rewritten in place, because the new wording names a configuration key and
  holds in both layouts (ruling X1): US-0004-0037; AC-0004-0009, AC-0004-0010,
  AC-0004-0036; BR-0004-0009, BR-0004-0010, BR-0004-0022, BR-0004-0030;
  EX-0004-0008, EX-0004-0009, EX-0004-0038. `.qfai/contracts/design/…` becomes
  `<paths.contractsDir>/design/…`, and `.qfai/assistant/skills/` becomes
  `<paths.skillsDir>`.
- Existing items touched by either change were translated to English.
- `01_Spec.md`: Consumer View, Scope, Applicable NFR, the REQ-0026, REQ-0027,
  REQ-0034, REQ-0037, REQ-0039 and REQ-0150 lines, eleven lines citing the
  discussion pack, and the Entry points ranges.
- `10_Plan.md`: a `### Story-tree layout` subsection under each heading the
  change touches.
- Unchanged: every existing TC and every existing ledger row (ruling X2).
- Skipped and never reissued (ruling X14): AC-0004-0040, BR-0004-0034..0042 and
  EX-0004-0042..0045, which git history shows were retired.

### Where each row lands

Delivery is three pull requests (P3-C1 to P3-C3):

1. **P1**, on its own and merged first: the guard pattern sets, the shape
   table, and the removal of out-of-band IDs from shipped files. The clean-up
   commit comes before the guard commit.
2. **P2 to P8**, one pull request of ordered commits that also carries
   `/qfai-atdd` and `/qfai-implement` with their tests. Its first commit
   records the NFR-0005 baseline from the P1 integration commit's own init
   tree. P3 measures the new init tree for diagnosis; P8 repeats that
   measurement for the merge gate.
3. **The removal of the migration memo's guard exception**, after the second
   has merged. This spec has nothing in it:
   `packages/qfai/scripts/lint-shipping.ts` carries no exception for the memo's
   file name.

| Triage row                                    | Operation     | Lands                                                | Items                                                                                                                              |
| --------------------------------------------- | ------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Layout and ID findings                        | UPDATE:APPEND | P3, second pull request                              | US-0004-0040; AC-0004-0041..0045; BR-0004-0043..0047; EX-0004-0046..0050; TC-0004-0074..0078                                       |
| Unlisted contract; `tech.md` read             | UPDATE:APPEND | P3, second pull request                              | US-0004-0041; AC-0004-0046, 0047; BR-0004-0048, 0049; EX-0004-0051, 0052; TC-0004-0079, 0080                                       |
| Four columns and status vocabulary            | UPDATE:APPEND | P3, second pull request                              | US-0004-0042; AC-0004-0048..0050; BR-0004-0050..0052; EX-0004-0053..0055; TC-0004-0081..0083                                       |
| Rows only appended                            | UPDATE:APPEND | P3, second pull request                              | US-0004-0043; AC-0004-0053, 0054; BR-0004-0055, 0056; EX-0004-0058..0060; TC-0004-0086..0088                                       |
| EX to AC                                      | UPDATE:APPEND | P3, second pull request                              | US-0004-0044; AC-0004-0057, 0058; BR-0004-0060, 0061; EX-0004-0064..0066; TC-0004-0092..0094                                       |
| BR to EX                                      | UPDATE:APPEND | P3, second pull request                              | US-0004-0044; AC-0004-0059..0062; BR-0004-0062..0065; EX-0004-0067..0071; TC-0004-0095..0099                                       |
| Test obligations per layer                    | UPDATE:APPEND | P3, second pull request                              | US-0004-0045; AC-0004-0063..0068; BR-0004-0066..0073; EX-0004-0072..0078; TC-0004-0100..0106                                       |
| Old-layout error                              | UPDATE:APPEND | Written at P3, wired in P7's last commit             | US-0004-0046; AC-0004-0069; BR-0004-0074, 0075; EX-0004-0079; TC-0004-0107                                                         |
| NFR-0005 validate time                        | UPDATE:APPEND | P1 integration baseline, P3 diagnosis, P8 merge gate | No item: an evidence gate in the plan's `## NFR approach`. AC-0004-0070, BR-0004-0076, EX-0004-0080 and TC-0004-0108 are withdrawn |
| `lint-shipping` ID classes                    | UPDATE:MODIFY | P1, first pull request                               | US-0004-0047; AC-0004-0071; BR-0004-0077; EX-0004-0081, 0082; TC-0004-0109, 0110; the REQ-0150 line                                |
| Assistant tree, `spec-coverage`, text grammar | UPDATE:MODIFY | P6, second pull request                              | US-0004-0028; AC-0004-0015, 0024, 0026; BR-0004-0014, 0022, 0023; EX-0004-0013, 0026; the REQ-0034 line                            |
| Old validators' items                         | UPDATE:REMOVE | P7, second pull request                              | See the next section                                                                                                               |
| `Change request:` rows under `QFAI-DRIFT-001` | UPDATE:APPEND | P3, second pull request                              | AC-0004-0055, 0056, 0075; BR-0004-0057..0059, 0081; EX-0004-0061..0063, 0086..0089; TC-0004-0089..0091, 0114..0117                 |
| Work log re-keyed                             | UPDATE:MODIFY | P7, second pull request                              | US-0004-0029, 0031; AC-0004-0017, 0020; BR-0004-0015, 0016, 0019; EX-0004-0015, 0018; the REQ-0037 and REQ-0039 lines              |
| Keyword rows                                  | UPDATE:APPEND | P3, second pull request                              | AC-0004-0051, 0052; BR-0004-0053, 0054; EX-0004-0056, 0057; TC-0004-0084, 0085                                                     |
| `--flow BF-NNNN`; `--spec` refused            | UPDATE:APPEND | P3, second pull request                              | US-0004-0048; AC-0004-0072..0074; BR-0004-0078..0080; EX-0004-0083..0085; TC-0004-0111..0113                                       |
| Remove `--spec`                               | UPDATE:REMOVE | P7, second pull request                              | See the next section                                                                                                               |

- The E2E ledger rows TDD-0150..0158 land with the rows of their stories.
- The design-contract paths in US-0004-0037, AC-0004-0009, 0010, 0036,
  BR-0004-0009, 0010, 0030, EX-0004-0008, 0009, 0038 and the REQ-0026 and
  REQ-0027 lines were rewritten under the unlisted-contract and old-validators
  rows. The wording holds in both layouts, so no code change goes with it.

### What each REMOVE row retires at landing

**Old validators' items (P7).**

- In this spec: the Scope bullet "layered spec / traceability / contract /
  discussion validators" in `01_Spec.md`, as far as it names the spec-pack
  validators. No US, AC, BR, EX or TC of this spec describes them, so no ledger
  row of this spec is tombstoned.
- In code: the spec-pack required-file, layered-traceability, TC and ledger,
  contract-annotation coverage, `QFAI-TRIAGE-*`, `QFAI-SPLIT-*` and
  retired-spec schema validators, and the reads of `.qfai/contracts` and
  `catalog/tech.md`, in the order the plan gives for P7.
- In code, the old business-flow checks the user added to the row on
  2026-09-24 (batch record P4-C1):
  - `packages/qfai/src/core/validators/businessFlowTraceability.ts` and its
    export from `packages/qfai/src/core/validators/index.ts`;
  - the flow-document half of `packages/qfai/src/core/businessFlow.ts`
    (`scanBusinessFlows`, `storiesByFlow` and the parsers of
    `_policies/04_Business-Flow.md`);
  - the `scanBusinessFlows` and `storiesByFlow` calls in
    `packages/qfai/src/core/atddTraceability.ts`;
  - `QFAI-BFLOW-005` and `QFAI-BFLOW-006` in
    `packages/qfai/src/core/emittedRuleCodes.ts` and in the code table of
    `packages/qfai/src/cli/commands/validate.ts`.

  `parseTestFlowRefs`, the flow-annotation reader, stays: the ID grammar reads
  `QFAI:BF-` annotations through it.

- Tests: the tests of those validators carry annotations of other specs, each
  retired by that spec's own REMOVE row. Phase 2 counted `QFAI:SPEC-0001` 24
  times and `QFAI:SPEC-0013` twice in the spec-pack validator's tests,
  `QFAI:SPEC-0008` twice and `QFAI:SPEC-0013` seven times in the traceability
  tests, and `QFAI:SPEC-0001` six times in the ledger tests. The list is
  re-derived when the row lands. The flow-document cases of
  `packages/qfai/tests/core/businessFlowTraceability.test.ts` go with the
  business-flow checks, and its `parseTestFlowRefs` cases stay.

**Remove `--spec` from `qfai validate` (P7).**

- In this spec: nothing. No item states the scope, and no ledger row of this
  spec covers it.
- In code: `packages/qfai/src/core/specScope.ts`, the `spec-` unit of
  `scopedReportPath` in `packages/qfai/src/cli/commands/validate.ts`, the
  flag's scoping in `packages/qfai/src/cli/lib/args.ts`, and its help in
  `packages/qfai/src/cli/main.ts`. `args.ts` keeps an explicit refusal:
  `qfai validate --spec` still exits 2 with a message naming `--flow BF-NNNN`
  (BR-0004-0079, `.qfai/contracts/cli/qfai-validate.md#flow-scope`).
- Tests that pin the flag today, re-derived when the row lands:
  `packages/qfai/tests/core/specScope.test.ts`,
  `packages/qfai/tests/core/specScopeValidate.test.ts`, the `--spec` cases of
  `packages/qfai/tests/cli/args.test.ts`,
  `packages/qfai/tests/core/atddSpecScopeAttribution.test.ts`,
  `packages/qfai/tests/core/specSplitScopeAttribution.test.ts` and
  `packages/qfai/tests/assets/perSpecGateScope.test.ts`.

### Co-changes the landing carries

- **P1.** Shipped sources carry this spec's composite IDs, for example
  `BR-0004-0028` in `packages/qfai/src/core/validators/reviewerGate.ts` and
  `AC-0004-0020` in `packages/qfai/src/core/validators/worklogSurface.ts`. The
  clean-up commit removes every one the new pattern set matches, re-counted
  with the guards' own patterns. The Phase 3 count across all specs was 54
  occurrences in 25 files.
- **First commit of the second pull request.** The baseline half of
  `.qfai/evidence/story-tree-validate-time.md` measures the P1 integration
  commit's own fresh-init tree. The separate
  `packages/qfai/tests/fixtures/story-tree-init/` fixture checks P3 init
  parity. The evidence file's fields gate the merge of the second pull
  request. Both names are the plan's; no contract fixes them.
- **Before the first `tdd` gate of the second pull request.** An approved
  change request `.qfai/decisions/CR-*.md` whose Impact scope names every spec
  and contract path this change edits, approved by the user (user answer U1).
  Until P7, `QFAI-DRIFT-001` fails the `tdd` gate and the dogfood `tdd` lane
  on each edited path without it.
- **P3.**
  - Test fixtures that write `.qfai/specs/` without setting `paths.specsDir`
    break when the default switches, so they set the key in the same commit.
  - `scripts/fresh-init-findings.json` is re-derived, because the story-tree
    families first run on a fresh init tree here. It is re-derived again at P6
    and P7.
- **P6.**
  - The co-change list in this spec's assistant-tree Triage row.
  - The `specs-coverage` directory name is pinned by the pack-sandbox path in
    `.github/workflows/ci.yml`, which needs a shipped-CI disposition, and by
    `packages/qfai/tests/core/layerCoverage.test.ts`,
    `packages/qfai/tests/assets/evidenceCitedArtifacts.test.ts` and
    `packages/qfai/tests/unit/core/doctor/cleanRunLogs.test.ts`.
  - `cli-ux-guidelines.md` is read by
    `packages/qfai/tests/unit/cliMessageLanguage.test.ts` and its allowlist,
    `packages/qfai/tests/cli/commands/validateTextFormat.test.ts`,
    `packages/qfai/tests/cli/validateRunIncomplete.test.ts`,
    `packages/qfai/tests/assets/assets.test.ts` and
    `packages/qfai/tests/integration/agentsRulesSurface.test.ts`.
  - TC-0004-0015, TC-0004-0024 and TC-0004-0026 keep their text until this
    phase and are rewritten with their items' code.
- **P7.**
  - The landing drops the current clause from every item listed under
    "Changed by adding a clause" above, leaving the marked one (ruling X1,
    OQ-0170). TC-0004-0017 and TC-0004-0020 are rewritten with the work-log
    code.
  - The P4 skill rewrite moves every skill text that runs
    `qfai validate --spec` to `--flow` before the flag goes.
  - The deletion list checks importers under `packages/qfai/src/migration/`.
    Migration step 8 keeps its own copy of the old `QFAI:SPEC-…` pattern
    because the old validators are deleted here.
  - The table helpers E3 uses move out of
    `packages/qfai/src/core/specPackParsers.ts` before that file is deleted.

### Recorded drift

Found while drafting under ruling X11. The Entry points drift below was later
resolved by D12; the other open items remain as recorded.

- `01_Spec.md` Entry points ended at EX-0004-0085 and TC-0004-0113 after
  Phase 2c added later items. D12 updated them to EX-0004-0089 and
  TC-0004-0117. Resolved.
- AC-0004-0026..0030 appear in no BR's AC-Refs. Open.
- BR-0004-0019 condition (a) requires `promote-to: 07_Decisions.md`, while the
  work-log contract makes promotion depend on the entry being `archived`. Open.
- BR-0004-0016 requires an `entry-<id>` prefix, while the work-log contract and
  REQ-0039 accept an entry ID with no prefix. Open.
- BR-0004-0013 and the REQ-0030 line still state the
  `{category, expected, found, location}` shape that AC-0004-0013 dropped under
  `CR-20260904-0003`. Open.
- Headings and item text that carry an old release number stay as written.
- The old business-flow validators had no item and no REMOVE row.
  `packages/qfai/src/core/businessFlow.ts` and
  `packages/qfai/src/core/validators/businessFlowTraceability.ts` raise
  `QFAI-BFLOW-005` and `QFAI-BFLOW-006` from `_policies/04_Business-Flow.md`,
  and `packages/qfai/src/core/atddTraceability.ts` also calls
  `scanBusinessFlows` and `storiesByFlow`. E1 reuses the annotation half,
  `parseTestFlowRefs`. Settled: the user widened the old-validators REMOVE row
  to them on 2026-09-24 (batch record P4-C1), so they go at P7 with the other
  old validators, and `parseTestFlowRefs` stays.
- Whether the `cli/` and `design/` enumeration moves into `buildContractIndex`
  at P7 is undecided. `spec-0001/10_Plan.md` says it does; this plan says only
  that the index does not change before P7. Open.
- The old-layout error is unreachable from P3 until P7's last commit, so
  TC-0004-0107 and TDD-0135..0139 cannot go green before then.
- Removing `--spec` at P7 keeps an explicit refusal: `--spec` still exits 2
  with a message naming `--flow BF-NNNN`, so AC-0004-0073, BR-0004-0079 and
  TC-0004-0112 keep holding. Settled by review ruling D8b in the batch record.
- Phase 2 counted one `QFAI:SPEC-0002` annotation in the tests of the retired
  validators. spec-0002 is not in this batch and has no REMOVE row to retire
  it. Open.

### Adoption and rejection

- Adopted: the story-tree families are selected by the detected layout, so this
  repository's own run stays on the spec-pack validators until it is migrated.
  Evidence: the `10_Plan.md` risk table and TC-0004-0074.
- Adopted: the old-layout error is written at P3 and wired only in P7's last
  commit, after this repository is migrated.
- X8 stands per U2. Validate reads only the configured `paths.specsDir`, with
  no fallback to the old default path when the key is absent: 2.x does not
  support an unmigrated tree, and a project on the spec-pack layout pins a 1.x
  release or migrates.
- Adopted (ruling G4-9): the `developer_instructions` guard becomes a two-way
  guard between the agent card and its generated Codex TOML, a MODIFY that
  needs no approval.
- Rejected: extending `buildContractIndex` in place at P3.
  - DO NOT: change `packages/qfai/src/core/contractIndex.ts` before P7.
  - Temptation: `cli/` and `design/` belong in the index, and adding them there
    looks like the smallest change. It changes what the six spec-pack callers
    read while this repository still runs them.
- Rejected: a second scoped-name helper for the `flow-` files.
  - DO NOT: build a scoped file name anywhere but `scopedReportPath`.
  - Temptation: report needs the name too, and a local helper saves an import.
    Two helpers drift apart, and report then misses the file validate wrote.
- Rejected: one validator module for every story-tree family.
  - DO NOT: merge the `sdd`, `atdd` and `tdd`, and `drift` families into one
    module.
  - Temptation: one file is easier to find. `core/validate.ts` wires validators
    per profile, so one module would run in profiles it does not belong to.

### Corrections from the Reviewer Gate (2026-09-24)

The gate of review pack `review-20260924014832174` returned REVISE. The
griller's rulings and the user's answers behind these corrections are in the
batch record.

Withdrawn, deleted and never reissued (ruling D4). NFR-0005 is checked by an
evidence gate instead, because a test reading a hand-written timing file cannot
fail on a regression:

- AC-0004-0070 withdrawn: the NFR-0005 timing criterion.
- BR-0004-0076 withdrawn: its only AC and its only EX are withdrawn, so no
  criterion or example is left for it.
- EX-0004-0080 withdrawn: the timing example.
- TC-0004-0108 withdrawn: the case that read the timing evidence.
- TDD-0140 withdrawn: the ledger row of TC-0004-0108.

| Ruling                    | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D4                        | The withdrawals above. The NFR-0005 line of `01_Spec.md` no longer cites AC-0004-0070. The plan's `## NFR approach` names `.qfai/evidence/story-tree-validate-time.md`, which must hold the machine, the base commit, five runs per side and both medians; a missing field or an after-median above 1.2 × the baseline blocks the merge of the second pull request. The L3 row no longer lists TC-0004-0108                                                                                                                                                                                             |
| D11                       | TC-0004-0074 and 0107 move from `unit` to `integration`, through `runValidate` in-process on a `mkdtemp` tree; TDD-0067, 0068 and 0135 to 0139 move to Integration/T2. TC-0004-0079 and 0080 move to `integration` and TDD-0078 to 0082 to Integration/T2, because the unlisted contract reads `api/` through `buildContractIndex` and `QFAI-ASSETS-003` reads `tech.md` from disk. TC-0004-0109 and 0110, and EX-0004-0081 and 0082, go through the exported `runLintShipping(root)` on a `mkdtemp` package root. The other family cases stay L1, on texts passed to E2's `buildStoryTreeModel(files)` |
| U1, R02 finding 2         | A risk row and a co-change: an approved change request covering every edited spec and contract path is committed before the first `tdd` gate of the second pull request                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| U2                        | "X8 stands per U2" under Adoption and rejection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| R02 findings 6, 16 and 17 | `contractReferences.ts` takes `cli/` and `design/` from E2 on the story-tree path. The kind function is named: the existing private `resolveTestKind` in `atddTraceability.ts`, exported. The order of the work lists P1 first, then the NFR-0005 baseline as the first commit of the second pull request                                                                                                                                                                                                                                                                                               |

### NFR-0005 measurement clarification

The pre-change CLI treats `.qfai/spec/` as a legacy directory, so its timing
cannot use the P3 story-tree parity fixture. Each CLI is measured on the
pristine tree produced by its own `qfai init`. The pre-change init tree can
produce findings and exit 1 after a complete scan. That exit is a valid timing
observation; an interrupted scan, `QFAI-SCAN-002`, or a crash is not. The P1
integration commit supplies the baseline. P3 is diagnostic, and the final P8
run gates the pull request. The D4 withdrawal of the timing test case remains
in force.

The second gate, review pack `review-20260924053652061`, returned REVISE. The
griller's rulings D12 and D13 are in the batch record.

| Ruling or finding     | What changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D12                   | Added AC-0004-0075, BR-0004-0081, EX-0004-0089, TC-0004-0117 and ledger row TDD-0162 under US-0004-0043: a merge base with no `decisions.md` under `paths.specsDir` makes neither drift family report. Added to the change-request row under Where each row lands. The plan's module row, seams, L3 row and boundaries name them; the U1 risk row covers P7's migration commit, and a new risk row covers the predicate silencing a later branch. The Entry points ranges run to the new IDs |
| D13                   | Plan step 5 follows the commit order of the repository-migration row in `_policies/10_delta.md`: migration step 4 re-keys the work-log entries in commit (3); the work-log readers, the REMOVE rows and the `--spec` REMOVE row in commit (4); the old-layout error in commit (5)                                                                                                                                                                                                            |
| R02 cycle-2 finding 2 | The `--spec` REMOVE row removes the flag's scoping from `args.ts` and keeps its explicit refusal, as the contracts state                                                                                                                                                                                                                                                                                                                                                                     |

## Triage (2026-09-24)

| Source                                 | Subject                                                                                                           | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                               | Depends-On |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| AC-0004-0013 and the shipped validator | Align the `designMdViolations` rule and requirement with required `kind` and `found`, while allowing extra fields | spec-0004     | UPDATE    | MODIFY | -           | BR-0004-0013 and REQ-0030 contradicted the accepted criterion; EX-0004-0090 and TC-0004-0013 prove the corrected shape. | -          |
| REQ-0039 and the work-log contract     | Accept a kebab-case work-log entry ID without an `entry-` prefix                                                  | spec-0004     | UPDATE    | MODIFY | -           | BR-0004-0016, AC-0004-0017, EX-0004-0015, and TC-0004-0017 use the same link grammar.                                   | -          |
| The work-log and validate contracts    | Require the declared decision row, archived status, and matching promotion back-reference                         | spec-0004     | UPDATE    | MODIFY | -           | BR-0004-0019, AC-0004-0020, EX-0004-0018, and TC-0004-0020 use the same three conditions.                               | OQ-0170    |
| AC-0004-0013                           | Add a shape-specific example for `designMdViolations`                                                             | spec-0004     | UPDATE    | APPEND | -           | EX-0004-0090 is the example TC-0004-0013 exercises; EX-0004-0012 remains the purity example.                            | -          |
