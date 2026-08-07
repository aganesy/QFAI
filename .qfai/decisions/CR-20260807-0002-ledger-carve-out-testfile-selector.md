# Change Request

- ID: `CR-20260807-0002`
- Title: `Widen the /qfai-implement ledger carve-out from three cells to five, so a row seeded with a dash placeholder in Test file can legally leave todo`
- Raised by: `/qfai-implement orchestrator, disclosing its own carve-out excursions on two rows after completion-reviewer ruled twice that "compelled is not authorised"`
- Raised at: `2026-08-07T19:30:00Z`
- Class: `intent`
- Status: `open`
- Approved by: `-`
- Approved at: `-`
- Approved option: `-`
- Applied at: `-`
- Superseded by: `-`

## Context

`constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist` grants `/qfai-implement` write
access to exactly three cells of a row in `.qfai/specs/<spec-id>/tdd/test-list.md`: `Status`, `DR-ID`
and `Evidence`. Everything else in that file, including row membership, is upstream SSOT owned by
`/qfai-sdd` Phase 2b.

Two other shipped rules make that impossible to honour for a row seeded the way this repository's rows
are seeded:

- `packages/qfai/src/core/validators/tddList.ts:914` emits `TDDLIST_TEST_FILE_MISSING` at **error**
  severity for any row whose `Test file` cell is empty and whose `Status` is `green`, `refactor` or
  `done`. The seeded value in spec-0006's CHG-007 rows is a dash placeholder (`—`).
- `packages/qfai/src/core/validators/tddList.ts:1053-1063` emits `TDDLIST_SELECTOR_UNRESOLVED` when the
  `Selector` cell's text is not found in the named test file, and its own remediation text is "Update
  the Selector". The seeded selectors are descriptive prose, not runnable test names, and
  `references/checkpoint-verification.md` step 1 runs `<runner> <Test file> -t '<Selector>'` — so an
  unresolved selector produces a run that matches nothing.

So a row cannot legally hold the status the carve-out **does** authorise without also writing a cell
the carve-out does **not**. This is structurally the same deadlock
`drift-protocol.md#why-the-execution-ledger-is-named-here` already resolved by naming `Status` and
`Evidence`, one and two columns over.

### How it presents (folded in from Reproduction, which the template drops for Class: intent)

On this branch, rows `SPEC-0006:TDD-0029` and `SPEC-0006:TDD-0033`:

1. Both were seeded with `Test file = —` and a descriptive `Selector`.
2. Both completed a full micro-cycle and reached `refactor`, which the carve-out authorises.
3. To do so the orchestrator wrote `Test file` (a path) and rewrote `Selector` (to the `describe`
   title, character-for-character, so `TDDLIST_SELECTOR_UNRESOLVED` clears and the checkpoint's step-1
   command selects the test).
4. `completion-reviewer` ruled the same way in two consecutive rounds: `Status` and `Evidence` are
   inside the carve-out, `Test file` and `Selector` are not, both writes are **compelled**, and
   "compelled is not authorised".

The excursion is disclosed rather than defended. It also recurred: the first round routed a CR proposal
into `.qfai/evidence/implement-spec-0006.md` and never minted one — which is exactly the "puts it
nowhere" defect that made the sibling finding blocking in the first place. This file exists so that
does not happen a third time.

## Proposed change

Extend the whitelist in `constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist` from
three cells to five, **conditionally**: `/qfai-implement` may write a row's `Test file` when the seeded
value is a dash placeholder or empty, and may write a row's `Selector` when the seeded value does not
satisfy the validator's `selectorResolves` check against the named test file.

Explicitly **not** widened: `TC-Refs`, `Layer`, `US-Refs`, `CON-API-Refs`, and row membership. Those
carry the row's obligation identity, and changing them is the upstream act the carve-out exists to
forbid. The line drawn here is the same one `delivery-planner` drew when it retracted its own proposal
to create a `Layer = E2E` row for `US-0006-0011`: decomposing an existing `TC-*`'s obligation is in
remit, minting a new obligation ID is not.

## Options (at least 3) and recommendation

### Option A — widen the carve-out conditionally (recommended)

As in `## Proposed change`. Cost: two more cells become writable by the executing stage. Mitigation:
both conditions are machine-checkable, so a reviewer can verify the precondition rather than take the
stage's word — the placeholder is a literal, and `selectorResolves` is the validator's own predicate.

### Option B — make `/qfai-sdd` Phase 2b seed both cells

Phase 2b would have to know each row's test file path and its eventual `describe` title before any test
exists. The path is guessable; the title is not, since it is authored during the micro-cycle. Cost: the
seeding step would have to invent titles that implementers then match exactly, inverting the direction
of authority between the spec and the test.

### Option C — leave the rule as written and record every write as an excursion

What is happening today. Cost: every row of every future slice carries a disclosed carve-out
excursion, and the whitelist stops describing what the stage actually does — which erodes the value of
the whitelist for the writes that genuinely are forbidden.

**Recommendation: A.** It is the only option under which the whitelist describes reality, and its two
conditions are verifiable rather than asserted.

## Blocked downstream items

**None.** No row is blocked by this CR. The writes have already happened and are disclosed; this CR
regularises them. It is filed because a reviewer ruled that recording the proposal in an evidence file
is not filing it.

| Item | Kind | Why it depends on the artifact |
| ---- | ---- | ------------------------------ |
| —    | —    | —                              |

- Not blocked by this CR: every other row of this slice continues its micro-cycle normally; only the
  transition to `done` waits.
- Overlapping open CRs: `CR-20260807-0001`. The two are independent — neither
  option set changes the other's artifact, and no row is in both blocked sets in a way that makes the
  union stricter than either alone.

## Impact scope

- Constitution: `constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`. **Owner
  correction, same as the sibling CR**: the root copy under `.qfai/assistant/constitution/` is mirrored
  from `packages/qfai/assets/init/.qfai/assistant/constitution/` by `scripts/sync-init-to-root.mjs`, so
  under Option A this is a **QFAI package change** authored in the asset tree and mirrored down — not a
  `/qfai-sdd` rerun, and not an edit to the root copy alone, which would fail `pnpm ci:gate`'s
  `git diff --exit-code .qfai/`.
- Specs: none edited. Ledger rows: none reset — the two rows named in Reproduction keep their status and
  evidence either way.
- Tests: none reset. Contracts: none. Schema: none.

## Decision needed from user

Choose A, B or C. Nothing is blocked either way; the question is whether the whitelist should describe
what the stage does, or whether each write continues to be disclosed as an excursion.

## Approved actions (owner skill rerun plan)

Mode: **`confirm-only`**. No artifact downstream of the constitution is invalidated, and no row
re-derives anything.

Under Option A:

1. Edit
   `packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md`, adding the two
   conditional cells to the minimal whitelist with the exclusions named in `## Proposed change`.
2. Mirror to the root copy and confirm `pnpm ci:gate` is clean.
3. Add test coverage for the conditions under `packages/qfai/tests/`, per the repository rule that all
   source changes carry test coverage.
4. Fill this CR's `Status`, `Approved option`, `Approved by/at`, `Applied at` and `## Resolution`.

Under Option B or C, no artifact changes and this CR closes with the chosen option recorded.

## Resolution

Pending. To be filled by the owner with the option chosen and, if A, the revision that applied it.
