# Acceptance Criteria

## Criteria

```gherkin
Feature: Validate Gate Integration

# AC-0001-0155-01
# Parent: US-0001-0155
Scenario: Validate Gate error=0
  Given SDD completion
  When `qfai validate --fail-on error` runs
  Then error count is 0.

# AC-0001-0155-02
# Parent: US-0001-0155
Scenario: Validate Pipeline Validator Registration Integrity
  Given a traceability validator declared in `packages/qfai/src/core/validators/`
  When the validate pipeline (`packages/qfai/src/core/validate.ts`) is loaded
  Then the validator's registration MUST hold end-to-end as a single registration-integrity outcome. Partial wiring (one half present, the other missing) is treated as a single failure mode at AC granularity, not as 2 independent facets — internal decomposition of the registration contract (export presence under canonical name, import + invocation in `validate.ts`) is intentionally kept at the lower (rule) layer rather than at AC layer, so the AC stays outside the compound-AC facet-level gap class.

# AC-0001-0155-03
# Parent: US-0001-0155
Scenario: Scoped Completion Gate Per Business Flow
  Given the story tree,
  When `/qfai-sdd` gates the business flows it wrote or changed before completion,
  Then it runs `qfai validate --profile sdd --fail-on error --flow BF-NNNN` for each of those flows, so that a parallel worker gates only on its own flow, and it does not pass `--spec <spec-id>`.
```
