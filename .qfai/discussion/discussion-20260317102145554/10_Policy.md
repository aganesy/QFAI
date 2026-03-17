# 10 Policy

## Security Policy

No new security surface is introduced by v1.6.0. The `qfai-implement` skill body executes within the existing sandboxed agent environment. No changes to authentication, authorization, or data handling are required.

## Compliance Policy

No regulatory or compliance requirements are affected by v1.6.0 changes. The implementation phase redesign is internal to the QFAI tool and does not alter data flows, storage, or external integrations subject to compliance obligations.

## Quality Policy

| ID | Policy | Enforcement |
|---|---|---|
| QP-01 | Assets tests must prevent old skill reference regression | Test suite must include assertions that `qfai-tdd-red`, `qfai-tdd-green`, and `qfai-tdd-refactor` do not appear in any skill registry, wrapper, or documentation file |
| QP-02 | `verify-pack` must pass | The existing `verify-pack` command must complete with zero failures before the PR is eligible for merge |
| QP-03 | Phase 1 validator must have unit test coverage | Validator behavior for existence check, table structure, required columns, status enum, and TC reference validation must each have dedicated test cases |

## Migration Policy

| ID | Policy | Rationale |
|---|---|---|
| MP-01 | Old skills must be fully removed, not deprecated | Deprecation creates a half-migration state that increases maintenance burden and user confusion; clean removal is preferred |
| MP-02 | No backward-compatibility shims | Shims (e.g., aliases from old skill names to `qfai-implement`) are prohibited to prevent silent reliance on abolished interfaces |
| MP-03 | All orphan references must be purged in the same PR | References to old skills in docs, tests, workflow definitions, and wrappers must be removed atomically with the skill abolition |
