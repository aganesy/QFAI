# 01 Spec — Repository Toolchain

- Spec: spec-0017
- Parent: CAP-0017: リポジトリツールチェーン (Repository Toolchain)
- Status: active

## Consumer View

- Primary SSOT for execution: `spec-0017/01_Spec.md`
- Default read set: this file + relevant contracts only
- `_policies` is read-only escalation context and must not be read by default

This file is the primary SSOT for execution phases.
Execution agents read this file first, then access child files (02-10) for detail.

The subject of this spec is **the tooling QFAI builds itself with**, not tooling QFAI ships.
Nothing this spec owns appears in `packages/qfai/package.json#files`, so no artifact under its
scope reaches an adopter's machine. That single property is the scope boundary (DR-0276) and it
is why the internal-version-leakage guard has no jurisdiction here.

## Scope

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
- Slice-surface alignment: the vitest project set, the CI matrix slice list, and the
  `test:<slice>` script set held to one shared name set.
- The layer-to-CI-lane mapping document, authored under
  `packages/qfai/assets/init/.qfai/assistant/catalog/` so the SSOT mirror gate stays satisfied.
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

## Applicable NFR

Own-CI halves only. The shipped-surface halves of NFR-0011, NFR-0013 and NFR-0016, and the
shipped half of NFR-0012, belong to `spec-0003`.

- NFR-0001: Pull-request wall clock does not regress — no worse than the captured baseline on a
  code-path pull request; at most 3 minutes end to end on a documentation-only one. The baseline
  is unmeasured today and capturing it is a precondition of any cost-shaping change.
- NFR-0002: Runner-minute consumption falls — from 14 job instances / 13 frozen-lockfile
  installs / 6 bundler builds per pull request to at most 12 / 8 / 3-or-5 on a code path, and to
  at most 4 executed instances (3 after `OQ-0022`) on a documentation-only path.
- NFR-0003: Credential-free layers structurally cannot require a secret — zero secret-inheritance
  uses anywhere in `.github/workflows/**`.
- NFR-0004: Flake budget — 3 consecutive green aggregate-verdict runs on every parallelism
  pull request before merge; at most 1 rerun-to-green per 20 default-branch verdict runs
  afterwards; zero retry settings in the vitest workspace.
- NFR-0005: The distributed-surface defence keeps its breadth — any change to the forbidden-pattern
  set moves all three code sites plus the rule document in one pull request with zero template
  edits in the same diff.
- NFR-0006: New assets are lint-clean — the lint aggregate exits 0 with every new and edited
  YAML, Markdown and script present. Copied YAML needs reformatting (DTC-14).
- NFR-0007: Every job is bounded and least-privileged — 100% of jobs carry both a
  `timeout-minutes` and a job-reachable permission block. Stated as a percentage precisely so it
  survives the own-CI denominator falling from 12 to 11.
- NFR-0010: Adding a lane costs one edit, not two — the verdict iterates its serialized needs
  map, so no verdict-body edit and no settings change is needed to add a job.
- NFR-0012 (own-CI half): Own-CI pins are 100% full-SHA with a bump owner named in a durable
  repository artifact.
- NFR-0014: Gate placement is effective, not nominal — every gate this spec introduces runs on a
  pull request; none is placed in the release-only gate aggregate (DTC-18).
- NFR-0015: The layer vocabulary does not grow — the layer-vocabulary warning count is unchanged
  and the built-in layer token set is untouched after every change.

## Applicable Policy

- Authorization: every job declares an explicit least-privilege permission block; the aggregate
  verdict declares an empty permission map; elevations are individually justified — the
  publishing job's identity-token write is the only one and it stays.
- Data protection: the checkout token is never persisted to the workspace; uploads are limited
  to QFAI's own report output, skipped on cancellation, with a short retention window.
- Secret management: secret inheritance is forbidden outright. Any reusable workflow declares
  each secret it needs and every caller enumerates them.
- Supply chain: every action reference is pinned to a full commit SHA, and pinning carries an
  explicit obligation to name a bump owner because no automated bump lane exists (OC-5).
- Guard integrity: no guard is weakened to make this work land. Preference order is explicit —
  satisfy the guard as written, then adjust the convention, then consider narrowing it.
