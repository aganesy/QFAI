# 10 Plan

**How-only.** Approach, seams and order. Progress belongs in `tdd/test-list.md`, history in
`09_delta.md`, and release judgement nowhere in this pack.

## Implementation approach

### Files this spec owns

Every path below was checked against the tree. `present` means the file exists today and this
spec edits it; `to be created` means no such path exists yet. `OQ-0025` exists because three
spec-claimed paths in other specs were never checked, so the column is not decoration.

| Path                                                                        | State today   | What this spec does with it                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                                                  | present       | 7 jobs today. Gains per-job permissions, checkout flags, SHA pins, the derived verdict, the detection job, layer-separated jobs, upload hygiene, the folded full-profile validate run. Job set grows; file count does not.                                                                                                                                    |
| `.github/workflows/release.yml`                                             | present       | 4 jobs today, one workflow-level permission block. Gains checkout flags and SHA pins; the gate job also moves onto the shared setup definition, dropping the `NODE_LTS` workflow-level literal. `NODE_PUBLISH` stays as the one declared exception (BR-0017-0027). Filename is frozen input (OC-74); contents may harden.                                     |
| `.github/workflows/qfai-validate.yml`                                       | present       | **Deleted.** This is the repository's own duplicate of the shipped validate workflow — the 13th install, the 6th build, and the second unconditional pull-request trigger.                                                                                                                                                                                    |
| `.github/actions/setup/action.yml`                                          | to be created | The single setup-preamble definition. New subdirectory `.github/actions/` under an already-tracked directory, so the root-additions policy does not apply; it is emphatically **not** authored under the shipped asset tree (OC-68).                                                                                                                          |
| `.github/required-status-contexts.json`                                     | to be created | The checked-in expected-required-context declaration the hygiene script reads. Co-located with what it describes, inside the existing `.github/`, so no root-level addition.                                                                                                                                                                                  |
| `scripts/check-workflow-hygiene.mjs`                                        | to be created | The hygiene lane, and the executor for the declaration check (DR-0017-0004). Root `scripts/` already holds 11 `check-*.mjs` siblings, so the naming and the home are the existing convention. Root-level `scripts/` is the right home rather than `packages/qfai/scripts/`: its subject is repository-level and it must be invokable from the root aggregate. |
| `package.json` (repository root)                                            | present       | `ci:lint` gains the hygiene lane. `ci:gate` is deliberately untouched — a gate there blocks no pull request (OC-72).                                                                                                                                                                                                                                          |
| `packages/qfai/package.json`                                                | present       | Gains the two missing per-slice scripts, so the script set reaches seven names.                                                                                                                                                                                                                                                                               |
| `packages/qfai/vitest.workspace.ts`                                         | present       | 8 projects, each carrying only `name` / `include` / `testTimeout` and zero parallelism settings. Gains the full knob set per project; the zero-file `compatibility` project is deleted, leaving 7.                                                                                                                                                            |
| `packages/qfai/vitest.config.ts`                                            | present       | Read as the coverage SSOT and left alone unless a knob genuinely belongs at workspace root. No retry setting enters either file.                                                                                                                                                                                                                              |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers-ci-lanes.md` | to be created | The layer-to-CI-lane mapping, authored here because this is the authoring side of the mirror (OC-70). The filename deliberately does not begin a hyphenated layer-prefixed phrase, and the loader resolves `catalog/test-layers.md` by exact path, so a sibling is invisible to it.                                                                           |
| `.qfai/assistant/catalog/test-layers-ci-lanes.md`                           | to be created | The generated mirror. Produced by `pnpm sync:ssot`, never authored. A change that edits only this copy is reverted and fails the tracked-tree diff.                                                                                                                                                                                                           |
| `packages/qfai/assets/init/.qfai/assistant/catalog/test-layers.md`          | present       | Gains one cross-link to the sibling. Nothing else: the loader parses this file, so prose here can extract as a token (BR-0017-0036).                                                                                                                                                                                                                          |

### Files this spec reads and must not change

| Path                                                                 | State today | Why it is named                                                                                                               |
| -------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/qfai/scripts/check-no-internal-version-leakage.sh`         | present     | Its scope resolves to the package directory, which is why a readable pin trailer stays legal in our `.github/`. Not weakened. |
| `packages/qfai/scripts/lint-shipping.ts`                             | present     | Skips YAML comment lines before its runtime rules. The shipped-YAML pin rule that needs this changed is `spec-0003`'s.        |
| `packages/qfai/scripts/check-branch-version-pin.sh`                  | present     | Stays in the lint lane. This spec changes which lane runs it, never its rule set.                                             |
| `packages/qfai/scripts/check-pack-locations.mjs`                     | present     | Existing `ci:lint` member; the precedent for a bare-`R-` script-emitted lint code.                                            |
| `scripts/verify-pack.mjs`                                            | present     | The binding allow-list over the shipped `.github/`. It is why the composite action cannot ship.                               |
| `scripts/sync-init-to-root.mjs`                                      | present     | Mirrors the whole asset tree recursively, so a new catalog file needs no script change — only a sync run.                     |
| `packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml` | present     | Scanned by the hygiene lane, authored by `spec-0003`. This spec never edits it.                                               |
| `packages/qfai/tests/assets/assets.test.ts`                          | present     | Asserts floating major-version references in the shipped workflow. Its co-change is `spec-0003`'s obligation, not ours.       |

