# 01 Spec

- Spec: spec-0032
- Parent: CAP-0032

## Consumer View

- Primary SSOT for execution: `spec-0032/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: cost/time metrics emission (per-iteration and aggregate), mode guidance based on project characteristics, reviewer drift tracking across runs, capability profile for project assessment
- Out: billing/payment integration, external metric aggregation services, cost ceilings (deferred OQ-0005)

## Applicable NFR

- NFR-0003: Cost/time metrics emitted for 100% of premium runs

## Applicable Policy

- POL-003: Metrics must not contain PII or secrets
- POL-004: Drift thresholds configurable per project

## Evidence Summary

- REQ: REQ-0016 to REQ-0019

## Relevant Requirements

- REQ-0016: Cost/time metrics emitted per iteration and as aggregate
- REQ-0017: Mode guidance based on project characteristics (standard vs premium)
- REQ-0018: Reviewer drift tracking across runs
- REQ-0019: Capability profile for project assessment

## Entry points

- US range in this spec: US-0032-0001..US-0032-0004
- Primary actors: QFAI evaluator, project maintainer, CI pipeline
- Notes: Observability layer consumed by report and dashboard downstream

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: metrics format or granularity not specified
- Conflict: NFR-0003 (100% emission) vs performance overhead
- Missing: drift threshold calibration algorithm (deferred)
- Trade-off: metric verbosity vs storage/bandwidth cost

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md (OC-37)
- \_policies/08_Decisions.md
