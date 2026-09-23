# Change Request

- ID: `CR-20260923-0011`
- Title: `spec-0004 passes a blocked row the kept check fails`
- Raised by: `/qfai-atdd` (run key `2026-09-23T19:33:24.738Z`)
- Raised at: `2026-09-23T20:04:55Z`
- Class: `defect`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-23T20:04:55Z`
- Approved option: `-`
- Applied at: `2026-09-23T20:08:13Z`
- Superseded by: `-`

## Context

spec-0004 states that `TDDLIST_BLOCKED_MISSING_REF` is unchanged: the upstream
requirement `discussion-20260923060900824#REQ-0004`, which AC-0004-0041 cites,
says so in as many words. The kept check requires both halves of a `Blocked-By`
cell: what the row waits on, and `— blocked at <status>`.

The spec's own items restate that check as weaker than it is:

| Item         | What it says                                                           |
| ------------ | ---------------------------------------------------------------------- |
| AC-0004-0041 | A `blocked` row whose `Blocked-By` is **filled** raises no error       |
| BR-0004-0035 | A `blocked` row needs only a **non-empty** `Blocked-By`                |
| EX-0004-0044 | The passing row's `Blocked-By` is `spec-0004:TDD-0001`, with no status |
| TC-0004-0076 | The first and third trees use a **filled** `Blocked-By`                |

So the spec contradicts itself: it keeps the check unchanged, and gives a
passing example the unchanged check rejects. A test that follows EX-0004-0044
cannot pass.

## Reproduction

The passing value in the example
(`.qfai/specs/spec-0004/05_Examples.md:229`, EX-0004-0044):

```text
- Given a ledger with a `blocked` row whose `Blocked-By` is `spec-0004:TDD-0001`, and no `.qfai/steering/` directory
```

The rule the example illustrates
(`.qfai/specs/spec-0004/04_Business-Rules.md:182`, BR-0004-0035):

```text
- A `blocked` ledger row needs only a non-empty `Blocked-By`.
```

The kept check
(`packages/qfai/src/core/validators/tddList.ts:264` and `:283-298`,
`BLOCKED_BY_DEPARTURE_RE` and `parseBlockedBy`):

```ts
const BLOCKED_BY_DEPARTURE_RE = /^(.*)\s*[—–-]\s*blocked\s+at\s+([A-Za-z0-9-]+)\s*$/i;

const match = BLOCKED_BY_DEPARTURE_RE.exec(value);
if (match === null) return { ok: false, reason: "missing-departure-status" };
```

`spec-0004:TDD-0001` does not match the pattern, so `parseBlockedBy` returns
`missing-departure-status`, and the caller (`tddList.ts:6163-6195`) raises
`TDDLIST_BLOCKED_MISSING_REF` at `error`.

The column's definition
(`.qfai/assistant/skills/qfai-implement/references/obligation-columns.md:16`
and `:30-35`):

```text
| Blocked-By   | What a `blocked` row is waiting on, and the status it was blocked at. Required on `blocked` rows, blank otherwise |

`TDDLIST_BLOCKED_MISSING_REF` **errors on either
half**: a missing blocker, a cell that names no departure status, and a
departure status outside that set are all the same defect
```

## Proposed change

The single correct fix: state the kept check as it is.

1. BR-0004-0035: a `blocked` row needs only a well-formed `Blocked-By` — what
   the row waits on, then `— blocked at <status>`, where the status is one of
   `todo`, `red`, `green`, `refactor` or `review-fix`. The heading keeps its
   meaning.
2. AC-0004-0041: the passing row's `Blocked-By` is well-formed rather than
   filled.
3. EX-0004-0044: the passing value is `spec-0004:TDD-0001 — blocked at todo`,
   and the third clause's row carries the same value.
4. TC-0004-0076: the first and third trees use that well-formed value. The
   second tree, an empty `Blocked-By`, is unchanged.

