# 10 Plan

- Goal: keep validate SSOT aligned to the current contract-first, skill-first validator wiring.

## Implementation approach

The change is maintenance-shaped rather than feature-shaped: the validator set
already exists, and this spec's job is to keep the SSOT describing the set that
is actually wired. The three subsections below are the shape of that work —
what is wired today, which files carry it, and the standing rules that keep the
two in step. The alternative considered was to let the spec describe a target
wiring and reconcile later; it was rejected because a spec that describes a set
the code does not have is worse than no spec, since it is read as if it were
true.

### Removing the work-log surface

`qfai validate` stops reading `.qfai/steering/`. The removal spans six specs and
lands as one change (`discussion-20260923060900824#REQ-0015`). This subsection
states the order of that change once. The plans of spec-0003, spec-0011 and
spec-0013 cite it rather than restate it.

The change adds no architectural element. It deletes code, and the remaining
schema copy in an adopter's tree is handled by the existing asset-provenance
check.

What the validators of this spec lose:

- `packages/qfai/src/core/validators/worklogSurface.ts` and
  `packages/qfai/src/core/worklogEntries.ts`, with their export from
  `validators/index.ts` and their call in `core/validate.ts`.
- In `packages/qfai/src/core/validators/tddList.ts`: the block labelled "Check
  8b: a stopped ledger owes a steering record" through its end,
  `blockedWithoutWorklog`, `readSteeringIndex`, `BlockedWorklogGate`, the gate
  parameter of `validateSpecTddList`, and the imports of `worklogEntries.js` and
  `PROJECT_STEERING_DIR`. The other block labelled Check 8b, "parked items must
  be visible in CI", stays, and so does `TDDLIST_BLOCKED_MISSING_REF`.
- In `packages/qfai/src/core/validators/reviewerJustification.ts`:
  `R-WORKLOG-DRIFT` and `R-HANDOFF-INCOMPLETE` leave `ADVISORY_FAILING_CODES`.
  `R-REJECTED-READOPT` stays in that set.
- In `packages/qfai/src/cli/commands/validate.ts` and
  `packages/qfai/src/core/emittedRuleCodes.ts`: the codes the removed checks
  emitted leave the profile lists, the `reviewer-gate-sdd` list and the rule
  registries.
- In `packages/qfai/src/core/validators/skillDocReferences.ts`: the
  `W-SKILL-PROJECT-MEMORY` message stops naming the surface. The check itself
  does not change.

The order inside the change. Only its head has to be green:

1. Write the failing tests first: TC-0003-0059..0061, TC-0004-0074..0076, both
   boundaries of TC-0004-0018, TC-0011-0013, TC-0013-0036 and TC-0013-0037.
   Each fails against the current code, except two rows that assert behaviour
   the code already has: TDD-0072 (`rejected-readopt-empty`) and TDD-0070
   (`blocked-by-empty`). Those two record RED under
   `qfai-implement/references/red-not-observable.md`. TDD-0072 is a `unit`
   row, which cannot cite production code as `Satisfied-by`, so it runs after
   TDD-0018 reaches `done` and cites TDD-0018.
2. Remove what uses a symbol before the symbol:
   - the seed code in `init.ts`, which spec-0003's plan lists;
   - the validator code above;
   - the source comments that cite the surface, in `parse/spec.ts`,
     `prototypingEvidence.ts`, `justificationCatalog.ts`,
     `reviewerJustification.ts`, `assistantTreeMigration.ts` and
     `skillDocReferences.ts`.

   Then remove from `packages/qfai/src/core/paths/assistantPaths.ts`:
   `PROJECT_STEERING_DIR`, `PROJECT_STEERING_TEMPLATES_SUBDIR`,
   `joinProjectSteering`, `WORKLOG_ENTRY_KINDS`, `WORKLOG_ENTRY_STATUSES`,
   `HANDOFF_REQUIRED_SECTIONS` and their types. The `LEGACY_ASSISTANT_*`
   constants and the `joinLegacyAssistant*` functions stay byte-identical. The
   test removals of step 4 land with this step, or the type check fails.

3. Withdraw the asset and edit the skill text:
   - Delete `packages/qfai/assets/init/.qfai/assistant/catalog/worklog-entry.schema.md`,
     then run `npm run generate:governed-manifest` from `packages/qfai`.
   - Edit the `qfai-implement` and `qfai-sdd` skill files under
     `packages/qfai/assets/init/.qfai/assistant/skills/`.
   - Run `pnpm sync:ssot`, then delete the tracked link
     `.qfai/assistant/catalog/worklog-entry.schema.md`.
