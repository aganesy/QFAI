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
  - Agent Delegation framework design (agent catalog, routing policy, review profiles, Orchestrator Protocol, Work Orders)
  - 19-agent catalog with ID, name, mission, category (worker / reviewer)
  - Standard agent contract structure (Mission, Inputs You Must Read, Deliverables, Stop Conditions, Sign-off Checklist, Output Format)
  - Orchestrator Protocol (delegation only, no direct generation, no self-approval)
  - Capability Probe and Simulation Mode protocol
  - Work Orders schema (Step, Role, Task title, Input refs, Output refs, Status)
  - Optional review modes (`devils-advocate`, `pattern-doubler`)
  - Routing registration (`agent-routing.yml`, `review-profiles.yml`)
  - Delegation role definitions (`agent-selection.md`)
  - Skill integration (all QFAI skills reference agent delegation in SKILL.md)
  - RCP footer updates for routed reviewers
  - Gate rules (`review-gate.rules.yml`)
  - Behavioral principles for devils-advocate (concrete alternative obligation) and pattern-doubler (rationale obligation)
  - Infinite loop prevention (3 consecutive FAILs trigger advisory demotion)
- Out:
  - Individual agent implementation details (each agent is defined in its own `.md` file)
  - CLI command implementations
  - Runtime execution engine
  - Historical archived roster behavior

## Applicable NFR

- NFR-0001: Review cycle time -- adding 2 new reviewers must not exceed 2x existing cycle time
- NFR-0002: Routing policy centralization -- `agent-routing.yml` and `review-profiles.yml` are the reviewer routing SSOT
- NFR-0003: Specialist preservation -- consolidated agents retain prior specialist responsibilities
- NFR-0004: New agent change footprint -- adding an agent updates catalog + routing without skill-wide rewrites
- NFR-0005: FAIL blocking mechanism -- routed blocking reviewers gate completion
- NFR-0006: RCP recording -- review results recorded in RCP artifacts (R??\_\*.md)
- NFR-0007: Targeted rerun -- failed reviewers and changed-scope dependents rerun without full roster restart

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

- Evidence: Agent files at `packages/qfai/assets/init/.qfai/assistant/agents/`, routing files under `packages/qfai/assets/init/.qfai/assistant/steering/`
- Consolidates: old spec-0008 (Agent Delegation), spec-0012 (Review Agent Extension), spec-0016 (Dev Toolkit Hardening -- agent roster parts)
- 19 agent definitions across worker and reviewer categories

## Relevant Requirements

- REQ-0001: Agent catalog -- 19 agents with ID, kind, mission, domain, and replacement map
- REQ-0002: Standard contract structure -- Mission, Inputs, Deliverables, Stop Conditions, Sign-off, Output Format
- REQ-0003: Orchestrator Protocol -- delegation only, no direct generation, no self-approval, Capability Probe
- REQ-0004: Work Orders schema -- Step, Role, Task title, Input refs, Output refs, Status
- REQ-0005: Review mode registration -- optional review modes define advisory-only devils-advocate / pattern-doubler behavior
- REQ-0006: Routing policy -- skill/phase/condition based reviewer and worker selection
- REQ-0007: Devils-advocate behavioral principles -- concrete alternative obligation on FAIL, advisory only by default
- REQ-0008: Pattern-doubler behavioral principles -- rationale for each proposed pattern, advisory only by default
- REQ-0009: All-skill integration -- every QFAI SKILL.md references central agent delegation
- REQ-0010: RCP footer update -- skill-specific RCP footers follow routed reviewers
- REQ-0011: Gate rules update -- `review-gate.rules.yml` references catalog + routing + review profiles
- REQ-0012: All-reviewer FAIL obligation -- every reviewer must provide concrete alternative on FAIL
- REQ-0013: Full-Harness Review Profile (v1.7.14) — `review-profiles.yml` に full-harness プロファイルを追加。always_required: [completion-reviewer, product-surface-reviewer, qa-gatekeeper]。
  product-experience-architect は `kind: worker` のため review-profiles.yml ではなく `agent-routing.yml` の prototyping evidence phase conditional_agents に配置
- REQ-0014: Prototyping Evidence Phase Routing (v1.7.14) — `agent-routing.yml` の prototyping evidence phase に product-experience-architect を conditional_agents として追加。full-harness 独立評価パネルの L2 レイヤーとして、別コンテキストで implementation fidelity を評価

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
