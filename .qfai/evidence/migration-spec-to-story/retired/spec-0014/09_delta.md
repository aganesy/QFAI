# 09 Delta (Migration Record)

## 2026-09-24 — Verify validation errors remain a failing outcome

DR-0014-0005 records the P7 source split: EX-0014-0001→new AC-0014-0027/TC-0014-0042; new EX-0014-0036→AC-0014-0001/old TC-0014-0018; new EX-0014-0035→AC-0014-0003/old TC-0014-0019. BR-0014-0001 now explicitly owns non-pass on validation error. The new criterion has US-0014-0013 as its parent.

## Origin

- Consolidates: old spec-0027 (UIX-VAL/UIX-REV), spec-0037 (SSOT Unification)
- Old spec-0027 defined UIX-VAL deterministic validators and UIX-REV semantic reviewers
- Old spec-0037 defined migration paths, feature maturity normalization, non-UI safety

## Adopted

- AD-0014-0001: Full-scan verify -- always full-scan, never incremental (DR-0007 preserved)
- AD-0014-0002: UIX-VAL validators -- deterministic UI/UX artifact validation from spec-0027
- AD-0014-0003: UIX-REV reviewers -- semantic review prompt templates from spec-0027
- AD-0014-0004: Non-UI safety -- zero UIX fires on non-UI projects (from spec-0037)
- AD-0014-0005: Migration support -- stale sidecar compatibility detection with canonical migration errors from spec-0037
- AD-0014-0006: Feature maturity normalization -- canonical vocabulary from spec-0037
- AD-0014-0007: contract-first downstream gate -- repo-root verify/validate uses specs + contracts as the active completion path
- AD-0014-0008: canonical UIX direct-pack path -- `runCanonicalUixValidators` remains only for direct discussion-pack validation

## Rejected

- RJ-0014-0001: Incremental verification
  - DO NOT implement diff-only verification in `/qfai-verify`
  - Temptation: using diff-only for faster CI runs
  - Reason: verify is the safety gate and must not be reduced to incremental checks (DR-0007)

- RJ-0014-0002: Error-level waivers
  - DO NOT allow waivers to suppress error-severity findings
  - Temptation: waiving errors for "known issues" or "legacy code"
  - Reason: errors must be fixed at source; waivers are for warning/info only

## ID Renumbering

| Old ID                                | New ID                      | Notes            |
| ------------------------------------- | --------------------------- | ---------------- |
| spec-0027 US-0027-YYYY / TC-0027-YYYY | US-0014-YYYY / TC-0014-YYYY | UIX-VAL/UIX-REV  |
| spec-0037 US-0037-YYYY / TC-0037-YYYY | US-0014-YYYY / TC-0014-YYYY | SSOT Unification |

## v1.7.12 — Evidence / Browser QA Convergence (Bundle C)

### Context

- Discussion pack decisions: D-001 (3-layer evaluation model as canonical), Browser QA (keep minimal truthful runner)
- Requirements: truthful evidence state handling, browser QA truthful implementation, canonical validator family enforcement

### Added

| ID           | Layer | Summary                                            |
| ------------ | ----- | -------------------------------------------------- |
| US-0014-0007 | US    | Truthful evidence state handling                   |
| US-0014-0008 | US    | Browser QA minimal truthful runner                 |
| US-0014-0009 | US    | Canonical validator family enforcement             |
| AC-0014-0009 | AC    | Truthful evidence states (5 canonical states)      |
| AC-0014-0010 | AC    | Browser QA minimum runner                          |
| AC-0014-0011 | AC    | Canonical validator set enforcement (D-001)        |
| BR-0014-0007 | BR    | Evidence states must be truthful (no placeholders) |
| BR-0014-0008 | BR    | Browser QA findings not always empty               |
| BR-0014-0009 | BR    | Canonical validator family from 3-layer model      |
| EX-0014-0008 | EX    | Truthful evidence — captured (pass)                |
| EX-0014-0009 | EX    | Placeholder evidence (fail)                        |
| EX-0014-0010 | EX    | Browser QA with findings (pass)                    |
| EX-0014-0011 | EX    | Browser QA empty findings (warning)                |
| EX-0014-0012 | EX    | Canonical validator set enforced (pass)            |
| EX-0014-0013 | EX    | Non-canonical validator rejected (fail)            |
| TC-0014-0012 | TC    | Truthful evidence state — captured pass            |
| TC-0014-0013 | TC    | Placeholder evidence rejection                     |
| TC-0014-0014 | TC    | Browser QA with findings accepted                  |
| TC-0014-0015 | TC    | Browser QA empty findings warning                  |
| TC-0014-0016 | TC    | Canonical validator set enforcement                |
| TC-0014-0017 | TC    | Non-canonical validator rejection                  |

