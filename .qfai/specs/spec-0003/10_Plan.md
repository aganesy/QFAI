# 10 Plan

- Spec: spec-0003
- Parent: CAP-0003
- Role: solution-architect + test-design-analyst

## Implementation approach

### Primary Source File

| File                                     | Responsibility                                                 |
| ---------------------------------------- | -------------------------------------------------------------- |
| `packages/qfai/src/cli/commands/init.ts` | CLI entry point. runInit() orchestrates all init operations    |
| `packages/qfai/src/cli/lib/fs.ts`        | copyTemplatePaths / copyTemplateTree for template distribution |
| `packages/qfai/src/cli/lib/assets.ts`    | getInitAssetsDir() for resolving asset root                    |

### Key Functions (implemented)

| Function                    | Responsibility                                                               |
| --------------------------- | ---------------------------------------------------------------------------- |
| `runInit()`                 | Orchestrator: template copy, git config, symlink sync, prune, report         |
| `syncIntegrationWrappers()` | Old-wrapper prune, copilot-instructions, instructions distribution, symlinks |
| `createSkillSymlinks()`     | Directory symlinks for 4 integration dirs                                    |
| `createAgentSymlinks()`     | File symlinks for .claude/agents/ and .github/agents/                        |
| `ensureSymlink()`           | Idempotent symlink creation with force/broken link handling                  |
| `pruneStaleQfaiWrappers()`  | Remove deprecated commands/prompts/non-symlink skill dirs                    |
| `pruneLegacySkillFiles()`   | Remove 10_workflow.md from skill directories                                 |
| `configureGitSymlinks()`    | Set git config core.symlinks true                                            |

### Intent-driven entry (CAP-0018)

This change alters one existing architectural element: **`GOVERNED_ASSISTANT_LAYERS`**
(`packages/qfai/src/core/assistantAssetProvenance.ts:37`) gains
`process/workflows`, so the plans become a governed layer while
`process/migrations/` stays ungoverned (BR-0003-0053, BR-0003-0054). Its
consumers today:

- `isGovernedAssistantLockKey`, which parses a lock key;
- `collectGovernedAssistantFiles`, the governed-file walk;
- the copy exclusion at `packages/qfai/src/cli/commands/init.ts:515`, which
  routes a governed layer to the governed writer;
- the governed-layer checks of `packages/qfai/src/core/validators/assistantAssets.ts`
  at lines 598, 618 and 923.

Three sites read a layer as the first path segment, and a two-segment layer
breaks them. The element therefore gains one helper beside the list, which maps
a relative path to its governed layer or to none, and all three call it:

| Site                                                  | What breaks                                                             | Owner                   |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------- |
| `assistantAssetProvenance.ts:194`, the lock-key parse | Every `process/workflows/…` key is rejected, so no plan can be recorded | spec-0003, BR-0003-0053 |
| `validators/assistantAssets.ts:616`, recorded layers  | A deleted `process/workflows/` layer goes unreported                    | spec-0004, BR-0004-0038 |
| `validators/assistantAssets.ts:631`, present layers   | A missing plan is skipped as if its layer were absent                   | spec-0004, BR-0004-0038 |

The helper and the lock-key parse are this spec's. The two validator reads are
spec-0004's, in the same U4 change. The risk that validate starts reporting the
installed plans is the `QFAI-ASSETS-*` row of spec-0004 `10_Plan.md`
`## Risk mitigation`.

`joinAssistantLayer` in `core/paths/assistantPaths.ts` takes a one-segment
layer type, so the `init.ts:515` exclusion also needs the two-segment form
typed. That is part of the same U4 change.

`addReviewPointer` taking a list of directives is a change inside one caller,
and the ignore lines are data, so neither is an element.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U4**, after spec-0018's U1 (the
correspondence module in `core/workflow/plans.ts`) and U3 (spec-0015's
`qfai-maintain` routing entry):

- the install set through the existing asset copy and wrapper sync
  (BR-0003-0061), with no `agents/openai.yaml` (BR-0003-0062);
- `.qfai/runs/` and `!.qfai/evidence/workflow/` in the lists of
  `core/gitignore.ts` (BR-0003-0013);
- the entry directive through `addReviewPointer` (BR-0003-0051);
- the mode line and the upgrade report: conflicts, `qfai init --force` for an
  absent routing entry, and the skipped-skill count (BR-0003-0052, 0055, 0056,
  0059);
