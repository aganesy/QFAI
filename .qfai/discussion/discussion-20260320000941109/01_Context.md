# Context

## Background

QFAI v1.6.0 introduced the **`/qfai-implement` single-entry unification**, consolidating the TDD micro-cycle workflow around a single entry point and establishing `test-list.md` as the execution ledger. v1.6.1 then **hardened test-list.md guardrails** by adding Phase 2 validation (5 new error checks), coverage visualization in the report, and 8-column template/documentation synchronization.

Despite these advances, the orchestration layer inside `/qfai-implement` remains under-specified. Sub-agent responsibilities are implicit, completion conditions are soft, evidence requirements are vague, and parallel dispatch lacks safety guardrails. v1.6.2 addresses these gaps through a **development toolkit hardening** release focused on formalizing the sub-agent roster, completion contracts, evidence contracts, parallel dispatch rules, and docs/wrappers/assets test synchronization.

## Purpose

Close five failure modes that allow TDD shortcuts, reviewer-less completion, thin evidence, unsafe parallelism, and stale documentation to survive undetected through the current orchestration pipeline:

| Failure Mode | Description                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F-6201**   | TDD shortcut -- the micro-cycle can be bypassed without watch-it-fail/watch-it-pass enforcement, allowing implementation without genuine RED/GREEN proof    |
| **F-6202**   | Reviewer-less completion -- items or specs can be marked complete without independent reviewer gates (TDDSpecReviewer, TDDCodeQualityReviewer)              |
| **F-6203**   | Thin evidence -- evidence entries lack command+result pairs, making post-hoc auditing impossible                                                            |
| **F-6204**   | Unsafe parallel -- parallel dispatch allows dependent slices, shared worktrees, or missing integration verification                                         |
| **F-6205**   | Stale docs/wrappers/tests -- documentation, wrapper files, and asset tests fall out of sync with the canonical skill, containing stale or forbidden phrases |

## Stakeholders

- **QFAI maintainers** -- Responsible for implementing, testing, and releasing the sub-agent roster, completion/evidence contracts, parallel rules, and synchronized docs/wrappers/tests.
- **Downstream project developers** -- Developers using QFAI who rely on `/qfai-implement` for strict TDD enforcement. They benefit from un-shortcuttable micro-cycles, auditable evidence, and safe parallel dispatch.

## Assumptions

1. QFAI v1.6.1 is stable and deployed. All Phase 1 and Phase 2 validators are functioning correctly.
2. The existing test infrastructure (assets tests, init tests, verify-pack) works correctly and can be extended for v1.6.2 guardrails.
3. The sub-agent roles (TDDCycleController, TDDImplementer, RedGreenAuditor, TDDSpecReviewer, TDDCodeQualityReviewer, ParallelSliceDispatcher) are already informally present in the skill logic and need formalization, not invention.
4. Parallel dispatch is currently possible but lacks explicit safety constraints; formalizing the rules does not remove the capability but constrains it.
5. A single PR delivery is feasible given the scope is limited to contract hardening rather than new feature development.

## Issues

- **TDD micro-cycle is shortcuttable.** Without formal watch-it-fail/watch-it-pass enforcement, a developer (or the AI agent) can skip the RED observation step and proceed directly to implementation, undermining the entire TDD guarantee (F-6201).
- **Completion has no independent review gate.** Items and specs can reach "complete" status without passing through TDDSpecReviewer or TDDCodeQualityReviewer, meaning quality checks are optional rather than mandatory (F-6202).
- **Evidence is too thin to audit.** Current evidence entries may contain only a status marker without the actual command that was run and its output, making it impossible to verify compliance after the fact (F-6203).
- **Parallel dispatch is unsafe.** There are no explicit rules requiring slice independence, worktree separation, or integration verification after parallel execution, risking merge conflicts and broken integration (F-6204).
- **Docs, wrappers, and tests are stale.** Documentation, wrapper files, and asset tests may contain phrases from previous versions or lack required phrases from the current version, creating confusion and false confidence in compliance (F-6205).
