# 01 Spec

- Spec: spec-0031
- Parent: CAP-0031

## Consumer View

- Primary SSOT for execution: `spec-0031/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: premium mode skill (`/qfai-prototyping-full-harness`), planner/generator/evaluator decomposition, iteration loop (5-15 range with configurable max cap), evidence and review output generation, weighted scoring with dimension floors
- In [v1.7.7 Remediation]: dedicated CLI entrypoint and skill definition for /qfai-prototyping-full-harness, explicit evidence and reviewer policy surface, mode documentation aligning with low-cost/standard/full-harness split defined in spec-0006
- Out: standard path changes, validate command changes, GUI, critique provider internals (spec-0029), calibration pack internals (spec-0030)
- Out [v1.7.7 Remediation]: standard and low-cost mode implementation (spec-0006 scope); merging full-harness back into standard prototyping skill

## Applicable NFR

- NFR-0001: 15-iteration cap — premium loop must terminate within configured max (default 15)
- NFR-0005: Standard path <1% regression — premium mode introduction must not degrade standard path performance

## Applicable Policy

- POL-001: Premium mode is non-default; explicit opt-in via separate skill invocation only
- POL-002: Every premium run must emit evidence and review artifacts regardless of outcome
- POL-003: Weighted scoring dimension floors are enforced; no dimension may be ignored

## Evidence Summary

- Discussion: discussion-20260329-CAP-0031
- REQ: REQ-0011 to REQ-0015
- Depends on: spec-0029 (critique adapter), spec-0030 (calibration pack)

## Relevant Requirements

- REQ-0011: Premium mode explicit non-default, separate skill
- REQ-0012: Planner/generator/evaluator decomposition
- REQ-0013: 5-15 iteration range with configurable max cap
- REQ-0014: Evidence and review outputs mandatory for every premium run
- REQ-0015: Weighted scoring with dimension floors
- REQ-0002 [v1.7.7 Remediation]: Full-harness dedicated entrypoint — create dedicated skill and CLI entrypoint for /qfai-prototyping-full-harness with explicit evidence/reviewer policy
- REQ-0003 [v1.7.7 Remediation]: Prototyping mode definitions — define low-cost, standard, full-harness modes explicitly; full-harness is this spec's responsibility
- REQ-0010 [v1.7.7 Remediation]: CLI mode exposure — full-harness entrypoint must surface explicit evidence and reviewer expectations aligned with the three-mode structure defined in spec-0006

## Entry points

- US range in this spec: US-0031-0001..US-0031-0010
- Primary actors: QFAI user (premium prototyping executor), planner agent, generator agent, evaluator agent
- Notes: This is the core premium prototyping spec. Critique adapter (spec-0029) and calibration pack (spec-0030) are consumed by the evaluator phase.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: planner/generator/evaluator boundary responsibilities overlap
- Conflict: iteration cap (NFR-0001) vs convergence quality requirements
- Missing: inter-phase data contract details not covered by spec-0029/spec-0030
- Trade-off: iteration budget allocation between refine and pivot decisions

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md (TC-57, TC-60)
- \_policies/08_Decisions.md (DR-0073, DR-0077, DR-0078)