4. Remove the tests that pin the surface. The list is the one under `SRC-0008`
   in `.qfai/evidence/discussion-20260923060900824.md`, plus what each spec's
   `09_delta.md` names:
   - the files `worklogSurface.test.ts`, `worklogSchemaShipped.test.ts`,
     `implementWorklogObligation.test.ts` and `initContractSteeringSeed.test.ts`;
   - the blocks that test the removed behaviour, among them the
     `QFAI-TDDLIST-015` and `QFAI-TDDLIST-016` describe in
     `tddListBlockedStatus.test.ts`;
   - the entries in the annotation carriers `tests/integration/qfai-traceability.md`
     and `tests/e2e/qfai-traceability.md`, and in `KNOWN_TEST_FILE_DRIFT`;
   - the entries in the code registries and in `tsconfig.tests.json`;
   - the `joinProjectSteering` assertions of the TC-0003-0025 tests in
     `initSpec0003.test.ts` and `init.test.ts`.
5. Move the entries' content:
   - Move each entry's content to the target its disposition names
     (`discussion-20260923060900824#REQ-0013`).
   - Rewrite the pointers in the three Change Requests and in the two evidence
     files (`#REQ-0014`). The spec-0006 pointers are already rewritten.
   - Then delete `.qfai/steering/**`.

   This step follows step 2: until `QFAI-TDDLIST-015` is gone, deleting the
   entries fails on spec-0003's blocked rows.

6. Update the documents:
   - `README.md` and `packages/qfai/README.md`, together;
   - `packages/qfai/docs/finding-codes.md`;
   - the `## [Unreleased]` entry in `CHANGELOG.md`;
   - `AGENTS.md`, `.github/copilot-instructions.md`,
     `.instruction/02_project/domain.md` and `scripts/check-doc-clarity.mjs`.
7. Re-pin `scripts/dogfood-backlog.json` for `tdd`, `sdd` and `full`, last. A
   re-pin may only lower a count, or strike a file whose count reaches zero. No
   file may be added, and a ledger with no pin stays at zero.

`QFAI-ATDD-101`, `-102` and `-112` clear inside the change, before step 7: the
tests of step 1 carry the new cases' annotations, and step 4 removes the
annotations of the removed ones. The stage that owns each row's layer,
`/qfai-atdd` or `/qfai-implement`, writes them; no separate step follows.

The spec-pack edits of this `/qfai-sdd` run land in the same change. Removing
the ledger rows first would leave test annotations citing unregistered test
cases.

The alternative considered was one statement of the order per spec. It was
rejected because six copies of one order drift apart. This spec owns every
validator that makes the order matter.

What the change leaves out:

- a replacement for the handoff brief;
- a finding for an adopter's `.qfai/steering/`;
- any change to `.qfai/handoff.yaml`, `handoffUpgrade.ts` or
  `R-HANDOFF-SCHEMA-DRIFT`.

## Current State

- `packages/qfai/src/core/validate.ts` is the repo-root downstream entrypoint.
- Direct-pack canonical UIX validation remains a discussion-only path.
- Prototyping validation now depends on `prototypingSkill`, `uiEvidenceArtifacts`, and `prototypingEvidence`, not on a recommendation validator.

## File Touchpoints

| File                                                          | Role                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/qfai/src/core/validate.ts`                          | Aggregates the current validator set                                |
| `packages/qfai/src/core/validators/skill/prototypingSkill.ts` | Validates `/qfai-prototyping` skill contract                        |
| `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`    | Enforces screenshot / HTML evidence presence                        |
| `packages/qfai/src/core/validators/prototypingEvidence.ts`    | Validates current prototyping.json schema and convergence semantics |

## Maintenance Notes

1. Remove deleted validator references from active spec text as code evolves.
2. Keep direct discussion-pack validation clearly separate from repo-root validate behavior.
3. Update traceability whenever the prototyping validator set changes.

## v1.9.2 Second-Wave (REQ-0166 validate side / REQ-0164 / REQ-0167)

### How — SaaS-package validate profile (REQ-0166)

- Add a `saas-package` profile to `validate.ts` that runs the prototyping-profile validators, asserts a DCON-005 attestation at `.qfai/contracts/design/design-system.yaml`, and runs the CLI-HANDOFF schema check; PASS requires all three.
- Mark ATDD-class and implement-class gates as SKIPPED under this profile and emit a `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) finding per skipped gate naming it; keep the skip set identical to the certify-side `notes:` (spec-0014).

### How — `primary_tasks` shape acceptance (REQ-0164)

- Add `auditProfile.ts` (NEW) accepting BOTH string-only and structured `{ id, label, acceptance }` (`additionalProperties: false`, all required, per DR-0268); string-only PASSes during the deprecation window.
- `QFAI-AUD-020` warning text names the `3..7` recommended count band (per DR-0267).

### How — pack-location CI lane (REQ-0167)

