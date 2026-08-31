# 09 delta

## 2026-04-22

- Clarified: prototyping-related routing is now described against the skill-led flow.
- Superseded: wording that tied evaluator routing to a removed prototyping runtime entrypoint.

## 2026-05-06 — CHG-001 — Absorbed prototyping routing rebuild + full-harness profile drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                            |
| ------ | ------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In)                              | `/qfai-prototyping` v2.0 routing rebuild + `review-profiles.yml` full-harness drop |
| OP-002 | UPDATE:APPEND | 06_Test-Cases.md (TC-0015-0015..0016)              | routing rebuild + profile drop test coverage                                       |
| OP-003 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0015-0015..0016) | TDD ledger sync                                                                    |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Same-Claude generator/reviewer assignment is rejected at the routing layer to keep the evaluator independent of generator self-preference bias.

## Triage

| Source                                                         | Subject                                                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0006, REQ-0017 (CHG-003)                                   | Reviewer-Gate sub-agents (`completion-reviewer`, `implementation-reviewer`, `qa-gatekeeper`) が work-log entries + Decisions table を構造化入力として受け取り、`R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` / `R-HANDOFF-INCOMPLETE` を出力する | spec-0015     | UPDATE    | APPEND | pin-implied | Agent collective spec owns reviewer-subagent contracts (CAP-0015)。subject-token overlap (`agent`, `reviewer`)。新 CAP 不要。                                                                                                                                                                                                                                                                        |
| `discussion-20260804173914356#REQ-0013`, `#REQ-0022` (CHG-007) | Reviewer Gate ingests the workflow-hygiene and shipped-shape drift findings                                                                                                                                                                 | spec-0015     | UPDATE    | APPEND | -           | Cascade from CHG-007, following the established emitter/ingestion split: the repository lane emits, this spec defines ingestion. Codes are declared in the `CLI-WFSET` contract. Both are error class and so belong in the closed justification catalog; registration is deferred as a lockstep change (DR-0015-0006 / OQ-0015-0001) and the current handling is recorded as a temporary divergence. |

## CHG-003 (v1.9.0) — Reviewer-Gate Drift Findings + Handoff Check

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-validate.md` (CLI-VAL, "Reviewer-Gate input bundle" section)
- Operation: UPDATE:APPEND
- Obligation: Reviewer sub-agents MUST be invoked with a structured input bundle (open work-log entries + Decisions table + fresh implementation output). They MUST emit `R-*` findings with non-empty `justification:` field naming (a) the entry ID or Decisions row ID that triggered the finding and (b) the specific contradiction or re-adoption observed. `qfai validate` rejects Reviewer reports whose `R-*` findings lack `justification:` (advisory-failing rather than mute per REQ-0006).
- New findings:
  - `R-WORKLOG-DRIFT` (severity error, advisory-failing): output contradicts an open entry with `kind` in `{decision, risk, blocker, scope-down}`.
  - `R-REJECTED-READOPT` (severity error, advisory-failing): output adopts an option marked `Status: rejected` in the active spec's `07_Decisions.md`.
  - `R-HANDOFF-INCOMPLETE` (severity error): a `kind: handoff` entry body is missing one of the 5 required sections (State / Next action / Constraints / OQs / References) per REQ-0017.
- Cascade: spec-0004 implements the `R-*` finding-schema enforcement and the `qfai validate` ingestion. Skill specs declare reviewer routing via existing `.qfai/assistant/catalog/agent-routing.yml`.
- Out-of-scope (this spec): heuristic implementation (natural-language reasoning lives in the sub-agent prompt, not in code).
- Source: REQ-0006, REQ-0017

## 2026-05-23 — CHG-004 — agent-catalog.yml in-line developer_instructions

| Op ID  | Op Type       | Target                                       | Summary                                                                                                                                       |
| ------ | ------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | `.qfai/assistant/manifest/agent-catalog.yml` | Add `developer_instructions` field per agent (19 agents); mirrors canonical `.qfai/assistant/agents/<name>.md` body from `## Mission` onward. |
| OP-002 | UPDATE:APPEND | tests/codex/agents.test.ts (TC-0004-0026)    | 3-way SSOT guard: canonical MD ↔ `.codex/agents/*.toml` ↔ agent-catalog.yml `developer_instructions` must stay in lockstep.                   |

