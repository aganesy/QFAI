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

### Story-tree layout

This spec introduces no architectural element. It consumes two that other
plans introduce, and gives an existing seam a new consumer.

- **Story-tree layout and ID grammar** (spec-0001's plan):
  `packages/qfai/src/core/storyTree/layout.ts`, landing at P3. Init is one of
  its first three consumers. It reads the seed set and the spec-pack predicate
  from it, and resolves `paths.specsDir` and `paths.contractsDir` through
  `config.ts#resolvePath`.
- **Migration implementation** (spec-0018's plan):
  `packages/qfai/src/migration/specToStory/`, landing at P5.
- **Init's two writers**, both already exported from
  `packages/qfai/src/cli/commands/init.ts` and already imported by
  `packages/qfai/src/cli/commands/doctor.ts`. Migration steps 9 and 10 import
  them unchanged (BR-0003-0055, EX-0003-0061):

  | Writer                       | Consumers once P5 lands                                                                                                                                                                |
  | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `ensureRootGitignoreEntries` | `runInit`; `doctor.ts`; step 10, `packages/qfai/src/migration/specToStory/step10UpdateGitignore.ts`                                                                                    |
  | `repairIntegrationWrappers`  | `doctor.ts`; step 9, `packages/qfai/src/migration/specToStory/step09RepointLinks.ts`. It links through `ensureSymlink`, the writer `runInit` reaches through `syncIntegrationWrappers` |

The work, in the order it is done:

| Phase    | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Modules                                                                                                                                                                                                                                                                                                                                                                                  | Items                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| P1       | The three guard pattern sets learn the `DEC`, `OQ`, `BF`, `US`, `AC`, `EX` and `BR` shapes with the sample band. The change is additive: no pattern is narrowed and no pragma or allowlist entry is added (AC-0003-0028, DR-0003-0008). P1 is a pull request of its own, merged before the rest of the work. Its first commit removes the IDs of those shapes that the shipped surface already holds outside the band (54 occurrences in 25 files, mostly spec-scoped `BR-` and `AC-` IDs in `src/**` comments and shipped skill references), re-spelling each to what the guard accepts (BR-0003-0027). Its second commit changes the pattern sets. Neither commit edits template content for the new layout (NFR-C0005) | `packages/qfai/scripts/check-no-internal-version-leakage.sh`, `packages/qfai/tests/integration/distributedSurfaceLeakage.test.ts`, `packages/qfai/scripts/lint-shipping.ts` (spec-0017's lint), `packages/qfai/tests/helpers/distributedSurfaceScan.ts` (new: the smoke test's scan, moved out of the test so the guard cases can call it), `.agents/rules/distributed-surface.local.md` | BR-0003-0056; TC-0003-0070 to 0072               |
| P3       | The built-in `specsDir` and `contractsDir` defaults and the shipped config switch to `.qfai/spec` and `.qfai/spec/03_contract`. They switch in the same commit as the seeding, so init never writes a config for a tree it does not seed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `packages/qfai/src/core/config.ts`, `packages/qfai/assets/init/root/qfai.config.yaml`                                                                                                                                                                                                                                                                                                    | BR-0003-0051; TC-0003-0063, 0064                 |
| P3       | Init seeds the story tree from the `qfai-sdd` templates P2 adds. The seed step copies through `copyTemplatePaths` with the literal `force: false`, so `--force` never rewrites a seed: the tree is project content, like the `.qfai/steering/` seed. It lands after spec-0004's layout and unlisted-contract validators, because the fresh tree must validate with no error                                                                                                                                                                                                                                                                                                                                               | `packages/qfai/src/cli/commands/init.ts`                                                                                                                                                                                                                                                                                                                                                 | BR-0003-0049, 0050; TC-0003-0059 to 0062         |
| P3       | Old-layout detection: the layout module's spec-pack predicate, or an existing `.qfai/contracts/`, which init tests inline because migration step 1 moves that directory. On a match init skips `.qfai/spec/`, writes everything else, and prints one line naming the detected path and `/qfai-migration-spec-to-story`                                                                                                                                                                                                                                                                                                                                                                                                    | `packages/qfai/src/cli/commands/init.ts`                                                                                                                                                                                                                                                                                                                                                 | BR-0003-0052; TC-0003-0065, 0066                 |
| P5       | The migration skill ships beside the other shipped skills, and init installs and links it the way it does each of them (`collectCanonicalSkillIds`), with no code of its own for it. Steps 9 and 10 import init's writers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-migration-spec-to-story/`, the two step modules above                                                                                                                                                                                                                                                                             | BR-0003-0054, 0055; TC-0003-0068, 0069           |
| P6       | Singular names; `rule/`; no `manifest/*.yml`, because the routing and review-profile defaults ship as package data in `packages/qfai/assets/defaults/`, outside the tree init copies; `kind` read from the card frontmatter; the singular decision negation; `--upgrade-assistant-tree` retargeted; `skill.local/`. The add-only routing merge and the migration memo are removed                                                                                                                                                                                                                                                                                                                                         | `packages/qfai/src/core/paths/assistantPaths.ts`, `packages/qfai/src/core/codexAgentToml.ts`, `packages/qfai/src/core/gitignore.ts`, `packages/qfai/src/cli/commands/init.ts`; `packages/qfai/src/core/manifest/routingPhaseMerge.ts` is deleted                                                                                                                                         | BR-0003-0015, 0057 to 0059; TC-0003-0073 to 0078 |
| P7       | The five merged files replace the four catalog seeds; the spec-pack and `_policies` templates are removed with the tests annotating their TCs; the shipped `distributed-surface.md` and `temporary-files.md` cite `.qfai/spec/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `packages/qfai/src/cli/commands/init.ts`, `packages/qfai/assets/init/root/.agents/rules/`                                                                                                                                                                                                                                                                                                | BR-0003-0053; TC-0003-0067                       |
| After P8 | The guard exception for the migration memo's file name goes. It is a pattern-set change, so it lands in a third pull request, after the P2–P8 pull request that stops writing the memo has merged, and that pull request edits no template (NFR-C0005)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | The three guards and `.agents/rules/distributed-surface.local.md`                                                                                                                                                                                                                                                                                                                        | spec-0003 REMOVE row for the memo                |

`scripts/fresh-init-findings.json` is re-derived in each commit that changes
what a fresh init writes: the P3 seeding, the P6 assistant tree and the P7
seeds.

Alternatives considered:

- **Seed the story tree beside an old layout.** Rejected by the init contract:
  migration step 1's rename of `.qfai/specs` would collide with it.
- **Switch the path defaults at P1.** Rejected: init would write a config for a
  tree it does not seed, and the verify:pack baseline would move for a tree that
  does not exist yet.
- **Give steps 9 and 10 their own link and `.gitignore` writes.** Rejected by
  BR-0003-0055: the migration could then write a link or a block init would not.

## Test approach

### Integration Tests (`tests/cli/init.test.ts`)

| Annotation                  | Verification                                        |
| --------------------------- | --------------------------------------------------- |
| QFAI:SPEC-0003:US-0003-0001 | Empty directory init creates all expected files     |
| QFAI:SPEC-0003:US-0003-0002 | Idempotent init skips existing files                |
| QFAI:SPEC-0003:US-0003-0003 | --force overwrites skills but protects skills.local |
| QFAI:SPEC-0003:US-0003-0005 | Skill symlinks are valid directory symlinks         |
| QFAI:SPEC-0003:US-0003-0011 | Instructions files created in new repo              |

### Story-tree layout

Layers per `catalog/test-layers.md`. L1 cases owe no ATDD annotation; the
ledger owns them.

| Layer          | Where                                                                 | Cases                                                                                                                                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1 Unit        | `packages/qfai/tests/unit/`                                           | TC-0003-0064 (omitted path keys, P3); TC-0003-0069 (steps 9 and 10 import init's writers and carry no link or `.gitignore` write of their own, P5)                                                                                                                                                    |
| L3 Integration | `packages/qfai/tests/integration/`, each run in a `mkdtemp` directory | TC-0003-0059 to 0063 and 0065 to 0067 (seeding, P3 and P7); TC-0003-0068 (migration skill, P5); TC-0003-0070, 0071 (guards over planted copies, P1); TC-0003-0072 (one pattern set across the three guards, read from the shipped guard files and the helper's export, P1); TC-0003-0073 to 0078 (P6) |
| L5 E2E         | `packages/qfai/tests/e2e/`                                            | The story rows for US-0003-0029, 0030 and 0031                                                                                                                                                                                                                                                        |

The guard cases plant one ID per shape in a copy of the clean surface. There is
one case per guard, each band on its own ledger row; each shape is its own test
(`it.each`), so the row's Selector holds one entry per shape (seven), and RED
is recorded per entry. TC-0003-0071 and the smoke test both call
`scanDistributedSurface(root)` from
`packages/qfai/tests/helpers/distributedSurfaceScan.ts`, which also exports the
pattern set TC-0003-0072 compares. TC-0003-0068 stays one row (TDD-0104) with
two Selector entries, one per layout.

Boundary cases that need a case of their own:

- `.qfai/contracts/` alone counts as the old layout (TC-0003-0066).
- `_policies/` alone under `paths.specsDir` counts as the old layout. It has
  a ledger row of its own beside the `spec-*/` run of TC-0003-0065.
- `--force` leaves an edited seed alone and writes a deleted one
  (TC-0003-0062).
- A re-run over a block holding the plural decision negation leaves one marker
  line (TC-0003-0075).
- An ID in the sample band passes and one outside it fails, per guard
  (TC-0003-0070, 0071).
- `DEC-NNNN` and `OQ-NNNN` do not match the leading part of `DEC-NNNN-NNNN`
  and `OQ-NNNN-NNNN` (TC-0003-0072).
- A file the relocation table does not recognise stays at its legacy path,
  uncopied and unlisted (TC-0003-0077).

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

How this spec meets its floors on the story-tree layout, and what shows a breach:

- **NFR-0012, NFR-C0008 (idempotent install).** The seeds are create-only, so
  a second `qfai init` and a `qfai init --force` leave `.qfai/spec/`
  byte-identical. Breach: the tree hash of `.qfai/spec/` differs after either
  run in TC-0003-0062.
- **NFR-C0005 (guard breadth).** Each guard rejects a planted out-of-band ID of
  each shape and accepts the clean surface; the three pattern sets and
  `.agents/rules/distributed-surface.local.md` change only together, in the P1
  pull request, which edits no template content for the new layout. Breach:
  TC-0003-0070, 0071 or 0072 fails, or the pull request that changes the
  pattern sets also changes a file under a `templates/` directory of
  `packages/qfai/assets/init/` for anything other than re-spelling an ID.
- **NFR-C0009 (existing adopters).** A project still on the old layout gets no
  seed and one line naming the migration skill. Breach: any path under
  `.qfai/spec/` after init on the old-layout fixtures of TC-0003-0065 and
  TC-0003-0066.
- **NFR-0040 (message quality).** The old-layout line names the detected path
  and `/qfai-migration-spec-to-story`. Breach: TC-0003-0065 finds either
  missing.
- **NFR-S0002 (Windows).** The migration skill is linked by the writer every
  shipped skill uses, so it falls back and reports the same way without
  Developer Mode. Breach: the Windows leg of TC-0003-0068 fails.
- **A fresh story tree validates clean.** Breach: `verify:pack` reports an
  `error` finding against `scripts/fresh-init-findings.json`, or TC-0003-0060
  sees a non-zero exit.

## Risk mitigation

| Risk                                                                                                                                       | Likelihood / impact | Mitigation                                                                                                                                              | Trigger to act                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The shipped pin change lands before the pre-build version rule, so pack verification, the leakage guard and the asset suite break together | med / high          | Ordering constraint 1 makes the pre-build rule a co-change rather than a follow-up; the asset suite is updated in the same commit                       | `pnpm verify:pack` or the leakage guard fails on a branch that only touched a shipped pin |
| The structural contract gate lands after the repository's own copy of the shipped validate workflow is retired, leaving no cross-check     | med / high          | Ordering constraint 2 requires the gate with-or-before the retirement, so the eye-check is replaced before it is removed                                | The own-copy retirement appears in a diff with no gate in the same change                 |
| The shipped set grows before an owner is declared, so a wider create-only surface ships unowned                                            | low / high          | Ordering constraint 3 lands the ownership contract first; `SHIPPED_WORKFLOW_NAMES` is in-binary, so a new name cannot arrive by globbing the asset tree | A new `qfai-*.yml` asset appears without a matching entry in the shipped-name list        |
| A refresh path re-implements `pruneMatchingEntries` instead of reusing it, splitting the prune rule in two                                 | med / med           | Ordering constraint 4 exports the helper first, which makes the no-parallel-implementation criterion satisfiable rather than aspirational               | A second prune walk appears anywhere under `src/cli/`                                     |

### Story-tree layout

| Risk                                                                                                                                                                                                                                    | Likelihood / impact | Mitigation                                                                                                                                                                                                                                                     | Trigger to act                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| The verify:pack baseline `scripts/fresh-init-findings.json` moves more than once: at the P3 seeding, with the P6 assistant tree and with the P7 seeds. A move made in the wrong commit hides a new finding                              | high / med          | The config defaults switch in the P3 seeding commit, so P3 moves it once. Each commit that changes what a fresh init writes re-derives the baseline with `QFAI_PACK_FINDINGS_UPDATE=1` and carries the diff                                                    | `verify:pack` fails in the build job, or the baseline changes in a commit that does not change init's output |
| Test fixtures that build a spec pack under `.qfai/specs/` with no `paths.specsDir` key read the built-in default, so the P3 switch moves them off the tree they wrote                                                                   | high / med          | The P3 commit gives each such fixture an explicit `paths.specsDir` and `paths.contractsDir`, rather than keeping the old default                                                                                                                               | A suite outside init fails on the P3 commit with a spec or contract it can no longer find                    |
| An adopter whose config omits `paths.specsDir` resolves it to `.qfai/spec` after P3. On a project still holding `.qfai/specs/spec-0001/`, validate may stay silent about the unmigrated tree, and init may seed `.qfai/spec/` beside it | med / high          | Accepted by user answer U2: 2.x does not support an unmigrated tree. The migration guide (BR-0018-0058) and the 2.0.0 CHANGELOG entry state that a project on the spec-pack layout pins a 1.x release or runs `/qfai-migration-spec-to-story` before upgrading | The guide or the 2.0.0 CHANGELOG entry lacks that statement at P8                                            |
| The shipped surface already holds IDs of the new shapes outside the sample band, so the P1 patterns fail the lint and build jobs on files nobody touched                                                                                | high / high         | The P1 pull request removes those IDs in a commit ahead of the pattern commit, and its CI runs the new guards over the cleaned tree before it merges                                                                                                           | A guard hit in the P1 pull request's CI on a file the pattern commit did not plant                           |
| A pattern-set change rides a commit that also edits a template, so the template is judged by a guard changed alongside it (NFR-C0005)                                                                                                   | med / high          | The P1 patterns land in a pull request of their own, merged before the pull request that adds P2's templates; the memo exception is removed in a pull request of its own, after the P2–P8 pull request that stops writing the memo has merged                  | A commit touching a guard pattern also touches a `templates/` directory, or TC-0003-0072 fails               |
| `repairIntegrationWrappers` relinks only the wrappers the link gate reports, with `force: false`. Step 9 may leave a link into `skills/` unrepointed once step 1 has renamed the directory                                              | med / med           | TC-0018-0067 runs step 9 on a fixture holding the plural links and asserts each resolves into the singular directory. A capability the writer lacks is added to the exported writer, not copied into step 9                                                    | TC-0018-0067 reports a link left alone, or step 9 gains a link write of its own (TC-0003-0069)               |
| Symlink creation on Windows without Developer Mode fails for the migration skill's links (NFR-S0002)                                                                                                                                    | med / low           | The skill is linked by the writer every shipped skill uses, which already falls back and reports                                                                                                                                                               | The Windows leg of TC-0003-0068 fails                                                                        |