### The shape of the change, in order

The order is not a preference; it is DR-0017-0005, and inverting an edge is a review rejection.
Nine changes, each independently mergeable:

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
5. **Slice-surface alignment.** Delete the `compatibility` project, add the two missing scripts.
   Cheap, and it sits inside the file step 6 rewrites.
6. **Parallelism structure.** The knob set per project with the declared starting value of ten.
   Structure only; the final value is a later change per project.
7. **Retire the duplicate.** Delete `.github/workflows/qfai-validate.yml` and fold its
   full-profile run into `build` as a named item of that job's verification set. Requires
   `spec-0003`'s shipped-set gate at or before this point.
8. **Change detection and lane selection.** The detection job, plus a derived condition on every
   declared leg. The lint lane and the required-context job stay unconditional.
9. **Layer separation.** Jobs and matrix legs inside `ci.yml`, partitioned by the cost data step 6
   produces. Last, because the partition is the only part of this spec that needs a measurement it
   does not itself take.

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
- **Boundary cases that must not share a case.** The documentation-only floor at four versus
  three instances (they differ by a repository setting no agent changes); the seven-name equality
  across three slice surfaces versus the deleted project name no longer resolving; ten workers
  measured against a second value versus ten workers declared.
- **What is not proven by execution here.** The bump-owner record and the build-reuse baseline are
  DR-0017-0002's subject. The layer partition's _quality_ is a judgement, not an oracle; only the
  file count and the check name are asserted.

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
  a code-path pull request, or as more than four executed instances on a documentation-only one.
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

## Risk mitigation

| Risk                                                                                                                                                      | Likelihood / impact | Mitigation                                                                                                                                                                                 | Trigger to act                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `build` survives by name while pack verification and the publish dry run move out of it, leaving the only required status check green over almost nothing | med / high          | BR-0017-0032 and BR-0017-0033 make the enumerated verification set, not the name, the obligation; the declaration check (BR-0017-0043) asserts it from a pull request                      | A diff that moves any step out of the `build` job, or that adds a condition to `build` or to anything it depends on                         |
| The hygiene lane merges before the tree it asserts is hardened, so it lands instantly red and gets weakened to land                                       | med / high          | DR-0017-0005 edge 2 makes the order a review rejection; the preference order is satisfy the guard, then adjust the convention, then narrow — never weaken to merge                         | A pull request that adds a hygiene rule and a rule exemption in the same diff                                                               |
| Step 4 stalls because pinning the Node version wants a new root-level file that no agent may create                                                       | high / low          | The plan proceeds on `package.json#engines.node`, which needs no approval, and records the root file as the approval-gated alternative with its exact semantic difference                  | The resolved Node version drifting off `20.19` in a run log, which is the observable cost of the no-approval option                         |
| More workers surface real filesystem races against temporary trees and the spawned binary, and there is no retry to hide them                             | high / med          | One project per pull request, largest first, three consecutive green verdicts before merge, and zero retry settings so the race is visible rather than masked                              | A second non-deterministic failure in the same project within one tuning pull request — stop tuning that project and record the measurement |
| A later contributor "restores" the source repository's one-workflow-file-per-layer topology                                                               | med / med           | BR-0017-0035 states the narrowing as a rule with its reason, and the reason is recorded as the current one (every check name is an unconfigurable settings surface), not the withdrawn one | A new file appearing under `.github/workflows/` in a layer-separation diff                                                                  |
| A ledger row is promoted before its file exists, turning every later acceptance-criteria edit into a `QFAI-TRACE-001` error                               | med / med           | DR-0017-0006's promotion rule plus the `State today` column above, so the two files cannot disagree about which paths exist                                                                | `QFAI-TRACE-001` naming a path this plan marks `to be created`                                                                              |
| The composite action is authored under the shipped asset tree by reflex, making `pnpm verify:pack` throw                                                  | low / high          | BR-0017-0028 states the exclusion; `verify-pack.mjs` allow-lists only `workflows` under the shipped `.github/` and throws on any other child                                               | `pnpm verify:pack` failing with an unexpected shipped `.github/` child                                                                      |
| SHA pins go stale because no automated bump lane exists                                                                                                   | high / low          | DR-0017-0003 names the owner and binds the obligation to release preparation, which is the one recurring moment the branch-name version pin makes structurally observable                  | A pinned SHA more than one upstream minor behind at a release-preparation pass                                                              |
| The documentation-only exclusion list drifts as directories are added, so cost creeps back                                                                | med / low           | BR-0017-0009 keeps the recognized-directory list closed and fails open, so drift costs runner minutes and never correctness                                                                | A documentation-only pull request executing more than four job instances                                                                    |