### Traceability Chain (v1.7.12 additions)

```text
US-0014-0007 → AC-0014-0009 → BR-0014-0007 → EX-0014-0008, EX-0014-0009 → TC-0014-0012, TC-0014-0013
US-0014-0008 → AC-0014-0010 → BR-0014-0008 → EX-0014-0010, EX-0014-0011 → TC-0014-0014, TC-0014-0015
US-0014-0009 → AC-0014-0011 → BR-0014-0009 → EX-0014-0012, EX-0014-0013 → TC-0014-0016, TC-0014-0017
```

### Rejected

- None for v1.7.12 slice

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0013~0014 (canonical UIX validators, removed compatibility surface) 追加
- adopted: US-0014-0010~~0011, AC-0014-0012~~0013 追加
- rationale: production path は runCanonicalUixValidators のみを使用し、互換性判定は package surface removal と canonical validators 側の migration errors に収束した。

### v1.7.13 補完 (2026-04-04)

- adopted: BR-0014-0013~0015 追加
- rationale: コミット履歴分析で特定された compatibility surface removal, canonical validator set, stale sidecar migration error の設計意図補完

### v1.7.13 収束 (2026-04-05)

- adopted: REQ-0013 拡張（canonical validator リストを完全化: 12 validator functions + canonical.ts aggregator の詳細記載）
- adopted: US range 更新 US-0014-0001..US-0014-0011
- rationale: 実装分析で特定された未文書化の v1.7.13 変更:
  - REQ-0013 が列挙していなかった classification.ts（明示的 UI 分類検証）を含む完全なバリデータリストに更新
  - 各バリデータの責務を明記（oqClosure=OQ 参照解決、forbiddenLegacyFiles=stale artifact reject、等）

## v1.7.15 (2026-04-17) — Semantics Audit Correction

### v1.7.15 Adopted

- adopted: US-0014-0012, AC-0014-0014, BR-0014-0015, EX-0014-0015, TC-0014-0009 を stale sidecar migration errors に再定義
- adopted: TC-0014-0018..0019 を canonical production path / removed compatibility surface の検証へ更新
- adopted: DR-0014-0001 を compatibility surface audit の決定に更新
- rationale: semantics audit により、spec に残っていた `validators/legacy/`, rollout ratchet, docs/runtime drift の記述が現行実装と乖離していることを確認。仕様を executable surface に合わせ、migration/compatibility/test coverage の traceability を回復した

### v1.7.15 Traceability Chain

```text
US-0014-0010 → AC-0014-0012 → BR-0014-0014 → EX-0014-0012 → TC-0014-0018
US-0014-0011 → AC-0014-0013 → BR-0014-0013 → EX-0014-0014 → TC-0014-0019
US-0014-0012 → AC-0014-0014 → BR-0014-0015 → EX-0014-0015 → TC-0014-0009
```

## v1.7.16 (2026-04-18) — QFAI Package Design Quality Pipeline Restructure (Validator Extensions)

### Superseded Note (2026-04-22)

