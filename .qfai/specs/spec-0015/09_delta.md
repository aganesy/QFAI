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

| Source                       | Subject                                                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| REQ-0006, REQ-0017 (CHG-003) | Reviewer-Gate sub-agents (`completion-reviewer`, `implementation-reviewer`, `qa-gatekeeper`) が work-log entries + Decisions table を構造化入力として受け取り、`R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` / `R-HANDOFF-INCOMPLETE` を出力する | spec-0015     | UPDATE    | APPEND | pin-implied | Agent collective spec owns reviewer-subagent contracts (CAP-0015)。subject-token overlap (`agent`, `reviewer`)。新 CAP 不要。 |

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