- Failure-direction policy: the test is **substitution, not cost**. Fail open where the degraded
  behaviour is a superset of the correct work (a failed diff means "assume everything changed")
  and annotate it; fail closed where degrading would substitute an input, because a substituted
  input lets a gate report a pass it never evaluated. The verdict job and the failure threshold
  never degrade to success.
- Monitoring: the aggregate verdict is the single observed signal and is asserted against all
  four need states — failed, cancelled, all-succeeded, all-skipped. The hygiene lane names its
  rule set in its output so a green result is legible as a list of checks.
- Measurement policy: no cost or parallelism claim ships on argument. A measured negative result
  is a legitimate outcome that is recorded rather than retried until it agrees.
- Review policy: three change classes are blocking-review regardless of diff size — any edit to
  the aggregate verdict job, any change to a guard's pattern set in either direction, and any
  change to a copy or prune policy touching an adopter's files.
- Repository rules: `.agents/rules/version-discipline.md` (OC-1 — the discussion branch is
  unpinned, so review is the only control), `.agents/rules/root-additions-policy.md` (OC-3 — an
  automated action-bump configuration at the repository root needs explicit user approval),
  `.agents/rules/temporary-files.md` (OC-6), `.agents/rules/distributed-surface.md` (NFR-0005).
- Test-layer policy: `.qfai/assistant/catalog/test-layers.md`. Per-level routing is a target
  state that is not enforced (DTC-9); the mapping document must not read as activating it.
- Drift Protocol: upstream artifact edits require a user-approved Change Request.
- Policy escalation targets: `_policies/07_Constraints.md`, `_policies/08_Decisions.md`.

## Evidence Summary

- Discussion pack: `discussion-20260804173914356` — REQ-0001..0025, NFR-0001..0016, 28 technical
  constraints, 22 open questions (0 open, 18 resolved, 4 deferred).
- Approval and rationale: `_policies/10_delta.md` § `2026-08-05 — CHG-007`, DR-0275 (revoke the
  `spec-0017` / `CAP-0017` permanent-gap reservation) and DR-0276 (`toolchain` as a fifth slice
  category, with the distributed-or-not boundary).
- Measured baseline: `05_Scope.md#Measured Baseline` of the pack, taken at `main` / `f8aec462`.
  Declaration (2 of 12 jobs) and reachability (4 of 12) are two different measurements and must
  never be conflated.
- Required-status-check inventory: repository rulesets API, 2026-08-04 — the only required
  context on `main` is the job named `build` (DTC-28). This withdrew the pack's Assumption 3.
- Cost and parallelism evidence: timing and run-identifier artifacts under `.qfai/evidence/`.
  That tree is version-control-ignored (OC-7), so every number must also be quoted in the
  pull-request description and in the spec's decision record (NFR-0001, NFR-0004, `DSC-015`,
  `DSC-017`).
- Sources: SRC-0001..SRC-0027 in the pack's `04_Sources.md`. The reference implementation is
  a private repository, is not named in any tracked file, and its mechanisms are adopted as
  design patterns, never as vendored files (LC-1).

## Relevant Requirements

`REQ-NNNN` below is **spec-local** and numbered from `REQ-0001` inside this spec. Each bullet
names the upstream discussion requirement it descends from as `<pack-id>#<upstream-id>`, because
both layers number from `REQ-0001` and the pack half is the only thing that disambiguates them.
All 15 carry `Surface: own-CI` or `Surface: both` in the pack; for the two `both`-surface rows
this spec owns the own-CI half only.

- REQ-0001: Own-CI per-job least privilege — every job across `.github/workflows/**` has a
  **reachable** `permissions:` block scoped to what it needs; the aggregate verdict declares an
  empty permission map; the publishing job's identity-token elevation is preserved as a justified
  exception. Written against reachability, not declaration, so the gap is 8 jobs, not 10.
  (upstream: `discussion-20260804173914356#REQ-0001`, `own-CI`, must)
- REQ-0002: Own-CI checkout credential hygiene — every checkout step sets
  `persist-credentials: false`; the two jobs that need full history keep it job-scoped rather
  than letting it become a default. Baseline 0 of 11.
  (upstream: `discussion-20260804173914356#REQ-0002`, `own-CI`, must)
- REQ-0003: Own-CI action pinning with a named bump owner — all 21 action references move to
  full commit-SHA pins. The conventional readable version trailer is legal in this tree and needs
  no guard change. The requirement is unsatisfied unless the bump owner is recorded in a durable
  repository artifact — the spec or the bump configuration — never only in a pull-request
  description, which no gate can read.
  (upstream: `discussion-20260804173914356#REQ-0003`, `own-CI`, must)
