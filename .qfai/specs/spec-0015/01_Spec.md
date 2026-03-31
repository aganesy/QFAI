# 01 Spec

- Spec: spec-0015
- Parent: CAP-0015

## Consumer View

- Primary SSOT for execution: `spec-0015/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default
- SSOT: Agent definitions live in `.qfai/assistant/agents/*.md`. This spec documents the framework design intent.

## Scope

- In:
  - Agent Delegation framework design (agent catalog, standard contract structure, Orchestrator Protocol, Work Orders)
  - 39-agent catalog with ID, name, mission, category (planning, implementation, review, operations)
  - Standard agent contract structure (Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format)
  - Orchestrator Protocol (delegation only, no direct generation, no self-approval)
  - Capability Probe and Simulation Mode protocol
  - Work Orders schema (Step, Role, Task title, Input refs, Output refs, Status)
  - Review agent extension (devils-advocate, pattern-doubler)
  - Roster registration (`review-roster.yml`)
  - Delegation role definitions (`agent-selection.md`)
  - Skill integration (all QFAI skills reference agent delegation in SKILL.md)
  - RCP footer updates for new reviewers
  - Gate rules (`review-gate.rules.yml`)
  - Behavioral principles for devils-advocate (concrete alternative obligation) and pattern-doubler (rationale obligation)
  - Infinite loop prevention (3 consecutive FAILs trigger advisory demotion)
- Out:
  - Individual agent implementation details (each agent is defined in its own `.md` file)
  - CLI command implementations
  - Runtime execution engine
  - Existing 10 reviewer role changes

## Applicable NFR

- NFR-0001: Review cycle time -- adding 2 new reviewers must not exceed 2x existing cycle time
- NFR-0002: Roster single-file management -- `review-roster.yml` is the sole roster SSOT
- NFR-0003: Existing reviewer stability -- existing 10 reviewers' behavior/order/logic unchanged
- NFR-0004: New reviewer change footprint -- new reviewer addition requires <= 5 file changes
- NFR-0005: FAIL blocking mechanism -- new reviewer FAIL uses same blocking mechanism as existing reviewers
- NFR-0006: RCP recording -- review results recorded in RCP artifacts (R??\_\*.md)
- NFR-0007: Infinite loop prevention -- loop detection and auto-cutoff mechanism exists

## Applicable Policy

- POL-01: Devils-advocate must always provide concrete alternative with FAIL
- POL-02: Pattern-doubler must provide rationale for each proposed pattern
- POL-03: Infinite loop prevention required (3 consecutive FAILs -> advisory demotion)
- POL-04: Existing 10 reviewers unaffected
- POL-05: Both agents' results fully recorded in RCP
- POL-06: FAIL criteria documented in SKILL.md
- POL-07: Loop detection auto-cutoff and OQ registration
- POL-08: All reviewers must provide concrete alternative/fix on FAIL

## Evidence Summary

- Evidence: Agent files at `packages/qfai/assets/init/.qfai/assistant/agents/`
- Consolidates: old spec-0008 (Agent Delegation), spec-0012 (Review Agent Extension), spec-0016 (Dev Toolkit Hardening -- agent roster parts)
- 39 agent definitions across planning, implementation, review, and operations categories

## Relevant Requirements

- REQ-0001: Agent catalog -- 39 agents with ID, name, mission, category
- REQ-0002: Standard contract structure -- Mission, Inputs, Deliverables, Stop Conditions, Sign-off, Output Format
- REQ-0003: Orchestrator Protocol -- delegation only, no direct generation, no self-approval, Capability Probe
- REQ-0004: Work Orders schema -- Step, Role, Task title, Input refs, Output refs, Status
- REQ-0005: Devils-advocate registration -- roster, role definition, review viewpoints, blocking power
- REQ-0006: Pattern-doubler registration -- roster, role definition, review viewpoints, blocking power
- REQ-0007: Devils-advocate behavioral principles -- concrete alternative obligation on FAIL, 3-FAIL advisory demotion
- REQ-0008: Pattern-doubler behavioral principles -- rationale for each proposed pattern, N/A when no ID-bearing items
- REQ-0009: All-skill integration -- every QFAI SKILL.md references agent delegation
- REQ-0010: RCP footer update -- new reviewers added to skill-specific RCP footers
- REQ-0011: Gate rules update -- `review-gate.rules.yml` includes new reviewer gate rules
- REQ-0012: All-reviewer FAIL obligation -- every reviewer must provide concrete alternative on FAIL

## Entry points

- US range in this spec: US-0015-0001..US-0015-0006
- Primary actors: QFAI maintainer, AI Agent (Orchestrator), QFAI user
- Notes: This spec is framework/design only. Agent definitions SSOT is `.qfai/assistant/agents/*.md`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: multiple valid implementations exist (e.g., can_be_na handling).
- Conflict: NFR / Policy / AC conflict (e.g., performance vs loop prevention).
- Missing: required constraints or policy are unclear.
- Trade-off: review thoroughness vs cycle time must be decided.

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
