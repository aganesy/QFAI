---
id: 2026-09-12-spec-0002-two-statements-the-product-replaced
status: active
kind: blocker
created: 2026-09-12
updated: 2026-09-12
scope: spec-0002
blocking: true
promote-to: null
links: ["spec-0002"]
---

# spec-0002 states two rules the product replaced

## Context

Four rows of `.qfai/specs/spec-0002/tdd/test-list.md` sat at `done` over
obligations the product contradicts. Three of them also named a test title that
no longer exists, and nothing reported it: the selector check falls back to the
last identifier-shaped token of a selector, and on a Japanese title those tokens
are technical nouns that appear in the named file for unrelated reasons.

Repairing the selectors alone would have made the rows resolve while still
discharging nothing, so the obligations were examined first. Two upstream
statements turned out to be the cause, and both are recorded in
`CR-20260912-0003`:

- `REQ-0012` / `AC-0002-0008` / `DR-0002-0001` / `DR-0002-0003` say discussion
  fixes no direction. The product asks the user for one during discussion,
  records it at `01_Context.md#Design Direction`, stops the next stage without
  it, and keeps planner-first only for the screen explorations.
- `REQ-0005` / `AC-0002-0010` say a UI-bearing pack requires
  `prototyping.yaml`. Three shipped documents state verbatim that it is
  optional, and the preflight does not block on its absence.

## What was tried

The obligations were traced to their acceptance criteria, the criteria to the
decision records behind them, and each to the code and tests that would have to
satisfy it. `planner-first` occurs nowhere under `packages/qfai/src/`, and no
validator emits the violation `TC-0002-0009` names — the `discussionDesignHardening`
validator that did was retired in v1.8.9 with the exploration-sidecar family.

`TC-0002-0011` has a test that discharges it against the product:
`packages/qfai/tests/assets/assets.test.ts`, `ensures qfai-discussion skill and
artifact rules
use canonical pack wording`, which reads the skill, the artifact rules and the
package README and requires the same sentence in all three. It cannot be pointed
at while the criterion says the opposite of what that sentence says.

## What the next session picks up

`CR-20260912-0003` is `open` and carries three options with a recommendation. It
needs the user's decision, per statement — they may be settled differently.

Once it resolves, the ledger sweep is enumerated in its approved-actions
section, and it differs per option — do not apply one option's sweep to
another's approval. Option 1 resets `TDD-0008`, `TDD-0009` and `TDD-0012` and
retires `TDD-0010`. Option 2 resets those three plus `TDD-0001`, whose test file
the preflight change edits, and retires `TDD-0010` as well. Option 3 retires all
four and resets none. `TDD-0011` is reset under every option, because the two
annotation repairs edit the file its observation covers. No test is deleted
under any of them.

## Constraints to preserve

The four rows are still `Status = done`, and the ledger is untouched. Two edges
were tried and neither exists. `done` is not a status a row may be blocked at —
`TDDLIST_BLOCKED_MISSING_REF` admits `todo`, `red`, `green`, `refactor` and
`review-fix` — so there is no `Blocked-By` cell and no departure metadata to
read; and the backward transition to `todo` is the approved-reset edge, which
needs `CR-20260912-0003` resolved first. The halt is carried by the open Change
Request and by this entry, not by the ledger. A session expecting to find the
rows parked will not find them parked.

## References to consult first

- `.qfai/decisions/CR-20260912-0003-spec-0002-states-two-rules-the-product-replaced.md`
- `.qfai/evidence/coverage-depth-spec-0002.md`, findings 1 through 5
- `.qfai/assistant/skills/qfai-implement/references/execution-ledger.md`, the status lifecycle