- REQ-0004: Own-CI single-definition setup preamble with a file-derived Node version — the setup
  preamble has exactly one definition in the repository and every own-CI job consumes it. The
  obligation is single-definition; a repository composite action is the mechanism that satisfies
  it today. The Node version is read from a file rather than from a duplicated workflow-level
  literal. Legal in this tree only; not shippable.
  (upstream: `discussion-20260804173914356#REQ-0004`, `own-CI`, must)
- REQ-0005: Own-CI build-artifact reuse, measurement-gated — the build is produced once and
  uploaded, and the legs that need it download it. Because this serializes jobs that are parallel
  today, the requirement is satisfied **either** by landing the reuse **or** by recording a
  measurement showing a wall-clock regression and keeping the rebuilds. Carries the
  obligation-preservation requirement on the job named `build` (DTC-28): keep the name, keep it
  unconditional, and keep its enumerated verification set — the name alone is explicitly not
  sufficient.
  (upstream: `discussion-20260804173914356#REQ-0005`, `own-CI`, should)
- REQ-0006: Own-CI drift-proof aggregate verdict — the verdict keeps its exact name and derives
  its result from the set of its needs rather than from a hand-maintained enumeration, so adding
  a job to its needs cannot produce a gate that ignores it. It must fail on a failed need and on
  a cancelled need, and pass when all needs succeeded and when all needs were skipped. It must
  land before any requirement that adds a job.
  (upstream: `discussion-20260804173914356#REQ-0006`, `own-CI`, must)
- REQ-0007: Own-CI change detection and change-derived lane selection — a full-history detection
  job derives which slices must run; every matrix leg stays **declared** and an unneeded leg is
  _skipped_ by a derived condition rather than removed, so its check name persists and it consumes
  no runner minutes. Any diff failure fails open with a warning annotation and runs everything, as
  does a change outside the recognized directories. Two lanes are exempt from selection and always
  run: the job carrying a required status context (temporary, released by `OQ-0022`; the general
  rule that outlives it is that no job carrying a required status context may be skippable while
  it carries it) and the lint lane. Pairs mandatorily with REQ-0006.
  (upstream: `discussion-20260804173914356#REQ-0007`, `own-CI`, should)
- REQ-0008: Own-CI layer-separated test lanes inside one file — the layer taxonomy is mapped onto
  own-CI jobs and matrix legs by cost and duration, because QFAI's suite is a single credential
  class and cannot be split by credential need. The split stays inside the existing workflow file,
  so no new check name enters the repository's check surface: every check name is a settings
  surface no agent can configure, so creating one strands it unconfigured.
  (upstream: `discussion-20260804173914356#REQ-0008`, `own-CI`, should)
- REQ-0009: Own-CI artifact upload hygiene — the report upload moves from unconditional to
  skip-on-cancellation, tolerates missing files, and shortens retention to at most 7 days from 14.
  (upstream: `discussion-20260804173914356#REQ-0009`, `own-CI`, should)
- REQ-0010: Per-project runner parallelism knobs with a derived worker default — the vitest
  workspace gains explicit pool, worker, concurrency, file-parallelism and hook-timeout settings
  per project, where today every project sets only a name, an include pattern and a shared
  timeout. The declared starting value is **10 workers** per the user's instruction, and **10** on
  the within-file concurrency axis. It is a hypothesis to confirm against measurement, not a
  constant: the source numbers are justified as network-bound, which is false for this filesystem-
  and subprocess-bound suite. Tuning proceeds one project per pull request, largest first. No
  retry setting is added.
  (upstream: `discussion-20260804173914356#REQ-0010`, `own-CI`, must)
- REQ-0011: Slice-surface alignment — delete the vitest project that matches zero files, is
  absent from the CI matrix, and would fail on an unfiltered run; add the two missing per-slice
  scripts, so the vitest project set, the CI matrix slice list and the per-slice script set hold
  the same names as each other — seven once the dead project is deleted, not three.
  (upstream: `discussion-20260804173914356#REQ-0011`, `own-CI`, must)
