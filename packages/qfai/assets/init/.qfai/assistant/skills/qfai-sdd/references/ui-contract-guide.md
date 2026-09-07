# UI Contract Authoring Guide

This guide explains how to author a UI contract YAML under
`.qfai/contracts/ui/` so it satisfies the QFAI validate lanes
(`QFAI-AUD-001` empty-slot, `QFAI-AUD-020` recommended count band) and
the downstream `/qfai-prototyping` preflight gates.

## `screens[].primary_tasks` shape

Each entry in `screens[]` MUST carry a `primary_tasks:` slot. Each
slot entry may be authored in one of two shapes:

1. **String-only (legacy)** — a plain bullet such as
   `- Review pending orders`. Accepted during the deprecation window
   for backwards compatibility with contracts authored before the
   structured shape was introduced.

2. **Structured (closed schema)** — a mapping with exactly three
   required keys, no additional keys allowed:

   ```yaml
   - id: t1
     label: Mark order shipped
     acceptance: order status flips to shipped
   ```

   - `id` — short stable handle for the task.
   - `label` — human-readable task name.
   - `acceptance` — testable acceptance condition, written so a
     reviewer can tell whether the task is actually done.

A structured entry missing any of `id` / `label` / `acceptance`, or
carrying any extra key (e.g. `priority`, `owner`), is rejected at
validate time. The schema is intentionally closed (no
`additionalProperties: true`) for two reasons: a fixed key set lets
validate name a malformed task deterministically instead of accepting
a mistyped or invented key in silence; and an open shape invites
per-project field sprawl (`priority`, `owner`, …), which would leave
the same contract shape meaning different things in different
projects.

Validate is currently the only consumer of a structured entry: it
reads `label` for the empty-slot and count-band lanes, and requires
`id` and `acceptance` to be present and non-empty. Nothing generates
tests from them yet — requiring them now is what lets a generator be
added later without re-authoring every contract.

## Recommended count band: 3..7

The recommended count band for `screens[].primary_tasks` is **3..7
entries per screen** (inclusive bounds). Outside the band, validate
emits `QFAI-AUD-020` at severity=warning, naming the band 3..7
explicitly:

| count | validate behavior                          |
| ----- | ------------------------------------------ |
| 0     | `QFAI-AUD-001` error (empty primary_tasks) |
| 1..2  | `QFAI-AUD-020` warning (below 3..7 band)   |
| 3..7  | passes silently                            |
| 8+    | `QFAI-AUD-020` warning (above 3..7 band)   |

The 3..7 band reflects multi-screen SaaS / dashboard workloads where
5–6 primary tasks per surface is common; tighter ceilings (e.g. 1..3
or "single primary CTA") over-flag legitimate productivity surfaces.

## Template

The shipped UI contract template at
`templates/contracts/ui-contract.sample.yaml` includes inline comments
that re-state the 3..7 band and the structured-shape schema, so an
author who reads only the template still learns the contract.
