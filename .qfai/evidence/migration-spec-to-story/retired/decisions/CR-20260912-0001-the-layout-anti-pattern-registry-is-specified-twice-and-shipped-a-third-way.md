# Change Request

- ID: `CR-20260912-0001`
- Title: `The layout anti-pattern registry is specified twice and shipped a third way`
- Raised by: `claude-code`
- Raised at: `2026-09-12T00:00:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `claude-code` — under the user's standing instruction to process every issue of this session with its own judgment; NOT a user decision on these options
- Approved at: `2026-09-12T00:00:00Z`
- Approved option: `2`
- Applied at: `2026-09-12T00:00:00Z` — see Resolution
- Superseded by: `-`
- Blocked set: `-`

## Context

`layoutAntiPatternsDetected[]` is a closed vocabulary. `loadKnownLapIds` reads it from
`packages/qfai/assets/validators/layoutAntiPatterns.json`, and a token no entry declares is
`QFAI-PROT-002`.

Three documents name that vocabulary, and no two agree.

| Where                                         | What it lists                                                                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec-0012/03_Acceptance-Criteria.md`         | `lap-001-orphan-page`, `lap-002-deadend-flow`, `lap-003-hidden-state`, `lap-004-broken-back`, `lap-005-mystery-meat-nav`, `lap-006-no-empty-state`, `lap-007-no-error-state`, `lap-008-no-back-affordance` |
| `spec-0004/01_Spec.md` and its business rules | the band `lap-001..008`, with `lap-001-orphan-page` and `lap-008-no-back-affordance` as its ends                                                                                                           |
| The registry, which is what runs              | `lap-007-state-not-represented`, `lap-008-no-back-affordance`, `lap-009`, `lap-010`                                                                                                                        |

One identifier is the same in all three: `lap-008-no-back-affordance`.

Two further mismatches sit inside the same passages.

- `spec-0012/03_Acceptance-Criteria.md` names `QFAI-PROT-025` as the finding for an
  unregistered token. That code exists nowhere in `packages/qfai/src`. The implementation
  emits `QFAI-PROT-002`, and `spec-0004` already says so.
- `spec-0012` states the band as `lap-001..008` while separately requiring the capture pass to
  emit `lap-009` and `lap-010`. Read together, the spec requires a token its own whitelist
  rejects.

`spec-0004/03_Acceptance-Criteria.md` was already reconciled against the registry, and its
`09_delta.md` records that. The rest of `spec-0004` and all of `spec-0012` were not, so one
pack now disagrees with itself as well as with `spec-0012`.

## How it got here

The shipped registry used to hold `lap-001-saas-dashboard` through `lap-006-overcrowded-sidebar`
— layout _shapes_, not defects. A dashboard, a card grid, tabs over a table, a bento grid and a
centred hero are the layouts that work, and detecting them blocked convergence for any product
built to convention. Those six were retired. Each surviving entry now carries a `source`: the
external authority that makes it a defect, or the screen contract it is measured against.

What the two spec lists describe — an orphan page, a dead-end flow, a hidden state, a broken back
link, unlabelled navigation, a missing empty state, a missing error state — are defects, and were
the better description all along. The retirement moved the implementation toward them. It did not
close the gap: nothing detects any of the seven, and the identifiers still do not match.

## The question this turns on

Aligning identifiers without building detectors would give a registry that matches its
specification and finds nothing. Aligning the specs to the registry records what runs, and leaves
the seven defects undetected but named as an open question rather than as a shipped promise.

## Options and recommendation

1. **Build the seven detectors, then align the identifiers.** The specs become true and the
   vocabulary is one thing. Each detector needs an external authority under the `source` rule and
   a working regex or a stated semantic test; several ("is this page an orphan") need the
   navigation graph, which no capture carries. Largest work, and it commits the project to
   detections nobody has scoped.
2. **The registry is canonical; the specs follow it, and the undetected defects become an open
   question.** Every spec row states the four identifiers that exist, the finding code the tool
   emits, and the band as the registry's contents rather than a numeric range. The seven defect
   families are recorded in `spec-0012/08_Open-questions.md` as worth detecting and not detected.
   Smallest change that makes every document true, and it keeps the evidence of what is missing.
3. **Leave the specs and treat the registry as an implementation detail.** Rejected on sight: the
   specs are what a reviewer measures a change against, and three of the rows are unsatisfiable —
   a token from the spec whitelist is rejected by the gate the spec also names.

**Recommended: 2.** A specification that names detections nothing performs is worse than one that
names four and records the gap, because the first reads as coverage. Option 1 is the right
follow-up and needs its own scoping; making it a precondition for correcting the documents keeps
them wrong in the meantime.

## Impact scope

| File                                      | Rows                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| `spec-0004/01_Spec.md`                    | the capability line and REQ-0029                             |
| `spec-0004/04_Business-Rules.md`          | the whitelist rule                                           |
| `spec-0004/05_Examples.md`                | the rejection example's cited band                           |
| `spec-0012/01_Spec.md`                    | the catalog line                                             |
| `spec-0012/02_User-stories.md`            | US-0012-0102, twice                                          |
| `spec-0012/03_Acceptance-Criteria.md`     | the whitelist AC and its finding code                        |
| `spec-0012/04_Business-Rules.md`          | two whitelist rules                                          |
| `spec-0012/05_Examples.md`                | the catalog precondition and two examples citing retired ids |
| `spec-0012/06_Test-Cases.md`              | one case citing a retired id                                 |
| `spec-0012/08_Open-questions.md`          | one new entry: the undetected defect families                |
| `.qfai/contracts/cli/qfai-prototyping.md` | the reserved-but-unemitted codes                             |

`.qfai/contracts/cli/qfai-prototyping.md` was already registry-anchored in both schema blocks,
so only one passage moves: it reserved `lap-011` and `lap-012` "but not currently emitted",
which is two identifiers held against a detection nobody has written. A further code is added
by declaring an entry that detects something; reserving ahead of that is what produced the three
disagreeing lists in the first place.

No source change. One test is added — `layoutAntiPatternSpecAlignment.test.ts`, which reads the
registry and fails on any spec or CLI contract citing an identifier it does not declare. Writing
the list out is what let the three lists drift, so the guard is over the citation rather than
over any one list.

## Decision needed from user

Whether the seven navigation and state defect families are worth detecting, and at what cost.
Recorded as an open question by this change rather than answered by it.

## Approved actions (owner skill rerun plan)

`/qfai-sdd spec-0004 spec-0012` — Phase 2c obligation reconciliation over the rows listed under
Impact scope, plus the `08_Open-questions.md` entry, plus Phase 4 delta.

## Resolution

Applied under option 2.

Every row above now states the registry's contents rather than a numeric band, names
`QFAI-PROT-002` as the finding for an unregistered token, and cites an identifier that exists.
The registry file is named as the source of truth in each place the band used to be written out,
so the next entry added or retired does not need these rows edited again.

`spec-0012/08_Open-questions.md` carries the undetected families and what each would need.
