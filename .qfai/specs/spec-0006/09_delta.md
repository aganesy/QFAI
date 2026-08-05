# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0006 新規作成（旧 spec-0004 の統合）
- Tags: doctor, diagnostics, consolidation

## Migration Record

| Old Spec  | Title       | Key Changes                                                                                                            |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| spec-0004 | qfai doctor | Core functionality retained. IDs renumbered to 0006-XXXX. --out and root auto-discovery added as explicit requirements |

## Outdated Content Removed

- 旧 spec-0004 の実装詳細（個別チェック項目のリスト）は core/doctor.ts に委譲されるため spec レベルでは概要にとどめた

## Adopted

- Adopted: 旧 spec-0004 を spec-0006 として再番号付け
- Why: v2.0 のスペック番号体系（CAP-0006）に合わせるため

## Rejected

- Candidate: 旧番号（spec-0004）を維持する
- Reason: 新番号体系への統一
- DO NOT: 旧 spec-0004 の番号で参照を残さないこと
- Temptation: 旧番号維持は移行コストが低いが、体系の一貫性を損なう

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing AC/BR/EX/TC numbering. NFR-0112 (fresh init + playwright install yields zero error lines) absorbed into AC-0006-0012 / TC-0006-0016.
- Approved By: yusuke_senaga

### Triage (rows owned by this spec)

| Source                                         | Subject                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------------------------- |
| REQ-0107 (discussion-20260523221141355)        | playwright を primary launcher として probe; playwright-cli は deprecation window 中 accepted (`D-DEPRECATED-PROBE` warning, sunset `1.10.0`) | spec-0006     | UPDATE    | APPEND | yusuke_senaga | `qfai doctor` probe rebuild は CAP-0006 (doctor) territory    |
| REQ-0122 (discussion-20260523221141355)        | `skills.integrity` 既定 severity を `warning` に downgrade; doctor summary を errors / warnings の 2 group に分割表示                         | spec-0006     | UPDATE    | APPEND | yusuke_senaga | doctor output shape は spec-0006 owned                        |
| NFR-0112 (fresh init + playwright zero errors) | absorbed into AC-0006-0012 / TC-0006-0016                                                                                                     | spec-0006     | UPDATE    | APPEND | yusuke_senaga | NFR realized as acceptance signal on doctor fresh-project run |

### CHG-005 Operations (this PR)

| Op ID  | Op Type       | Target                                                                                | Summary                                                                                                                 |
| ------ | ------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0107 / REQ-0122; Entry-points US range → 0007) | doctor probe rebuild + skills.integrity downgrade を Relevant Requirements に登録                                       |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0006-0006..0007)                                               | playwright primary probe + 2-group summary user stories                                                                 |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0006-0010..0014)                                        | probe primary + deprecation-window + fresh-init zero-error + skills.integrity warning + group split (Gherkin + catalog) |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0006-0007..0011)                                             | mirror BR layer (probe order / window / error-text install hint / severity default / group split)                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0006-0010..0014)                                                   | worked examples per AC                                                                                                  |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0006-0012..0018)                                                 | test coverage per AC — TC level `integration` for probe / summary; `unit` for severity-default helper                   |

- Notes:
  - Sunset version `1.10.0` is the next minor after `feature/v1.9.1`; the literal string is the only versioned token permitted in spec text per `.agents/rules/distributed-surface.md` exception for npm-version markers.
  - Parallel pack pieces: spec-0004 (validate.json profile path + SSOT-sync pair lane + R-PROMPT-SCANNER-DRIFT justification); spec-0012 (iterate-side scanner / prompt implementation); spec-0013 (UI contract template `primary_tasks:` slot); spec-0015 (Reviewer-Gate cycle check + R-PROMPT-SCANNER-DRIFT emission).
  - 9 deferred-OQ decisions made upstream by the orchestrator are reflected verbatim in REQ text (playwright-cli sunset = `1.10.0`).
- Source: REQ-0107, REQ-0122 (discussion-20260523221141355); NFR-0112

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR | Rationale                                                                                                                                                                            | Approver |
| ------------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| UPDATE:APPEND | spec-0006   | REQ-0123  | CHG-005 cycle (REQ-0107 / REQ-0122 実装) で `playwrightLauncher.ts` / `doctor.ts` の 3 関数が ~50 LOC を超えたまま着地。behavior-preserving extraction を follow-up として登録する。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0006)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND (additive; preserves existing US/AC/BR/EX/TC numbering)
- Local ID ranges added: US-0006-0008..0010, AC-0006-0015..0020, BR-0006-0012..0017, EX-0006-0015..0020, TC-0006-0019..0026

### Triage (rows owned by this spec)

