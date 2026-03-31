# 09 Delta

## Change Summary

- Change ID: DELTA-S35-001
- Date: 2026-03-30
- Primary: spec-0035 initial creation
- Tags: v1.7.8, prototyping-workflow, ui-detection, full-harness, static-first
- Summary: Initial spec creation for Prototyping Workflow Canonicalization (CAP-0035)

## Rationale

- UI-bearing detection logic is duplicated across validators and skills, causing inconsistent classification
- Prototyping skill body contains runtime-heavy language misaligned with static-first architecture
- Full-harness premium path lacks actual user-facing entrypoint (routing guidance only)

## Candidates Considered

1. CLI only for full-harness entrypoint
2. Dual entrypoint: CLI + dedicated skill file (adopted)

## Adopted

- Adopted: Dual entrypoint (CLI + skill) with stateless routing reception
- Why: Dual path ensures discoverability from both CLI and skill contexts; stateless reception avoids fragile inter-skill dependencies (SD-0035-001, DR-0085)
- Evidence: discussion-20260330035428071

## Rejected

- RJ-001: CLI only for full-harness
- Reason: Skill guidance is the primary discovery path for many users; CLI-only makes full-harness invisible to skill users
- DO NOT: Provide premium path without skill guidance. Full-harness must be accessible from both CLI and skill entrypoints.
- Temptation: CLI だけで十分と思う。Skill 経由のユーザーが full-harness を発見できなくなるリスクを軽視しがち。

## Impact

- Affects: shared detection module (new), `uixDetection.ts` (refactor), `discussionDesignHardening.ts` (refactor), prototyping `SKILL.md` (rewrite), full-harness skill file (new), `prototyping.ts` CLI command (update)
- Validation: qfai validate pass, integration tests for all TC-0035-\* cases

## Follow-ups

- None (all OQs resolved)

## v1.7.11 Completion Release Update

- **Change ID**: DELTA-S35-002
- **Date**: 2026-03-31
- **Primary**: v1.7.11 Completion Release — standard-to-full-harness routing condition consistency and determinism
- **Tags**: v1.7.11, routing-consistency, determinism, REQ-0020
- **Source**: v1.7.11 WS-I

### Summary

Added US-0035-0004, AC-0035-0013 through AC-0035-0015, BR-0035-0014 through BR-0035-0016, EX-0035-0017 through EX-0035-0020, TC-0035-0019 through TC-0035-0022.
Addresses REQ-0020 (ensure standard to full-harness routing conditions are consistent).

### Adopted

- Routing conditions must be deterministic: only explicit CLI flag or skill invocation triggers full-harness
- Mode precedence chain must be documented in SKILL.md and match implementation
- No contradictory routing across documentation sources
- **Rationale**: REQ-0020 from v1.7.11 requirements; ensures routing predictability and documentation consistency

### Rejected

- Implicit routing based on evidence scores: introduces non-determinism and unpredictable behavior
  - DO NOT: evidence スコアに基づく自動ルーティングを実装しない。Temptation: UX 向上のため自動化したくなる

### Impact

- Affects: SKILL.md routing documentation, CLI help routing descriptions, mode router implementation alignment
- Validation: TC-0035-0019..TC-0035-0022 must pass; existing TC-0035-0001..TC-0035-0018 must not regress

---

## v1.7.9 Convergence Update

- Date: 2026-03-30
- Source: discussion-20260330153902875
- Adopted: shared detection module は surface declaration primary / content signals fallback を維持し、full-harness は real path として扱う
- Rejected: routing-only premium path と heuristic-primary detection
- DO NOT: standard path に premium obligations を戻さない
