# 05 Scope -- QFAI v1.6.2 Development Toolkit Hardening

## In Scope

| #   | Item                           | Description                                                                                                                                                                                                        |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Sub-agent roster formalization | Define 6 named sub-agents (TDDCycleController, TDDImplementer, RedGreenAuditor, TDDSpecReviewer, TDDCodeQualityReviewer, ParallelSliceDispatcher) with explicit responsibilities and handoff contracts in SKILL.md |
| 2   | Completion contract hardening  | Define machine-enforceable conditions for item completion, spec completion, and completion prohibition (e.g., missing reviewer sign-off blocks completion)                                                         |
| 3   | Evidence contract hardening    | Define minimum evidence per TDD item: each evidence entry must include a command+result pair; thin evidence (status-only) is rejected                                                                              |
| 4   | Parallel dispatch rules        | Formalize three rules: independent slices only, worktree separation required, integration verify after merge                                                                                                       |
| 5   | Docs/wrappers/assets test sync | Synchronize all documentation and wrapper files with canonical SKILL.md; add required/forbidden phrase guardrails enforced by asset tests                                                                          |
| 6   | Asset test guardrails          | New or updated asset tests that verify required phrases are present and forbidden phrases are absent across docs, wrappers, and skill files                                                                        |

## Out of Scope (Anti-goals)

All of the following are explicitly **out of scope** for v1.6.2 and MUST NOT appear in this release.

| #   | Item                             | Deferral Target | Rationale                                                        |
| --- | -------------------------------- | --------------- | ---------------------------------------------------------------- |
| 1   | Evidence schema versioning       | v1.6.3+         | Adds migration complexity beyond contract hardening scope        |
| 2   | qfai upgrade command             | v1.6.3+         | Separate feature, not an orchestration hardening concern         |
| 3   | Generic spec-lint                | v1.6.3+         | Broad scope beyond the five targeted failure modes               |
| 4   | Wrapper framework generalization | v1.6.3+         | Current wrappers are sufficient; generalization is a new feature |
| 5   | Coverage numerical targets       | v1.6.3+         | Policy decision independent of orchestration hardening           |

## Success Criteria

1. **All 5 failure modes addressed** -- Each failure mode (F-6201 through F-6205) has a corresponding contract or guardrail in the canonical SKILL.md that prevents the failure from occurring.
2. **Single PR delivery** -- All v1.6.2 changes are delivered in one coordinated PR with no partial or staged rollout.
3. **All tests pass** -- Existing tests continue to pass, and new asset tests for required/forbidden phrase guardrails pass on the final PR state.
4. **No half-migration state** -- SKILL.md, wrappers, documentation, and tests are all synchronized; no artifact references stale contracts or missing sub-agent definitions.
5. **Sub-agent roster is complete** -- All 6 sub-agents are named, defined, and have explicit responsibilities in the canonical skill.
6. **Completion contract is enforceable** -- Item and spec completion conditions are explicitly stated with prohibition conditions that block premature completion.
7. **Evidence contract is enforceable** -- Minimum evidence per TDD item is defined with command+result pair requirements.
8. **Parallel dispatch rules are explicit** -- Independence, worktree separation, and integration verify rules are documented and testable.
