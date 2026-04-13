# 07 Decisions

### DR-0014-0001: Docs/Runtime Drift Integration Test Location and Scope (v1.7.15)

- Decision: The docs/runtime drift gate runs as an integration test within `packages/qfai/tests/integration/`, not as a separate CLI command or binary
- Context: NFR-0005 requires docs claims and runtime error conditions to correspond 1:1. This could be implemented as a standalone tool, a validator rule, or an integration test
- Rationale: An integration test can import both the SKILL.md parser and the validator rule registry, checking correspondence at the code level. This avoids introducing a new CLI surface and keeps the drift check co-located with the code it verifies. The test runs as part of `qfai-verify`'s existing integration harness
