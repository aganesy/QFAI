# 01 Spec

- Spec: spec-0035
- Parent: CAP-0035

## Consumer View

- Primary SSOT for execution: `spec-0035/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

## Scope

- In: UI-bearing detection module unification, prototyping skill body rewrite (static-first), full-harness entrypoint (CLI + skill), banned phrase removal, 3-mode documentation, non-UI n/a path documentation
- Out: full-harness as default mode, new design methodology introduction, runtime-heavy default prototyping text, web-only mandatory behavior for CLI projects

## Applicable NFR

- NFR-0002: Non-UI project safety (UI-bearing validators must not fire on non-UI projects)
- NFR-0003: Validator determinism (same input produces same output, no semantic judgment)
- NFR-0004: Validator/reviewer separation (deterministic validate vs semantic review)
- NFR-0005: SSOT convergence (skill docs / templates / validators / policy / core modules reference same canonical model)
- NFR-0007: CLI/skill body alignment (CLI behavior and skill body descriptions must not contradict)

## Applicable Policy

- (none specific; cross-cutting NFRs govern)

## Evidence Summary

- REQ: REQ-0014 to REQ-0019
- Source: discussion-20260330035428071

## Relevant Requirements

- REQ-0014: UI-bearing detection unified module (shared detection, explicit surface classification primary + content heuristics fallback)
- REQ-0015: Duplicate detection logic removal (consolidate uixDetection.ts and discussionDesignHardening.ts)
- REQ-0016: Prototyping skill body rewrite (static-first architecture, 3 modes explicit)
- REQ-0017: Runtime-heavy language removal from prototyping skill body/docs
- REQ-0018: Full-harness entrypoint addition (dedicated skill file + CLI command integration)
- REQ-0019: Full-harness workflow definition (evidence/reviewer/calibration obligations, loop semantics)

## Entry points

- US range in this spec: US-0035-0001..US-0035-0003
- Primary actors: validator maintainer, prototyping user, premium user
- Notes: Detection unification is a prerequisite for skill rewrite; full-harness entrypoint depends on skill body alignment

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: surface type classification for mixed surface projects
- Conflict: NFR-0002 (non-UI safety) vs NFR-0005 (SSOT convergence) when detection module behavior diverges
- Missing: full-harness evidence obligation specifics beyond what DR-0085 defines
- Trade-off: detection heuristic accuracy vs classification simplicity

### Escalation Targets (Read-only, decision basis)

- \_policies/08_Decisions.md (DR-0085)
- spec-0031/07_Decisions.md (DR-0083, DR-0084, DR-0085)
