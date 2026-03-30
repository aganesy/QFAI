# 02 User Stories

## US Catalog

- US-0035-0001: UI-Bearing Detection 統一 (D-07)
- US-0035-0002: Prototyping Skill Rewrite (D-08)
- US-0035-0003: Full-Harness Entrypoint (D-09)

## US-0035-0001: UI-Bearing Detection 統一

- Parent: CAP-0035
- Goal: As a validator maintainer, I want a single shared detection module so that all validators and skills use the same UI-bearing detection rules
- Non-goals: AST-based detection, visual regression testing, new heuristic research
- Notes: Detection uses explicit surface classification as primary and content heuristics as fallback only. Consolidates duplicate logic from `uixDetection.ts` and `discussionDesignHardening.ts` into a single shared module (REQ-0014, REQ-0015)

## US-0035-0002: Prototyping Skill Rewrite

- Parent: CAP-0035
- Goal: As a prototyping user, I want the skill body to match the static-first architecture so that the skill body and CLI contract are aligned
- Non-goals: Introducing new prototyping modes, changing CLI behavior
- Notes: Remove runtime-heavy language (REQ-0017). Explicitly describe 3 modes: low-cost / standard / full-harness (REQ-0016). Document non-UI n/a paths

## US-0035-0003: Full-Harness Entrypoint

- Parent: CAP-0035
- Goal: As a premium user, I want an actual user-facing entrypoint for the full-harness path so that I can start the workflow directly rather than receiving routing guidance only
- Non-goals: Making full-harness the default mode, removing standard mode routing guidance
- Notes: Both CLI and skill entrypoints required (DR-0085 stateless routing reception). Evidence, reviewer, and calibration obligations must be defined (REQ-0018, REQ-0019)