- This slice is retained as migration history only.
- Current-active downstream design contracts are `exploration-brief.yaml`, `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `selected-direction.yaml`, and `design-system.yaml`.
- Historical references in this section to discussion-time design-system generation and legacy trend-derived scoring remain non-active.

### Context

- Source: discussion-20260418093755100 (18 REQs, non-UI pack)
- In-scope REQs for spec-0014 this revision: REQ-0008 (UIX-VAL-T01..T04), REQ-0018 (UIX-VAL-DS01/DS02, PROT-DS01)
- Applicable NFRs: NFR-0001 (backward compatibility), NFR-0004 (validation speed <= 20% increase)

### Added

| ID                 | Layer | Summary                                                                                 |
| ------------------ | ----- | --------------------------------------------------------------------------------------- |
| REQ-0015           | REQ   | Trend->Axis traceability validators (UIX-VAL-T01..T04)                                  |
| REQ-0016           | REQ   | Design system validators and PROT-DS01 evidence recording                               |
| US-0014-0013       | US    | Enforce evaluation_connection presence on Trend Scan entries (T01)                      |
| US-0014-0014       | US    | Reject dangling evaluation_connection references (T02)                                  |
| US-0014-0015       | US    | Warn on dangling TRD source_refs (T03)                                                  |
| US-0014-0016       | US    | Warn when visual Trend has no visual axis (T04)                                         |
| US-0014-0017       | US    | Historical: require a legacy discussion-time design-system artifact on UI-bearing packs |
| US-0014-0018       | US    | Historical: require mandatory sections in the legacy discussion-time design-system file |
| US-0014-0019       | US    | Require designSystemCompliance score in prototyping evidence (PROT-DS01)                |
| AC-0014-0015       | AC    | UIX-VAL-T01 ERROR on missing evaluation_connection                                      |
| AC-0014-0016       | AC    | UIX-VAL-T02 ERROR on dangling evaluation_connection                                     |
| AC-0014-0017       | AC    | UIX-VAL-T03 WARNING on dangling source_refs                                             |
| AC-0014-0018       | AC    | UIX-VAL-T04 WARNING on missing visual axis                                              |
| AC-0014-0019       | AC    | UIX-VAL-DS01 ERROR when design_system.md missing                                        |
| AC-0014-0020       | AC    | UIX-VAL-DS02 ERROR on empty required sections                                           |
| AC-0014-0021       | AC    | PROT-DS01 conditional severity                                                          |
| BR-0014-0016..0024 | BR    | Trigger rules, severity map, non-UI safety (9 rules)                                    |
| EX-0014-0016..0028 | EX    | Happy/negative/edge/state/idempotency/permission examples (13 entries)                  |
| TC-0014-0020..0032 | TC    | Unit tests per validator plus cross-cutting (13 entries)                                |
| DR-0014-v1716-01   | DR    | Severity mapping (T01/T02/DS01/DS02 = ERROR, T03/T04 = WARNING, PROT-DS01 conditional)  |
| DR-0014-v1716-02   | DR    | Backward-compatible staged introduction                                                 |
| OQ-0005 (carried)  | OQ    | CSS value auto-extraction precision (deferred to TDD)                                   |

### Traceability Chain (v1.7.16 additions)

```text
US-0014-0013 -> AC-0014-0015 -> BR-0014-0016 -> EX-0014-0016, EX-0014-0017, EX-0014-0018 -> TC-0014-0020, TC-0014-0021, TC-0014-0022
US-0014-0014 -> AC-0014-0016 -> BR-0014-0017 -> EX-0014-0019 -> TC-0014-0023
US-0014-0015 -> AC-0014-0017 -> BR-0014-0018 -> EX-0014-0020 -> TC-0014-0024
US-0014-0016 -> AC-0014-0018 -> BR-0014-0019 -> EX-0014-0021 -> TC-0014-0025
US-0014-0017 -> AC-0014-0019 -> BR-0014-0020 -> EX-0014-0022, EX-0014-0028 -> TC-0014-0026, TC-0014-0032
US-0014-0018 -> AC-0014-0020 -> BR-0014-0021 -> EX-0014-0023 -> TC-0014-0027
US-0014-0019 -> AC-0014-0021 -> BR-0014-0022 -> EX-0014-0024, EX-0014-0025 -> TC-0014-0028, TC-0014-0029
Cross-cutting: BR-0014-0023 (severity map) covered by EX-0014-0027 -> TC-0014-0031; BR-0014-0024 (non-UI safety) covered by EX-0014-0026 -> TC-0014-0030
```

### Rejected

- RJ-0014-v1716-01: Uniform WARNING rollout for all v1.7.16 rules.
  - DO NOT introduce UIX-VAL-T01/T02 as WARNING.
  - Temptation: minimize any theoretical risk of retro-CI-failure.
  - Reason: T01/T02 reference a field that cannot appear in legacy packs; WARNING would weaken the traceability invariant with zero rollout benefit (DR-0014-v1716-02).

### Rationale

The v1.7.16 slice recorded a historical validator contract that made the legacy research-to-direction-to-design-system scoring chain observable. In the current exploration-first posture, active scoring and validation read finalized downstream contracts instead of a discussion-time design-system file.

## 2026-05-06 — CHG-001 — Absorbed verify evidence path + full-harness drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                         | Summary                                                         |
| ------ | ------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In)                          | prototyping evidence iter-NN layout + full-harness profile drop |
| OP-002 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0014-0005..0006) | active evidence path layout + full-harness vocabulary purge     |
| OP-003 | UPDATE:APPEND | 04_Business-Rules.md (BR-0014-0005..0006)      | mirror BR layer for OP-002                                      |
| OP-004 | UPDATE:APPEND | 05_Examples.md (EX-0014-0026..0027)            | worked examples per AC                                          |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). No new Test-Cases are added in this CHG per the parent plan; AC-level coverage will be paired with implementation-side test work in a downstream Phase. The validator-side enforcement of the new evidence layout is owned by spec-0004's evidence-schema validators.

## Triage

| Source                                                     | Subject                                                                                                                               | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------- |
| REQ-0005, REQ-0010, REQ-0014, REQ-0015, REQ-0017 (CHG-003) | `/qfai-verify` SKILL.md に `project_memory:` 宣言追加。verify report に open work-log 数 / stale 数 / broken-link 数を surface する。 | spec-0014     | UPDATE    | APPEND | pin-implied | Review-phase skill (REQ-0005 scope)。subject-token overlap (`skill`, `verify`)。 |

## CHG-003 (v1.9.0) — Work-log Surfacing in Verify Report

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Obligation: `/qfai-verify` SKILL.md MUST gain a `project_memory:` block. Verify report MUST include a `## Work-log State` section enumerating: open entries (`status` ∈ `{active, handoff}`), stale entries (`W-WORKLOG-STALE` from REQ-0014), broken-link entries (`W-WORKLOG-BROKEN-LINK` from REQ-0015), and incomplete handoff entries (`R-HANDOFF-INCOMPLETE` from REQ-0017). Verify itself does not author work-log entries (REQ-0005 contract is read+cite).
- Cascade: SKILL.md `project_memory:` validated by spec-0004.
- Source: REQ-0005, REQ-0010, REQ-0014, REQ-0015, REQ-0017

