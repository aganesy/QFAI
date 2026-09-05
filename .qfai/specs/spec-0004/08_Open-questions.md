# 08 Open Questions

## Open Questions

| OQ-ID | Question                                                                                                                                                                                                                                                                                                                                                                                                           | Owner                        | Due        | Status | Notes                                                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0168  | The eight `lap-*` IDs `AC-0004-0012` used to list name navigation and interaction defects (orphan page, dead-end flow, hidden state, missing wayfinding, input trap, modal dead zone, untargetable affordance). `layoutAntiPatterns.json` detects layout archetypes instead, and is now canonical (`CR-20260904-0003`). Is the navigation-defect family separately worth detecting, as its own registry and scope? | product-experience-architect | 2026-10-31 | open   | Seven of the eight have no detector today and none was deliberately retired — the spec listed them and the gate never implemented them (#1105). Answering "yes" means a new registry plus its regexes, not a rename.       |
| 0169  | `AC-0004-0013` used to require `expected` and `location` on every `designMdViolations` entry; the shipped check reads only `{kind, found}` and is now canonical (`CR-20260904-0003`). Should a reviewer have to state what the design called for and where the violation is?                                                                                                                                       | qa-strategist                | 2026-10-31 | open   | The two fields carry information the gate currently drops, so a violation is reported without a location. Requiring them is a change to the reviewer's obligation and to `isViolationArray`, not a schema tidy-up (#1105). |

## Notes

- Both rows came out of `CR-20260904-0003`, which chose the implementation as
  canonical for three `review.json` schema divergences. That settles what the gate requires
  today; neither row is a consequence of the choice being wrong, and neither blocks it.

## Resolved (v1.9.2 second-wave, 2026-05-27)

- OQ-0158 (`primary_tasks` recommended count band) — RESOLVED by `_policies/08_Decisions.md` DR-0267 = `3..7`. Reflected in BR-0004-0031 / AC-0004-0037 (`QFAI-AUD-020` warning text names the band).
- OQ-0159 (structured `primary_tasks` JSON Schema) — RESOLVED by DR-0268 = closed `{id, label, acceptance}` (all required, `additionalProperties: false`). Reflected in BR-0004-0031; string-only continues to PASS during the deprecation window.
- OQ-0167 (pack-location lint scope dimension) — RESOLVED by DR-0274 = staged/changed-dir scope against the three allowed roots. Reflected in BR-0004-0032 / BR-0004-0033. The distinct register row OQ-0167 (`qfai sdd lint --fix` autofix for `surface_type`-absent specs) remains deferred.