- no manifest merge on a plain run (BR-0003-0060);
- Windows parity, with lock keys written with `/` (BR-0003-0058);
- `process/workflows` in `GOVERNED_ASSISTANT_LAYERS`, the path-to-layer
  helper, the lock-key parse through it, and the two-segment layer type of
  `joinAssistantLayer` (BR-0003-0053, BR-0003-0054).

Left out: the correspondence module itself (spec-0018); the routing entries
(spec-0015); a manifest merge on a plain run (J2).

### Removing the work-log seed

`qfai init` stops seeding `.qfai/steering/` and leaves an existing one alone.
This is the init part of one change across six specs. Its order is stated once,
in spec-0004's `10_Plan.md` under "Removing the work-log surface".

The change adds no architectural element. What leaves
`packages/qfai/src/cli/commands/init.ts`:

- `seedProjectSteering`, `buildProjectSteeringEntryTemplate`,
  `summarizeSeedDrift`, `readSeedBodyForDrift` and `type SeedComparison`;
- `normalizeNewlines` and `SEED_DRIFT_MAX_BYTES`, which only the seed code
  reaches (`OPEN_READ_FLAGS` stays, because other readers use it);
- the folding of `projectSteeringResult` into the run's report;
- the work-log line that `buildCopilotInstructions` writes;
- "steering" in the `--force` NOTE's list of what is not overwritten.

`retireWithdrawnGovernedAssets` and the `.assets.lock.json` record it reads stay
as they are. They are what deletes an unedited, recorded copy of
`catalog/worklog-entry.schema.md` under `--force` and keeps an edited one with a
note.

The alternative considered was a new guard that refuses any write under
`.qfai/steering/`. It was rejected because nothing writes there once the seed
is gone: no path in `packages/qfai/src/**` names the directory.

What the change leaves out:

- migration or deletion of an adopter's `.qfai/steering/`;
- any change to the retire pass or the lock record;
- the legacy `.qfai/assistant/steering/` layout and its sunset.

## Test approach

### Integration Tests (`tests/cli/init.test.ts`)

| Annotation                  | Verification                                        |
| --------------------------- | --------------------------------------------------- |
| QFAI:SPEC-0003:US-0003-0001 | Empty directory init creates all expected files     |
| QFAI:SPEC-0003:US-0003-0002 | Idempotent init skips existing files                |
| QFAI:SPEC-0003:US-0003-0003 | --force overwrites skills but protects skills.local |
| QFAI:SPEC-0003:US-0003-0005 | Skill symlinks are valid directory symlinks         |
| QFAI:SPEC-0003:US-0003-0011 | Instructions files created in new repo              |

### Intent-driven entry (CAP-0018)

Levels follow `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.

**Layers.**

| Layer       | What it proves                                                                                                                                                                                                                | Where                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| integration | TC-0003-0063..0090, TC-0003-0091..0093: `qfai init` and a plain upgrade on temp repositories — the ignore entries, the install set and wrappers, the entry directive, the mode line, the provenance lock, the conflict report | `packages/qfai/tests/integration/init/`, one module per BR |
| E2E         | US-0003-0029, discharged by the spec-0018 journey whose first step runs `qfai init` from the built CLI and asserts the installed entry; the upgrade half stays in the rows above                                              | `packages/qfai/tests/e2e/`, annotated with both story IDs  |

No new test goes in `tests/cli/`. An integration annotation there answers no layer, and
the files there are named by `done` rows, which an edit would make stale.

**Modules, one per BR.**

| Module under `tests/integration/init/` | BR           | Cases                                                  |
| -------------------------------------- | ------------ | ------------------------------------------------------ |
| `managedGitignoreBlock.test.ts`        | BR-0003-0013 | TC-0003-0091, TC-0003-0090                             |
| `entryInstallSet.test.ts`              | BR-0003-0061 | TC-0003-0093, TC-0003-0063, TC-0003-0064               |
| `noOpenaiYaml.test.ts`                 | BR-0003-0062 | TC-0003-0065                                           |
| `entryDirective.test.ts`               | BR-0003-0051 | TC-0003-0066 to TC-0003-0070                           |
| `modeLine.test.ts`                     | BR-0003-0052 | TC-0003-0071, TC-0003-0072, TC-0003-0073               |
| `governedPlans.test.ts`                | BR-0003-0053 | TC-0003-0074, TC-0003-0075, TC-0003-0077               |
| `upgradeRecord.test.ts`                | BR-0003-0054 | TC-0003-0078, TC-0003-0079                             |
| `conflictReport.test.ts`               | BR-0003-0055 | TC-0003-0081 to TC-0003-0084                           |
| `forceGuidance.test.ts`                | BR-0003-0056 | TC-0003-0086                                           |
| `forceRoutingMerge.test.ts`            | BR-0003-0057 | TC-0003-0087                                           |
| `windowsParity.test.ts`                | BR-0003-0058 | TC-0003-0092, TC-0003-0076, TC-0003-0080, TC-0003-0088 |
| `skippedSkillCount.test.ts`            | BR-0003-0059 | TC-0003-0089                                           |
| `plainRunManifest.test.ts`             | BR-0003-0060 | TC-0003-0085                                           |

**Cases that stand alone.**

- **The upgrade states.** One factory builds every state from a fresh `qfai init` tree plus
  the named overlays of `05_Examples.md` `## Upgrade-state fixtures`. An unknown overlay name
  fails the test. No earlier release is installed, and no snapshot tree is checked in.
