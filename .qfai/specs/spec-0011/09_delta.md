# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0014 (TDD unification), spec-0015 (Guardrail Hardening), spec-0016 (Dev Toolkit Hardening)
- Old spec-0014 unified 3 TDD skills into `/qfai-implement`
- Old spec-0015 added Phase 2 validators and 8-column template
- Old spec-0016 formalized 6-agent roster, completion contracts, evidence contracts, parallel dispatch rules

## Adopted

- AD-0011-0001: Single TDD entry point -- `/qfai-implement` with embedded micro-cycle (from spec-0014)
- AD-0011-0002: 8-column test-list.md -- TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence (from spec-0015)
- AD-0011-0003: 6-agent sub-agent roster -- formal agent definitions with responsibilities and prohibitions (from spec-0016)
- AD-0011-0004: 10-point completion gate -- machine-enforceable completion conditions (from spec-0016)
- AD-0011-0005: Evidence contract hardening -- per-item fresh evidence with RED/GREEN command+result (from spec-0016)
- AD-0011-0006: Failed first delegation hard-stop mitigation -- the first required real delegation doubles as the capability probe, and failure must stop immediately with remediation guidance (from spec-0011/10_Plan.md Risk mitigation)

## Rejected

- RJ-0011-0001: Old 3-skill TDD workflow (qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor)
  - DO NOT reintroduce separate TDD phase skills
  - Temptation: splitting implement back into separate skills for "modularity"
  - Reason: single entry point eliminates phase-skipping and ensures full cycle enforcement

- RJ-0011-0002: Status-only evidence
  - DO NOT accept evidence without command+result pairs
  - Temptation: marking items done with "looks good" or "should pass"
  - Reason: observable proof is required per evidence hard rules

## ID Renumbering

| Old ID                 | New ID       | Notes                 |
| ---------------------- | ------------ | --------------------- |
| spec-0014 US-0014-YYYY | US-0011-YYYY | TDD unification       |
| spec-0015 US-0015-YYYY | US-0011-YYYY | Guardrail hardening   |
| spec-0016 US-0016-YYYY | US-0011-YYYY | Dev toolkit hardening |

## 2026-05-06 — CHG-001 — Absorbed simplified handoff + design-system input from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                          |
| ------ | ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | simplified handoff schema + design-system input bullets; US range → US-0011-0008 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0011-0007..0008)            | simplified handoff + design-system input user stories                            |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0011-0009..0010)     | simplified handoff schema + design-system mirror byte-equivalence                |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0011-0007..0008)          | mirror BR layer for OP-003                                                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0011-0008..0009)                | worked examples per AC                                                           |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0011-0011..0012)              | test coverage per AC                                                             |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0011-0011..0012) | TDD ledger sync                                                                  |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). The mirror invariant for `design-system.yaml` is enforced by the design contract validator family owned by spec-0004; `/qfai-implement` only consumes the validated mirror.

## Triage

| Source                                                     | Subject                                                                                                                                                                                             | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017 (CHG-003) | `/qfai-implement` SKILL.md に `project_memory:` 宣言追加、author 前に open work-log entry を読み、kind 別 write-trigger に従い entry を書く。handoff entry body を 5 セクション schema に従わせる。 | spec-0011     | UPDATE    | APPEND | pin-implied | Primary worklog-writer (most write-trigger surface area)。implementation-phase skill (REQ-0005 scope)。subject-token overlap (`skill`, `implement`)。 |

## CHG-003 (v1.9.0) — Primary Worklog-writer Contract

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- Obligation: `/qfai-implement` is the **primary** worklog-writer. SKILL.md MUST:
  1. Carry a `project_memory:` block enumerating layers it reads.
  2. Read open work-log entries (`status` ∈ `{active, handoff}`, `scope` ∈ `{global, <current-spec>}`) before authoring; cite consulted entry IDs in completion report (REQ-0005).
  3. Write entries at the 11 conditions listed in `_policies/10_Policy.md#work-log-write-triggers` (REQ-0004) — milestone, decision, risk, consultation-needed, unexpected, unscoped-discovery, handoff, blocker, scope-up, scope-down, spike.
  4. Follow the handoff-brief body schema (REQ-0017) for `kind: handoff` entries.
  5. Treat `kind: unscoped-discovery` as non-blocking (REQ-0016): record and continue, do not abort current scope.
- Cascade: SKILL.md `project_memory:` validated by spec-0004. Reviewer-Gate drift checks (spec-0015) run on outputs.
- Source: REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017