## 2026-05-27 — v1.9.2 Second-Wave (spec-0014)

| Operation | Sub-op | Target                                                          | Source (REQ) | Rationale        | DR-Ref       | Status |
| --------- | ------ | --------------------------------------------------------------- | ------------ | ---------------- | ------------ | ------ |
| UPDATE    | APPEND | 01_Spec.md (Scope.In + Relevant Requirements + US range → 0020) | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 02_User-stories.md (US-0014-0020)                               | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 03_Acceptance-Criteria.md (AC-0014-0022)                        | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 04_Business-Rules.md (BR-0014-0025)                             | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 05_Examples.md (EX-0014-0029)                                   | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 06_Test-Cases.md (TC-0014-0035..0036)                           | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 07_Decisions.md (DR-0014-0004)                                  | REQ-0166     | cascade verified | DR-0014-0004 | PASS   |
| UPDATE    | APPEND | 08_Open-questions.md (Resolved note)                            | REQ-0167     | cascade verified | DR-0274      | PASS   |

- Notes: REQ-0166 is the certify side (SaaS-package scope seal). The validate-profile side (`qfai validate --profile saas-package`) is owned by spec-0004 (same Source REQ, file-local IDs). Certificate carries `scope: "saas-package"` + `notes:`; never claims full DONE; `--upgrade-scope full` gated on missing gates landing. Contract reference: `_policies/05_Contracts.md` §CHG-006 DCON-005 / CLI-VAL; glossary `saas-package profile`. One-minor deprecation window per OC-63.
- Source: REQ-0166 (discussion-20260527075558258)

## Triage (2026-09-11)

### DELTA-0007 (2026-09-11)

