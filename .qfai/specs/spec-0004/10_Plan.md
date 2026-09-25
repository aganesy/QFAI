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

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It adds consumers to two
existing ones:

- `requiresApproval()` in `core/sddTriage.ts` gains `QFAI-TRIAGE-011`, a check
  inside `packages/qfai/src/core/validators/specPack.ts`;
- the path-to-governed-layer helper beside `GOVERNED_ASSISTANT_LAYERS` in
  `core/assistantAssetProvenance.ts` gains the two layer reads of
  `core/validators/assistantAssets.ts`. The helper and its third caller, the
  lock-key parse, are spec-0003's (BR-0003-0053).

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`.

**U4**, in the same change as spec-0003's helper and `process/workflows` layer:

- `validators/assistantAssets.ts:616` collects recorded layers, and `:631`
  tests a present layer, both through the helper, so the existing
  `QFAI-ASSETS-*` checks cover the installed plans and never
  `process/migrations/` (BR-0004-0038). No finding code and no check is added.

**U3**, landing with spec-0013's `Authorization-Ref` column in
`references/sdd-triage.md`:

- `specPack.ts` drops `APPROVAL_REQUIRED_OPS` and its `UPDATE:REMOVE` branch
  for `requiresApproval()` (BR-0004-0039);
- the checks of CLI-VAL `## Triage authorization reference` read the tracked
  record and `summary.json` (BR-0004-0040, 0036, 0037). They read the
  authorization record through spec-0018's parser in
  `packages/qfai/src/core/workflow/parse.ts`, the one parser of that record, and
  keep none of their own. So this lands after U1;
- the code joins `core/emittedRuleCodes.ts`, with an English message, and moves
  into CLI-VAL's `## New finding codes (this delta)` table in the same change.

Left out: the `workflow.mode` config issue (spec-0018); any staleness check.

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

1. Write the one test the change adds, TDD-0072 (`rejected-readopt-empty`).
   It asserts behaviour the code already has, so it records RED as a
   falsifiability proof under `qfai-implement/references/red-not-observable.md`.
   No test asserts that the work-log surface is absent (`CR-20260925-0010`).
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
     `initSpec0003.test.ts` and `init.test.ts`;
   - the absence tests `CR-20260925-0010` withdraws, with their ledger rows.
     Each spec's `09_delta.md` `## Triage (2026-09-25)` names them.
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

`QFAI-ATDD-101`, `-102` and `-112` clear inside the change, before step 7: step
4 removes the annotations of the removed cases. The stage that owns each row's
layer, `/qfai-atdd` or `/qfai-implement`, removes them; no separate step
follows.

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

- TC-0004-0018 has one row, TDD-0072, at `unit` level: an empty justification
  on `R-REJECTED-READOPT` is still an error. It is the only test the removal
  adds.
- The behaviour that remains keeps its existing tests:
  `TDDLIST_BLOCKED_MISSING_REF` in
  `packages/qfai/tests/core/tddListBlockedStatus.test.ts`, and
  `QFAI-ASSETS-006` on an unshipped file in
  `packages/qfai/tests/core/assistantAssetProvenance.test.ts`.
- No test asserts that validate ignores `.qfai/steering/` or the removed codes.
  The codes' absence from `emittedRuleCodes.ts` and the profile lists is
  checked by NFR-0006's search.

### File Touchpoints (additions)

