# 02 User Stories

## US Catalog

- US-0016-0001: Sub-agent Roster Formalization
- US-0016-0002: Completion Contract Hardening
- US-0016-0003: Evidence Contract Hardening
- US-0016-0004: Parallel Dispatch Rules
- US-0016-0005: Docs/Wrappers/Assets Test Synchronization

---

## US-0016-0001: Sub-agent Roster Formalization

- Parent: CAP-0016
- Source: discussion-20260320000941109 story #D0001
- Requirement: REQ-0001
- Failure Mode: F-6201

**As a** developer using qfai-implement
**I want** the skill to formally define 6 named sub-agents with explicit responsibilities and handoff contracts
**So that** TDD cannot be shortcutted because each phase is owned by a specific agent that enforces watch-it-fail / watch-it-pass

- Goal: SKILL.md formally defines TDDCycleController, TDDImplementer, RedGreenAuditor, TDDSpecReviewer, TDDCodeQualityReviewer, and ParallelSliceDispatcher with responsibilities, prohibitions, and handoff contracts
- Non-goals: Splitting sub-agent definitions into separate files; providing a GUI agent roster
- Notes: Sub-agent roles are already informally present in the skill logic. This story formalizes them in SKILL.md as the single source of truth.

---

## US-0016-0002: Completion Contract Hardening

- Parent: CAP-0016
- Source: discussion-20260320000941109 story #D0002
- Requirement: REQ-0002, REQ-0003, REQ-0004
- Failure Mode: F-6202

**As a** developer
**I want** independent reviewer gates so that completion requires actual review by TDDSpecReviewer and TDDCodeQualityReviewer
**So that** items and specs cannot be marked complete without passing mandatory review steps

- Goal: SKILL.md defines a 10-point item completion checklist, spec-level completion conditions, and explicit prohibition conditions that block premature completion
- Non-goals: Configurable or optional reviewer gates; bypassing reviewer gates under any circumstance
- Notes: The 10-point checklist is exhaustive and non-configurable. Prohibition rules are explicitly enumerated to make violations detectable.

---

## US-0016-0003: Evidence Contract Hardening

- Parent: CAP-0016
- Source: discussion-20260320000941109 story #D0003
- Requirement: REQ-0005
- Failure Mode: F-6203

**As a** developer
**I want** evidence entries to require command+result pairs
**So that** post-hoc auditing is possible and thin evidence (status-only) is rejected

- Goal: SKILL.md defines minimum evidence per TDD item using free-text+labels format: TDD-ID, TC-ref, RED command+result, GREEN command+result, refactor verify, reviewer results
- Non-goals: Strict JSON evidence schema (deferred to v1.6.3+); evidence schema versioning
- Notes: Evidence format is free-text+labels (not strict JSON) per OQ-0001 resolution. Both command and result are required; result completeness is best-effort.

---

## US-0016-0004: Parallel Dispatch Rules

- Parent: CAP-0016
- Source: discussion-20260320000941109 story #D0004
- Requirement: REQ-0006
- Failure Mode: F-6204

**As a** developer
**I want** parallel dispatch limited to independent slices with worktree separation and integration verify
**So that** parallel work is safe and does not risk merge conflicts or broken integration

- Goal: SKILL.md defines allow/deny conditions for parallel execution: independent slices only (no shared SUT, no shared test files, no shared state), worktree separation required, integration verify after merge
- Non-goals: Removing the parallel dispatch capability; default-allow parallelism
- Notes: ParallelSliceDispatcher is the sole authority for parallel dispatch authorization. Default is sequential execution.

---

## US-0016-0005: Docs/Wrappers/Assets Test Synchronization

- Parent: CAP-0016
- Source: discussion-20260320000941109 story #D0005
- Requirement: REQ-0007, REQ-0008, REQ-0009, REQ-0010, REQ-0011
- Failure Mode: F-6205

**As a** maintainer
**I want** required/forbidden phrase guardrails in docs, wrappers, and asset tests
**So that** artifacts stay synchronized with the canonical skill and stale or contradictory content is detected automatically

- Goal: README.md, workflow.md, and platform wrappers (.agents/.claude/.codex) are synchronized with SKILL.md; 8 required phrases and 7 forbidden phrases are enforced by asset tests; verify-pack passes
- Non-goals: Wrapper framework generalization; automatic wrapper generation tooling
- Notes: Wrapper descriptions use behavior-only language (watch-it-fail/pass, reviewer gates) without exposing sub-agent names, per OQ-0005 resolution. .github update is conditional on existence of qfai-implement references there, per OQ-0004 resolution.
