# Change Request

- ID: `CR-20260807-0002`
- Title: `Widen the /qfai-implement ledger carve-out from three cells to five, so a row seeded with a dash placeholder in Test file can legally leave todo`
- Raised by: `/qfai-implement orchestrator, disclosing its own carve-out excursions on two rows after completion-reviewer ruled twice that "compelled is not authorised"`
- Raised at: `2026-08-07T19:30:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `user (aganesy)` — via the /qfai-implement G6 stage gate: AskUserQuestion
- Approved at: `2026-08-17T00:00:00Z`
- Approved option: `A`
- Applied at: `2026-08-17T00:00:00Z` (`8bf2dfd0` + `31d944a6`; the first was incomplete, see Resolution)
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

**Option A, applied across two commits: `8bf2dfd0` then `31d944a6`.** The first was incomplete and a
reviewer caught it; both are named here because `Applied at` pointing at only the first is the record
defect this CR's own subject matter is about.

`8bf2dfd0` — the whitelist in
`packages/qfai/assets/init/.qfai/assistant/constitution/drift-protocol.md`, the SSOT, mirrored to the
root copy by `sync:ssot` and verified byte-identical, now names `Test file` and `Selector` as
writable **only while** their stated condition holds, alongside the three unconditional cells. A new
subsection titled "Why Test file and Selector are conditional" carries the rationale. The file is
inside the distributed surface, so it names no internal spec or decision id, and
`check-no-internal-version-leakage.sh` is green.

`31d944a6` — **what `8bf2dfd0` left undone.** The rule is restated in two other shipped documents, and
`8bf2dfd0` changed neither, so the approved intent was not delivered at the point of use: an agent
reading `skills/qfai-implement/SKILL.md`'s Non-goals — the operative list an executing stage consults
before deciding it may not write a cell — still saw the three-cell rule stated as exhaustive, citing the
anchor that by then named five. `skills/qfai-sdd/references/spec-traceability-rules.md`, the
Ownership-split SSOT for the ledger schema, still said "and nothing else". Both corrected and mirrored,
plus a paragraph in the rationale naming `selectorResolves`'s deliberate leniency and its consequence.
The `## Approved actions` step list above names none of that, and following an incomplete plan
faithfully still leaves an inconsistent artifact — which is why the scope of the fix was set by grepping
every tree for restatements rather than by the reviewer's finding list.

Coverage per step 3: `packages/qfai/tests/assets/ledgerWriteAuthorization.test.ts`, 15 → **27** tests,
which already owned the three-cell whitelist and was extended rather than duplicated. It pins an
exclusion case that slices the writable enumeration only and asserts `TC-Refs` / `Layer` / `US-Refs` /
`CON-API-Refs` are absent from it while still named as staying upstream. A tree-independent block ties
the prose to the shipped validator: `selectorResolves` still exists, both cited rule ids are still
emitted, and the rationale's four statuses are parsed from `TEST_FILE_CHECK_STATUSES` rather than
string-matched, so
reformatting does not break it. Non-vacuity was shown by two mutations, each failing exactly the two
asset-tree cases while the unmutated root copy passed, then restored to the pre-mutation blob.

**The coverage delivered at `8bf2dfd0` did not in fact pin both conditions, and the correction belongs
here rather than only in the evidence.** An earlier draft of this Resolution claimed it pinned "both
conditions including their polarity". A round-2 `implementation-reviewer` measured otherwise: swapping
the two condition bodies — giving `Test file` the `selectorResolves` condition and `Selector` the
placeholder condition — left the suite green at 26/26. The cause was structural rather than an
oversight: five independent `toContain`s over one flattened region are satisfied by any arrangement of
fragments drawn from it. `31d944a6` fixed it by contiguity — each condition is now asserted as one
string carrying **both** the cell it qualifies and its condition — and four mutants now die, each in
exactly one case, every restore verified by `cmp` against a backup and `git hash-object`. So the claim
is true at `31d944a6` and was false at `8bf2dfd0`, and saying so is the point: a Resolution that
described the intended state rather than the delivered one is the same defect class as the shipped
sentences this CR's own application left stale.

Byte-identity of the two trees is deliberately **not** re-asserted here: `sync-init-to-root.mjs --check`
already compares mirrored paths with `Buffer.equals` in both directions, and
`packages/qfai/tests/scripts/syncInitStaleDetection.test.ts` covers it. A second spelling would be the
weaker one.

**Two process defects surfaced while applying this and are recorded rather than absorbed.** First, the
prose edit broke four assertions in the suite above and the applying stage did not notice: it had run
`prettier`, `lint:md` and the leakage guard, but not the tests. A shipped-prose edit needs the suite,
not just the formatters. Second, `git checkout --` restores from HEAD/index, not the working tree, so a
mutation-proof revert during the same session reverted the still-uncommitted edit; it was recovered
bit-exact from the root mirror, which had not been touched. Commit before running a mutation proof.

Immediate effect on the rows that raised this: `TDD-0040`'s `Test file` placeholder and `TDD-0031`'s
unresolvable `Selector` were both filled under the new conditions, taking the repository gate from
`error=3 warning=353` back to the slice's recorded Stage 0 baseline of `error=2 warning=352` —
`TDDLIST_TEST_FILE_MISSING` and spec-0006's `TDDLIST_SELECTOR_UNRESOLVED` both cleared.
