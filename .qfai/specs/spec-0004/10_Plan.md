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
  for `requiresApproval()` (BR-0004-0034);
- the checks of CLI-VAL `## Triage authorization reference` read the tracked
  record and `summary.json` (BR-0004-0035, 0036, 0037). They read the
  authorization record through spec-0018's parser in
  `packages/qfai/src/core/workflow/parse.ts`, the one parser of that record, and
  keep none of their own. So this lands after U1;
- the code joins `core/emittedRuleCodes.ts`, with an English message, and moves
  into CLI-VAL's `## New finding codes (this delta)` table in the same change.

Left out: the `workflow.mode` config issue (spec-0018); any staleness check.

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

### File Touchpoints (additions)

| File                                                      | Role                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/qfai/src/core/validate.ts`                      | Adds the `saas-package` profile + skip-gate finding emission          |
| `packages/qfai/src/core/validators/auditProfile.ts` (NEW) | Accepts string-only + structured `primary_tasks`; `QFAI-AUD-020` band |
| `packages/qfai/scripts/check-pack-locations.mjs` (NEW)    | Pack-location lint lane wired into `pnpm ci:lint`                     |

### Intent-driven entry (CAP-0018)

What each layer proves:

| Layer | What it proves                                                                                                            | Cases              |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `L3`  | `qfai validate --profile sdd` over a temporary project: the approval set, each `QFAI-TRIAGE-011` check, and the non-rules | TC-0004-0074..0079 |
| `L3`  | `qfai validate` over a tree made by the built `qfai init`: `process/workflows` as a governed layer                        | TC-0004-0080..0083 |
| E2E   | Validate resolving a CREATE row's `Authorization-Ref` at the end of a whole run                                           | US-0004-0040       |

Test modules, one per BR, all under `packages/qfai/tests/integration/validators/`:

| BR           | Module                           | Cases                          |
| ------------ | -------------------------------- | ------------------------------ |
| BR-0004-0034 | `triageApprovalSet.test.ts`      | TC-0004-0074                   |
| BR-0004-0035 | `triageAuthorizationRef.test.ts` | TC-0004-0075, 0076, 0077       |
| BR-0004-0036 | `triageLegacyApproval.test.ts`   | TC-0004-0078                   |
| BR-0004-0037 | `triageNoApprovalRow.test.ts`    | TC-0004-0079                   |
| BR-0004-0038 | `workflowPlanProvenance.test.ts` | TC-0004-0080, 0081, 0082, 0083 |

The `Notes` of `06_Test-Cases.md` name the same modules.

Cases that stand alone:

- TC-0004-0075 is a matrix of 2 rows: `create-row` and `column-position`.
- TC-0004-0076 is a matrix of 9 rows, one per failed check: `resolves-malformed`,
  `resolves-outside`, `resolves-missing`, `resolves-unparsable`, `kind`,
  `operation`, `operation-non-create`, `binding-create` and `answerer`. Each has
  its own fixture and its own check name in the finding. A shared case would
  observe only the first failing assert.
- `operation-non-create` is a `DELETE` row carrying a reference. Only a `CREATE`
  row may carry one, so it fails `Operation`.
- The kept failures are the 9 rows of TC-0004-0076. The dash value
  (TC-0004-0078), the reference on a row that needs no approval (TC-0004-0079)
  and the absent staleness check (TC-0004-0077) are one case each, apart from the
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

- `QFAI-ATDD-111` (US-0004-0040) and `QFAI-ATDD-112` (TC-0004-0074..0083), until
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
  `resolves-malformed` or `resolves-outside` row of TC-0004-0076 fails, or the
  validator reads a file outside `.qfai/evidence/workflow/`.
- NFR-0001, the validate budget: the check reads one record and one
  `summary.json` per row that cites a reference. No triage row in this
  repository cites one today, so the added cost here is zero. Breach: the
  existing measurement of NFR-0001 moves on a tree whose rows carry no
  reference.
- NFR-0002, the same input gives the same result: the check reads no clock and
  judges no staleness (DR-0296). Breach: TC-0004-0077, a year-old record that
  still passes, fails, or two runs over one tree report different findings.
- NFR-0004, actionable issues: each `QFAI-TRIAGE-011` names the row and the
  failed check. Breach: a TC-0004-0076 row whose finding does not name its
  check.

## Risk mitigation

| Risk                                                                                                                                                                                        | Likelihood / impact | Mitigation                                                                                                                                                                        | Trigger to act                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| The `saas-package` profile skips ATDD-class and implement-class gates silently, and a skipped gate reads as a passed one                                                                    | med / high          | Each skipped gate emits `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) naming itself, so the skip is stated rather than inferred from an absence                                          | A gate is added to the skip set without a matching finding                                                                                     |
| The validate-side skip set and the certify-side `notes:` (spec-0014) drift apart                                                                                                            | med / high          | The two are required to be identical; they are a declared pair rather than two independently maintained lists                                                                     | Either side's skip set changes in a diff that does not touch the other                                                                         |
| Deleted validators stay referenced in active spec text, so the SSOT describes a set the code does not have                                                                                  | high / med          | Maintenance note 1 makes removal part of the same change; the File Touchpoints table names real module paths, so a deletion breaks the reader's search                            | A path in the touchpoints table no longer resolves                                                                                             |
| The pack-location lane walks the whole tree and becomes slow enough to be disabled                                                                                                          | low / med           | The lane scans staged / changed directories only (DR-0274) and passes silently otherwise; no full-tree walk                                                                       | A full-tree walk is proposed for the lane                                                                                                      |
| The validator starts judging staleness, so every row approved in a past run fails once the scope moves on                                                                                   | low / high          | DR-0296 records the option as rejected, and CLI-VAL states that staleness is not checked here                                                                                     | A change to the `QFAI-TRIAGE-011` check that reads a scope digest, a capability text or a timestamp                                            |
| The validator's triage parsing and spec-0013's triage format disagree on the `Authorization-Ref` column                                                                                     | med / med           | The two land in the same change (unit U3)                                                                                                                                         | A pull request that changes the triage parsing in `validators/specPack.ts` without `qfai-sdd/references/sdd-triage.md`, or the other way round |
| `QFAI-ASSETS-*` starts reporting the installed plans, so a fresh `qfai init` tree or this repository's dogfood run gains a finding and the CI `build` job fails on the verify:pack baseline | med / high          | Plans are copied byte for byte and hashed after CRLF normalization. A test case asserts that a fresh `qfai init` tree yields no `QFAI-ASSETS-*` finding under `process/workflows` | A count change in the verify:pack fresh-init baseline, or a `QFAI-ASSETS-*` count change in `scripts/dogfood-backlog.json`                     |

### Intent-driven entry (CAP-0018)

The last three rows of the table above are this entry's.
