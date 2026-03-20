# spec-0016: Development Toolkit Hardening (qfai-implement)

## Parent

CAP-0016

## Version

v1.6.2

## Summary

Harden the orchestration layer inside `/qfai-implement` by formalizing the sub-agent roster, completion contracts, evidence contracts, parallel dispatch rules, and docs/wrappers/assets test synchronization. Closes five failure modes (F-6201 through F-6205) that allow TDD shortcuts, reviewer-less completion, thin evidence, unsafe parallelism, and stale documentation to survive undetected.

## Consumer View

- Primary SSOT for execution: `spec-0016/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

### In Scope

| #   | Item                           | Description                                                                                                                                                                                               |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sub-agent roster formalization | Define 6 named sub-agents (TDDCycleController, TDDImplementer, RedGreenAuditor, TDDSpecReviewer, TDDCodeQualityReviewer, ParallelSliceDispatcher) with responsibilities and handoff contracts in SKILL.md |
| 2   | Completion contract hardening  | Define machine-enforceable conditions for item completion, spec completion, and completion prohibition                                                                                                    |
| 3   | Evidence contract hardening    | Define minimum evidence per TDD item: TDD-ID, TC-ref, RED command+result, GREEN command+result, refactor verify, reviewer results; thin evidence (status-only) is rejected                                |
| 4   | Parallel dispatch rules        | Formalize three rules: independent slices only, worktree separation required, integration verify after merge                                                                                              |
| 5   | Docs/wrappers/assets test sync | Synchronize all documentation and wrapper files with canonical SKILL.md; add required/forbidden phrase guardrails enforced by asset tests                                                                 |
| 6   | Asset test guardrails          | New or updated asset tests that verify required phrases are present and forbidden phrases are absent across docs, wrappers, and skill files                                                               |

### Out of Scope

| #   | Item                             | Deferral Target | Rationale                                                        |
| --- | -------------------------------- | --------------- | ---------------------------------------------------------------- |
| 1   | Evidence schema versioning       | v1.6.3+         | Adds migration complexity beyond contract hardening scope        |
| 2   | qfai upgrade command             | v1.6.3+         | Separate feature, not an orchestration hardening concern         |
| 3   | Generic spec-lint                | v1.6.3+         | Broad scope beyond the five targeted failure modes               |
| 4   | Wrapper framework generalization | v1.6.3+         | Current wrappers are sufficient; generalization is a new feature |
| 5   | Coverage numerical targets       | v1.6.3+         | Policy decision independent of orchestration hardening           |

## Applicable NFR (copy-down from \_policies)

| NFR-ID   | Title                   | Measurable Target                                      |
| -------- | ----------------------- | ------------------------------------------------------ |
| NFR-0001 | Single PR Delivery      | PR count = 1                                           |
| NFR-0002 | No Half-migration State | Wrapper parity drift = 0                               |
| NFR-0003 | Backward Compatibility  | All existing validator tests pass without modification |
| NFR-0004 | Scope Discipline        | 0 unrelated file changes in PR diff                    |
| NFR-0005 | Test Execution Time     | CI time delta < 10%                                    |

## Applicable Policy

| Policy-ID    | Policy                                                 |
| ------------ | ------------------------------------------------------ |
| POL-SEC-001  | No secrets in skill bodies or wrappers                 |
| POL-COMP-001 | MIT license compliance for all new content             |
| POL-QA-001   | All changes must have corresponding test coverage      |
| POL-QA-002   | Required/forbidden phrase guardrails must be automated |
| POL-PROC-001 | 1 version = 1 PR policy must be maintained             |

## Relevant Requirements (copy-down)

| REQ-ID   | Title                        | Priority |
| -------- | ---------------------------- | -------- |
| REQ-0001 | Sub-agent Roster Definition  | Must     |
| REQ-0002 | Item Completion Contract     | Must     |
| REQ-0003 | Spec Completion Contract     | Must     |
| REQ-0004 | Completion Prohibition Rules | Must     |
| REQ-0005 | Evidence Minimum Contract    | Must     |
| REQ-0006 | Parallel Dispatch Contract   | Must     |
| REQ-0007 | Docs Synchronization         | Must     |
| REQ-0008 | Wrapper Synchronization      | Must     |
| REQ-0009 | Required Phrase Guardrails   | Must     |
| REQ-0010 | Forbidden Phrase Guardrails  | Must     |
| REQ-0011 | Verify-pack Pass             | Must     |
| REQ-0012 | Optional Validator Warnings  | Could    |

## Entry Points

- US range in this spec: US-0016-0001..US-0016-0005
- Primary actors: QFAI maintainers, downstream project developers
- Notes: All changes delivered in a single PR. Failure modes F-6201 through F-6205 each map to one or more User Stories.

## Evidence Summary

- Discussion: `.qfai/discussion/discussion-20260320000941109/`
- OQ resolved: 5 / 5 (OQ-0001 through OQ-0005, all resolved 2026-03-20)

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist.
- Conflict: NFR / Policy / AC conflict.
- Missing: required constraints or policy are unclear.
- Trade-off: performance vs security vs DX must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
