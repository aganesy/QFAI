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
