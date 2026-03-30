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
- Validation: qfai validate pass, integration tests for all TC-0035-* cases

## Follow-ups

- None (all OQs resolved)
