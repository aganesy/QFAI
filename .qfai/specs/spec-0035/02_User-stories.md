# 02 User Stories

## US Catalog

- US-0035-0001: UI-Bearing Detection 統一 (D-07)
- US-0035-0002: Prototyping Skill Rewrite (D-08)
- US-0035-0003: Full-Harness Entrypoint (D-09)
- US-0035-0004: [v1.7.11] Standard-to-full-harness routing conditions are deterministic and consistent

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

---

## [v1.7.11 Completion Release] User Stories

## US-0035-0004: Standard-to-full-harness routing conditions are deterministic and consistent

- Parent: CAP-0035
- Source: REQ-0020, v1.7.11 WS-I
- Goal: As a QFAI user, I want the routing conditions from standard mode to full-harness mode to be deterministic and consistently documented, so that I can predict when and why the system routes to full-harness and there are no contradictory routing paths.
- Non-goals: Auto-routing from standard to full-harness without explicit user action; changing the mode precedence chain
- Notes: REQ-0020 requires routing condition consistency. The mode precedence chain (CLI > discussion > default) must be documented and implemented identically. The trigger conditions for full-harness routing (explicit `--mode full-harness` flag or skill invocation) must be the sole routing conditions — no implicit routing based on evidence scores or project state. The routing decision must be logged as part of mode resolution output.

### Example Seeds

| Perspective       | Example                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Happy path        | User passes `--mode full-harness`; routing to full-harness is deterministic and logged                                       |
| Negative path     | Documentation implies automatic routing on low evidence score; implementation requires explicit flag; contradiction detected |
| Edge/boundary     | Discussion artifact recommends full-harness; user provides no CLI flag; full-harness used via precedence chain               |
| Permission/role   | Any user can read the documented routing conditions and predict routing outcome without maintainer help                      |
| State transition  | User switches from standard to full-harness between runs; no stale routing state carried over                                |
| Idempotency/retry | Same routing inputs (same flags, same discussion artifact) always produce the same routing decision                          |
