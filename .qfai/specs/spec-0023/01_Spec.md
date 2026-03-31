# 01 Spec

- Spec: spec-0023
- Parent: CAP-0023

## Consumer View

- Primary SSOT for execution: `spec-0023/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: UI-bearing detection, DDS enforcement, 7 new validators (QFAI-DDP-019..025), template updates, SKILL.md update, error severity
- Out: Heuristic/aesthetic checks, non-UI pack changes, qualityProfile gating, new CLI commands, Figma dependency

## Applicable NFR

- NFR-0001: Performance <=500ms delta
- NFR-0002: Backward compatibility (zero new issues on non-UI packs)
- NFR-0003: Actionable error messages (3-part: field, why, how to fix)
- NFR-0004: 100% branch coverage for new validators
- NFR-0005: Same-changeset documentation (SKILL.md + templates)

## Applicable Policy

- 1 PR per version (OC-1)
- Validators are pure async (TC-3)
- No new runtime deps (TC-5)
- TypeScript 5.6.3 compat (TC-4)
- Backward compat with v1.6.5 non-UI packs (TC-1)

## Evidence Summary

- Discussion: discussion-20260325120000000
- Review: review-20260325122000000 (all PASS)

## Relevant Requirements

- REQ-0001: UI-bearing detection (artifact presence)
- REQ-0002: DDS section mandatory for UI-bearing packs
- REQ-0003: Option comparison (>=2 options) mandatory
- REQ-0004: Selected anchor screen mandatory
- REQ-0005: Competitive reference registry (3 mandatory fields)
- REQ-0006: CTA hierarchy mandatory
- REQ-0007: State coverage (empty/loading/error/populated) mandatory
- REQ-0008: Design anti-goals (>=1) mandatory
- REQ-0009: All new structural validators emit error severity
- REQ-0010: Review-Request captures design-direction decisions
- REQ-0011: Delta log captures rejected visual directions
- REQ-0012: SKILL.md updated with UI-bearing requirements
- REQ-0013: Discussion templates updated in assets/init/
- REQ-0014: Non-UI packs remain unchanged
- REQ-0007-REM: UI-bearing detection unification — enforce explicit surface classification as primary SSOT; content signals as fallback heuristics only (remediation: discussion-20260329195516830)

## Entry points

- US range in this spec: US-0023-0001..US-0023-0010
- Primary actors: Pack author, Reviewer, Skill maintainer
- Notes: This spec hardens discussion-phase design direction by enforcing structural completeness of UI-bearing packs through 7 new DDP validators and supporting documentation updates

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: Detection heuristic for UI-bearing packs returns uncertain result
- Conflict: Backward compatibility (TC-1) conflicts with new validator requirements
- Missing: Validator rule not covered by existing DDP framework
- Trade-off: Strictness of error severity vs. adoption friction

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