- **The exit-0 conflict matrix.** TC-0003-0083 asserts exit 0 over an edited plan, an absent
  routing entry, a dropped reviewer and an invalid mode, one install each (DR-0003-0033).
- **`git check-ignore` is the oracle** for the ignore entries (TC-0003-0090, TC-0003-0091 and TC-0003-0092). No case
  counts the lines of the managed block, whose single source is `core/gitignore.ts`.
- **Setups no other case can share:** the CRLF variants (TC-0003-0092, 0067, 0076), the
  symbolic-link refusal (0070), the rerun that writes nothing (0077) and the built CLI under a
  root with a space (0088).

**Kept failures.** Each has an `error` row, and none is invented:

- an edited asset is kept and reported (TC-0003-0081);
- a plain run leaves a customized `agent-routing.yml` byte-identical (TC-0003-0085);
- `qfai init --force` is named for an absent routing entry and never for a dropped reviewer,
  which it cannot restore (TC-0003-0086);
- a symbolic-link `AGENTS.md` is refused (TC-0003-0070), one representative of the shared
  writer's refusals.

`plainRunManifest.test.ts` and `forceGuidance.test.ts` cite
`discussion-20260923171450572#FAULT-023` in the test file, so the fault-seed guard finds the
seed's init side.

**What existing guards hold.** No case here repeats them:

- the shared writer's other refusals (a hard link, bytes that are not UTF-8, a file changed
  between read and write): the existing entry-point tests under `tests/cli/`;
- no stage skill carrying `disable-model-invocation`: one executable test outside this spec;
- the host adapter matrix over the same wrappers: TC-0003-0063 is discharged by one
  executable test that carries both specs' annotations;
- shipped assets free of internal identifiers: `distributedSurfaceLeakage.test.ts` and the
  post-build guard;
- operator-facing strings in English: `cliMessageLanguage.test.ts`.

**Order.** Tier 2 of spec-0018 `10_Plan.md` `### Order in which the rows go green`.
Twenty-one rows need spec-0018's plans, `qfai-run` and correspondence module, and four of
them also need spec-0015's `qfai-maintain` routing entry. The gitignore, entry-directive,
lock-key and skipped-skill rows need neither. US-0003-0029 closes at tier 5, on the tier-4
journey. spec-0017's `windows-parity` job lands only once `tests/integration/init/` holds a
collected test file.

**Windows parity.** The same cases run on the Linux and the Windows jobs:

- CRLF comes from fixtures that write the bytes, never from the checkout;
- every link a case needs — the host wrappers, the refused `AGENTS.md` — is made at run time
  inside the temp root, and nothing under `packages/` is a tracked link;
- every temp root is read from the environment (`os.tmpdir()`), and its name contains a
  space. The Windows job points `TEMP` and `TMP` at such a path, so a case that hard-codes a
  path fails there;
- no case asserts case-insensitivity, because no clause of CLI-INIT states a case rule.

**Findings carried on purpose.**

| Finding                                                    | Why it is expected                                      | Until                            |
| ---------------------------------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `QFAI-ATDD-111` for US-0003-0029                           | The journey that discharges it does not exist yet       | The tier-4 journey lands         |
| `QFAI-ATDD-112` for TC-0003-0063..0090, TC-0003-0091..0093 | The integration tests do not exist yet                  | ATDD writes them                 |
| The `tdd` pin of 73 errors on `tdd/test-list.md`           | Pre-existing; this change appends rows and repairs none | A later change that repairs them |

