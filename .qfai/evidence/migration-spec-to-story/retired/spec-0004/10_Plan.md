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

### Story-tree layout

This covers the rows under `## Triage (2026-09-23 spec-to-story)` in
`09_delta.md`. The work is done in the order P1, P2, P3, P5, P6, P7, P8. P1 is
a pull request of its own, merged before the rest. P2 to P8 are ordered commits
of one pull request, which also carries their tests. spec-0004 has work in P1,
P3, P6 and P7.

**Elements taken from spec-0001's plan.** Three elements land at P3 and are
specified in `spec-0001/10_Plan.md`. The validators below are among their
consumers.

| Element                  | Path                                                                                                         | What this spec uses                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 Layout and ID grammar | `packages/qfai/src/core/storyTree/layout.ts`, `packages/qfai/src/core/storyTree/ids.ts`                      | The layout predicate (BR-0004-0043, BR-0004-0074); the seven ID shapes and prefix agreement (BR-0004-0045 to 0047); the `QFAI:BF-`, `QFAI:AC-` and `QFAI:EX-` patterns (BR-0004-0066 to 0071) |
| E2 Story-tree reader     | `packages/qfai/src/core/storyTree/tree.ts`, with `packages/qfai/src/core/storyTree/contractRules.ts`         | Declared flows, stories, ACs, EXs and rules, each with its file (BR-0004-0060 to 0065, BR-0004-0067 to 0073); the contract files under `paths.contractsDir` (BR-0004-0048)                    |
| E3 Two-table rows        | `packages/qfai/src/core/storyTree/tables.ts`, and `readFileAtBase` in `packages/qfai/src/core/gitChanges.ts` | Columns, vocabulary and row ID shape (BR-0004-0050 to 0052); the keyword classifier and in-force predicate (BR-0004-0053, 0054, 0072); the base-to-head row diff (BR-0004-0055, BR-0004-0059) |

**E4, flow scope (P3).** This plan introduces it.

- `packages/qfai/src/core/flowScope.ts`, modelled on
  `packages/qfai/src/core/specScope.ts`. `resolveFlowScope(values)` parses each
  `--flow` value into a `BF-NNNN` ID and returns the scope and the values it
  could not use. A value is unusable when it is not a `BF-NNNN` ID or when E2
  finds no such flow. Membership of a path or a finding is answered through E2:
  the named flow, its stories, their ACs and EXs, and the rules that cite those
  EXs.
- `scopedReportPath` in `packages/qfai/src/cli/commands/validate.ts` takes a
  unit prefix where it is, so one helper names both the `spec-` and the `flow-`
  files. `report.ts` already imports it from there.

Consumers, each present at P3:

1. `packages/qfai/src/cli/commands/validate.ts`: the scoped result goes to
   `validate.flow-<ids>.json`, and an unusable value writes no scoped file
   (BR-0004-0078 to 0080; EX-0004-0083, EX-0004-0085).
2. `packages/qfai/src/cli/commands/report.ts`: reads `validate.flow-<ids>.json`
   and exits 2 on a malformed value before any file is written (BR-0005-0014,
   BR-0005-0016; EX-0005-0015, EX-0005-0017).
