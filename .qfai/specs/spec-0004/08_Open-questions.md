# 08 Open Questions

## Open Questions

| OQ-ID   | Question         | Owner | Due | Status | Notes                         |
| ------- | ---------------- | ----- | --- | ------ | ----------------------------- |
| 0 items | 0 open questions | -     | -   | -      | Add rows only when unresolved |

## Empty State

- 0 open questions in spec-0004 scope.

## Resolved (v1.9.2 second-wave, 2026-05-27)

- OQ-0158 (`primary_tasks` recommended count band) — RESOLVED by `_policies/08_Decisions.md` DR-0267 = `3..7`. Reflected in BR-0004-0031 / AC-0004-0037 (`QFAI-AUD-020` warning text names the band).
- OQ-0159 (structured `primary_tasks` JSON Schema) — RESOLVED by DR-0268 = closed `{id, label, acceptance}` (all required, `additionalProperties: false`). Reflected in BR-0004-0031; string-only continues to PASS during the deprecation window.
- OQ-0167 (pack-location lint scope dimension) — RESOLVED by DR-0274 = staged/changed-dir scope against the three allowed roots. Reflected in BR-0004-0032 / BR-0004-0033. The distinct register row OQ-0167 (`qfai sdd lint --fix` autofix for `surface_type`-absent specs) remains deferred.
