# 10 Plan

## Implementation approach

1. TDD micro-cycle engine: Red -> Green -> Refactor -> Done lifecycle
2. test-list.md parser: 8-column table with status tracking
3. Status transition validator: forward-only enforcement, exception with DR-ID
4. Sub-agent roster: 6 agents with handoff contracts
5. Completion gate: 10-point checklist enforcement
6. Evidence contract: per-item fresh evidence validation
7. Parallelization policy: independence check, worktree separation, integration verify

## Test approach

- Unit tests: status lifecycle transitions, evidence validation, backward transition rejection
- Integration tests: full TDD cycle from todo to done, exception handling, parallel dispatch rules
- E2E tests: end-to-end implement workflow with test-list.md processing

## Dependencies

- Requires: spec artifacts from `/qfai-sdd` (test-list.md populated by SDD)
- Consumed by: `/qfai-verify` for validation gate

## Risk mitigation

- Complex agent orchestration may be difficult to test in isolation
- Mitigation: stop immediately on failed first delegation and return concrete remediation steps for unsupported or misconfigured subagent environments