| File                                                      | Role                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/qfai/src/core/validate.ts`                      | Adds the `saas-package` profile + skip-gate finding emission          |
| `packages/qfai/src/core/validators/auditProfile.ts` (NEW) | Accepts string-only + structured `primary_tasks`; `QFAI-AUD-020` band |
| `packages/qfai/scripts/check-pack-locations.mjs` (NEW)    | Pack-location lint lane wired into `pnpm ci:lint`                     |

### Intent-driven entry (CAP-0018)

What each layer proves:

| Layer | What it proves                                                                                                            | Cases                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `L3`  | `qfai validate --profile sdd` over a temporary project: the approval set, each `QFAI-TRIAGE-011` check, and the non-rules | TC-0004-0078..0079, TC-0004-0084..0087 |
| `L3`  | `qfai validate` over a tree made by the built `qfai init`: `process/workflows` as a governed layer                        | TC-0004-0080..0083                     |
| E2E   | Validate resolving a CREATE row's `Authorization-Ref` at the end of a whole run                                           | US-0004-0040                           |

Test modules, one per BR, all under `packages/qfai/tests/integration/validators/`:

| BR           | Module                           | Cases                          |
| ------------ | -------------------------------- | ------------------------------ |
| BR-0004-0039 | `triageApprovalSet.test.ts`      | TC-0004-0084                   |
| BR-0004-0040 | `triageAuthorizationRef.test.ts` | TC-0004-0085, 0076, 0077       |
| BR-0004-0036 | `triageLegacyApproval.test.ts`   | TC-0004-0078                   |
| BR-0004-0037 | `triageNoApprovalRow.test.ts`    | TC-0004-0079                   |
| BR-0004-0038 | `workflowPlanProvenance.test.ts` | TC-0004-0080, 0081, 0082, 0083 |

The `Notes` of `06_Test-Cases.md` name the same modules.

Cases that stand alone:

- TC-0004-0085 is a matrix of 2 rows: `create-row` and `column-position`.
- TC-0004-0086 is a matrix of 9 rows, one per failed check: `resolves-malformed`,
  `resolves-outside`, `resolves-missing`, `resolves-unparsable`, `kind`,
  `operation`, `operation-non-create`, `binding-create` and `answerer`. Each has
  its own fixture and its own check name in the finding. A shared case would
  observe only the first failing assert.
- `operation-non-create` is a `DELETE` row carrying a reference. Only a `CREATE`
  row may carry one, so it fails `Operation`.
- The kept failures are the 9 rows of TC-0004-0086. The dash value
  (TC-0004-0078), the reference on a row that needs no approval (TC-0004-0079)
  and the absent staleness check (TC-0004-0087) are one case each, apart from the
  matrices.

What existing guards already hold, with no new case:

- A table with no `Authorization-Ref` column: the existing triage-validator tests,
  which pass unchanged.
- The code's registration in `core/emittedRuleCodes.ts`: `tests/scripts/generateEmittedRuleCodes.test.ts`.
- The English message: `tests/unit/cliMessageLanguage.test.ts`.
- The fixture format: each authorization record a fixture writes also validates
  against the shipped `authorization.schema.json`.

Order, per spec-0018 `10_Plan.md` `### Order in which the rows go green`:

- The `L3` rows are tier 2 and land with spec-0013's `Authorization-Ref` column.
  They also need spec-0018's `authorization.schema.json` (tier 1).
- The E2E row closes at tier 5, on the US-0018-0001 journey.

Findings carried on purpose:

- `QFAI-ATDD-111` (US-0004-0040) and `QFAI-ATDD-112` (TC-0004-0078..0083, TC-0004-0084..0087), until
  the annotated tests land. Each push lists them in the batch evidence.
- The ledger's 104 pinned `tdd` errors (50 × `QFAI-TDDLIST-007`, 50 × `-011`,
  4 unresolved selectors) are left as they are. No existing row changes.
- The first Coverage Depth Matrix for this spec clears its pinned
  `QFAI-ATDD-131`. The push that adds it re-pins `full` with
  `node scripts/check-dogfood-backlog.mjs --profile full --pin`, because a count
  below its pin fails the lane.

The installed plans as a governed layer (BR-0004-0038):

- Four single-row `L3` cases, one module: an edited plan (TC-0004-0080), the whole
  layer deleted (TC-0004-0081), `process/migrations/` never reported
  (TC-0004-0082), and a fresh `qfai init` tree with no `QFAI-ASSETS-*` finding
  under `process/workflows/` (TC-0004-0083). The first two are the kept failures.
- TC-0004-0083 is the mitigation of the risk row on `QFAI-ASSETS-*` reporting
  installed plans: it fails before a fresh init tree, or this repository's
  dogfood run, gains such a finding.
- The rows are tier 2 and need spec-0018's plans shipped (tier 1), and they land
  in the same change as spec-0003's layer helper.

## NFR approach

- NFR-0003 is unchanged by the intent-driven entry, and its existing
  measurement stands. The floors that entry touches are answered below.

### Intent-driven entry (CAP-0018)

- `discussion-20260923171450572#NFR-0017`, English operator messages: the
  `QFAI-TRIAGE-011` message is written in English and needs no allowlist entry.
  Breach: `tests/unit/cliMessageLanguage.test.ts` fails, or its allowlist gains
  an entry for this code.
- `discussion-20260923171450572#NFR-0015`, no internal identifier in what ships:
  the new check and its message name no spec, decision or version marker of this
  repository. Breach: `lint:shipping` in `pnpm ci:lint`, or
  `packages/qfai/scripts/check-no-internal-version-leakage.sh`, exits non-zero.
- The trust-boundary floor (`.agents/rules/minimal-implementation.md` § 2): an
  `Authorization-Ref` value comes from a file, so it is parsed against the CLI-VAL
  grammar and its real path checked before any record is read. Breach: a
  `resolves-malformed` or `resolves-outside` row of TC-0004-0086 fails, or the
  validator reads a file outside `.qfai/evidence/workflow/`.