- Approved By: pin-implied (under feature/v1.9.0)
- Notes: Field surfaces the agent Mission/Inputs/Deliverables/Stop Conditions/Sign-off contract directly inside the routing manifest so downstream loaders that read agent-catalog.yml (codex/copilot/claude wrappers, agent-routing.yml validators) do not need a second file-system read. The duplication is structurally guarded by TC-0004-0026 so drift fails CI.

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing AC/BR/EX/TC numbering. NFR-0115 (justification-text contract reuse) absorbed into BR-0015-0009 (SSOT shared with spec-0004 BR-0004-0028).
- Approved By: yusuke_senaga

### Triage (rows owned by this spec)

| Source                                       | Subject                                                                                                                                                                                                                                                 | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | -------------------------------------------------------------------------------------------------- |
| REQ-0113 (discussion-20260523221141355)      | Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` (severity error) on certify path that reads validator output requiring `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase — structural check, option-B path (upstream deferred-OQ decision) | spec-0015     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate finding emission is CAP-0015 (agent collective) territory                            |
| REQ-0125 (discussion-20260523221141355)      | Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` (severity error) emission with mandatory `justification:` per discussion-20260522081618995 REQ-0006 contract                                                                                                     | spec-0015     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate is the emitter; spec-0004 BR-0004-0028 is the rejector (one contract, two enforcers) |
| NFR-0115 (justification-text contract reuse) | absorbed into BR-0015-0009                                                                                                                                                                                                                              | spec-0015     | UPDATE    | APPEND | yusuke_senaga | NFR realized as BR-layer cross-spec SSOT (shared with BR-0004-0028)                                |

### CHG-005 Operations (this PR)

| Op ID  | Op Type       | Target                                                                                          | Summary                                                                                                                 |
| ------ | ------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0015-0013 / REQ-0015-0014; Entry-points US range → 0008) | Reviewer-Gate cycle check + `R-PROMPT-SCANNER-DRIFT` emission registered as Relevant Requirements                       |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0015-0007..0008)                                                         | regression-check + drift-emission user stories                                                                          |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0015-0013..0014)                                                  | structural cycle check + 3-part justification ACs                                                                       |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0015-0008..0009)                                                       | mirror BR layer (cycle check is structural / justification 3-part contract is shared SSOT with spec-0004 BR-0004-0028)  |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0015-0009..0010)                                                             | worked examples per AC                                                                                                  |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0015-0017..0019)                                                           | test coverage per AC; integration level for Reviewer-Gate fixture-driven assertions; control (Type=normal) + error case |

- Notes:
  - The option-B path text in REQ-0015-0013 corresponds to the orchestrator's upstream deferred-OQ resolution for OQ-0107 (path resolution recorded in the slice prompt, not duplicated here to avoid distributed-surface leakage).
  - Parallel pack pieces: spec-0004 (validate.json profile path + SSOT-sync pair lane + R-PROMPT-SCANNER-DRIFT justification ingestion); spec-0006 (qfai doctor playwright probe rebuild); spec-0012 (iterate-side scanner / prompt + countWords pure-function); spec-0013 (UI contract template `primary_tasks:` slot + validate lane).
  - The Reviewer-Gate emitter (spec-0015) and the validate rejector (spec-0004) share the 3-part justification contract; updating one without the other must be caught by the same SSOT-sync-pair discipline that this pack itself enforces (BR-0004-0027).
- Source: REQ-0113, REQ-0125 (discussion-20260523221141355); NFR-0115

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR     | Rationale                                                                                                                                                                                                                                 | Approver |
| ------------- | ----------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UPDATE:APPEND | spec-0015   | REQ-0015-0015 | CHG-005 cycle で REQ-0015-0014 (`R-PROMPT-SCANNER-DRIFT` emission) を実装した `promptScannerPairs.ts` は proof-of-concept として 1 clause のみ。残り 3 violation kinds (font / radius / shadow) の manifest 拡張を follow-up として登録。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0015)

Pack: `.qfai/discussion/discussion-20260527075558258/` (CHG-006). Wave A scaffold (DR-0261..DR-0274) in `_policies/08_Decisions.md`. Posture: append-first `UPDATE:APPEND` only; continued local IDs from true max +1 (US 0009-0015, AC 0015-0021, BR 0010-0016, EX 0011-0017, TC 0020-0033).

| Operation     | Sub-op | Target                                                                         | Source (REQ) | Rationale        | DR-Ref                | Status |
| ------------- | ------ | ------------------------------------------------------------------------------ | ------------ | ---------------- | --------------------- | ------ |
| UPDATE:APPEND | APPEND | US-0015-0009 / AC-0015-0015 / BR-0015-0010 / EX-0015-0011 / TC-0015-0020..0021 | REQ-0160     | cascade verified | DR-0269               | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0010 / AC-0015-0016 / BR-0015-0011 / EX-0015-0012 / TC-0015-0022..0023 | REQ-0158     | cascade verified | DR-0270               | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0011 / AC-0015-0017 / BR-0015-0012 / EX-0015-0013 / TC-0015-0024..0025 | REQ-0161     | cascade verified | CLI-HANDOFF           | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0012 / AC-0015-0018 / BR-0015-0013 / EX-0015-0014 / TC-0015-0026..0027 | REQ-0168     | cascade verified | OQ-0119 carry-fwd     | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0013 / AC-0015-0019 / BR-0015-0014 / EX-0015-0015 / TC-0015-0028..0029 | REQ-0171     | cascade verified | DR-0271               | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0014 / AC-0015-0020 / BR-0015-0015 / EX-0015-0016 / TC-0015-0030..0031 | REQ-0172     | cascade verified | (SHOULD; CLI-HANDOFF) | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0015 / AC-0015-0021 / BR-0015-0016 / EX-0015-0017 / TC-0015-0032..0033 | REQ-0173     | cascade verified | (doc governance)      | PASS   |

- Decisions: 07_Decisions.md reference rows DR-0015-0003→DR-0269, DR-0015-0004→DR-0270, DR-0015-0005→DR-0271.
- Open questions: OQ-0160 / OQ-0162 / OQ-0163 resolved by the cited DRs; OQ-0119 remains carry-forward deferred (prompt-augmentation timing not resolved).
- 01_Spec.md: Status remains `active`; governance behavior copied down to Consumer View; Relevant Requirements + US range (→0015) updated.
- Approved By: yusuke_senaga (pin-implied under feature/v1.9.2)

## 2026-08-05 — CHG-007 — Reviewer-Gate ingestion of the workflow-hygiene lane codes

Pack: `.qfai/discussion/discussion-20260804173914356/` (CHG-007). Cascade only — this spec defines ingestion; the lane belongs to spec-0017 and the shipped-file rules to spec-0003. Posture: append-first `UPDATE:APPEND`, each new local ID taken from its own class's true max + 1 (US 0015→0016, AC 0021→0022, BR 0016→0017, EX 0017→0018, TC 0034→0035..0036, TDD 0035→0036..0037).

| Operation     | Sub-op | Target                                                                         | Source (REQ)                    | Rationale        | DR-Ref       | Status |
| ------------- | ------ | ------------------------------------------------------------------------------ | ------------------------------- | ---------------- | ------------ | ------ |
| UPDATE:APPEND | APPEND | US-0015-0016 / AC-0015-0022 / BR-0015-0017 / EX-0015-0018 / TC-0015-0035..0036 | CHG-007 pack `#REQ-0013`/`0022` | cascade verified | DR-0015-0006 | PASS   |
| UPDATE:APPEND | APPEND | tdd/test-list.md TDD-0036..0037 (first ledger table)                           | (ledger sync)                   | cascade verified | DR-0015-0006 | PASS   |

- Decisions: DR-0015-0006 records that catalog membership is decided by severity class, that both `CLI-WFSET` codes belong in the closed catalog, and that registering them is deferred as a lockstep change.
- Open questions: OQ-0015-0001 opened (registration timing + the full SSOT set that must move together). No prior open question resolved here.
- Round-2 review corrections folded in: the acceptance criterion was first appended as a duplicate of the CHG-006 `AC-0015-0016` and is renumbered to `AC-0015-0022` (the CHG-006 chain at `AC-0015-0016` is untouched); the two ledger rows were first appended to the file's second Markdown table, which `parseFirstMarkdownTable` never reads, and are moved into the first table.
- Approved By: user@2026-08-05 (CHG-007 pack approval)
