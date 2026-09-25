# 10 Plan

**How-only.** Approach, seams and order. Progress belongs in `tdd/test-list.md`, history in
`09_delta.md`, and release judgement nowhere in this pack.

## Implementation approach

### Files this spec owns

Every path below was checked against the tree. `present` means the file exists today and this
spec edits it; `to be created` means no such path exists yet. `OQ-0025` exists because three
spec-claimed paths in other specs were never checked, so the column is not decoration.

| Path                                                                        | State today | What this spec does with it                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                  | present     | Runs the derived verdict, detection, test and node-floor matrices, lint and build gates. Its two slice matrices match the seven runner projects and scripts.                                                                                                      |
| `.github/workflows/release.yml`                                             | present     | Runs the release gates. The gate-tests and gate-floor matrices and verify SUITE_SLICES match the seven runner projects and scripts. Older tag manifests with extra slices use the complete whole-suite aggregate.                                                 |
| `.github/workflows/qfai-validate.yml`                                       | absent      | The repository duplicate of the shipped validate workflow is retired; its full-profile run belongs to the build job.                                                                                                                                              |
| `.github/actions/setup/action.yml`                                          | present     | The single repository-internal setup preamble. It is not shipped to adopters.                                                                                                                                                                                     |
| `.github/required-status-contexts.json`                                     | present     | The checked-in expected required-context and workflow cost declaration read by the hygiene script.                                                                                                                                                                |
| `scripts/check-workflow-hygiene.mjs`                                        | present     | The own-workflow hygiene lane and executor for the required-context declaration check.                                                                                                                                                                            |
| `scripts/pin-documentation-only-cost.mjs`                                   | present     | Re-derives and writes the documentation-only cost pin from the own workflow tree.                                                                                                                                                                                 |
| `package.json` (repository root)                                            | present     | `ci:lint` gains the hygiene lane. The existing `ci:gate:checks` command vector keeps its original order; its unchanged `package.json` implementation is bound by BR-0017-0070. `ci:gate` is deliberately untouched — a gate there blocks no pull request (OC-72). |
| `packages/qfai/package.json`                                                | present     | The per-slice script set holds the same seven names as the runner projects, both CI matrices, both release matrices and release verify SUITE_SLICES.                                                                                                              |
| `packages/qfai/vitest.workspace.ts`                                         | present     | Each current project declares the full parallelism knob set and matches tests. The zero-file compatibility project and retired pr-fix and pr-merge projects are absent, leaving seven.                                                                            |
| `packages/qfai/vitest.config.ts`                                            | present     | Read as the coverage SSOT and left alone unless a knob genuinely belongs at workspace root. No retry setting enters either file.                                                                                                                                  |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers-ci-lanes.md` | present     | The authored layer-to-CI-lane mapping. Its sibling mirror is generated by pnpm sync:ssot.                                                                                                                                                                         |
| `.qfai/assistant/catalog/test-layers-ci-lanes.md`                           | present     | The generated assistant-tree mirror of the packaged mapping.                                                                                                                                                                                                      |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md`          | present     | Gains one cross-link to the sibling. Nothing else: the loader parses this file, so prose here can extract as a token (BR-0017-0036).                                                                                                                              |

### Companion changes for the approved traceability correction

These shared and shipped files support the approved proof check. Their source
ownership stays with SDD guidance or the cross-spec validator contract; this
spec remains the owner of its own toolchain behavior.