- NFR-0001, the validate budget: the check reads one record and one
  `summary.json` per row that cites a reference. No triage row in this
  repository cites one today, so the added cost here is zero. Breach: the
  existing measurement of NFR-0001 moves on a tree whose rows carry no
  reference.
- NFR-0002, the same input gives the same result: the check reads no clock and
  judges no staleness (DR-0299). Breach: TC-0004-0087, a year-old record that
  still passes, fails, or two runs over one tree report different findings.
- NFR-0004, actionable issues: each `QFAI-TRIAGE-011` names the row and the
  failed check. Breach: a TC-0004-0086 row whose finding does not name its
  check.

## Risk mitigation

| Risk                                                                                                                                                                                        | Likelihood / impact | Mitigation                                                                                                                                                                        | Trigger to act                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| The `saas-package` profile skips ATDD-class and implement-class gates silently, and a skipped gate reads as a passed one                                                                    | med / high          | Each skipped gate emits `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) naming itself, so the skip is stated rather than inferred from an absence                                          | A gate is added to the skip set without a matching finding                                                                                     |
| The validate-side skip set and the certify-side `notes:` (spec-0014) drift apart                                                                                                            | med / high          | The two are required to be identical; they are a declared pair rather than two independently maintained lists                                                                     | Either side's skip set changes in a diff that does not touch the other                                                                         |
| Deleted validators stay referenced in active spec text, so the SSOT describes a set the code does not have                                                                                  | high / med          | Maintenance note 1 makes removal part of the same change; the File Touchpoints table names real module paths, so a deletion breaks the reader's search                            | A path in the touchpoints table no longer resolves                                                                                             |
| The pack-location lane walks the whole tree and becomes slow enough to be disabled                                                                                                          | low / med           | The lane scans staged / changed directories only (DR-0274) and passes silently otherwise; no full-tree walk                                                                       | A full-tree walk is proposed for the lane                                                                                                      |
| The wrong Check 8b block is removed, because two blocks in `tddList.ts` carry that label                                                                                                    | low / high          | The removal names its block by its heading, "a stopped ledger owes a steering record", and keeps "parked items must be visible in CI"                                             | A parked-item test fails, or `TDDLIST_EXCEPTION_PARKED` disappears from a ledger that has `exception` rows                                     |
| `R-REJECTED-READOPT` stops being raised, because the set it is asked through changes shape                                                                                                  | low / high          | Only two codes leave `ADVISORY_FAILING_CODES`, and the set keeps its `.has()` gate, which `contractDeferralNotes.test.ts` reads through the AST                                   | `contractDeferralNotes.test.ts` fails on `R-REJECTED-READOPT`, or TDD-0072 goes red                                                            |
| A test file or selector is deleted while a live row still names it                                                                                                                          | med / med           | Removed rows go in the same change as their tests, and the shared test files keep every other row's selector                                                                      | `TDDLIST_TEST_FILE_MISSING` or `TDDLIST_SELECTOR_UNRESOLVED` on a row this change did not retire                                               |
| The dogfood re-pin raises a count or adds a file to hide a new finding                                                                                                                      | low / med           | Step 7 of the removal order allows only a lower count or a struck file                                                                                                            | A diff of `scripts/dogfood-backlog.json` raises a number or adds a key                                                                         |
| The validator starts judging staleness, so every row approved in a past run fails once the scope moves on                                                                                   | low / high          | DR-0299 records the option as rejected, and CLI-VAL states that staleness is not checked here                                                                                     | A change to the `QFAI-TRIAGE-011` check that reads a scope digest, a capability text or a timestamp                                            |
| The validator's triage parsing and spec-0013's triage format disagree on the `Authorization-Ref` column                                                                                     | med / med           | The two land in the same change (unit U3)                                                                                                                                         | A pull request that changes the triage parsing in `validators/specPack.ts` without `qfai-sdd/references/sdd-triage.md`, or the other way round |
| `QFAI-ASSETS-*` starts reporting the installed plans, so a fresh `qfai init` tree or this repository's dogfood run gains a finding and the CI `build` job fails on the verify:pack baseline | med / high          | Plans are copied byte for byte and hashed after CRLF normalization. A test case asserts that a fresh `qfai init` tree yields no `QFAI-ASSETS-*` finding under `process/workflows` | A count change in the verify:pack fresh-init baseline, or a `QFAI-ASSETS-*` count change in `scripts/dogfood-backlog.json`                     |

### Intent-driven entry (CAP-0018)

The last three rows of the table above are this entry's.
