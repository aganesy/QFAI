# 10 Plan

## Goal

- Keep prototyping SSOT aligned to the current skill-first architecture and reviewer-score evidence model.

## Current State

- CLI/runtime orchestration is removed from the active public contract.
- Validate/verify hold the machine gates.
- Skill/reference documents define the human workflow.
- Internal mode helpers still provide deterministic iteration budgets.
- Full-harness history/result artifacts are reviewer-score centered.
- Round / candidate / absorption artifacts are documented here as the active v2 exploration model.
- Former spec-0017 (CAP-0017 v2.0 single-thread evolution loop / UX-loop redesign) and spec-0018 are absorbed into spec-0012; the standalone directories no longer exist.

## Next Maintenance Steps

1. Keep `spec-0012` aligned with `qfai-prototyping` SKILL.md and its references.
2. When harness schema changes, update `review/prototyping.ts`, `history.ts`, `resultWriter.ts`, and this spec together.
3. Keep `16_Traceability-ledger.md` and `tdd/test-list.md` aligned with real remaining tests only.
4. Do not recreate standalone prototyping spec packs unless the product surface genuinely splits again; extend `spec-0012` instead.
