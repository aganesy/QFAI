# Change Request

- ID: `CR-20260904-0003`
- Title: `spec-0004's review.json schema disagrees with the shipped validator in three places`
- Raised by: `code review on PR #1092 (issue #1105)`
- Raised at: `2026-09-04T08:35:00+09:00`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-04T09:30:00+09:00`
- Approved option: `1` (the implementation is canonical for all three)
- Applied at: `2026-09-04T09:40:19+09:00`
- Superseded by: `-`

## Context

`spec-0004` defines the `iter-NN/review.json` schema across
`03_Acceptance-Criteria.md`, `04_Business-Rules.md` and `05_Examples.md`.
`packages/qfai/src/core/validators/prototypingEvidence.ts` enforces a different
one. Three divergences, each measured on `main`:

| #   | the spec said                                                                                     | the validator checks                                                           |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | `prose` (`04:60`, `05:68`)                                                                        | `proseCritique` — 17 occurrences, and in `REVIEW_KNOWN_KEYS`                   |
| 2   | `designMdViolations` is `{category, expected, found, location}`, extra field rejects (`03:58-59`) | `{kind, found}`, extra fields ignored (`prototypingEvidence.ts:79-87`)         |
| 3   | eight `lap-*` IDs naming navigation defects (`AC-0004-0012`)                                      | eight naming layout archetypes, in `assets/validators/layoutAntiPatterns.json` |

For (1) a reviewer following the spec produced a file rejected **twice** — as an
unknown key and as a missing required one. For (3) seven of the eight IDs had no
counterpart, so every ID the spec listed except `lap-008-no-back-affordance` was
rejected by the shipped gate, and every ID the gate accepts except that one
violated the criterion.

## Why this needs a Change Request

`03`–`06` are upstream SSOT under `constitution/drift-protocol.md#core-rule`.
Each divergence needs a canonical side chosen, and choosing the implementation
means editing the spec.

(3) in particular could not be resolved by "make the code match the spec": the
two lists are not the same **kind** of thing. The AC named navigation and
interaction defects (orphan page, dead-end flow, input trap); the registry names
layout archetypes, six scoped `layout` and two `semantic`, each with the regex
that detects it. Making the code match would have deleted eight working
detectors to satisfy prose.

## Blocked downstream items

- `TDD-0011`, `TDD-0012`, `TDD-0013` sit at `done` against tests asserting the
  **implementation's** shape while their TCs cited the **spec's**.
  `CR-20260904-0001` corrected which file those rows point at; it could not make
  the shapes agree, and said so.
- Not blocked by this CR: the reviewer-artifact layout question
  (`OQ-0012-0013`, `CR-20260904-0002`) — that is about which FILE is canonical,
  not what is inside it.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0004` (`03_Acceptance-Criteria.md`, `04_Business-Rules.md`,
  `05_Examples.md`, `08_Open-questions.md`, `09_delta.md`)
- Plans: none
- Tests: none — the tests already assert the implementation's shape, which is
  what this CR makes canonical
- Contracts: none
- Schema: `packages/qfai/assets/validators/layoutAntiPatterns.json` is named as
  the SSOT for the whitelist; the file itself is unchanged

## Decision needed from user

Which side is canonical, per divergence. Presented as three questions with the
measured evidence above.

**Answered: the implementation, for all three.**

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0004` rerun scope: **`confirm-only`**. The tests, the validator
   and the registry are unchanged — this CR moves the spec onto them — so there
   is no derivation to re-run. The mode confirms the corrected criteria describe
   what the shipped gate does.
2. `AC-0004-0012`: the whitelist points at
   `assets/validators/layoutAntiPatterns.json` and lists its eight IDs, with
   their scopes. The eight withdrawn IDs are recorded in the criterion so the
   change is auditable.
3. `AC-0004-0013`: `designMdViolations` is `{kind, found}`; a missing `kind`,
   a missing `found`, or an out-of-enum `kind` rejects. Extra fields do not
   reject — stated, because the old criterion said the opposite. The enum was
   already correct.
4. `04_Business-Rules.md` and `05_Examples.md`: `prose` → `proseCritique`.
5. Two product questions the choice does **not** answer go to
   `08_Open-questions.md` rather than being settled here: whether the
   navigation-defect family is separately worth detecting, and whether a
   reviewer should have to supply `expected` and `location`.

## Resolution

The spec now describes the shipped gate in all three places, and each corrected
criterion records what it used to say.

Nothing DERIVED from `03`–`05` changed: `06_Test-Cases.md` cites the criteria by
ID rather than restating the shapes, and the tests already assert the
implementation's.

The two product questions are open, not resolved. Choosing the implementation as
canonical settles _what the gate requires today_; it does not decide whether the
gate should require more. Recording them as open is the difference between "the
spec matches the code" and "the spec is finished".

## Timestamps

Each value is anchored to something checkable rather than estimated:

| field         | value                       | anchor                                                                     |
| ------------- | --------------------------- | -------------------------------------------------------------------------- |
| `Raised at`   | `2026-09-04T08:35:00+09:00` | issue #1105, filed from PR #1092's review round                            |
| `Approved at` | `2026-09-04T09:30:00+09:00` | the operator's answer to the three canonical questions                     |
| `Applied at`  | `2026-09-04T09:40:19+09:00` | the `confirm-only` rerun's CR reference written to `spec-0004/09_delta.md` |

`Applied at` is when the owner-skill rerun completed and the upstream artifacts
carried the approved change — `skills/qfai-sdd/templates/change-request.md:20`.
A later commit that repairs a defect in the applied text is not a new
application and does not move it; what would move it is a further approved
change to an upstream artifact.