- Add `packages/qfai/scripts/check-pack-locations.mjs` (NEW) scanning staged/changed dirs (per DR-0274) for `review-*/` / `discussion-*/` outside `tmp/`, `.qfai/review/<ts>/`, `.qfai/discussion/<ts>/`; wire into `pnpm ci:lint`.
- On a misplaced dir emit `R-PACK-LOCATION-DRIFT` (error) referencing `.agents/rules/root-additions-policy.md` and proposing the correct path; pass silently otherwise (no full-tree walk).

## Test approach

- `validators` level for finding-emit checks (`D-SAAS-PACKAGE-VERIFY-SKIPPED`, `QFAI-AUD-020`, closed-schema reject); `integration` level for end-to-end profile wiring and the CI lane (CLI shape: `--profile saas-package`, `pnpm ci:lint`). Each REQ has normal AND error/boundary coverage (TC-0004-0067..0073).
- The boundary that needs its own case rather than a shared one is the closed schema: `additionalProperties: false` on the structured `primary_tasks` shape is only proven by a rejection case, and the string-only form must keep passing for the length of the deprecation window — so acceptance and rejection are separate cases, not one parameterised case.

### Tests for the work-log removal

- TC-0004-0074, TC-0004-0075 and TC-0004-0076 run `qfai validate` at
  `integration` level over a temporary tree. Each builds its own tree:
  malformed entries for TC-0004-0074, a remaining schema copy for TC-0004-0075,
  and `blocked` rows with an unreadable file under `.qfai/steering/` for
  TC-0004-0076. The three trees differ, so no shared fixture is introduced.
- TC-0004-0018 keeps two rows, one per boundary. TDD-0018 proves that an empty
  justification on `R-WORKLOG-DRIFT` raises nothing. TDD-0072 proves that the
  same on `R-REJECTED-READOPT` is still an error. The rejection needs its own
  row, because a gate that rejected nothing would pass the first.
- TC-0004-0076 splits into three boundaries, because each fails on its own: a
  named `Blocked-By` passes, an empty one raises `TDDLIST_BLOCKED_MISSING_REF`,
  and an unreadable file under `.qfai/steering/` raises nothing.

### File Touchpoints (additions)

| File                                                      | Role                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/qfai/src/core/validate.ts`                      | Adds the `saas-package` profile + skip-gate finding emission          |
| `packages/qfai/src/core/validators/auditProfile.ts` (NEW) | Accepts string-only + structured `primary_tasks`; `QFAI-AUD-020` band |
| `packages/qfai/scripts/check-pack-locations.mjs` (NEW)    | Pack-location lint lane wired into `pnpm ci:lint`                     |

## Risk mitigation

| Risk                                                                                                                     | Likelihood / impact | Mitigation                                                                                                                                             | Trigger to act                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| The `saas-package` profile skips ATDD-class and implement-class gates silently, and a skipped gate reads as a passed one | med / high          | Each skipped gate emits `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) naming itself, so the skip is stated rather than inferred from an absence               | A gate is added to the skip set without a matching finding                                                 |
| The validate-side skip set and the certify-side `notes:` (spec-0014) drift apart                                         | med / high          | The two are required to be identical; they are a declared pair rather than two independently maintained lists                                          | Either side's skip set changes in a diff that does not touch the other                                     |
| Deleted validators stay referenced in active spec text, so the SSOT describes a set the code does not have               | high / med          | Maintenance note 1 makes removal part of the same change; the File Touchpoints table names real module paths, so a deletion breaks the reader's search | A path in the touchpoints table no longer resolves                                                         |
| The pack-location lane walks the whole tree and becomes slow enough to be disabled                                       | low / med           | The lane scans staged / changed directories only (DR-0274) and passes silently otherwise; no full-tree walk                                            | A full-tree walk is proposed for the lane                                                                  |
| The wrong Check 8b block is removed, because two blocks in `tddList.ts` carry that label                                 | low / high          | The removal names its block by its heading, "a stopped ledger owes a steering record", and keeps "parked items must be visible in CI"                  | A parked-item test fails, or `TDDLIST_EXCEPTION_PARKED` disappears from a ledger that has `exception` rows |
| `R-REJECTED-READOPT` stops being raised, because the set it is asked through changes shape                               | low / high          | Only two codes leave `ADVISORY_FAILING_CODES`, and the set keeps its `.has()` gate, which `contractDeferralNotes.test.ts` reads through the AST        | `contractDeferralNotes.test.ts` fails on `R-REJECTED-READOPT`, or TDD-0072 goes red                        |
| A test file or selector is deleted while a live row still names it                                                       | med / med           | Removed rows go in the same change as their tests, and the shared test files keep every other row's selector                                           | `TDDLIST_TEST_FILE_MISSING` or `TDDLIST_SELECTOR_UNRESOLVED` on a row this change did not retire           |
| The dogfood re-pin raises a count or adds a file to hide a new finding                                                   | low / med           | Step 7 of the removal order allows only a lower count or a struck file                                                                                 | A diff of `scripts/dogfood-backlog.json` raises a number or adds a key                                     |