| Operation     | Sub-op | Target                                                                       | Source (REQ) | Rationale                                             | DR-Ref  | Status |
| ------------- | ------ | ---------------------------------------------------------------------------- | ------------ | ----------------------------------------------------- | ------- | ------ |
| UPDATE:APPEND | APPEND | 01_Spec.md (Relevant Requirements + US range→0010 + Consumer-View copy-down) | REQ-0153     | stale review-pack TTL archival; cascade verified      | DR-0264 | PASS   |
| UPDATE:APPEND | APPEND | 02..06 (US-0006-0008 / AC-0006-0015,0016 / BR-0006-0012,0013 / EX/TC edges)  | REQ-0153     | `doctor --clean` archival edges; cascade verified     | DR-0264 | PASS   |
| UPDATE:APPEND | APPEND | 02..06 (US-0006-0009 / AC-0006-0017,0018 / BR-0006-0014,0015 / EX/TC edges)  | REQ-0156     | `doctor --autoremediate` mode; cascade verified       | DR-0264 | PASS   |
| UPDATE:APPEND | APPEND | 02..06 (US-0006-0010 / AC-0006-0019,0020 / BR-0006-0016,0017 / EX/TC edges)  | REQ-0159     | per-skill manifest probe (Pair III); cascade verified | DR-0264 | PASS   |
| UPDATE:APPEND | APPEND | 07_Decisions.md (DR-0006-0003 cites DR-0264) + 08_Open-questions (OQ-0155)   | REQ-0153     | TTL default resolved by DR-0264; cascade verified     | DR-0264 | PASS   |

- Notes:
  - REQ-0159 manifest-schema authoring / 配布 lint side は spec-0015 owned; 本 slice は doctor probe 挙動のみ (REQ-0159 を shared Source として参照)。
  - Contract refs: CHG-006 §CLI-MANIFEST (manifest schema) + §CLI-DOC (`--autoremediate` / `--profile`)。
  - DR-0272 (atdd scaffold escalate) は spec-0008 slice owned。
- Source: REQ-0153, REQ-0156, REQ-0159 (discussion-20260527075558258)

## Triage

| Source                                  | Subject                                                                                 | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0022 (discussion-20260804173914356) | adopter drift detection for installed shipped workflows (detection half; advisory only) | spec-0006     | UPDATE    | APPEND | -           | `qfai doctor` already performs exactly this shape — `skills.integrity` compares installed assets against the shipped standard assets, and the diagnostic surface already carries an advisory bucket plus a dotted-lowercase check-identifier scheme. No size signal: ac 20→24 (threshold 30), tc 26→31 (threshold 50) |

## 2026-08-05 — CHG-007 — Adopter drift-detection channel (spec-0006, detection half)

- Discussion pack: `.qfai/discussion/discussion-20260804173914356/`
- Policy record: `_policies/10_delta.md` § `2026-08-05 — CHG-007` (Triage Table row `REQ-0022 → spec-0006 UPDATE:APPEND`)
- Operation: UPDATE:APPEND (additive; preserves every existing US/AC/BR/EX/TC ID and sentence)
- Local ID ranges added: US-0006-0011, AC-0006-0021..0024, BR-0006-0018..0020, EX-0006-0021..0024, TC-0006-0027..0031
- Correction (recorded 2026-08-05, review round 6): `AC-0006-0024`, `EX-0006-0024`, `TC-0006-0031` and `TDD-0033` were authored by the provenance-gate remediation that closed the architecture review's `adopter-owned`-unreachable finding, and the ranges above originally stopped one short of each. They are the `adopter-owned` silence chain: a name with no provenance entry is never reported as drift, with a live control file proving the silence is provenance-derived rather than vacuous. No validator reconciles these declarations against pack contents in either profile, which is why ten prior reviewer verdicts did not catch it; the gap was found by a claim-keyed diff of new IDs against declared ranges.
- Approved By: `-` (append-first; no AskUserQuestion-gated operation in this row)

### CHG-007 Operations (spec-0006)

| Op ID  | Op Type       | Target                                                                           | Summary                                                                                      |
| ------ | ------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0022; US range → 0011; CHG-007 copy-down) | detection-half contract を execution SSOT に copy-down                                       |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US Catalog row + US-0006-0011)                               | shipped workflow drift detection user story (detection half only)                            |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0006-0021..0024 Gherkin + AC Catalog rows)         | drift advisory / exit-code invariance / repair-text + skip semantics / adopter-owned silence |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0006-0018..0020)                                        | comparison basis / advisory contract / repair-text contract                                  |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0006-0021..0024)                                              | worked examples per BR                                                                       |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0006-0027..0031)                                            | normal (0027) + boundary (0028, 0029) + error (0030, 0031) coverage                          |
| OP-007 | UPDATE:APPEND | 08_Open-questions.md (OQ-0021 mirror)                                            | deferred overwrite half を per-spec open question として可視化 (deferred mirroring rule)     |
| OP-008 | UPDATE:APPEND | 10_Plan.md (CHG-007 How section)                                                 | How-only 実装ノート                                                                          |
| OP-009 | UPDATE:APPEND | tdd/test-list.md (TDD-0029..0033)                                                | ledger rows for TC-0006-0027..0031 (Status `todo`; ownership per traceability rules)         |

