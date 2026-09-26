# US-0002-0018: A workflow-hygiene lint lane that pull requests actually run

## User Story

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-005
- Goal: As a maintainer I want a repository script, invoked from the lint aggregate a pull request
  actually executes, that asserts the hygiene rule set over `.github/workflows/**` **and** over
  the shipped workflows tree, names the rules it checked in its output, and exits non-zero naming
  the offending file, job and rule — so the hardening properties are a gate rather than a habit
- Non-goals: adopting an external workflow linter and its pinned toolchain (deferred on
  `OQ-0017`); placing the lane in the release-only gate aggregate, which no pull request runs
  (DTC-18, NFR-0014); asserting the shipped third-party action count as zero, which would fail on
  the one action the shipped pin policy legitimately keeps; authoring or hardening the shipped
  files themselves, which are `spec-0003`'s
- Notes: covers spec-local REQ-0012 and REQ-0013. REQ-0013 is a `both`-surface requirement and
  this spec owns the **lane**, not the files it scans. Sequencing is mandatory: the lane's
  shipped-tree coverage lands together with the shipped hardening, never before it, or it lands
  instantly red. The source repository's own equivalent trick never covered its composite-action
  templates — recorded so the gap is not inherited. This same script is the executor for the
  required-context declaration check, because it already parses every workflow, and it reads a
  **checked-in expected-context declaration** rather than live repository settings so that it can
  run on a pull request at all.

## Legacy Source Scope

### In

- `.github/workflows/**` — QFAI's own workflow set: job topology, per-job `permissions:`,
  `timeout-minutes`, checkout credential hygiene, action pinning, concurrency, artifact upload
  hygiene, change detection, change-derived lane selection, and the aggregate verdict job.
- Repository-internal composite actions under `.github/actions/**` — the single-definition
  setup preamble (package-manager shim, Node setup with cache, frozen-lockfile install).
- Repository root `scripts/**` — the quality-gate scripts the lint aggregate and the release
  gate aggregate invoke.
- `packages/qfai/scripts/**` — the package-local guard scripts (branch version pin, internal
  version leakage, shipping lint) as **CI-lane citizens**: which lane runs them, at what
  severity, and against which tree. Their rule sets stay owned by the specs that own the
  surfaces they guard.
- The workflow-hygiene lint lane: its rule set, its output contract, its exit-code contract,
  its registration in `pnpm ci:lint`, and the checked-in expected-required-context declaration
  it reads.
- Test-runner configuration: `packages/qfai/vitest.config.ts`, `packages/qfai/vitest.workspace.ts`,
  and the per-project pool / worker / concurrency / file-parallelism / hook-timeout knobs.
- Slice-surface alignment: the vitest project set, the `test:<slice>` script set, and the matrix
  slice list of every CI job that expands over the slice set, held to one shared name set.
- The layer-to-CI-lane mapping document, authored under
  `packages/qfai/assets/init/.qfai/assistant/catalog/` so the SSOT mirror gate stays satisfied.
  With the `rule/ skill/ agent/ prompt/` assistant tree it is a section of
  `packages/qfai/assets/init/.qfai/assistant/rule/test-layers.md` instead, and the sibling file
  is gone.
- The link set `scripts/link-assistant-tree.mjs` maintains under the repository-root
  `.qfai/assistant/`, and its `--check` mode, as `pnpm sync:ssot` and `pnpm ci:gate:ssot` run them.
- The shape table in `.agents/rules/distributed-surface.local.md`, held in step with the pattern
  set of the three distributed-surface guards. The guards' pattern set stays owned by the specs
  that own those guards.
- Retirement of the repository's own duplicate of the shipped validate workflow, and the fold
  of its full-profile run into the job carrying the required status context.

### Out

- **Shipped workflow templates** under `packages/qfai/assets/init/root/.github/workflows/**`.
  They belong to **CAP-0003** (`qfai init`). Distributed-or-not is the boundary (DR-0276): the
  templates are copied into an adopter's repository, so their hardening, pin policy, layer
  separation, portability and ownership contract are `spec-0003`'s (upstream REQ-0014..0021).
  This spec's hygiene lane _scans_ that tree; it does not _author_ it.
- Adopter drift detection for installed shipped workflows (upstream REQ-0022) — `spec-0006`
  (`qfai doctor`).
- The worker-scoped credential-reuse rule as ATDD guidance (upstream REQ-0024) — `spec-0008`.
- The `pnpm ci:lint` lane **inventory** and the validator rule-code registry — `spec-0004`.
  This spec contributes one lane to that inventory; it does not own the inventory.
- Ephemeral-environment provisioning templates, including deterministic per-pull-request
  environment naming, forced recreation on reopen, teardown by name pattern, and the cron leak
  sweep. QFAI provisions nothing and has no deployable backend (OC-9), so there is no path to
  dogfood them. Not applicable rather than future work. Only the "injected environment
  identifier forbids provisioning and teardown" rule survives, as prose, in `spec-0008`.
- Browser-backend-pinned E2E templates, the digest-pinned browser container, the browser trace
  and screenshot policy, and the environment warm-up loop that exists only to serve a
  provisioned target. Double-blocked by DTC-7 and by the version-marker guard.
- The `ghalint` workflow linter and therefore the aqua toolchain. Deferred on `OQ-0017` with a
  named trigger; the lane it would have provided is delivered as a repository script instead.
- Composite-action templates **for adopters**. An `actions/` directory under the shipped
  `.github/` is a hard pack failure (DTC-1, DTC-15). Repository-internal composite actions are
  in scope; shipped ones are rejected.
- Blanket test retries. The source repository's justification is network-transient; this suite
  is offline and deterministic, and a retry would mask the filesystem races that parallelism
  tuning risks introducing.
- Test sharding. An outer matrix plus in-process fan-out replaces it.
- CI keys in `qfai.config.yaml` (DTC-11, `OQ-0006`). Repository variables give the same
  per-adopter tuning at zero schema cost.
- Numeric drift scoring; version stamping into shipped artifacts; secret-consuming shipped
  templates; adopting the source repository's credential-class script naming.
- A new test layer, a new layer token, a new layer heading, or wider acceptance-test glob
  scanning (NFR-0015, DTC-8, DTC-9).
- Branch-protection changes, repository-settings changes, version bumps, CHANGELOG release
  headings, tags and publishes (OC-1, OC-4). `OQ-0022` carries the required-context hand-off.

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0017/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0017/02_User-stories.md#us-0017-0006`