3. `packages/qfai/src/core/validate.ts`: drops findings outside the named flows
   (EX-0004-0083, where the second flow's missing file is not reported).
4. `packages/qfai/src/core/validators/reviewArtifacts.ts`: narrows review packs
   to `business-flow-NNNN/` (`.qfai/contracts/cli/qfai-validate.md#flow-scope`,
   "Review packs").

**Validator modules.** Each is a consumer of E1 to E4 wired into one place,
`core/validate.ts`, so none is an element. They split by profile because
`core/validate.ts` wires validators per profile, and the drift, unlisted and
placeholder families stay in the modules that own them today.

| Module                                                               | Profile        | Families                                                                                                                                         | Rules                                                  |
| -------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `packages/qfai/src/core/validators/storyTreeStructure.ts` (new)      | `sdd`          | Story directory, ID grammar, BF Mermaid (`QFAI-STORY-011`), two tables, `QFAI-SPACK-102` on `Unadjudicated:` rows, EX to AC, BR to EX, rule refs | BR-0004-0044 to 0047, 0050 to 0052, 0054, 0060 to 0065 |
| `packages/qfai/src/core/validators/storyTreeObligations.ts` (new)    | `atdd`, `tdd`  | Test obligation, misplaced annotation, undeclared annotation, exempted item                                                                      | BR-0004-0066 to 0073                                   |
| `packages/qfai/src/core/validators/upstreamSsotGuard.ts` (extended)  | `tdd`, `drift` | Upstream edit without a change request; row rewritten, in `drift` only                                                                           | BR-0004-0055 to 0059, 0081                             |
| `packages/qfai/src/core/validators/contractReferences.ts` (extended) | `sdd`          | Unlisted contract, `QFAI-CONTRACT-034` keyed by `CON-*` ID or by path; on the story tree it takes `cli/` and `design/` from E2                   | BR-0004-0048                                           |
| `packages/qfai/src/core/validators/assistantAssets.ts` (extended)    | as today       | `QFAI-ASSETS-003` reads `tech.md` and `structure.md` under `paths.contractsDir`                                                                  | BR-0004-0049                                           |
| `packages/qfai/src/core/validate.ts` (extended)                      | every          | Layout selection; the old-layout error, which suppresses every story-tree family                                                                 | BR-0004-0043, 0074, 0075                               |

Seams between them:

- The layer of a test file comes from `resolveTestKind`, the existing private
  function in `packages/qfai/src/core/atddTraceability.ts`, exported beside
  `atddTestKindDirs`. `atddAcceptanceLayerFilter` already tests its result for
  non-null. `storyTreeObligations.ts` calls it, so there is one crosswalk
  (BR-0004-0066).
- `upstreamSsotGuard.ts` reads the changed set through
  `getChangedFilesAgainstBase` and base content through `readFileAtBase`. Both
  return `null` when git cannot answer, and `null` reports nothing
  (BR-0004-0056). `readFileAtBase` reads at the merge base of `baseBranch`
  and HEAD; when it finds no `decisions.md` under `paths.specsDir` there,
  neither family reports anything (BR-0004-0081).
- `packages/qfai/src/core/contractIndex.ts#buildContractIndex` is not changed
  before P7. Its six callers — `core/report.ts`, `core/specPackReport.ts`,
  `validators/contractReferences.ts`, `validators/contracts.ts`,
  `validators/ids.ts` and `validators/specPack.ts` — see what they see today.
  E2 enumerates `cli/` and `design/` on the story-tree path only, and
  `contractReferences.ts` takes those two directories from E2 there, while
  `ui/`, `api/` and `db/` still come from `buildContractIndex`.
- The old-layout error suppresses the story-tree families by the same
  selection that routes a spec-pack tree to the spec-pack validators, so
  BR-0004-0075 needs no second check.

**Order of the work.**

1. P1: the `src-comment` rule of `packages/qfai/scripts/lint-shipping.ts`
   rejects the seven story-tree shapes outside the sample band, and leaves an
   old composite `DEC-NNNN-NNNN` or `OQ-NNNN-NNNN` ID to its existing class
   (BR-0004-0077). It changes in the same commit as the post-build guard and
   the smoke test (spec-0003's rows). That commit follows the clean-up of the
   out-of-band IDs already in shipped files, 54 occurrences in 25 files, which
   is the first commit of the P1 pull request. So no commit leaves a guard
   failing.
2. First commit of the P2–P8 pull request: the NFR-0005 baseline from the
   P1 integration commit's fresh-init tree (see `## NFR approach`).
3. P3: E1 to E4, then the modules above, then `--flow` on `qfai validate` and
   the refusal of `--spec` on the story tree (BR-0004-0079). The story-tree
   families run only where E1's predicate reads a story tree, so this
   repository's own run stays on the spec-pack validators. The old-layout
   error is written here beside the selection and is not wired into any
   profile.
4. P6: validators read `kind` from the card frontmatter and assistant files
   from `rule/`; `layerCoverage.ts` writes `report/spec-coverage`;
   `assistantTreeMigration.ts` accepts `skill.local/`; the text-output grammar
   lives in the validate contract, and the language pin of
   `packages/qfai/tests/unit/cliMessageLanguage.test.ts` moves from
   `cli-ux-guidelines.md` to `repository-language.md`. Each old path stops
   being read in the same phase.
5. P7, in the commit order of the repository-migration row in
   `_policies/10_delta.md`:
   - commit (3), this repository migrated: migration step 4 re-keys the
     work-log entries in `.qfai/steering/` to BF and DEC IDs and
     `decisions.md` (`.qfai/contracts/cli/qfai-migration-spec-to-story.md#invocation`);
   - commit (4): the work-log readers in `worklogSurface.ts` and
     `reviewerJustification.ts` read BF and DEC IDs and `decisions.md`; the
     REMOVE rows delete the spec-pack validators and the tests annotating their
     TCs; the `--spec` REMOVE row deletes `specScope.ts`, the `spec-` unit
     of `scopedReportPath` and the flag's scoping, keeping an explicit refusal
     that exits 2 and names `--flow` (BR-0004-0079);
   - commit (5), the last: the old-layout error wired into every profile.

**Alternatives rejected.**

- One `storyTree.ts` validator for every family: `core/validate.ts` wires
  validators per profile, and the ledger already places the drift, unlisted
  and placeholder families in their existing modules.
- Extending `buildContractIndex` in place at P3: it would change what the six
  spec-pack callers read while this repository still runs them.
- A second scoped-name helper for `flow-`: two helpers can name the same scope
  differently, and report would miss the file validate wrote.

**The old business-flow checks.** `packages/qfai/src/core/businessFlow.ts`
and `packages/qfai/src/core/validators/businessFlowTraceability.ts` raise
`QFAI-BFLOW-005` and `QFAI-BFLOW-006` from `_policies/04_Business-Flow.md`, a
spec-pack file. They land at P7 with the old-validators REMOVE row, which the
user widened to them on 2026-09-24 (batch record P4-C1). The deletion takes the
flow-document half of `businessFlow.ts`, `businessFlowTraceability.ts`, and the
`scanBusinessFlows` and `storiesByFlow` calls in `atddTraceability.ts`. E1
reuses the annotation half, `parseTestFlowRefs`, which stays.

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

### Story-tree layout

L1 cases pass the file texts, and the test files' texts where a family reads
annotations, to `buildStoryTreeModel(files)` (E2) and run the family's module on
the model. They create no directory and do not call `validateProject`. L3 cases
build the tree in a `mkdtemp` directory and call `runValidate` in-process, call
the module on that tree, or run a real `git` against it. A family whose
decision needs the disk is an L3 case: the unlisted contract reads `api/`
through `buildContractIndex`, and `QFAI-ASSETS-003` reads `tech.md` from
`paths.contractsDir`.

| Layer          | Where                                                                                                                                  | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1 Unit        | `packages/qfai/tests/unit/core/validators/`, one file per module; `packages/qfai/tests/unit/core/storyTree/` for E3 and the rule forms | Each `sdd` family on texts passed to `buildStoryTreeModel(files)` (TC-0004-0075 to 0078, 0081 to 0085, 0092 to 0099), the protected set and the change-request rows (TC-0004-0089 to 0091, 0114, 0115), and each `atdd` and `tdd` family (TC-0004-0100 to 0106)                                                                                                                                                                                                                                                                                                                                                                      |
| L3 Integration | `packages/qfai/tests/integration/`                                                                                                     | Layout selection (TC-0004-0074) and the old-layout error under each profile (TC-0004-0107), through `runValidate` in-process on a `mkdtemp` tree; the unlisted contract and `QFAI-ASSETS-003` on a `mkdtemp` tree (TC-0004-0079, 0080); the drift families against a base branch in a real repository (TC-0004-0086 to 0088, 0116, 0117); the source-comment guard, through the exported `runLintShipping(root)` on a `mkdtemp` package root whose `src/*.ts` files carry planted comment lines, with the returned violations as the oracle (TC-0004-0109, 0110); `--flow` and `--spec` through `runValidate` (TC-0004-0111 to 0113) |
| L5 E2E         | `packages/qfai/tests/e2e/`                                                                                                             | One journey per story, US-0004-0040 to 0048                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Boundaries that need a case of their own:

- A tree holding both `spec-*/` and story-tree files reads as the spec-pack
  layout (TDD-0068).
- The base ref is missing, and the directory is not a repository: two cases,
  because git fails differently (TDD-0096, TDD-0097).
- A merge base with no `decisions.md` reports nothing, and the next branch
  whose base holds the tree reports again (TDD-0162).
- A Status change alone raises nothing, while a Content change does
  (TDD-0094, TDD-0095).
- A change confined to `Change request:` rows, appended and then moved on
  (TC-0004-0091, 0114, 0115).
- `SUPERSEDED (by DEC-NNNN)` passes and `SUPERSEDED` without parentheses fails
  (TDD-0085).
- A `Test exception:` row at DONE against one at WIP; no cascade from a BF to
  its story's AC; a misspelled exempted ID exempts nothing (TDD-0130 to 0134).
- A `--flow` value that is not an ID against a `BF-NNNN` ID the tree does not
  define (TDD-0148, TDD-0149).
- An old composite ID is reported once, by its existing class (TDD-0144).
- The old layout under each of the five profiles (TDD-0135 to 0139). These
  cases land in P7's last commit with the wiring they test.

Existing `--spec` tests stay unchanged through P6. They pin that the
generalised `scopedReportPath` still writes today's `spec-` names.

## NFR approach

- **discussion-20260923063306456#NFR-0005: at most 120% of the baseline.**
  The first commit of the P2–P8 pull request records a baseline from the P1
  integration commit. Build that commit's CLI, run its `qfai init` into an
  empty directory, and save a pristine snapshot of the generated tree. At P3,
  generate and measure the new story-tree init output for diagnosis. At P8,
  rebuild and measure the final CLI and its own pristine init output for the
  merge gate. On the same machine, restore the relevant snapshot before each
  of five default-profile `qfai validate --fail-on error` runs for each CLI.
  Time the complete validation, including its exit. An exit code of 1 is
  usable only when validation completed and the code came from findings;
  `QFAI-SCAN-002`, a crash, or an interrupted scan invalidates the run. Each
  run must produce its own complete `validate.json` result with no
  `QFAI-SCAN-002` finding. Record the CLI commit and build identity, the
  generated tree's hash, path count and bytes, the Node version, OS and CPU,
  each exit code, finding count and result-report path, five durations per
  side, both medians and their ratio in
  `.qfai/evidence/story-tree-validate-time.md`. Every run must be valid, and
  the P8 median must be at most 1.2 times the baseline median before the
  P2–P8 pull request merges. The P3 parity fixture at
  `packages/qfai/tests/fixtures/story-tree-init/` separately checks what P3
  init seeds; it is not the old CLI's timing input. This is an evidence gate,
  not a test case: a test reading a hand-written file cannot fail on a
  regression. CI does not time the run because CI runners are not one machine.
- **NFR-0002: same input, same result.** E2, E3 and every family sort their
  output by file, then by ID. A breach shows as two runs over one tree writing
  different `validate.json` files.
- **NFR-0004 and discussion-20260923063306456#NFR-0007: actionable findings.**
  Each family's message names what the contract's "The message names" column
  lists, and the old-layout error names the path and
  `/qfai-migration-spec-to-story` in one sentence. A breach is a case whose
  oracle names a file or an ID the finding does not carry.
- **discussion-20260923063306456#NFR-0004: no internal IDs in shipped files.**
  The source-comment guard, the post-build guard and the smoke test hold one
  pattern set. A breach is a failure of `pnpm ci:lint` or of the post-build
  guard on the clean surface, or a pass on a planted out-of-band ID
  (TC-0004-0109, 0110).
- **This repository stays at zero errors in every phase.** A breach is any
  story-tree finding code in this repository's own `qfai validate` output
  before P7.

## Risk mitigation

| Risk                                                                                                                     | Likelihood / impact | Mitigation                                                                                                                                             | Trigger to act                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| The `saas-package` profile skips ATDD-class and implement-class gates silently, and a skipped gate reads as a passed one | med / high          | Each skipped gate emits `D-SAAS-PACKAGE-VERIFY-SKIPPED` (info) naming itself, so the skip is stated rather than inferred from an absence               | A gate is added to the skip set without a matching finding             |
| The validate-side skip set and the certify-side `notes:` (spec-0014) drift apart                                         | med / high          | The two are required to be identical; they are a declared pair rather than two independently maintained lists                                          | Either side's skip set changes in a diff that does not touch the other |
| Deleted validators stay referenced in active spec text, so the SSOT describes a set the code does not have               | high / med          | Maintenance note 1 makes removal part of the same change; the File Touchpoints table names real module paths, so a deletion breaks the reader's search | A path in the touchpoints table no longer resolves                     |
| The pack-location lane walks the whole tree and becomes slow enough to be disabled                                       | low / med           | The lane scans staged / changed directories only (DR-0274) and passes silently otherwise; no full-tree walk                                            | A full-tree walk is proposed for the lane                              |

### Story-tree layout

| Risk                                                                                                                                                                                                                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                                                                                                                                                                                                                     | Trigger to act                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A story-tree family fires on this repository's spec-pack tree before P7                                                                                                                                                                                                                                                               | med / high          | Families are selected by E1's predicate, and TC-0004-0074 pins that a tree holding `spec-*/` runs none                                                                                                                                                                                                                                         | A story-tree finding code in this repository's own `qfai validate` output before P7                                                                               |
| A drift family reports when git cannot answer                                                                                                                                                                                                                                                                                         | med / high          | `gitChanges.ts` returns `null` for an unresolvable base, and `null` reports nothing; the two failure kinds have separate cases                                                                                                                                                                                                                 | A finding from either drift family on a CI run with no base ref                                                                                                   |
| The contract-index change reaches the six spec-pack callers of `buildContractIndex` before P7                                                                                                                                                                                                                                         | med / high          | `contractIndex.ts` is left alone until P7; `cli/` and `design/` are enumerated inside E2 only                                                                                                                                                                                                                                                  | A diff to `packages/qfai/src/core/contractIndex.ts` in a commit before P7                                                                                         |
| A timing run measures an incomplete scan or a changed init tree, so its duration is not comparable                                                                                                                                                                                                                                    | med / med           | Restore each version's pristine init snapshot before every run; record both tree identities and findings; reject `QFAI-SCAN-002` and interrupted runs; check P3 init parity against its separate fixture                                                                                                                                       | A scan stops early, the snapshot changes, or P3 init parity fails                                                                                                 |
| The guards learn the new shapes while shipped files still carry out-of-band IDs of them, so they fail on files nobody touched                                                                                                                                                                                                         | med / high          | The P1 pull request removes the 54 occurrences in 25 shipped files in a commit ahead of the one that changes the three guards and their shared pattern set, and its CI runs the guards over the cleaned tree before it merges                                                                                                                  | `lint:shipping` or the post-build guard fails in the P1 pull request's CI                                                                                         |
| The old-layout error is wired before this repository is migrated, so every profile fails here                                                                                                                                                                                                                                         | low / high          | It is wired in P7's last commit, after the migration and the REMOVE rows                                                                                                                                                                                                                                                                       | The wiring appears in a commit before the one that migrates this repository                                                                                       |
| P7 deletes `packages/qfai/src/core/specPackParsers.ts` while E3 still reads tables through `parseFirstMarkdownTable`                                                                                                                                                                                                                  | med / med           | The table helpers E3 uses move beside E3 before the file goes                                                                                                                                                                                                                                                                                  | The P7 deletion list names `specPackParsers.ts` while E3 imports it                                                                                               |
| The old business-flow validators are deleted at P7 with E1 still importing `parseTestFlowRefs`                                                                                                                                                                                                                                        | med / low           | They go with the old-validators REMOVE row, which takes only the flow-document half of `businessFlow.ts`; E1 imports only the annotation half                                                                                                                                                                                                  | The P7 deletion removes `parseTestFlowRefs`, or a `QFAI-BFLOW-*` finding appears on a story tree                                                                  |
| Until P7, `--profile tdd` runs `QFAI-DRIFT-001`, which clears an edited spec or contract path only through an approved `.qfai/decisions/CR-*.md` naming it. The P2–P8 pull request edits many such paths, so its `tdd` gate and the dogfood `tdd` lane fail. From P7 the story-tree family compares against a base with no story tree | high / high         | An approved change request whose Impact scope names every spec and contract path this change edits, approved by the user, is committed before the first `tdd` gate of the P2–P8 pull request (user answer U1). From P7, a base with no story tree reports nothing (BR-0004-0081, TC-0004-0117); this holds until the P2–P8 pull request merges | A `QFAI-DRIFT-001` finding in the P2–P8 pull request's `tdd` gate or in the dogfood `tdd` lane, or a story-tree upstream-edit finding after P7's migration commit |
| The base-without-story-tree predicate silences the drift gate on a later branch                                                                                                                                                                                                                                                       | low / high          | It reads only `decisions.md` at the merge base, which init seeds and every migrated tree has; the And clause of EX-0004-0089 pins that the next branch reports again                                                                                                                                                                           | A protected change on a branch whose base has `decisions.md` raises no finding                                                                                    |
| `QFAI-ATDD-111` and `QFAI-ATDD-112` fire for this spec's new integration cases and E2E rows until their tests exist                                                                                                                                                                                                                   | high / med          | `/qfai-atdd` and `/qfai-implement` run in the same change, so the tests land before it merges; no dogfood pin is added                                                                                                                                                                                                                         | The change is marked ready to merge with a `QFAI-ATDD-111` or `QFAI-ATDD-112` finding naming spec-0004                                                            |
| Generalising `scopedReportPath` changes the `spec-` names that `--spec` runs write before P7                                                                                                                                                                                                                                          | low / med           | The `spec` prefix produces today's name, and the existing `--spec` tests stay unchanged until the P7 REMOVE row                                                                                                                                                                                                                                | An existing `--spec` scoped-output test needs editing before P7                                                                                                   |