| Source   | Subject                                                      | Existing Spec | Operation | Sub-op | Approved By        | Rationale                                                                                                                             |
| -------- | ------------------------------------------------------------ | ------------- | --------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0018 | Retire the design-system presence validator and its coverage | spec-0014     | UPDATE    | REMOVE | aganesy@2026-09-11 | The validator required a file `UIX-VAL-3LAYER-FORBIDDEN-FILE` refuses, so no pack satisfied both, and it was dispatched from nowhere. |

## 2026-09-11 — Design-system presence validator retired

`validators/uix/designSystemPresence.ts` reported `UIX-VAL-DS01` when a
UI-bearing pack had no `uiux/12_design_system.md`, and `UIX-VAL-DS02` when its
sections were empty.

Two things made it dead weight rather than a gate.

- `validators/uix/threeLayer.ts` reports `UIX-VAL-3LAYER-FORBIDDEN-FILE` for
  that same file, so one validator required what another refused and no pack
  could satisfy both. The integration suite for this pack states which side is
  current: the file is a forbidden legacy sidecar.
- Nothing dispatched it. It was absent from the validator index and from
  `runCanonicalUixValidators`, and listed as unwired and unreachable in two
  test allowlists, so the contradiction never fired.

| Operation | Sub-op | Target                                    | Source (REQ) | Rationale                       | Status |
| --------- | ------ | ----------------------------------------- | ------------ | ------------------------------- | ------ |
| UPDATE    | REMOVE | 06_Test-Cases.md (TC-0014-0026/0027/0032) | REQ-0018     | the code under test is retired  | PASS   |
| UPDATE    | REMOVE | tdd/test-list.md (TDD-0026/0027/0032)     | REQ-0018     | same, and the test file is gone | PASS   |

`AC-0014-0004` stays: `TC-0014-0028` and `TC-0014-0029` cover the prototyping
design-system validator, which is a different module and still runs.

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                              | Subject                                                                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Depends-On                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0011, discussion-20260923063306456#REQ-0013 | `/qfai-verify` references: the TC chain and ledger (`references/articles.md`), the spec and contract directories and catalog steering files (`references/context-load.md`), the decision sources (`SKILL.md`) | spec-0014     | UPDATE    | MODIFY | -           | Slice B, lands P7 (P4 merged into cutover). The catalog steering files move with the Q8 relocation, which cannot land in this repository before P7. Size: 7 AC / 9 TC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | OQ-0170                                        |
| discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017                                        | `/qfai-verify` loads constitution and manifest content from `rule/` and `qfai.config.yaml`                                                                                                                    | spec-0014     | UPDATE    | MODIFY | -           | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |

## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands

The record of the `/qfai-sdd` batch run 20260923100952585, whose intake is the
discussion pack `discussion-20260923063306456`. Its Triage rows are under
`## Triage (2026-09-23 spec-to-story)` above. Every decision it rests on is in
`.qfai/evidence/sdd-batch-20260923100952585.md`, and the short IDs in
parentheses below (Q1, X2, P3-C1 and so on) are that record's. No approved
change request ordered this run.

### What this run changed

Both rows are MODIFY rows with no existing item to modify, so the new items sit
under the existing US-0014-0018 and keep the rows' operation (G5-11). No
existing item changed.

| File                        | Added                                                                      |
| --------------------------- | -------------------------------------------------------------------------- |
| `01_Spec.md`                | two Scope lines; two pack requirement lines                                |
| `03_Acceptance-Criteria.md` | AC-0014-0023..0026                                                         |
| `04_Business-Rules.md`      | BR-0014-0026..0030                                                         |
| `05_Examples.md`            | EX-0014-0030..0034                                                         |
| `06_Test-Cases.md`          | TC-0014-0037..0041                                                         |
| `tdd/test-list.md`          | TDD-0042..0046 at `todo`                                                   |
| `10_Plan.md`                | a `### Story-tree layout` subsection under each heading the change touches |

`16_Traceability-ledger.md` gained no row.

### How it lands

