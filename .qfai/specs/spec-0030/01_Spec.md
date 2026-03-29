# 01 Spec

- Spec: spec-0030
- Parent: CAP-0030

## Consumer View

- Primary SSOT for execution: `spec-0030/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: calibration example packs, scoring alignment asset specification, accept/refine/pivot policy definition, reviewer disagreement handling, plateau detection and loop exit policy
- Out: provider selection (deferred), cost ceilings (deferred OQ-0005)

## Applicable NFR

- NFR-0001: 15-iteration cap on refinement loops
- NFR-0004: calibration packs independently updatable without code changes

## Applicable Policy

- POL-005: calibration assets must be version-controlled

## Evidence Summary

- Evidence: `qfai validate` structural verification (traceability edges satisfied, calibration pack schema conformance)

## Relevant Requirements

- REQ-0006: Calibration example packs with scoring alignment examples
- REQ-0007: Scoring alignment asset specification (consistent across runs/team members)
- REQ-0008: Accept/refine/pivot policy definition with configurable thresholds
- REQ-0009: Reviewer disagreement handling mechanism
- REQ-0010: Plateau detection and loop exit policy (score delta, lookback, max iterations)

## Entry points

- US range in this spec: US-0030-0001..US-0030-0005
- Primary actors: harness orchestrator, calibration author, reviewer agent, loop controller
- Notes: This spec defines the contracts and calibration pack structure that govern the harness refinement loop. OQ-0004 (reviewer disagreement escalation) is deferred to SDD with interim majority-rule decision.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: scoring alignment thresholds have multiple valid interpretations
- Conflict: accept/refine/pivot thresholds conflict with NFR-0001 iteration cap
- Missing: calibration pack format lacks required fields for a new reviewer type
- Trade-off: strict plateau detection vs. allowing more refinement iterations

### Escalation Targets (Read-only, decision basis)

- \_policies/07_Constraints.md (TC-59, TC-60)
- \_policies/08_Decisions.md (DR-0073, DR-0074)