| Path                                                                                                       | State today | Use in this change                                                                                                                                    | Owner                           |
| ---------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`                                       | present     | Shipped SDD workflow source: states active and planned binding rules and proof requirements; its repository-root assistant copy is generated by sync. | spec-0013 SDD guidance          |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`          | present     | Shipped contract reference: defines changed-obligation binding completeness, optional Proof and fail-closed evidence behavior.                        | spec-0013 SDD guidance          |
| `packages/qfai/assets/init/.qfai/assistant/skills/qfai-sdd/templates/specs/spec/16_Traceability-ledger.md` | present     | Shipped ledger template: gives adopters active and planned table schemas and Proof authoring instructions.                                            | spec-0013 SDD guidance          |
| `packages/qfai/src/core/validators/traceabilityIntegrity.ts`                                               | present     | Validates changed obligations, active and planned bindings, unchanged-implementation proof and unavailable Git data.                                  | shared validator contract       |
| `packages/qfai/src/core/gitChanges.ts`                                                                     | present     | Supplies merge-base files and diff paths to the integrity validator; Git failures remain explicit.                                                    | shared validator contract       |
| `packages/qfai/src/core/atddTraceability.ts`                                                               | present     | Supplies the existing language-aware runnable TC carrier scanner to proof validation.                                                                 | shared validator contract       |
| `packages/qfai/src/core/validators/tddList.ts`                                                             | present     | Supplies the existing selector, evidence-hash, command and result decisions used by proof validation.                                                 | shared validator contract       |
| `packages/qfai/tests/core/traceabilityIntegrity.test.ts`                                                   | present     | Covers changed, unchanged-but-proved, missing, ambiguous and unavailable binding outcomes.                                                            | shared validator coverage       |
| `packages/qfai/tests/assets/sddOptionalOutputs.test.ts`                                                    | present     | Checks the shipped SDD guidance and ledger template describe the validator contract.                                                                  | spec-0013 SDD guidance coverage |

### Files this spec reads and must not change