No product code changes. `parseBlockedBy` is the behaviour the spec keeps.

## Blocked downstream items

| Item                 | Kind         | Why it depends on the artifact                                                               |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `spec-0004/TDD-0069` | `ledger-row` | `TC-Refs` names TC-0004-0076; its boundary `blocked-by-named` is the example this CR changes |
| `spec-0004/TDD-0070` | `ledger-row` | `TC-Refs` names TC-0004-0076, which this CR restates; its empty-cell fixture does not change |
| `spec-0004/TDD-0071` | `ledger-row` | `TC-Refs` names TC-0004-0076; its `steering-unreadable` fixture holds the passing row        |

- Not blocked by this CR: TDD-0067 and TDD-0068 (TC-0004-0074 and
  TC-0004-0075, which name no `blocked` row), and every other spec. The ledger
  rows are left as they are: `/qfai-atdd` raised this CR and owns no ledger cell,
  so nothing is parked.
- Overlapping open CRs: none. `CR-20260923-0003` concerns spec-0003 only.

## Impact scope

- Specs: `spec-0004`
- Plans: `none`. `10_Plan.md` says "a named `Blocked-By` passes", which a
  well-formed value satisfies.
- Tests: `spec-0004/TDD-0069`, `spec-0004/TDD-0070`, `spec-0004/TDD-0071`. No
  test for TC-0004-0076 exists yet.
- Contracts: `none`
- Schema: `none`
- Upstream paths edited under this CR:
  `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`,
  `.qfai/specs/spec-0004/04_Business-Rules.md`,
  `.qfai/specs/spec-0004/05_Examples.md`,
  `.qfai/specs/spec-0004/06_Test-Cases.md`,
  `.qfai/specs/spec-0004/07_Decisions.md`,
  `.qfai/specs/spec-0004/09_delta.md`

## Decision needed from user

Approve the single correct fix: spec-0004 states that a `blocked` row needs a
well-formed `Blocked-By`, naming what it waits on and the status it was blocked
at, and EX-0004-0044 uses `spec-0004:TDD-0001 — blocked at todo`?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd spec-0004`, mode `re-derive`, limited to BR-0004-0035,
   AC-0004-0041, EX-0004-0044 and TC-0004-0076. It makes the edits under
   `## Proposed change`, records a Decision Record in `07_Decisions.md` whose
   `Related` names this CR, a Decision Log entry in `09_delta.md`, and this CR
   in the `## Change Requests` table of `09_delta.md`.
2. Downstream ledger sweep: no row is reset or retired. TDD-0069, TDD-0070 and
   TDD-0071 are at `todo`, so a reset would move nothing, and each keeps its
   boundary: only the fixture value of TDD-0069 and TDD-0071 changes.
3. `/qfai-atdd spec-0004` resumes TC-0004-0076 against the restated items once
   `Applied at` is set.

## Resolution

Applied by `/qfai-sdd spec-0004` in mode `re-derive`, as the single
correct fix under `## Proposed change`.

- Upstream artifacts updated:
  - `.qfai/specs/spec-0004/03_Acceptance-Criteria.md`: AC-0004-0041
  - `.qfai/specs/spec-0004/04_Business-Rules.md`: BR-0004-0035
  - `.qfai/specs/spec-0004/05_Examples.md`: EX-0004-0044
  - `.qfai/specs/spec-0004/06_Test-Cases.md`: TC-0004-0076
  - `.qfai/specs/spec-0004/07_Decisions.md`: DR-0004-0043, whose `Related`
    names this record
  - `.qfai/specs/spec-0004/09_delta.md`: DELTA-0002, DL-0029, and this record
    in `## Change Requests`
- Ledger rows reset: none. `spec-0004/TDD-0069`, `spec-0004/TDD-0070` and
  `spec-0004/TDD-0071` stay at `todo` with their boundaries.
- Ledger rows retired: none.
- Evidence: `.qfai/evidence/sdd-spec-0004.md`, the current run.