Delivery is three pull requests (user answers P3-C1, P3-C2 and P3-C3). The
first carries P1 alone and the third removes a guard exception; neither touches
this spec. Both rows of this spec land in the second pull request, which also
runs `/qfai-atdd` and `/qfai-implement` and carries their tests. The change is
text in the `qfai-verify` skill; no source module changes.

This spec has no REMOVE row, so nothing retires and no ledger row is
tombstoned.

| Triage row                                                                                 | Operation     | Lands                              | Items                                                                                          |
| ------------------------------------------------------------------------------------------ | ------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/qfai-verify` references: the TC chain and ledger, the directories, the decision sources  | UPDATE:MODIFY | P7, with the cutover               | AC-0014-0023..0025; BR-0014-0026..0028; EX-0014-0030..0032; TC-0014-0037..0039; TDD-0042..0044 |
| `/qfai-verify` loads constitution and manifest content from `rule/` and `qfai.config.yaml` | UPDATE:MODIFY | P6, with the assistant-tree rename | AC-0014-0026; BR-0014-0029, 0030; EX-0014-0033, 0034; TC-0014-0040, 0041; TDD-0045, 0046       |

`references/context-load.md` names `01_policy/` only in a commit after the one
that migrates this repository, because the catalog files move there at P7.

### Co-changes the landing carries

- The `QFAI-TRACE-001` findings are pinned in `scripts/dogfood-backlog.json` as
  a recorded one-off exception (user answer Q1). The pin is not there yet; it is
  a co-change of pull request 2. Editing this spec's `03` and `04` makes
  `QFAI-TRACE-001` fire for every row of `16_Traceability-ledger.md` whose
  linked implementation file the branch does not change. The pin is lifted when
  the linked files change or when P7 retires the ledgers. The plan's Risk
  mitigation section names its keys and counts, 13 findings in both the `tdd`
  and the `full` profiles, and the re-pin a commit owes when it touches a
  keyed file, such as `core/report.ts` at P3.
- The P6 co-change list in the second Triage row applies to this repository:
  the `skillsDir` key, the 42 tracked links and the citations in the root
  documents, rules and scripts.
- The tests that pin today's wording change in the commit that changes the text:
  `tests/assets/traceabilityChainLayered.test.ts` for `articles.md` at P7, and
  every test citing `assistant/skills/qfai-verify` or `assistant/constitution/`
  at P6.
- The P6 rename commit repoints the `skills/` paths in the ledger's
  `Owning module` cells of TDD-0042..0044. TDD-0045 and TDD-0046 already name
  `skill/`.

### Recorded drift

- Settled in Phase 2c: AC-0014-0024 and BR-0014-0027 read "the policy files
  under `01_policy/`" without naming them. They now name `objective.md`,
  `initiative.md` and `principle.md`, as spec-0018 and spec-0009 do (P2C-16).
- No pre-existing inconsistency was reported for this spec.

### Adoption and rejection

Adopted:

- Verify's own gate stays an unscoped full scan on the story tree. It takes
  neither `--spec` nor `--flow` (NFR-0001).
- The skill cites `rule/agent-selection.md`, which states once where the
  built-in routing and review-profile defaults are read from (P3-D01).
- `articles.md` restates the constitution's Article V chain instead of spelling
  its own (G5-8).

Rejected:

- Naming the defaults file in the skill.
  - DO NOT: write the path of the built-in defaults into `SKILL.md` or
    `context-load.md`.
  - Temptation: a direct path looks clearer. The location is stated once in
    `rule/agent-selection.md`, and a second statement drifts.
- Reading `constitution/` and `rule/` side by side for a while.
  - DO NOT: accept both assistant-tree layouts (N05).
  - Temptation: it looks like a gentler upgrade, but it keeps two sources of the
    constitution alive with nothing to say which one wins.
- Keeping the `QFAI-TRACE-001` pin once its lifting condition is met.
  - DO NOT: leave the pin in `scripts/dogfood-backlog.json` after the linked
    files change or P7 retires the ledgers.
  - Temptation: a pin that keeps CI green is easy to forget.
- Pinning the `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that the new `todo`
  cases raise in the dogfood lanes.
  - DO NOT: add a dogfood pin for them.
  - Temptation: a pin turns the lanes green at once. Pull request 2 carries the
    ATDD and implementation tests, which clear the errors (P3-C1).
