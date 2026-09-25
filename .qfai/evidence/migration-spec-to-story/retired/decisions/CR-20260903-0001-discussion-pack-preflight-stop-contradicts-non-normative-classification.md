# Change Request

- ID: `CR-20260903-0001`
- Title: `AC-0013-0003's preflight stop contradicts reclassifying a discussion pack as non-normative`
- Raised by: `claude-code (issue #1070 implementation)`
- Raised at: `2026-09-03T11:15:00Z`
- Class: `intent`
- Status: `approved`
- Approved by: `yusuke_senaga`
- Approved at: `2026-09-03T11:20:00Z`
- Approved option: `1`
- Applied at: `2026-09-03T11:25:00Z`
- Superseded by: `-`

## Context

Issue #1070 asks that `/qfai-sdd` treat a discussion pack as optional,
non-normative reference material, so that "an incomplete/contradictory
discussion pack or blocking discussion OQ does not hard-stop SDD by itself".

Three upstream artifacts in `spec-0013` state the opposite:

- `.qfai/specs/spec-0013/03_Acceptance-Criteria.md:11` — **AC-0013-0003**:
  "Given a missing or incomplete discussion pack, when SDD starts, then it stops
  and guides to `/qfai-discussion`."
- `.qfai/specs/spec-0013/04_Business-Rules.md:16` — **BR-0013-0003**: "SDD MUST
  stop when discussion-pack is missing/incomplete or has blocking OQ."
- `.qfai/specs/spec-0013/05_Examples.md:17` — **EX-0013-0003**: "Given
  discussion pack missing `06_REQ.md` … Then SDD stops and guides to
  `/qfai-discussion`."
- `.qfai/specs/spec-0013/06_Test-Cases.md:15` — **TC-0013-0003**: "Verify SDD
  stops when discussion pack is missing or incomplete."

`TDD-0003` (`tdd/test-list.md:7`) covers TC-0013-0003 at status `exception`
(`DR-0013-0001`) against
`packages/qfai/tests/integration/sddSkillSpec0013.test.ts`, and that test failed
when the skill's Stage 0 stop was removed — correctly, since the obligation it
traces to still stood.

The requested behaviour and the released AC cannot both hold. This is intent
drift: the upstream artifact states something the requested downstream change
disagrees with, and there is a real decision to make.

## Proposed change

Retire the unconditional stop from AC-0013-0003 / BR-0013-0003 / EX-0013-0003 /
TC-0013-0003 and restate each in terms of the condition that does warrant a
stop: **no usable source at all** — no discussion pack, no import-lite input,
and no explicit user requirement. An incomplete, contradictory or
blocking-OQ-carrying pack continues, with the discrepancy recorded in the
SDD-owned artifact's delta/evidence rather than repaired in the pack.

## Options (at least 3) and recommendation

| #   | Option                                                                                                                  | Cost                                                               | Risk                                                                                                                         | Recommended |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | Retire the stop: restate AC / BR / EX / TC around "no usable source at all", update the test, keep the import-lite path | Four upstream edits plus one test; one ledger row referenced       | The preflight no longer catches a thin pack early; a run can reach Phase 0 on weak inputs and surface the gap later          | ✅          |
| 2   | Keep AC-0013-0003 and ship only the non-contradicting half of #1070 (drift classification, contract rules, wording)     | Smallest; no upstream edit                                         | #1070's actual subject is deferred, and the shipped prose then disagrees with itself: the pack is non-normative but blocking |             |
| 3   | Close the PR and let a full `/qfai-sdd 0013` run own both the spec and the skill change                                 | Highest; a full orchestrated stage for a four-line semantic change | The AC conflict stays open meanwhile, and the same decision still has to be made inside that run                             |             |

Option 1 is recommended because the conflict is a genuine product decision that
issue #1070 already states, and options 2 and 3 both leave the contradiction
standing while costing more.

## Blocked downstream items

| Item       | Kind         | Why it depends on the artifact                                            |
| ---------- | ------------ | ------------------------------------------------------------------------- |
| `TDD-0003` | `ledger-row` | `TC-Refs` names TC-0013-0003, whose assertion is the stop this CR retires |

- Not blocked by this CR: the other nine `spec-0013` ledger rows (TDD-0001..0002,
  TDD-0004..0010). Their TCs do not reference the discussion-pack preflight, and
  `sddSkillSpec0013.test.ts`'s other describes assert unrelated SKILL.md content.
  Also not blocked: the `drift-protocol.md`, `contract-artifact-rules.md`,
  `sdd-execution-playbook.md` and `sdd-triage.md` changes in the same pull
  request, none of which carries a `spec-0013` obligation.
- Overlapping open CRs: `none`

## Impact scope

- Specs: `spec-0013`
- Plans: `-`
- Tests: `packages/qfai/tests/integration/sddSkillSpec0013.test.ts` (`TDD-0003`)
- Contracts: `-`
- Schema: `-`

## Decision needed from user

`AC-0013-0003` requires SDD to stop on a missing or incomplete discussion pack.
Issue #1070 requires it not to. Retire the AC's unconditional stop and restate
it around "no usable source at all", or keep the AC and defer #1070's core?

## Approved actions (owner skill rerun plan)

1. `/qfai-sdd 0013` rerun scope: **`confirm-only`**. The upstream edits are
   applied by hand under the approval recorded above, which is the mode
   `constitution/drift-protocol.md#when-drift-is-detected` step 4 provides for
   exactly this case ("the change was already applied by hand under approval").
   A `re-derive` run would regenerate the whole spec pack for a four-line
   semantic change.
2. Downstream ledger sweep: no reset. `TDD-0003` stays at `exception` with
   `DR-0013-0001`; its `Test file` and `Selector` do not move, and the test it
   names is updated in the same change to assert the restated TC. The row's
   `DR-ID` column records this CR's ID.
   - `TDD-0003`

## Resolution

Applied by hand under the approval above, `confirm-only`:

- `03_Acceptance-Criteria.md` — AC-0013-0003 restated: a stop requires no usable
  source at all.
- `04_Business-Rules.md` — BR-0013-0003 restated to match, and renamed from
  "Discussion-Pack Required" to "Usable Source Required".
- `05_Examples.md` — EX-0013-0003 replaced: an incomplete pack continues; the
  no-source case stops.
- `06_Test-Cases.md` — TC-0013-0003 restated to verify both directions.
- `tdd/test-list.md` — `TDD-0003`'s `DR-ID` records `CR-20260903-0001`.
- `packages/qfai/tests/integration/sddSkillSpec0013.test.ts` — the
  `TC-0013-0003` describe asserts the restated obligation in both directions
  instead of the `discussion-pack` token.