- REQ-0012: Workflow-hygiene lint lane over own workflows — a repository script, run from the
  lint aggregate that pull requests actually execute, asserts over `.github/workflows/**`: every
  job declares `permissions:` and `timeout-minutes`; every checkout refuses to persist
  credentials; every action reference is SHA-pinned; every matrix disables fail-fast; secret
  inheritance appears nowhere. The script names its rule set in its output so a green result reads
  as a list of checks rather than as a blanket assurance. The same script is the executor for the
  required-context declaration check (`DSC-027`), because it already parses every workflow.
  (upstream: `discussion-20260804173914356#REQ-0012`, `own-CI`, should)
- REQ-0013: The hygiene lane also lints the shipped templates — the same lane scans the shipped
  workflows tree, either by copying it into the real workflows directory inside the CI checkout or
  by pointing the script at both trees, and applies the shared rule set plus the shipped-only
  rules. Third-party `uses:` is asserted as an **allow-list, never as a count of zero** — a count
  would fail the lane on the one action the shipped pin policy legitimately keeps, which is the
  instantly-red failure mode this requirement exists to warn about. Sequencing is mandatory: this
  lands together with the shipped hardening, never before it. **This spec owns the lane; the
  shipped files it scans are `spec-0003`'s.**
  (upstream: `discussion-20260804173914356#REQ-0013`, `both` — own-CI half, should)
- REQ-0014: Layer-to-CI mapping in a parser-invisible home — the mapping from the layer taxonomy
  to CI lanes lands in a sibling catalog file, cross-linked from the layer catalog, whose header
  states that the layer-policy loader does not read it. It must not read as activating per-level
  routing, which the catalog marks as not enforced, and extending the built-in token set to
  legalize CI vocabulary is rejected. **It must be authored under
  `packages/qfai/assets/init/.qfai/assistant/catalog/`**: the root `.qfai/assistant/**` tree is
  SSOT-synced from assets by `scripts/sync-init-to-root.mjs`, so editing the root copy directly is
  reverted by `pnpm sync:ssot` and fails `git diff --exit-code .qfai/` in `pnpm ci:gate` (DTC-20).
  (upstream: `discussion-20260804173914356#REQ-0023`, `both` — own-CI half, should)
- REQ-0015: Retire the repository's duplicate of the shipped validate workflow — the repository's
  own copy is removed and its full-profile run is folded into the existing `build` job, which
  already has a locally built binary. It is the thirteenth frozen-lockfile install and the sixth
  bundler build per pull request; it is the second unconditionally pull-request-triggered workflow
  with no path filter, so while it exists a documentation-only pull request cannot reach its
  minimum however well lane selection works; and it has silently diverged from the shipped copy.
  Repointing it at the shipped file was rejected: the root manifest declares no dependency on the
  package and provides no local binary, so the shipped invocation would resolve to the
  **published** package rather than to the change under review, inverting the dogfooding. The fold
  inherits REQ-0005's obligation-preservation requirement, and the shipped-set contract gate
  (`spec-0003`) must land in the same change or earlier.
  (upstream: `discussion-20260804173914356#REQ-0025`, `own-CI`, must)

Upstream `REQ-0014..0022` and `REQ-0024` are **not** owned here. The CHG-007 Triage Table
allocates them to `spec-0003`, `spec-0006` and `spec-0008`; see `## Scope` → `### Out`.

## Entry points

- US range in this spec: US-0017-0001..US-0017-0009
- Primary actors: QFAI maintainer, release engineer, contributor opening a pull request,
  QFAI's own CI runner
- Notes: user stories map from discussion `DUS-001`, `DUS-005` and `DUS-006`. `US-0017-0009`
  has no `DUS-` ancestor — its provenance is the success criterion `DSC-016` and the resolution
  of `OQ-0010`.

## Escalation Hook (Read \_policies only when needed)

### When to Escalate

- Ambiguous: term or concept unclear → `_policies/06_Glossary.md`
- Conflict: a shipped-surface obligation appears to require an own-CI edit, or the reverse →
  `_policies/08_Decisions.md` (DR-0276 fixes the boundary)
- Missing: constraint or policy not in this spec → `_policies/07_Constraints.md`
- Trade-off: runner minutes versus wall clock, or gate breadth versus readability →
  `_policies/01_Objective.md`, `_policies/08_Decisions.md`

### Escalation Targets (Read-only, decision basis)

- \_policies/01_Objective.md
- \_policies/02_Initiative.md
- \_policies/07_Constraints.md
- \_policies/08_Decisions.md
