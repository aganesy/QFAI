# 08 Open Questions

## Open Questions

| OQ-ID   | Question                                                                                                                                                                                                                                   | Owner | Due        | Status   | Notes                                                                                                                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-0021 | Unconditional-overwrite refresh command for stale shipped workflows — conflict policy is undecided for two states: a file the adopter hand-edited, and a file the adopter installed and then deleted (`declined` per REQ-0020 / spec-0003) | user  | 2026-11-30 | deferred | Mirror of `discussion-20260804173914356/13_Deferred.md` D4 (severity high). Decision point: after REQ-0020's ownership contract has landed with tests **and** the conflict policy is decided for both states. Safe deferral: detection ships alone (US-0006-0011) and the advisory names no command, so this spec and D4 cannot diverge |

## Empty State

- 1 open question in spec-0006 scope (OQ-0021, deferred — mirrored from the upstream pack, not owned here).

## Resolved (v1.9.2 Second-Wave)

- OQ-0155 (stale review-pack TTL default) — RESOLVED by DR-0264: 14d default, `review.staleTtlDays` configurable (see DR-0006-0003). No open residual in spec-0006 scope.