- Notes:
  - **Detection half only.** REQ-0022 は upstream table で `Status: blocked` だが、blocked なのは overwrite / refresh half のみ (OQ-0021, deferred, owner user, due 2026-11-30)。detection half は今すぐ完全に仕様化できる。
  - **No command may be named.** refresh command が存在しないため advisory は command / CLI verb / flag を名指ししない。名指しを始めるのは refresh を ship する release から (OQ-0021 Mitigation 列の記述と本 spec を発散させない)。
  - **Exit code invariant.** advisory であり `--fail-on error` でも本 finding 単独では exit 0。`skills.integrity` (BR-0006-0010) の advisory 契約を再利用する。
  - **Surface choice.** finding は diagnostic (doctor) surface のみ。validate に置くと severity 例外か「1 version 遅れた全 adopter の build break」になる。
  - Boundary of ownership: shipped workflow の所有権契約 / provenance record / declined-vs-missing 分類は REQ-0020 (spec-0003) owned; 本 slice は「不在は drift として報告しない」ことだけを主張する。
- Source: REQ-0022 (discussion-20260804173914356)

## 2026-08-05 — CHG-007 round-2 review remediation (spec-0006)

- Review pack: `.qfai/review/review-20260805082718000/` (architecture-reviewer round 2 findings R1 / R7 / R8)
- Operation: UPDATE:APPEND (additive; no existing ID renumbered, no accepted sentence rewritten except the two falsified ones named below)
- Local ID ranges added: AC-0006-0025..0026, BR-0006-0021..0022, EX-0006-0025..0028, TC-0006-0032..0035, TDD-0034..0037, DR-0006-0004..0005
- Approved By: `-` (append-first remediation of a blocking review finding; no AskUserQuestion-gated operation)

### Round-2 Operations (spec-0006)

| Op ID  | Op Type       | Target                                                  | Closes   | Summary                                                                                                                                    |
| ------ | ------------- | ------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OP-010 | UPDATE:MODIFY | 06_Test-Cases.md (TC-0006-0029 body)                    | R1 (a)   | test oracle が却下済み severity `warning` を assert していた 7 番目のサイトを `info` に訂正し、本 leg が非識別的である旨を明記             |
| OP-011 | UPDATE:APPEND | 03/04/05/06 + tdd/test-list.md                          | R1 (b)   | `--fail-on warning` 識別 leg を AC / BR / EX / TC / TDD の完全な chain として追加 (exit 0 本体 + exit 1 対照)                              |
| OP-012 | UPDATE:MODIFY | 04_Business-Rules.md (BR-0006-0018 / BR-0006-0019 セル) | R7 (a)   | `QFAI-DENSITY-005` を誘発していた rationale を cell から 07_Decisions.md へ移し、規範文 + 決定記録への pointer だけを残した                |
| OP-013 | UPDATE:APPEND | 07_Decisions.md (DR-0006-0004 / DR-0006-0005)           | R7 (b)   | 却下案 (severity `warning`、prefix-as-selector、`missing` を drift 扱い) を DO NOT / Temptation 付きで記録し Delta Rejected Guard に載せた |
| OP-014 | UPDATE:APPEND | 03/04/05/06 + tdd/test-list.md                          | R8       | `CLI-DOC` の `details.declined` transparency 条項に spec 側 owner (BR-0006-0022 / AC-0006-0026) と oracle を与えた                         |
| OP-015 | UPDATE:MODIFY | 01_Spec.md / 10_Plan.md (CHG-007 copy-down)             | R1 minor | `skills.integrity` の 4 状態を「severity ごと写した」と読める記述を訂正し、exit-code 不変条件を全 `--fail-on` 値に揃えた                   |

- Notes:
  - **Why a new BR rather than a longer BR-0006-0019.** 不変条件の記述 (BR-0006-0019) と、その不変条件を識別できる唯一の観測 leg (BR-0006-0021) は別の主張である。後者を独立させたことで oracle が TC に落ち、同時に BR-0006-0019 の cell 長が閾値以下に戻った。
  - **Why the control case (EX-0006-0026 / TC-0006-0033) is not redundant.** exit 0 の主張だけでは、`--fail-on warning` が何も捕まえない実装でも green になる。対照を対で置いて初めて主張が falsifiable になる。
  - **`details.declined` ownership.** `declined` の _定義と分類_ は spec-0003 / REQ-0020 owned のまま。本 spec が引き受けたのは doctor 出力に _現れること_ だけで、これは `qfai doctor` の出力形であり `CLI-DOC` の owning spec に一致する。
  - REQ-0022 の copy-down 文 (01_Spec.md `## Relevant Requirements`) は upstream 文言のため未編集。同文は `--fail-on error` のみに言及するが、spec 側はそれより強い不変条件を主張しているだけで矛盾しない。
- Source: review round 2 findings R1 / R7 / R8 (`R04_architecture-reviewer-round2.md`)
