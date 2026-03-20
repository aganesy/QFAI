# 06 Functional Requirements — QFAI v1.6.2 Development Toolkit Hardening

## Requirements

| REQ-ID   | Title                        | Description                                                                                                                                                                                                                                                | Source        | Priority |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| REQ-0001 | Sub-agent Roster Definition  | SKILL.md MUST formally define 6 sub-agent roles (TDDCycleController, TDDImplementer, RedGreenAuditor, TDDSpecReviewer, TDDCodeQualityReviewer, ParallelSliceDispatcher) with responsibilities and prohibitions                                             | SRC-0001 §4   | Must     |
| REQ-0002 | Item Completion Contract     | SKILL.md MUST define a 10-point item completion checklist: TDD-ID selected, failing test written, RED observed, minimal code written, GREEN observed, refactor+green verified, spec review PASS, quality review PASS, test-list updated, checkpoint passed | SRC-0001 §5.1 | Must     |
| REQ-0003 | Spec Completion Contract     | SKILL.md MUST define spec-level completion conditions: all unit\|component TCs mapped, all items done/exception, DR-ID present for every exception, 0 blocking issues, checkpoint pass                                                                     | SRC-0001 §5.2 | Must     |
| REQ-0004 | Completion Prohibition Rules | SKILL.md MUST list conditions that block completion: no RED evidence, no GREEN evidence, reviewer not run, items remaining, parallel merge unverified                                                                                                      | SRC-0001 §5.3 | Must     |
| REQ-0005 | Evidence Minimum Contract    | SKILL.md MUST define per-item evidence fields: TDD-ID, TC-ref, RED command+result, GREEN command+result, refactor verify, reviewer results                                                                                                                 | SRC-0001 §6   | Must     |
| REQ-0006 | Parallel Dispatch Contract   | SKILL.md MUST define allow/deny conditions for parallel execution (independent slices only, worktree separation required) and post-merge integration verification requirements                                                                             | SRC-0001 §7   | Must     |
| REQ-0007 | Docs Synchronization         | README.md and workflow.md MUST reflect the new sub-agent roster, completion contracts, evidence contracts, and parallel dispatch rules without contradiction to SKILL.md                                                                                   | SRC-0002 §2   | Must     |
| REQ-0008 | Wrapper Synchronization      | Platform wrappers (.agents/.claude/.codex) MUST reflect the new contracts with semantically equivalent descriptions across all three formats                                                                                                               | SRC-0002 §2   | Must     |
| REQ-0009 | Required Phrase Guardrails   | Assets tests MUST verify the presence of 8 required phrases that confirm the new contracts are documented in skill and wrapper artifacts                                                                                                                   | SRC-0001 §8.3 | Must     |
| REQ-0010 | Forbidden Phrase Guardrails  | Assets tests MUST verify the absence of 7 forbidden phrases that indicate stale or contradictory content in skill and wrapper artifacts                                                                                                                    | SRC-0001 §8.3 | Must     |
| REQ-0011 | Verify-pack Pass             | verify-pack.mjs MUST pass with all new and updated files included in the packaging integrity check                                                                                                                                                         | SRC-0002 §3   | Must     |
| REQ-0012 | Optional Validator Warnings  | specPack validator MAY add non-blocking diagnostic warnings: selector not found, orphan test, invalid layer, ambiguous TC mapping, evidence ref missing                                                                                                    | SRC-0001 §9   | Could    |

## Design Decisions

| Decision                                                          | Rationale                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Sub-agent roles are defined in SKILL.md, not in separate files    | Single source of truth for orchestration; avoids cross-file synchronization burden (REQ-0001)                            |
| 10-point checklist is exhaustive, not configurable                | Prevents partial completion by ensuring every gate is mandatory; no opt-out mechanism (REQ-0002)                         |
| Prohibition rules are explicitly enumerated                       | Implicit prohibitions are easily overlooked; explicit enumeration makes violations detectable (REQ-0004)                 |
| Evidence requires command+result pairs, not just status markers   | Status-only evidence is unfalsifiable; command+result pairs enable post-hoc auditing (REQ-0005)                          |
| Parallel dispatch requires explicit independence proof            | Default-allow parallelism risks merge conflicts and integration failures; default-deny is safer (REQ-0006)               |
| Required/forbidden phrase lists are tested, not manually reviewed | Automated guardrails are enforceable in CI; manual checks degrade over time (REQ-0009, REQ-0010)                         |
| Validator warnings in REQ-0012 are non-blocking and optional      | These diagnostics add value but are not required for v1.6.2 contract hardening; blocking on them would delay the release |

## Failure Modes

| ID     | Trigger                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| F-6201 | TDD shortcut -- micro-cycle bypassed without watch-it-fail/watch-it-pass enforcement (addressed by REQ-0002, REQ-0004)          |
| F-6202 | Reviewer-less completion -- items or specs marked complete without independent reviewer gates (addressed by REQ-0002, REQ-0003) |
| F-6203 | Thin evidence -- evidence entries lack command+result pairs (addressed by REQ-0005)                                             |
| F-6204 | Unsafe parallel -- dependent slices dispatched in parallel or merge unverified (addressed by REQ-0006)                          |
| F-6205 | Stale docs/wrappers/tests -- artifacts contain stale or forbidden phrases (addressed by REQ-0007, REQ-0008, REQ-0009, REQ-0010) |
