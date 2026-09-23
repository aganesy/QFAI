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
| `syncIntegrationWrappers()` | README generation, copilot-instructions, instructions distribution, symlinks |
| `createSkillSymlinks()`     | Directory symlinks for 4 integration dirs                                    |
| `createAgentSymlinks()`     | File symlinks for .claude/agents/ and .github/agents/                        |
| `ensureSymlink()`           | Idempotent symlink creation with force/broken link handling                  |
| `pruneStaleQfaiWrappers()`  | Remove deprecated commands/prompts/non-symlink skill dirs                    |
| `pruneLegacySkillFiles()`   | Remove 10_workflow.md from skill directories                                 |
| `configureGitSymlinks()`    | Set git config core.symlinks true                                            |

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
is gone, so the absence tests hold the rule without new code.

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

### Tests for the work-log removal

- TC-0003-0059, TC-0003-0060 and TC-0003-0061 go in
  `packages/qfai/tests/integration/**`, like the other new obligations of this
  spec (see Test placement below).
- TC-0003-0060 runs plain `init` and `init --force` against a partial seed
  (EX-0003-0053). It hashes every file under `.qfai/steering/` before and
  after. A full, unedited seed would pass on the code that still seeds, so the
  test could not fail first.
- TC-0003-0061 has two boundaries, each with its own row: a recorded, unedited
  schema copy is deleted, and an edited one stays with the edited-content note.
- Each test builds its own tree. The trees differ from the ones spec-0004's
  tests build, so no shared fixture is introduced.

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

## Risk mitigation

| Risk                                                                                                                                       | Likelihood / impact | Mitigation                                                                                                                                                                                                                                                                                                                        | Trigger to act                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The shipped pin change lands before the pre-build version rule, so pack verification, the leakage guard and the asset suite break together | med / high          | Ordering constraint 1 makes the pre-build rule a co-change rather than a follow-up; the asset suite is updated in the same commit                                                                                                                                                                                                 | `pnpm verify:pack` or the leakage guard fails on a branch that only touched a shipped pin |
| The structural contract gate lands after the repository's own copy of the shipped validate workflow is retired, leaving no cross-check     | med / high          | Ordering constraint 2 requires the gate with-or-before the retirement, so the eye-check is replaced before it is removed                                                                                                                                                                                                          | The own-copy retirement appears in a diff with no gate in the same change                 |
| The shipped set grows before an owner is declared, so a wider create-only surface ships unowned                                            | low / high          | Ordering constraint 3 lands the ownership contract first; `SHIPPED_WORKFLOW_NAMES` is in-binary, so a new name cannot arrive by globbing the asset tree                                                                                                                                                                           | A new `qfai-*.yml` asset appears without a matching entry in the shipped-name list        |
| A refresh path re-implements `pruneMatchingEntries` instead of reusing it, splitting the prune rule in two                                 | med / med           | Ordering constraint 4 exports the helper first, which makes the no-parallel-implementation criterion satisfiable rather than aspirational                                                                                                                                                                                         | A second prune walk appears anywhere under `src/cli/`                                     |
| Deleting the TC-0003-0022 tests removes a selector a live row still names, because they share files with live rows                         | med / med           | Remove only the `it` blocks whose selector names TC-0003-0022, with their annotations, in `tests/cli/init.test.ts` and `tests/integration/initSpec0003.test.ts`. Remove the `joinProjectSteering` assertions of the TC-0003-0025 tests in `initSpec0003.test.ts` and `init.test.ts` with the symbol, and leave their row as it is | `TDDLIST_SELECTOR_UNRESOLVED` on a row of this ledger that the change did not retire      |