Each push to the batch's draft pull request lists these in the batch evidence, and its CI
log is read against that list.

### Tests for the work-log removal

- The removal adds no test to this spec (`CR-20260925-0010`). The tests that
  pinned the seed are deleted with it, and no test asserts that
  `.qfai/steering/` is absent.
- The type check fails on any import of a removed function.
- The withdrawn schema is retired by the generic pass, which
  `packages/qfai/tests/core/assistantAssetProvenance.test.ts` already tests.

## Dependencies

| Dependency           | Content                                              |
| -------------------- | ---------------------------------------------------- |
| spec-0004 (validate) | validate checks init-created directory structure     |
| spec-0006 (doctor)   | doctor diagnoses init-created config and directories |

## Implementation Order

US-0003-0001..US-0003-0020 are already implemented; those sections document existing behaviour.
US-0003-0021..US-0003-0028 (CHG-007) are not implemented and carry the order below.

## 5. CHG-007 — Shipped Workflow Set (How)

### Surfaces this spec owns

| Surface                                               | Responsibility                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/qfai/assets/init/root/.github/workflows/**` | The shipped set itself: the hardened validate workflow plus the new orchestrator file             |
| `packages/qfai/src/cli/lib/fs.ts`                     | `copyTemplateTree` / `copyTemplatePaths` — the only copy primitives (existing, unchanged surface) |
| `packages/qfai/src/cli/commands/init.ts`              | `pruneMatchingEntries` (to be exported), the shipped-name lists, the provenance reader / writer   |
| `packages/qfai/tests/assets/assets.test.ts`           | Co-change: the floating-major-reference assertions are updated / subsumed in the same change      |
| Structural-shape gate module (test suite)             | The declared expected shape — the single SSOT for the pinned values                               |

### Explicitly not this spec's surfaces

| Surface                                                      | Owner                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| `.github/workflows/**` (QFAI's own)                          | spec-0017 (`toolchain`)                                         |
| `packages/qfai/scripts/lint-shipping.ts`                     | spec-0017 — the pre-build shipped-YAML version rule lands there |
| `packages/qfai/scripts/check-no-internal-version-leakage.sh` | spec-0017 — and it is not to be modified at all (DR-0003-0008)  |
| Workflow-hygiene lint script                                 | spec-0017 (rule set) + spec-0004 (`pnpm ci:lint` lane registry) |
| Adopter drift finding (`workflows.integrity`)                | spec-0006 (`qfai doctor`)                                       |

### Ordering constraints

1. The pre-build shipped-YAML version rule (spec-0017) and the `assets.test.ts` co-change land **before or with** the shipped pin change (REQ-0025), or pack verification, the leakage guard and the asset suite all break at once.
2. The structural contract gate (REQ-0031) lands **with or before** spec-0017's retirement of the repository's own copy of the shipped validate workflow. That copy is currently the only cross-check a reviewer can perform by eye.
3. The ownership contract (REQ-0030) lands **before** the shipped set grows, so a larger create-only surface is not shipped without a declared owner.
4. `pruneMatchingEntries` is exported before any refresh-path work, since the no-parallel-implementation criterion is otherwise unsatisfiable.

### Test placement

New obligations are discharged in `packages/qfai/tests/integration/**` per the ATDD annotation hard gate (`QFAI-ATDD-112`), including the rows whose derived `Level` is `unit` — per-level routing is a target state that is not enforced.

## NFR approach

- The legacy floors of `01_Spec.md` `## Applicable NFR` (NFR-0012, NFR-0040, NFR-0042, the
  NFR-S series and the CHG-007 NFR-C series) are unchanged by the intent-driven entry, and their
  existing measurements stand.

### Intent-driven entry (CAP-0018)

- **NFR-0011, init and upgrade half: the same behaviour on Windows as on Linux.** Met by the
  BR-0003-0058 test cases: CRLF comes from fixtures, and every fixture root has a space in its
  name. They run on Linux in the `test` job and on Windows through the `test:windows-parity`
  script of spec-0017's `windows-parity` job. Breach: a red `windows-parity` run on the init and
  migration suites. That job gates no merge (spec-0017's risk row), so the breach is read on
  `ci-pass`, on the pull request and on the default branch.
- **NFR-0002, NFR-0015, NFR-0016 and NFR-0017 for the installed tree and the init summary.** The
  shipped entry-point templates gain the entry directive and the summary gains the mode and
  conflict lines. Met by the existing guards, which this entry leaves as they are. Breach: the
  asset line-budget check over an asset past 800 lines or 400 characters; the four
  distributed-surface guards (`lint:shipping`, `check-no-internal-version-leakage.sh`,
  `distributedSurfaceLeakage.test.ts`); `canonicalQfaiLauncher.test.ts` on a shipped mention of the
  command in another form; `cliMessageLanguage.test.ts` on a non-English operator string.
- **BC-02 and OC-69: `active` becomes the default on upgrade, and install stays create-only.** Met
  by the upgrade report: it names the mode in force and every conflict, and a plain run overwrites
  no asset the project edited and merges no manifest (BR-0003-0052, BR-0003-0055, BR-0003-0060).
  Breach: an upgrade that changes what a project does without the report naming the mode and the
  conflicts, which the BR-0003-0055 test cases observe.

## Risk mitigation

| Risk                                                                                                                                       | Likelihood / impact | Mitigation                                                                                                                                                                                                                                                                                                                        | Trigger to act                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| The shipped pin change lands before the pre-build version rule, so pack verification, the leakage guard and the asset suite break together | med / high          | Ordering constraint 1 makes the pre-build rule a co-change rather than a follow-up; the asset suite is updated in the same commit                                                                                                                                                                                                 | `pnpm verify:pack` or the leakage guard fails on a branch that only touched a shipped pin                          |
| The structural contract gate lands after the repository's own copy of the shipped validate workflow is retired, leaving no cross-check     | med / high          | Ordering constraint 2 requires the gate with-or-before the retirement, so the eye-check is replaced before it is removed                                                                                                                                                                                                          | The own-copy retirement appears in a diff with no gate in the same change                                          |
| The shipped set grows before an owner is declared, so a wider create-only surface ships unowned                                            | low / high          | Ordering constraint 3 lands the ownership contract first; `SHIPPED_WORKFLOW_NAMES` is in-binary, so a new name cannot arrive by globbing the asset tree                                                                                                                                                                           | A new `qfai-*.yml` asset appears without a matching entry in the shipped-name list                                 |
| A refresh path re-implements `pruneMatchingEntries` instead of reusing it, splitting the prune rule in two                                 | med / med           | Ordering constraint 4 exports the helper first, which makes the no-parallel-implementation criterion satisfiable rather than aspirational                                                                                                                                                                                         | A second prune walk appears anywhere under `src/cli/`                                                              |
| Deleting the TC-0003-0022 tests removes a selector a live row still names, because they share files with live rows                         | med / med           | Remove only the `it` blocks whose selector names TC-0003-0022, with their annotations, in `tests/cli/init.test.ts` and `tests/integration/initSpec0003.test.ts`. Remove the `joinProjectSteering` assertions of the TC-0003-0025 tests in `initSpec0003.test.ts` and `init.test.ts` with the symbol, and leave their row as it is | `TDDLIST_SELECTOR_UNRESOLVED` on a row of this ledger that the change did not retire                               |
| An adopter runs `qfai init --force` to clear a skipped stage skill and loses local edits to it                                             | med / high          | The upgrade report counts the skipped skills and says `--force` replaces them with the shipped versions (BR-0003-0059)                                                                                                                                                                                                            | An upgrade report naming skipped skills whose project copies carry local edits, or an adopter report of lost edits |
| The entry directive prepended to `AGENTS.md` or `CLAUDE.md` collides with the adopter's own first lines                                    | low / med           | Prepended only where no operative copy exists, through the review directive's mechanism and refusals (BR-0003-0051, DR-0003-0034)                                                                                                                                                                                                 | An `init` run over a fixture with a hand-written directive that produces two copies                                |
| `active` by default surprises an upgraded adopter mid-work                                                                                 | med / med           | The init summary names the mode in force, and `off` and `shadow` stay available                                                                                                                                                                                                                                                   | An upgrade summary without the mode line                                                                           |

### Intent-driven entry (CAP-0018)

- The last three rows of the table above are this entry's.
- The other half of the plain-upgrade limit, that a plain upgrade needs `qfai init --force` for the
  routing entries a release adds, is spec-0015's risk row, beside its record of the user's answer.
  The non-gating Windows job is spec-0017's.
