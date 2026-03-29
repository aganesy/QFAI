# 01 Spec

- Spec: spec-0033
- Parent: CAP-0033

## Consumer View

- Primary SSOT for execution: `spec-0033/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: handoff artifact generation, session resumption from handoff artifacts, display-only implementation detection and flagging, stub-only implementation detection and flagging
- Out: user authentication for handoff, AST-based detection, visual regression testing

## Applicable NFR

- NFR-0007: Handoff artifacts resumable in >99% of interruption scenarios

## Applicable Policy

- POL-003: Handoff artifacts strip credentials before persistence

## Evidence Summary

- REQ: REQ-0020 to REQ-0023

## Relevant Requirements

- REQ-0020: Handoff artifact generation for long-running sessions
- REQ-0021: Session resumption from handoff artifacts
- REQ-0022: Display-only implementation detection and flagging
- REQ-0023: Stub-only implementation detection and flagging

## Entry points

- US range in this spec: US-0033-0001..US-0033-0005
- Primary actors: QFAI session manager, evaluator, developer
- Notes: Detection feeds back into the evaluator refine loop; handoff enables cross-session continuity

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: detection heuristic threshold for stub vs partial implementation
- Conflict: NFR-0007 (resumability) vs handoff artifact size constraints
- Missing: credential stripping allowlist definition (POL-003)
- Trade-off: heuristic accuracy vs detection speed

### Escalation Targets (Read-only, decision basis)

- \_policies/07_Constraints.md (TC-62, TC-64)
- \_policies/08_Decisions.md (DR-0076)
