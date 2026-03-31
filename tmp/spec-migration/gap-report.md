# Spec Migration Gap Report

Generated: 2026-04-01

## Summary

- Critical: 1
- Warning: 2
- Info: 1

This report lists only gaps that were directly confirmed from the current repository state after the 38 -> 15 spec migration.

## Critical

### spec-0012: full-harness runtime backend is not materially present

- Severity: Critical
- Spec expectation:
  - `spec-0012/01_Spec.md` declares runtime-heavy `full-harness` execution, runtime gates, and browser/live API verification as part of `/qfai-prototyping`.
- Implementation evidence:
  - `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md` still documents `full-harness`.
  - In `packages/qfai/src/**`, the remaining concrete references are limited to harness type/validator support such as `packages/qfai/src/core/harness/types.ts` and `packages/qfai/src/core/validators/skill/prototypingSkill.ts`.
  - Previously referenced implementation bases `core/prototyping/` and `core/browserQa/` are no longer present in the repository.
- Gap:
  - The spec still describes a substantial runtime execution capability, but the codebase currently contains prompt/schema support rather than a confirmed execution backend.
- Recommended action:
  - Either reduce `spec-0012` to the currently implemented static/prompt-level capability, or reintroduce an executable runtime backend and tests.

## Warning

### spec-0013: slice policy and create/delete approval are documented but not validator-enforced

- Severity: Warning
- Spec expectation:
  - `spec-0013` and `qfai-sdd/SKILL.md` require `_policies/11_Slice-Policy.md` based classification and mandatory `AskUserQuestion` approval for spec create/delete.
- Implementation evidence:
  - The rule exists in `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`.
  - Code references to `11_Slice-Policy.md` are currently limited to spec layout metadata (`packages/qfai/src/core/specLayout.ts`).
  - `packages/qfai/src/core/validate.ts` does not execute a dedicated slice-policy validator.
- Gap:
  - The policy is enforced at prompt/document level, not at repository validation/runtime level.
- Recommended action:
  - Add a dedicated validator and wire it into `validate.ts`, or explicitly mark this rule as process-only.

### spec-0012 vs spec-0013: Spec Auto-Discovery ownership remains split

- Severity: Warning
- Spec expectation:
  - `spec-0012` includes Spec Auto-Discovery in prototyping scope.
  - `spec-0013` also includes Spec Auto-Discovery in SDD scope.
- Implementation evidence:
  - Executable logic exists in shared core files such as `packages/qfai/src/core/specDiffDetector.ts` and `packages/qfai/src/core/validators/traceabilityIntegrity.ts`.
- Gap:
  - Capability ownership is still ambiguous after migration. The implementation is shared core logic, while the migrated specs assign the behavior to multiple skills.
- Recommended action:
  - Choose one primary owning spec and downgrade the other to a dependency/reference relationship.

## Info

### Resolved during migration follow-up: stale removed command name

- Severity: Info
- Observation:
  - A stale reference to `/qfai-prototyping-full-harness` remained in `packages/qfai/src/core/harness/types.ts`.
- Resolution:
  - Updated to `/qfai-prototyping full-harness mode` in this change set.
