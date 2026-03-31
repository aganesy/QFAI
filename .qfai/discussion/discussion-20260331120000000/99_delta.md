# Delta / Change Log

Discussion pack: `discussion-20260331120000000`
Release: v1.7.11 (completion/correction/integration)

---

## Adopted Decisions

### OQ-0001 — Compatibility wrapper for old aggregator

- **Decision:** Use compatibility wrapper with deprecation path (option b).
- **Rationale:** Minimizes migration risk for existing consumers while providing a clear deprecation timeline. The wrapper translates old aggregator calls to the new implementation transparently.

### OQ-0002 — Deprecate 4-axis templates rather than delete

- **Decision:** Apply deprecation marking and remove from defaults (option b).
- **Rationale:** Preserves 4-axis templates as historical reference for users who need them while signaling the transition to the 3-layer model. Templates are no longer offered as defaults in new projects.

### OQ-0003 — Remove "requested" status from evidence

- **Decision:** Remove "requested" and use only captured/skipped/failed (option b).
- **Rationale:** The "requested" status created ambiguity between intention and execution. Three clear terminal states provide unambiguous evidence tracking.

### OQ-0004 — Implement all 4 browser QA phases

- **Decision:** Implement all 4 phases: smoke, visual, interaction, accessibility (option a).
- **Rationale:** Partial or foundation-only implementation would produce dishonest reporting. All phases need actual implementation to achieve meaningful quality signals.

### OQ-0005 — Skip v1.7.10

- **Decision:** Skip directly to v1.7.11 from v1.7.9 (option b).
- **Rationale:** v1.7.10 was never released. v1.7.11 serves as the completion release that converges all outstanding work from v1.7.9.

---

## Rejected Options

### OQ-0001 — Old aggregator removal vs compatibility wrapper

| Rejected Option               | Rationale                                                              | Recurrence Prevention                                                                           |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| (a) Complete removal          | Breaks existing consumers with no migration path                       | Deprecation-first policy: always provide a wrapper or adapter before removing public interfaces |
| (c) Side-by-side indefinitely | Creates permanent maintenance burden with two parallel implementations | Time-boxed deprecation windows enforced in release planning                                     |

### OQ-0002 — 4-axis template handling

| Rejected Option        | Rationale                                                      | Recurrence Prevention                                                                |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| (a) Immediate deletion | Loses reference material needed by users mid-migration         | Deprecation-first policy: mark before delete, with at least one release cycle notice |
| (c) Keep as-is         | Perpetuates an outdated model in defaults, confusing new users | Periodic template audit during release planning to flag stale defaults               |

### OQ-0003 — Render evidence "requested" status

| Rejected Option          | Rationale                                                              | Recurrence Prevention                                            |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| (a) Keep requested       | Ambiguous state conflates intent with execution                        | Status values must represent observable outcomes, not intentions |
| (c) Add "pending" status | Further complicates the state machine without resolving core ambiguity | New statuses require justification via OQ before introduction    |

### OQ-0004 — Browser QA phase runner scope

| Rejected Option                 | Rationale                                                         | Recurrence Prevention                                                           |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| (b) Implement smoke+visual only | Defers interaction and accessibility, leaving two phases as stubs | Phase registration must be gated on implementation readiness                    |
| (c) Keep foundation-only        | All phases report as available but produce no meaningful results  | Honest reporting principle: never expose a phase without backing implementation |

### OQ-0005 — v1.7.10 skip

| Rejected Option           | Rationale                                                                              | Recurrence Prevention                                  |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| (a) Release v1.7.10 first | Creates a retroactive release with no distinct content, confusing the version timeline | Unreleased version numbers are skipped, not backfilled |

---

## Drift Events

### DRIFT-001: Phasing alignment correction (2026-03-31)

- **Change Type:** Drift (review-driven correction)
- **Trigger:** Reviewers R01, R03, R09, R11 flagged inconsistency between `02_Inception-Deck.md` Q8 (Phase 1=A,B,C,D,E) and `05_Scope.md` (Phase 1=A,B,D,F).
- **Resolution:** Aligned `02_Inception-Deck.md` Q8 to match `05_Scope.md` and design spec §10:
  - Phase 1 (Truth-Path Blockers): A, B, D, F
  - Phase 2 (Runtime Completion): G, H, I
  - Phase 3 (Normalization): C, E, J
- **Impact:** 02_Inception-Deck.md updated. No impact on other files (05_Scope was already correct).
- **Rationale:** Design spec §10 defines F (validator truth-path) as Phase 1 blocker; C and E (schema completions) do not block runtime and belong in Phase 3.

---

## Rejected Visual Directions

N/A. This is a non-ui (CLI tool) project; no visual directions apply.
