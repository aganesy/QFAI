# 01 Spec

- Spec: spec-0029
- Parent: CAP-0029

## Consumer View

- Primary SSOT for execution: `spec-0029/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: critique provider interface, generic command provider, example providers, structured response schema, fail-open semantics
- Out: provider benchmarking (deferred OQ-0003), UI/dashboard, modifying validate command

## Applicable NFR

- NFR-0002: Critique adapter must fail open; provider failure never blocks path
- NFR-0006: External command surface reviewed for injection risks; arguments sanitized

## Applicable Policy

- POL-001: Sandbox external commands, sanitize injection risks
- POL-002: Validate critique responses against schema

## Evidence Summary

- Discussion: discussion-20260329175059391
- REQ: REQ-0001 to REQ-0005

## Relevant Requirements

- REQ-0001: Critique provider interface with schema and operations
- REQ-0002: Generic command provider via external process execution
- REQ-0003: Example provider implementations (minimum 2)
- REQ-0004: Structured critique response schema
- REQ-0005: Fail-open semantics

## Entry points

- US range in this spec: US-0029-0001..US-0029-0004
- Primary actors: QFAI full-harness evaluator, external critique providers
- Notes: Adapter is consumed by spec-0031 (full-harness) evaluator

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid interface designs for provider protocol
- Conflict: NFR-0002 (fail-open) vs desired critique quality
- Missing: provider selection/fallback algorithm (deferred OQ-0003)
- Trade-off: interface simplicity vs provider capability

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md (TC-58, TC-61, TC-63)
- \_policies/08_Decisions.md (DR-0075, DR-0079)