| Path                                                                 | State today | Why it is named                                                                                                               |
| -------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/qfai/scripts/check-no-internal-version-leakage.sh`         | present     | Its scope resolves to the package directory, which is why a readable pin trailer stays legal in our `.github/`. Not weakened. |
| `packages/qfai/scripts/lint-shipping.ts`                             | present     | Skips YAML comment lines before its runtime rules. The shipped-YAML pin rule that needs this changed is `spec-0003`'s.        |
| `packages/qfai/scripts/check-branch-version-pin.sh`                  | present     | Stays in the lint lane. This spec changes which lane runs it, never its rule set.                                             |
| `packages/qfai/scripts/check-pack-locations.mjs`                     | present     | Existing `ci:lint` member; the precedent for a bare-`R-` script-emitted lint code.                                            |
| `scripts/verify-pack.mjs`                                            | present     | The binding allow-list over the shipped `.github/`. It is why the composite action cannot ship.                               |
| `scripts/link-assistant-tree.mjs`                                    | present     | Links the assistant tree at the shipped assets, so a new catalog file needs no script change — only a link run.               |
| `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml` | present     | Scanned by the hygiene lane, authored by `spec-0003`. This spec never edits it.                                               |
| `packages/qfai/tests/assets/assets.test.ts`                          | present     | Asserts floating major-version references in the shipped workflow. Its co-change is `spec-0003`'s obligation, not ours.       |

### Test helper consumers

- `packages/qfai/tests/helpers/spec0017WorkflowSurfaces.ts` supplies workflow and
  slice readers to `packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts`,
  `packages/qfai/tests/integration/spec0017CiMatrix.test.ts`
  (`TC-0017-0007`, `TC-0017-0043`) and
  `packages/qfai/tests/integration/spec0017SliceAlignment.test.ts`
  (`TC-0017-0062`, `TC-0017-0064`). These are three separate consuming test
  modules.
- `packages/qfai/tests/helpers/spec0017Release.ts` supplies release classifier
  and gate readers to `packages/qfai/tests/scripts/ownWorkflowTopology.test.ts`,
  `packages/qfai/tests/integration/spec0017ReleaseOperations.test.ts`
  (`TC-0017-0090`, `TC-0017-0093`) and
  `packages/qfai/tests/integration/spec0017ReleaseFallback.test.ts`
  (`TC-0017-0091`). These are three separate consuming test modules.

### Release obligation traceability

- Release capability, fallback and isolation remain under BR-0017-0069 with the active
  `.github/workflows/release.yml` binding. The local ordered command vector moves to
  BR-0017-0070 and TC-0017-0093 with its existing `package.json` binding.
- AC-0017-0036 covers both paths, so it binds to both files. Its unchanged
  `package.json` binding and BR-0017-0070 cite the distinct TDD-0107 proof.
- The first traceability table holds complete active bindings for every changed
  acceptance criterion and business rule. The planned table holds only unpromoted
  obligations with explicit path and state.

### Traceability validator reuse

- The unchanged `package.json` bindings for AC-0017-0036 and BR-0017-0070 need a
  runnable TC carrier before TDD-0107 can prove them. `hasRunnableTcCarrier`
  reuses the existing language-aware scanner and comment mask. Its only
  production consumer is `traceabilityIntegrity` (one module). One consumer
  would normally favor inline code, but a thin export avoids duplicating the
  private scanner; an artificial caller would add no behavior.
- `selectorResolves`, `redTestManifestHash`, `isExecutedEvidenceCommand`,
  `isPassingEvidenceResult` and `isFailingEvidenceResult` are reused from
  `tddList` by `traceabilityIntegrity` (two production consumer modules
  including `tddList`). This is also below the usual three-consumer
  extraction threshold, but these existing TDD decisions must not be duplicated.
  They give unchanged-implementation proof the same selector, evidence freshness
  and execution-result decisions as the TDD gate.
  This reuse preserves required traceability annotations and quality-gate
  evidence without a second interpretation of those checks.

### Traceability correction order

1. Split the local command-vector rule from release capability, then record both
   active `package.json` bindings and their TDD-0107 proof in the spec ledger.
2. Update the shipped SDD workflow, reference and ledger template together.
   Generate the repository-root assistant mirror from those shipped sources.
3. Reuse the existing Git, runnable-carrier and TDD evidence checks in the
   integrity validator. Exercise binding and proof failures in the focused tests,
   then run the scoped and full validation gates.

### The shape of the change, in order

The order is not a preference; it is DR-0017-0005, and inverting an edge is a review rejection.
Twelve activities. The release classifier change in step 12 lands with the
slice retirement in step 5; their intermediate states would classify older
tags against the wrong slice set.

1. **Derived verdict.** Replace the hand-written six-way condition with an iteration over the
   serialized needs map. Nothing else in the same change, so the diff is reviewable as the
   change to the one job every other change depends on.
2. **Own-tree hardening.** Per-job permissions, `persist-credentials: false` on all 11 checkout
   steps, all 21 references to full SHAs. Mechanical and wide; no topology change.
3. **Hygiene lane over the own tree only.** The script plus its fixtures plus the `ci:lint`
   registration. Lands with or after step 2 so it is green on arrival.
4. **Setup definition.** Extract the preamble duplicated 6 times into
   `.github/actions/setup/action.yml` and consume it from every toolchain job. The Node version
   moves out of the `NODE_LTS` workflow-level literal into a file-derived read — see the
   alternative below, which carries a decision this spec cannot make alone.
   Three separate jobs in `.github/workflows/ci.yml` use the action: `lint` before
   `pnpm ci:lint`, `mirror-surface` before `pnpm -C packages/qfai lint:mirror-surface`,
   and `check-types` before `pnpm check-types`.
5. **Slice-surface alignment.** Delete the zero-file `compatibility` project. Retire the
   `pr-fix` and `pr-merge` projects, scripts and matrix legs with their suites. Keep the
   seven remaining names equal across the runner, scripts, both CI matrices,
   both release matrices and release verify's `SUITE_SLICES`. Land step 12 with
   this change.
6. **Parallelism structure.** The knob set per project with the declared starting value of ten.
   Structure only; the final value is a later change per project.
7. **Retire the duplicate.** Delete `.github/workflows/qfai-validate.yml` and fold its
   full-profile run into `build` as a named item of that job's verification set. Requires
   `spec-0003`'s shipped-set gate at or before this point.
8. **Change detection and lane selection.** The detection job, plus a derived condition on every
   retained leg. The lint lane and the required-context job stay unconditional. Re-pin both
   selection-state check-name inventories and the code-path cost declaration after the retired
   legs leave the matrices.
9. **Layer separation.** Jobs and matrix legs inside `ci.yml`, partitioned by the cost data step 6
   produces. It waits on that data, because the partition is the only part of this spec that needs a
   measurement it does not itself take.
10. **The documentation-only cost as a re-pinned measure.** Three artifacts in one change,
    because each is unsatisfiable without the others. `documentationOnlyCostPin` in
    `.github/required-status-contexts.json` holds the executing job list and the sum of their
    declared `timeout-minutes`; `scripts/pin-documentation-only-cost.mjs` re-derives both from
    `ci.yml`; and
    one `check-workflow-hygiene.mjs` rule, in the existing `declaration` scope, exits 1 while the
    committed figures and a fresh recomputation disagree. Those three are the field's usages: the
    pinner writes it, the rule compares it, and `TC-0017-0006` reads it over the real tree in place
    of the four-name equality it holds today. The membership half of the rule needs no new code —
    it reads `dependencies` and `dependencyConditions` from the same declaration, scoped to the
    jobs the verdict depends on, and property 2c already rejects a listed job that drops its
    condition and an unlisted job that gains one. `dependencyConditionsNote` carries the reason each
    one cannot be skipped, which `BR-0017-0007` makes binding on review. The replacement assertions
    land in this change, so no revision exists in which the pin is unasserted.
11. **Extract the mirror-surface lane.** `lint:mirror-surface` becomes a job of its own, so `lint`
    stops forking five lanes onto a four-core runner. Later than step 10 and separate from it: the
    extraction raises the pinned sum, because `timeout-minutes` is integer-only and each half of
    the split needs its own margin, and a change that introduced the pin and raised it at once would
    leave no committed figure the raise could be read against. The re-pin lands in the same
    commit as the extraction or the hygiene lane fails. The measurement obligation is BR-0017-0030's
    and the pin does not discharge it: the run before and the run after are recorded in
    `07_Decisions.md` and quoted in the pull-request description, where the projection to be tested
    is `lint` at about 160 s against 285 s measured. The new job owes no usage count: it is a lane, not an architectural
    element, because it produces no output another job reads and nothing goes through it. Two places
    name it — the verdict's `needs` map and the declaration's `dependencies` list — and they record
    it rather than consume it. The job carries no condition and stays absent from
    `dependencyConditions`, which BR-0017-0011 requires of a lane moved into a job of its own. That
    obligation is inherited from the rule rather than created here. `dependencyConditionsNote` gains
    the reason it cannot be skipped, which review reads and no lane parses. That entry belongs to
    this step rather than step 10, because it names a job step 11 creates.
12. **Release tag compatibility.** Classify a tag as sliced only when its suite slice script
    set equals the current workflow's seven names. An older tag with the retired
    `pr-fix` and `pr-merge` slices takes its complete whole-suite aggregate path.
    The regression case checks the older tag shape alongside the current and
    whole-suite shapes.

Build-artifact reuse is deliberately absent from that list: it is a measurement, not a step, and
its outcome may legitimately be "keep the rebuilds" (BR-0017-0031). It is attempted after step 4,
because the setup dedup is what changes its arithmetic.

### The alternative considered, per seam

- **Setup definition: composite action versus reusable workflow.** A reusable workflow adds
  per-job dispatch overhead, which contradicts the cost objective this spec exists to serve. The
  composite action is chosen. The obligation is single-definition, so a later mechanism change is
  legal; a second definition is not.
- **The Node version file (open, and it needs the user).** No `.node-version`, `.nvmrc` or
  `.tool-versions` exists in this repository. Two resolutions, and they are not equivalent:
  point `node-version-file` at the already-present `package.json`, whose `engines.node` is
  `>=20.19.0` — no new file, but the resolved version becomes "latest satisfying" instead of
  today's pinned `20.19`; or add `.node-version` at the repository root, which pins exactly but
  is a new root-level file and therefore needs explicit user approval (OC-3). The plan proceeds
  with the first and records the second as the approval-gated alternative, because a spec may not
  create a root file on its own authority.
- **Hygiene lane: repository script versus an external workflow linter.** The external linter
  imports a pinned toolchain with no bump lane and its conventional manifest is a root-level
  addition. Deferred with a named trigger; the lane ships as a repository script.
- **Shipped-tree scan: copy into the workflows directory versus two roots.** Both satisfy
  BR-0017-0044. Two roots is preferred because copying inside the checkout makes the reported
  path ambiguous, and BR-0017-0044 requires the shipped path to be named as such.
- **Retiring the duplicate: repoint versus fold.** Repointing at the shipped file resolves to the
  **published** package, because the root manifest declares no dependency on `packages/qfai` and
  provides no local binary. That inverts the dogfooding, so the fold into `build` is the only
  option that exercises the change under review.

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. The job and its script are one
lane and its command. They serve NFR-0011 of
`discussion-20260923171450572`.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U5**. It lands after U1 and U4,
once every suite entry resolves (BR-0017-0074), and does not wait for U6:

- In `.github/workflows/ci.yml`, a `windows-parity` job:
  - it needs `detect` with the `test` job's condition, and is listed in
    `ci-pass`'s `needs` (BR-0017-0072);
  - `permissions: contents: read`, SHA pins and the shared setup action;
  - an in-job build (BR-0017-0073), and `TEMP` and `TMP` under a path with a
    space;
  - a `SHIPPED-CI: not-applicable` marker.
- `test:windows-parity` in `packages/qfai/package.json`, listing exactly the
  declared suites (BR-0017-0071).
- The job's entry in the expected-context declaration.

Left out: the eval runner and its no-workflow guard (spec-0018); any change to
the required status check (OC-73).

## Test approach

- **What is proven where.** The hygiene script, the verdict logic and the workspace knob set are
  file-shape and exit-code properties of the repository, so they are proven at the L3 Integration
  layer against `packages/qfai/tests/scripts/**` — the existing home of
  `checkNoInternalVersionLeakage.test.ts`, `checkBranchVersionPin.test.ts` and
  `lintShipping.test.ts`, which are the same class of guard. No new layer, layer token or layer
  heading is introduced (BR-0017-0036).
- **The five hygiene rules need five fixture pairs, not one.** A single fixture that violates
  everything proves only that the script exits 1. BR-0017-0039 requires the failure to name the
  rule, so each rule gets a positive workflow fixture and a negative one that differs from it in
  exactly one respect. Fixtures live under `packages/qfai/tests/fixtures/`, which is
  Markdown-lint-ignored and formatter-covered, so a deliberately malformed fixture is possible
  without fighting a lint gate.
- **The reachability rule needs its own negative case.** AC-0017-0008 is not the contrapositive
  of AC-0017-0007: it removes _both_ blocks and then restores _either_ one. Two removals and two
  restorations, four assertions, one case each.
- **The verdict needs all four need states plus an unknown.** Succeeded, skipped, failed,
  cancelled, and a state the script does not recognize. The unknown state is the one that cannot
  share a case with anything else, because it is the only one whose correct behaviour is decided
  by the fail-closed rule rather than by a mapping.
- **The required-context declaration check needs three separate cases.** A declared context that
  resolves to no job, a job made skippable _through a dependency_ rather than directly, and a
  verification-set item removed. The middle one is the case a single-property test would miss,
  and it is the one DTC-28 calls the quiet failure.
- **Boundary cases that must not share a case.** NFR-0002's documentation-only instance floor at
  five versus four (they differ by a repository setting no agent changes); seven-name equality
  across the runner, scripts, four matrices and `SUITE_SLICES` versus the deleted project name
  no longer resolving; ten workers
  measured against a second value versus ten workers declared.
- **Release classifier boundary.** The current seven-slice tag may enter the
  sliced operations path. An older nine-slice tag containing all seven names
  must take the complete whole-suite aggregate. Re-execute TDD-0099 and
  TDD-0100 after the classifier changes.
- **Separate CI acceptance results.** Each of the six matrix-shaped cases
  names its independently observable outcomes in the test-case table. Phase 2b
  keeps the first outcome on its existing TDD row and seeds a sibling row for
  each remaining outcome. ATDD assigns one unique selector per row; implement
  records separate RED or falsifiability, GREEN, review and checkpoint proof.
  The failed required-operation result remains under TDD-0098, which already
  tests the release prerequisite result matrix.
- **What is not proven by execution here.** The bump-owner record and the build-reuse baseline are
  DR-0017-0002's subject. The layer partition's _quality_ is a judgement, not an oracle; only the
  file count and the check name are asserted.
- **The re-pin comparison needs a case on each side.** A recomputed sum equal to the committed
  figure and one a minute away from it are the two outcomes the comparison decides between, and a
  case that meets only the first proves the rule reads the field rather than that it refuses
  anything.

### Intent-driven entry (CAP-0018)

Levels follow `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.

**Layers.**

| Layer       | What it proves                                                                                                                                                              | Where                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| integration | TC-0017-0094..0099 over the parsed `ci.yml` and `test:windows-parity` script: the suite list and its resolution, the temp root, detection and the verdict, the in-job build | `packages/qfai/tests/integration/windowsParity/`, one module per BR    |
| E2E         | US-0017-0016, one annotated describe                                                                                                                                        | a new file, `packages/qfai/tests/e2e/spec0017WindowsParityE2E.test.ts` |

These cases read the workflow tree and the package script. What the job did at run time is
not a row: the trial run's per-suite counts and timings are delivery evidence, recorded with
DR-0017-0024.

**Modules, one per BR.**

| Module under `tests/integration/windowsParity/` | BR           | Cases                      |
| ----------------------------------------------- | ------------ | -------------------------- |
| `suiteList.test.ts`                             | BR-0017-0071 | TC-0017-0094, TC-0017-0096 |
| `selectionAndVerdict.test.ts`                   | BR-0017-0072 | TC-0017-0097, TC-0017-0098 |
| `inJobBuild.test.ts`                            | BR-0017-0073 | TC-0017-0099, TC-0017-0100 |
| `suitesLandFirst.test.ts`                       | BR-0017-0074 | TC-0017-0095               |

**Cases that stand alone.**

- **The suite list is compared both ways** (TC-0017-0094), so an extra suite fails as a
  missing one does.
- **Each list entry resolves to a collected test file** (TC-0017-0095). vitest stays green
  when one of several filters matches nothing, so without this case a renamed directory
  shrinks the suite silently.
- **The kept failure** is TC-0017-0098: the real `ci-pass` body, run over a needs map in
  which only the Windows job failed, exits 1. It is integration, not unit, because its oracle
  needs the job's real name and the real body. A unit row could never be taken RED, since the
  verdict already fails on any failing need.
- Each of the three criteria keeps this file's rule of one `normal` row and one `error` or
  `boundary` row.

**What existing guards hold.** No case here repeats them:

- the permission block, `timeout-minutes`, `persist-credentials: false` and SHA pins: the
  hygiene lane;
- the shared setup action and the expected-context declaration: the topology tests;
- the documentation-only and code-path cost pins and the check-name inventory: their existing
  rows, re-pinned in the change that adds the job;
- the `SHIPPED-CI: not-applicable` marker: the parity guard in `ci:lint`, which reads the
  pull request's diff;
- no workflow naming the routing-eval runner: spec-0018's guard.

**Order.** The job is unit U5 of spec-0018 `10_Plan.md`. It runs once tier 1 and spec-0003's
init suite are green, per `### Order in which the rows go green` there, and does not wait for
the journeys. It lands only in the change where every suite entry has a test file:
`tests/unit/workflow/` and `tests/integration/workflow/` (spec-0018), and
`tests/integration/init/` (spec-0003). Landing it earlier fails TC-0017-0095 by design
(BR-0017-0074). The E2E journey lands with the job.

**Windows parity, as the job runs it.**

- The job builds `packages/qfai` itself, so the suites that spawn the built CLI see a `dist/`
  made on Windows.
- Links a case needs are made at run time in its temp root. No tracked link is on the suite
  list, so the checkout needs no `core.symlinks` step.
- The temp root comes from the environment: the job points `TEMP` and `TMP` at a directory
  whose name contains a space (TC-0017-0096), and every case reads it through `os.tmpdir()`.
- A case that is red on the trial run is classed as platform-inapplicable, a parity defect or
  a test defect, and none leaves the list.

**Tier.** The seven Integration rows carry `Tier` `T2`. They parse `ci.yml` and a package
script, which is CI infrastructure, and the Phase 2b seeding rule raises a row that touches
infrastructure to `T2`. The older rows of this ledger keep the tier they were seeded with.

**Findings carried on purpose.**

| Finding                                                                                                           | Why it is expected                                                                                                                                                                              | Until                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `QFAI-ATDD-111` for US-0017-0016                                                                                  | The journey file does not exist yet                                                                                                                                                             | The job and its journey land                                                                                    |
| `QFAI-ATDD-112` for TC-0017-0094..0099                                                                            | The integration tests do not exist yet                                                                                                                                                          | ATDD writes them                                                                                                |
| `QFAI-TRACE-001` × 3: BR-0017-0068 and BR-0017-0069 on `release.yml`, and BR-0017-0069 on the root `package.json` | This spec's `03` and `04` changed and those files did not. The user accepted them as known (Y1 = A). CI never reports them: the `build` job has no `origin/main`, so the check is skipped there | A change that narrows the check to changed BRs. Revisit if the count differs, or if `build` gains `origin/main` |
| The `tdd` pin of 140 errors on `tdd/test-list.md`                                                                 | Pre-existing; this change appends rows and repairs none                                                                                                                                         | A later change that repairs them                                                                                |

Each push to the batch's draft pull request lists these in the batch evidence, and its CI
log is read against that list.

## NFR approach

- **NFR-0007 (bounded and least-privileged) is met by construction and asserted by the lane.** The
  hygiene lane's first two rules are exactly this NFR's two counts, so the floor and its gate are
  the same object. The target is a percentage precisely so it survives the own-CI denominator
  falling from 12 jobs to 11 when the duplicate is retired.
- **NFR-0003 (credential-free) is met by absence.** Zero secret-inheritance uses, asserted as a
  count of zero over both trees. This is the one rule where a count of zero is correct, because
  unlike the shipped third-party allow-list there is no sanctioned member to fail on.
- **NFR-0001 / NFR-0002 (wall clock and runner minutes) are met only against captured numbers.**
  The baseline does not exist today, so capturing it is a precondition of steps 6, 7 and 8, not a
  follow-up. A breach shows as an aggregate-verdict duration worse than the recorded baseline on
  a code-path pull request, as more than five executed instances on a documentation-only one, or as
  either committed pin disagreeing with what the workflow tree recomputes. `NFR-0002` claims no
  fall on a code path, so there is no instance breach to watch for there: that path's figures are
  recorded and re-pinned, and the breach is a change that moved them and did not.
  Because the evidence tree is version-control-ignored, every number is also quoted in the
  pull-request description and in `07_Decisions.md` (OC-80, BR-0017-0030).
- **NFR-0004 (flake budget) is met by refusing the easy fix.** Three consecutive green verdicts
  per tuning pull request, and zero retry settings. A breach shows as a rerun-to-green rate above
  one in twenty default-branch verdict runs, which reopens the setting rather than raising the
  threshold.
- **NFR-0005 (guard breadth) is met by not touching the guards.** No rule in this spec requires a
  change to the distributed-surface pattern set: the readable pin trailer is already legal in our
  `.github/` because the guard's root resolves to the package directory. The additive shipped-YAML
  rule that _does_ need a three-site change belongs to `spec-0003`, and OC-79 requires it to land
  as its own pull request with zero template edits.
- **NFR-0010 (adding a lane costs one edit) is met by the derived verdict.** The measurement is
  the one DSC-007 names: wire a failing job into the needs map, change nothing else, and the
  verdict must exit 1.
- **NFR-0014 (gate placement) is met by registration, not by intent.** Both new gates are
  registered in `ci:lint`. A breach is detectable by reading the aggregate's definition, which is
  why the criterion is the invocation path plus a planted violation turning a pull request red.
- **NFR-0015 (vocabulary does not grow) is met by placement.** The mapping document is a sibling
  the loader resolves no path to. The measurement is an occurrence count of the vocabulary warning
  before and after, plus the built-in token set left untouched.
- **NFR-0006 (lint-clean assets) is met by treating copied YAML as new.** The source repository
  spells the same boolean quoted in some files and unquoted in others, so nothing is copied
  verbatim; every new YAML file is written to this repository's formatter output.

### Intent-driven entry (CAP-0018)

- **`discussion-20260923171450572#NFR-0011`, own-CI half: the control-core suites and the init and
  migration suites run on Windows on every code-path pull request.** Met by the `windows-parity`
  job, which runs the `test:windows-parity` list under a temp root with a space and builds the
  package on its own runner (BR-0017-0071..0072). Breach: a red `windows-parity`, read on `ci-pass`
  because the job gates no merge (the risk row below). The trial run's per-suite counts and
  timings, recorded in DR-0017-0024, are the baseline a later run is compared with.
- **NFR-0001 and NFR-0002 for the added job.** A documentation-only pull request skips the job, so
  its executed-instance floor is unchanged. The code-path pin moves and is re-pinned in the same
  change, with before-and-after numbers in DR-0017-0024 (BR-0017-0030, BR-0017-0067). Breach: the
  committed code-path pin disagreeing with what the workflow tree recomputes.
- **NFR-0007 and NFR-0012 for the added job.** Met by the existing hygiene lane: the job carries a
  permission block, a timeout, SHA pins and `persist-credentials: false`. Breach: the hygiene lane
  exiting 1 on the job.

## Risk mitigation

| Risk                                                                                                                                                      | Likelihood / impact | Mitigation                                                                                                                                                                                                                 | Trigger to act                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `build` survives by name while pack verification and the publish dry run move out of it, leaving the only required status check green over almost nothing | med / high          | BR-0017-0032 and BR-0017-0033 make the enumerated verification set, not the name, the obligation; the declaration check (BR-0017-0043) asserts it from a pull request                                                      | A diff that moves any step out of the `build` job, or that adds a condition to `build` or to anything it depends on                         |
| The hygiene lane merges before the tree it asserts is hardened, so it lands instantly red and gets weakened to land                                       | med / high          | DR-0017-0005 edge 2 makes the order a review rejection; the preference order is satisfy the guard, then adjust the convention, then narrow — never weaken to merge                                                         | A pull request that adds a hygiene rule and a rule exemption in the same diff                                                               |
| Step 4 stalls because pinning the Node version wants a new root-level file that no agent may create                                                       | high / low          | The plan proceeds on `package.json#engines.node`, which needs no approval, and records the root file as the approval-gated alternative with its exact semantic difference                                                  | The resolved Node version drifting off `20.19` in a run log, which is the observable cost of the no-approval option                         |
| More workers surface real filesystem races against temporary trees and the spawned binary, and there is no retry to hide them                             | high / med          | One project per pull request, largest first, three consecutive green verdicts before merge, and zero retry settings so the race is visible rather than masked                                                              | A second non-deterministic failure in the same project within one tuning pull request — stop tuning that project and record the measurement |
| A later contributor "restores" the source repository's one-workflow-file-per-layer topology                                                               | med / med           | BR-0017-0035 states the narrowing as a rule with its reason, and the reason is recorded as the current one (every check name is an unconfigurable settings surface), not the withdrawn one                                 | A new file appearing under `.github/workflows/` in a layer-separation diff                                                                  |
| A planned obligation is promoted before its implementation exists, leaving an invalid active binding                                                      | med / med           | DR-0017-0006's promotion rule plus the `State today` column above, so the two files cannot disagree about which paths exist                                                                                                | `QFAI-TRACE-001` naming a missing active implementation path                                                                                |
| The composite action is authored under the shipped asset tree by reflex, making `pnpm verify:pack` throw                                                  | low / high          | BR-0017-0028 states the exclusion; `verify-pack.mjs` allow-lists only `workflows` under the shipped `.github/` and throws on any other child                                                                               | `pnpm verify:pack` failing with an unexpected shipped `.github/` child                                                                      |
| SHA pins go stale because no automated bump lane exists                                                                                                   | high / low          | DR-0017-0003 names the owner and binds the obligation to release preparation, which is the one recurring moment the branch-name version pin makes structurally observable                                                  | A pinned SHA more than one upstream minor behind at a release-preparation pass                                                              |
| The documentation-only exclusion list drifts as directories are added, so cost creeps back                                                                | med / low           | BR-0017-0009 keeps the recognized-directory list closed and fails open, so drift costs runner minutes and never correctness                                                                                                | The hygiene lane reporting the committed documentation-only pin and its recomputation disagreeing, in the executing job list or in the sum  |
| A Windows regression merges, because `windows-parity` gates no merge while the only required status check is `build` (OC-73)                              | med / high          | `ci-pass` turns red on the pull request that causes it (DR-0017-0024); moving the required context to `ci-pass` is OQ-0017-0002, a repository setting no agent changes                                                     | A red `windows-parity` on the default branch, or OQ-0017-0002 still open at the release that claims Windows parity                          |
| `QFAI-TRACE-001` fires locally on this spec's three ledger rows (`release.yml` twice, the root `package.json`) at the implement and verify gates          | high / low          | Accepted and recorded as known, by the user's answer on 2026-09-24; a follow-up asks to narrow the check to rows whose BR or AC changed. CI's dogfood lanes cannot run the check, because `build` fetches no `origin/main` | The count differs from three, or CI's `build` job gains `origin/main`, which turns the three into CI errors                                 |

### Intent-driven entry (CAP-0018)

- The last two rows of the table above are this entry's.
- spec-0014 carries the other four `QFAI-TRACE-001` rows of the same decision.
