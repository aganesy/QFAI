# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0011 (Spec Diff Protocol), spec-0038 (Auto-Discovery)
- Old spec-0011 defined Preflight Diff Protocol and SKILL.md incremental mode
- Old spec-0038 defined 4-source unified diff detection TypeScript implementation

## Adopted

- AD-0013-0001: Unified SDD workflow -- single `/qfai-sdd` entrypoint for full SDD flow
- AD-0013-0002: Spec Auto-Discovery integration -- 4-source diff detection from spec-0038
- AD-0013-0003: Contract-first phase -- contracts created before spec slices
- AD-0013-0004: Phase order enforcement -- strict Contracts -> Outline -> Slice -> Plan -> Delta
- AD-0013-0005: Triage cell escape ↔ parse symmetry -- `escapeTableCell` only escapes `|` → `\|` and normalizes line breaks (no `\` → `\\` step), matching the parser's `\|` → `|` un-escape rule exactly. Literal `\` is part of the allowed cell character set (Windows paths, regex literals) and round-trips as-is.

## Rejected

- RJ-0013-0001: Split SDD entrypoints
  - DO NOT reintroduce separate outline/slice/plan commands
  - Temptation: splitting for "modularity" or "flexibility"
  - Reason: unified flow prevents phase-skipping and ensures consistency

- RJ-0013-0002: Business Flow as Gherkin
  - DO NOT author Business Flow as Gherkin (\*.feature files)
  - Temptation: using Gherkin for "executable specs"
  - Reason: Business Flow is Markdown + Mermaid; Gherkin is deprecated for this purpose

## ID Renumbering

| Old ID          | New ID                      | Notes              |
| --------------- | --------------------------- | ------------------ |
| spec-0011 US/TC | US-0013-YYYY / TC-0013-YYYY | Spec Diff Protocol |
| spec-0038 US/TC | US-0013-YYYY / TC-0013-YYYY | Auto-Discovery     |

## Post-Migration Changes

| Date       | Change Type | IDs Added                                                                                                                                                                                                                                                  | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-01 | adopted     | AC-0013-0010, BR-0013-0008, EX-0013-0008, TC-0013-0013                                                                                                                                                                                                     | 06_Test-Cases テンプレートに Type 列（normal/error/boundary/edge）を追加、各 AC に最低1つの非正常系 TC を義務化                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-23 | updated     | REQ-0021, AC-0013-0011                                                                                                                                                                                                                                     | `/qfai-sdd` 完了時点で selected-direction/design-system も UI-bearing validate readiness の必須 design contract として扱うよう runtime gate に同期                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-04 | adopted     | AC-0013-0012, AC-0013-0013, AC-0013-0014, BR-0013-0009, BR-0013-0010, BR-0013-0011, EX-0013-0009, EX-0013-0010, EX-0013-0011, TC-0013-0014, TC-0013-0015, TC-0013-0016, TC-0013-0017, TC-0013-0018, TC-0013-0019, TC-0013-0020, TC-0013-0021, AD-0013-0005 | PR #206 commit 465b9869 — Triage cell escape ↔ parse symmetry を BR として明文化。`escapeTableCell` から `\` → `\\` 段を削除し、parser 側 (`splitMarkdownRow`) と対称化 (Option 1)。allowed cell character set に literal `\` を含めることを spec レベルで宣言し、trace chain (REQ → Spec → Code → Test) を round-trip identity property test に対して閉じる。AC-0013-0012 に Type=normal の TC-0013-0019 (happy path) と Type=edge の TC-0013-0018 (escape edge cases) を組み合わせて BR-0013-0008 を満たす。並行して spec-0038-consolidated annotation (TC-0013-0014..0017) を 06_Test-Cases.md に正式 register し、Code↔Spec 双方向 reachability を確立。当初 AC-0013-0001 / EX-0013-0001 (Phase Order 系) に semantic mis-anchor していたが、後続 commit で AC-0013-0013 / BR-0013-0010 / EX-0013-0010 (Spec Auto-Discovery 系) を新設し正しい AC へ re-anchor — semantic reachability も成立 (PR #206 review N2PY / N2XT)。AC-0013-0010 の non-normal coverage gap (BR-0013-0008 自己違反) は本 PR scope 外として OQ-0016 で track。後続 commit で TDD-0014/0015 を本来の SUT (`validateTraceabilityIntegrity` / validate-pipeline wiring) に対応する新規 TC-0013-0020 (Type=normal) / TC-0013-0021 (Type=boundary) に re-anchor し、Code↔Spec の semantic 整合を確立 (PR #206 review N32O / N34p / N35m / N39l)。さらに後続 commit で TC-0013-0020 (wiring assertion) を AC-0013-0007 (behavioral 'error count == 0') から新設の AC-0013-0014 (Validate Pipeline Validator Registration Integrity) / BR-0013-0011 (Validator Registry Wiring) / EX-0013-0011 (validator wiring source-level verification) へ re-anchor — semantic AC-Refs を behavioral outcome から structural-wiring contract に揃え、TC↔AC 一段間接化を解消 (PR #206 review N65f)。TC-0013-0021 (forward-compat boundary) は behavioral outcome (validator が old evidence で raise しない → error count = 0 が保たれる) と直接整合するため AC-0013-0007 anchor を維持。AC-0013-0014 の non-normal coverage gap は OQ-0016 pattern (2) で track (lexical detection class)、AC-0013-0013 の compound-AC facet-level gap は OQ-0019 で track (semantic detection class — PR #206 review N8St で OQ-0016 から split)。AC-0013-0014 自体の export/import 分解は同一 BR-0013-0011 配下に decomposition を残す routing を選択し、AC 分割せず単一 registration-integrity facet として保持 (PR #206 review N9Xs / N9dA — selection criterion: 共通 BR の facet なら AC 分割せず BR 層 decomposition を維持)。code-side annotation 側 (`packages/qfai/tests/core/traceabilityIntegrity.test.ts:232-240`) も AC-0013-0014 / BR-0013-0011 を参照するよう同期更新 (PR #206 review N9dn)。AC/BR 本文からは provenance prose を撤去し、来歴は本 row と OQ-0016 / OQ-0019 Notes 行に集約。次回 spec-0013 で新 TC を採番する場合は TC-0013-NNNN range の次の free slot (本 commit 時点で 0022 以降) から開始。 |

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0014~0015 (prototyping.yaml preflight gate, recommendation schema gate) 追加
- adopted: US-0013-0008, AC-0013-0008~0009 追加
- adopted: US range 更新 US-0013-0001..US-0013-0008
- rationale: v1.7.13 sddPreflight.ts に prototyping.yaml 存在チェックと recommendation schema validation が追加された実装の仕様反映

## v1.8.1 (2026-04-22) — Preflight Side Artifact Neutrality

- updated: REQ-0014~~0015 / US-0013-0008 / AC-0013-0008~~0010 を current implementation に再同期
- removed: prototyping.yaml 必須 preflight blocker 前提
- rationale: `packages/qfai/src/core/discussionPack.ts` が side artifact requiredness を廃止し、`packages/qfai/src/core/preflight/sddPreflight.ts` は markdown readiness を主 blocker として扱うため

## 2026-05-06 — CHG-001 — Absorbed SDD Phase 0 design lock + legacy design contract drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                               |
| ------ | ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | Phase 0 lock + legacy contract drop + active design-contract surface; US range → 0010 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0013-0009..0010)            | Phase 0 sha256 lock + active design-contract surface reduction                        |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0013-0015..0017)     | DESIGN.md lock + legacy removal + active index closed set                             |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0013-0012..0014)          | mirror BR layer for OP-003                                                            |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0013-0012..0014)                | worked examples per AC                                                                |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0013-0022..0024)              | test coverage per AC                                                                  |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0013-0022..0024) | TDD ledger sync                                                                       |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Validator-side enforcement of the lock and mirror invariants is owned by spec-0004; this spec only declares Phase 0 emission semantics.

## Triage (CHG-001)

| Source                                                                         | Subject                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------ |
| REQ-0005 (Stage 0 read), REQ-0007 (promote-gate surfacing), REQ-0010 (CHG-003) | `/qfai-sdd` SKILL.md に `project_memory:` 宣言追加。Stage 0 で open work-log entry を読み (MAY)、`W-PENDING-PROMOTION` を preflight summary に surface する。 | spec-0013     | UPDATE    | APPEND | pin-implied | SDD skill は MAY-read (REQ-0005 Notes); promote-gate surfacing は MUST。 |

## CHG-003 (v1.9.0) — Stage 0 Worklog Read + Promote-gate Surfacing

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Obligation: `/qfai-sdd` SKILL.md MUST gain a `project_memory:` block. Stage 0 preflight MAY read open work-log entries (`status` ∈ `{active, handoff}`); REQ-0005 Notes explicitly relaxes SDD's read contract from MUST to MAY. Stage 0 MUST however surface `W-PENDING-PROMOTION` findings from `qfai validate` in the preflight summary so the triage step can promote `kind: decision` entries to per-spec `07_Decisions.md` rows.
- Cascade: SKILL.md `project_memory:` validated by spec-0004.
- Source: REQ-0005, REQ-0007, REQ-0010

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing AC/BR/EX/TC numbering. NFR-0110 (testability of scanner + countWords as pure functions) naturally pairs with spec-0012 for the function-purity side; spec-0013's piece is the UI contract template `primary_tasks:` slot + the new validate lane gating `/qfai-prototyping`.
- Approved By: yusuke_senaga

## Triage (CHG-005)

Rows owned by this spec.

| Source                                                         | Subject                                                                                                                                                                                        | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0115 (discussion-20260523221141355)                        | UI spec template `primary_tasks: []` slot per screen + requirements-analyst guide instruction + new validate lane (QFAI-AUD-001 aligned) blocking `/qfai-prototyping` on empty `primary_tasks` | spec-0013     | UPDATE    | APPEND | yusuke_senaga | SDD UI contract template is spec-0013 (CAP-0013) territory; new validate lane's enforcement-side implementation routes through spec-0004's validator family |
| NFR-0110 (testability — pure functions, paired with spec-0012) | spec-0013 piece: UI contract template + validate lane (structural). The pure-function side lives in spec-0012.                                                                                 | spec-0013     | UPDATE    | APPEND | yusuke_senaga | NFR has two pair-points — only the template / lane half lands in spec-0013                                                                                  |

## CHG-005 Operations

| Op ID  | Op Type       | Target                                                                     | Summary                                                                                           |
| ------ | ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0115; Entry-points US range → 0011) | UI contract template `primary_tasks:` slot + new validate lane registered as Relevant Requirement |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0013-0011)                                          | requirements-analyst authoring story for `primary_tasks` slot                                     |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0013-0018..0019)                             | template-carries-slot + validate-lane-blocks-empty ACs                                            |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0013-0015..0016)                                  | mirror BR layer (template slot mandatory + lane gating contract)                                  |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0013-0015..0016)                                        | worked examples per AC                                                                            |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0013-0025..0027)                                      | test coverage per AC; integration level for template-load and validate-lane behavior              |

- Notes:
  - The validate lane finding code `QFAI-AUD-001` aligns with the existing audit-finding family; if the canonical token differs at implementation time, the spec text says "QFAI-AUD-001 aligned" to preserve flexibility while keeping intent intact.
  - Parallel pack pieces: spec-0004 (validate.json profile path + SSOT-sync pair lane + R-PROMPT-SCANNER-DRIFT justification); spec-0006 (qfai doctor playwright probe rebuild + skills.integrity downgrade); spec-0012 (iterate-side scanner / prompt + countWords pure-function half of NFR-0110); spec-0015 (Reviewer-Gate cycle + drift findings).
  - 9 deferred-OQ decisions made upstream by the orchestrator are reflected verbatim where relevant; REQ-0115 itself does not depend on a deferred decision (its option set was already definite in the pack).
- Source: REQ-0115 (discussion-20260523221141355); NFR-0110 (template / lane half)

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR | Rationale                                                                                                                                                                                                                                                                        | Approver |
| ------------- | ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UPDATE:APPEND | spec-0013   | REQ-0116  | CHG-005 cycle で `.claude → .qfai/assistant` migration 後の canonical UI 契約テンプレート path への prose 同期が 7 ファイル分 deferred。pure-documentation drift fix として登録。                                                                                                | auto     |
| UPDATE:APPEND | spec-0013   | REQ-0117  | CHG-005 cycle で QFAI-AUD-001 が key-absent / key-empty を同一 severity で扱う defect を 2-stage emission (info / error) として降格する follow-up が `sddPrimaryTasksLane.test.ts` 内 inline TODO で deferred。本 follow-up で OC-60 sunset window 配下の semantic を pin する。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0013)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing US/AC/BR/EX/TC numbering. New local IDs: US-0013-0012..0014, AC-0013-0020..0025, BR-0013-0017..0020, EX-0013-0017..0020, TC-0013-0028..0035, TDD-0023..0030, DR-0013-0002..0004.
- Approved By: pin-implied (feature/v1.9.2)

| Operation | Sub-op | Target                                                     | Source (REQ)                 | Rationale        | DR-Ref                    | Status |
| --------- | ------ | ---------------------------------------------------------- | ---------------------------- | ---------------- | ------------------------- | ------ |
| UPDATE    | APPEND | 01_Spec.md (Relevant Reqs, Consumer View, US range → 0014) | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0013-0012..0014)                    | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0013-0020..0025)             | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0013-0017..0020)                  | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0013-0017..0020)                        | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0013-0028..0035, Type-classified)     | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0013-0002..0004)                       | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (OQ-0157/0158/0159 resolved)          | REQ-0155, REQ-0164           | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | 10_Plan.md (Second-Wave How)                               | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |
| UPDATE    | APPEND | tdd/test-list.md (TDD-0023..0030)                          | REQ-0155, REQ-0163, REQ-0164 | cascade verified | DR-0266, DR-0267, DR-0268 | PASS   |

- Notes:
  - REQ-0155 spans spec-0010 (writer) and spec-0013 (reader) — same Source REQ, file-local IDs per spec. Writer side declared in spec-0010.
  - REQ-0164 validator-implementation side is shared with spec-0004 (`auditProfile.ts` / `QFAI-AUD-020` enforcement). This slice owns the SDD authoring + doc + template surface (`ui-spec.yaml` comments, `references/ui-contract-guide.md`).
  - REQ-0163: `D-SURFACE-TYPE-MISSING` warns during the deprecation window and sunsets to error; `resolveAllUiBearingSpecs()` keeps the frontmatter as the strict downstream signal (no behavioral change downstream).
- Source: REQ-0155, REQ-0163, REQ-0164 (discussion-20260527075558258)

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

| Source                       | Subject                                                                                                    | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Depends-On        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| REQ-0042                     | Stage 1 checks a routing-time `CREATE` authorization instead of asking                                     | spec-0013     | UPDATE    | APPEND | -           | D5. Stage 1 checks that the `human_decision` exists, matches the row's operation and capability and is not stale. If it is missing, mismatched or stale, the stage stops and the run waits in `awaiting_input`. The other approval-required operations keep today's question. No spec-0013 item covers Stage 1 approval today, and the policy half is in `_policies/11_Slice-Policy.md`. Size signal: 30 AC headings today, 27 distinct IDs, because AC-0013-0008 to AC-0013-0010 are used twice. New ACs are numbered from AC-0013-0043, and the appends in this table take the count past 30. spec-0013 owns only CAP-0013, so there is no split | REQ-0041, OQ-0007 |
| REQ-0043                     | The triage row format carries a reference to its workflow authorization                                    | spec-0013     | UPDATE    | APPEND | -           | Covers `references/sdd-triage.md` and the Stage 1 text. OQ-0006 decides between a new column and a value form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | REQ-0041, OQ-0006 |
| REQ-0044                     | `--auto` stays a no-question mode inside and outside a run                                                 | spec-0013     | UPDATE    | APPEND | -           | An approval-required row under `--auto` still stops with a `consultation-needed` entry and `Approved By` left `-`. The degrade regression test keeps active-run authority and legacy `--auto` as separate cases                                                                                                                                                                                                                                                                                                                                                                                                                                    | REQ-0033          |
| REQ-0047                     | Phase 2b seeds a diagnosed missing-test row without a Change Request                                       | spec-0013     | UPDATE    | APPEND | -           | D13. The TC and its ledger row are appended with the diagnosed defect as the reason, AC and BR are unchanged, and the row runs from `todo` to RED to GREEN. An acceptance-layer row gets its test from ATDD. This is the `sdd_append` stage of REQ-0006 under the predicate `missing_test_row_needed`, and OQ-0009 fixes its name                                                                                                                                                                                                                                                                                                                  | REQ-0033, OQ-0009 |
| REQ-0013                     | Work-order target binding: a missing target never means every capability                                   | spec-0013     | UPDATE    | APPEND | -           | A work order carries a fixed operation and target. A new spec arrives as `target: new_capability` and is bound to the created ID afterwards. US-0013-0004 and BR-0013-0007, the standalone no-argument batch, are unchanged                                                                                                                                                                                                                                                                                                                                                                                                                        | REQ-0033          |
| REQ-0053                     | Standalone `/qfai-sdd` ends at SDD and never continues into implementation                                 | spec-0013     | UPDATE    | APPEND | -           | A request to go "to the end" is handed to a whole run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | REQ-0033          |
| REQ-0051, REQ-0052, REQ-0056 | Orchestrated mode for `/qfai-sdd`: the entry check, the work-order scope and Stage 0 shared-snapshot reuse | spec-0013     | UPDATE    | APPEND | -           | One reference cited by one line from `SKILL.md` (D12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | REQ-0033          |

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-24
- Primary: `/qfai-sdd` as a stage of an intent-driven run (`discussion-20260923171450572`)
- Tags: @docs, @test
- Summary: Stage 1 checks a routing-time `CREATE` approval instead of asking;
  the triage format carries `Authorization-Ref`; Phase 2b seeds a diagnosed
  missing-test row without a Change Request; and the skill gains its
  orchestrated mode. Contract-backed rules cite CLI-WF, CLI-WFFILE and CLI-VAL
  and copy none of their fields.
- Items appended: US-0013-0015..US-0013-0017; AC-0013-0043 and AC-0013-0029..AC-0013-0041;
  BR-0013-0022..BR-0013-0035. The examples start at EX-0013-0022 and the test
  cases at TC-0013-0038. No existing item changes: US-0013-0004 and
  BR-0013-0007, the standalone no-argument batch, stand as written.
- At the intent-driven entry, BR-0013-0021, EX-0013-0021, TC-0013-0036 and
  TC-0013-0037 were reserved for `CR-20260913-0012`. DELTA-0004 applies that
  CR, using AC-0013-0042 as the next free criterion ID.
- Resolved pack questions:
  - `discussion-20260923171450572#OQ-0006`: CLI-VAL
    `## Triage authorization reference` — an optional `Authorization-Ref` column.
  - `discussion-20260923171450572#OQ-0007`: CLI-WF `## Authorizations` — when a
    routing-time approval is stale.
  - `discussion-20260923171450572#OQ-0009`: CLI-WFFILE `### Vocabulary` and
    `_policies/08_Decisions.md` DR-0297 — stage kind `sdd_append`, operation
    `defect-row-seeding`.
- Policy: DR-0296 and DR-0297, cited in `01_Spec.md` `## Applicable Policy`. No
  spec decision record is added, and `08_Open-questions.md` stays at zero.
- Size: 27 distinct AC IDs under 30 headings become 41 under 44, and TC 35
  passes 50 once the test cases are appended. No split: spec-0013 owns only
  CAP-0013.

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: Phase 2c obligation reconciliation, against CLI-VAL
  `## Triage authorization reference` as revised: `Authorization-Ref` on a
  `CREATE` row only
- Tags: @docs, @test
- Summary:
  - BR-0013-0024 and AC-0013-0030 state how the other five approval-required
    operations are approved inside a run. The question is a `decision` question
    the stage result opens, the row copies the answerer into `Approved By`, and
    the row carries no `Authorization-Ref`.
  - BR-0013-0026 and AC-0013-0032 limit the column to a `CREATE` row.
  - BR-0013-0036 is added under AC-0013-0034: a seeded row beside an existing row
    on the same obligation names a `Boundary`, and that sibling gains its slug
    with `Status` and `Evidence` unchanged.
  - BR-0013-0028 and AC-0013-0034 are retitled to "no existing row's status",
    because the slug is the one cell seeding writes on an existing row.
  - IDs are unchanged apart from the new BR-0013-0036. BR-0013-0021 stays
    reserved.

- Change ID: DELTA-0003
- Date: 2026-09-24
- Primary: Phase 2c second pass
- Tags: @docs
- Summary: the titles of BR-0013-0028 and AC-0013-0034 end "no existing row's
  status or evidence", which is what BR-0013-0028 and BR-0013-0036 hold. IDs and
  rule text are unchanged.

- Change ID: DELTA-0004
- Date: 2026-09-25
- Primary: CR-20260913-0012 Option 1 owner rerun
- Tags: @docs, @test
- Summary: The first AC-0013-0008, AC-0013-0009 and AC-0013-0010 keep their
  IDs. The contradictory second AC-0013-0008 and superseded second
  AC-0013-0010 are removed with REQ-0014 and REQ-0016..0018. The live
  optional-side-artifact criterion becomes AC-0013-0042, with BR-0013-0021,
  EX-0013-0021, normal TC-0013-0036 and error TC-0013-0037. US-0013-0008
  now states only the optional-artifact promise. Phase 2b seeds TDD-0129 and
  TDD-0130 at todo with this CR in DR-ID; no existing TDD obligation changes.
  The stale duplicate-ID pin and pending-application text in 10_Plan.md are
  removed. The earlier migration and triage counts remain historical records.

- Change ID: DELTA-0005
- Date: 2026-09-25
- Primary: Follow-up
- Tags: @docs, @test
- Summary: CR-20260925-0006 part A. Five test cases no longer require shipped
  skill text to cite a contract or DR-0297, neither of which ships:
  - TC-0013-0038 states the approval check: the record exists, matches the
    row's operation and capability, and is not stale.
  - TC-0013-0039 states the three staleness conditions, and that the clock
    alone never makes an approval stale.
  - TC-0013-0042 and EX-0013-0026 state the value form
    `run-<17 digits>/<authorizationId>`.
  - TC-0013-0043 states that the seeded row is for behaviour the spec already
    states.
  - TC-0013-0047 drops its citation clause.

  The ACs and BRs cite the contracts as their own source and are unchanged.
  IDs are unchanged. TDD-0112, TDD-0113, TDD-0116, TDD-0117 and TDD-0121 stay
  at todo; this CR goes in their DR-ID.

## Change Requests

| CR ID            | Upstream artifact                                                                                                                                                         | Mode         | Approved by                                                    | Applied at           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- | -------------------- |
| CR-20260923-0010 | `spec-0013/03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `06_Test-Cases.md`                                                                                         | confirm-only | claude-code (the user's standing instruction for this session) | 2026-09-23T10:52:00Z |
| CR-20260913-0009 | `spec-0013/02_User-stories.md`, `tdd/test-list.md`                                                                                                                        | re-derive    | user (2026-09-24 reply)                                        | 2026-09-24T09:46:00Z |
| CR-20260913-0012 | `spec-0013/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `10_Plan.md`, `tdd/test-list.md` | re-derive    | user (2026-09-24 reply)                                        | 2026-09-24T09:46:00Z |
| CR-20260925-0008 | `spec-0013/06_Test-Cases.md`, `tdd/test-list.md`                                                                                                                          | re-derive    | claude-code (the user's standing instruction for this session) | 2026-09-25T01:55:00Z |
| CR-20260924-0006 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                    | re-derive    | user                                                           | 2026-09-24T18:26:35Z |
| CR-20260925-0004 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`                                                                                    | re-derive    | user                                                           | 2026-09-24T19:00:08Z |
| CR-20260925-0006 | `.qfai/contracts/cli/qfai-workflow.md`; `spec-0013/05_Examples.md`, `06_Test-Cases.md`                                                                                    | re-derive    | user                                                           | 2026-09-25T02:36:35Z |
| CR-20260925-0010 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                    | re-derive    | user                                                           | 2026-09-25T03:00:14Z |
| CR-20260925-0009 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`                                                                                    | re-derive    | user                                                           | 2026-09-25T03:23:20Z |
| CR-20260925-0012 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                    | re-derive    | user                                                           | 2026-09-25T06:04:36Z |
| CR-20260925-0013 | `.qfai/contracts/cli/qfai-workflow.md`                                                                                                                                    | re-derive    | user                                                           | 2026-09-25T07:34:27Z |
| CR-20260925-0015 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md`                                                                                    | re-derive    | user                                                           | 2026-09-25T10:20:50Z |

### CR-20260913-0009: Ledger boundary repair

The existing 15-column ledger already had E2E placeholders for thirteen stories. Re-derivation adds the missing Integration cases and separates independently observable outcomes. Prior completed or exception evidence remains as history; the affected rows return to `todo` because their test identity changed. `US-0013-0003` now agrees with its usable-source acceptance criterion.

### CR-20260913-0012: Acceptance criterion ID repair

The original `AC-0013-0008` to `AC-0013-0010` headings retain their IDs. The contradicted markdown readiness and design normalization duplicates are removed. Optional side-artifact neutrality moves to `AC-0013-0028` with `BR-0013-0021`, `EX-0013-0021`, and `TC-0013-0036` to `TC-0013-0037`. The historical references above remain a record of past source text and do not reintroduce those obligations.

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- The intent-driven criterion `AC-0013-0028` became `AC-0013-0043`.
- `TDD-0044`..`TDD-0062` became `TDD-0112`..`TDD-0130`.
- Change Request records `CR-20260924-0001`, `CR-20260924-0002` and `CR-20260925-0008` became `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010`; every reference here follows them.

Both lines of work also applied the same approved option of `CR-20260913-0012`.
`origin/main`'s application stands: `AC-0013-0028`, `BR-0013-0021`, `EX-0013-0021`,
`TC-0013-0036`, `TC-0013-0037` and rows `TDD-0081` to `TDD-0083`. The intent-driven
application is withdrawn:

- `AC-0013-0042` is removed from `03_Acceptance-Criteria.md`, and its ID stays reserved.
  `AC-0013-0028` states the same criterion.
- `spec-0013/TDD-0129` and `spec-0013/TDD-0130` are deleted and tombstoned in
  `tdd/test-list.md`. Their Evidence cells, verbatim, were
  `` RED:n-a GREEN:pass TIER:T2 -> `.qfai/evidence/atdd-spec-0013.md#tdd-0129` `` and
  `` RED:n-a GREEN:pass TIER:T2 -> `.qfai/evidence/atdd-spec-0013.md#tdd-0130` ``,
  each retired at Status = exception.
- Their test file, `packages/qfai/tests/integration/sddPreflightOptionalArtifact.test.ts`,
  is deleted. Two of its checks were missing from the test of `TDD-0081` to `TDD-0083`,
  `packages/qfai/tests/integration/sddOptionalArtifactPreflight.test.ts`, and moved there:
  the command's exit code and JSON report, and the same verdict with a valid artifact present.
