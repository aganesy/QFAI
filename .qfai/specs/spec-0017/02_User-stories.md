# 02 User Stories

## US Catalog

- US-0017-0001: Change-derived lane selection behind a drift-proof aggregate verdict
- US-0017-0002: Own-CI supply-chain hardening with an accountable pin owner
- US-0017-0003: One setup definition with a file-derived Node version
- US-0017-0004: Measurement-gated build reuse and artifact-upload hygiene
- US-0017-0005: Layer-separated test lanes without a new check name
- US-0017-0006: A workflow-hygiene lint lane that pull requests actually run
- US-0017-0007: Runner parallelism derived from QFAI's own workload
- US-0017-0008: Retire the duplicate validate workflow without weakening the required check
- US-0017-0009: Layer-to-CI-lane mapping in a home the layer parser cannot see

## US-0017-0001: Change-derived lane selection behind a drift-proof aggregate verdict

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-001
- Goal: As a QFAI maintainer I want CI to detect what a pull request actually touched, run only
  the lanes that change can affect, and still report a correct verdict when nothing needed
  running — so a documentation-only pull request costs a handful of executed job instances
  instead of the full fourteen, while still running the formatter and the Markdown linter, which
  are the gates that exist precisely for a documentation change
- Non-goals: path filters as the selection mechanism (a path-filtered workflow reports nothing to
  branch protection rather than success, DTC-25); removing an unneeded matrix leg (its check name
  would disappear); making the lane set a hand-maintained list; changing which checks branch
  protection requires (a repository-settings action, `OQ-0022`)
- Notes: covers spec-local REQ-0006 and REQ-0007. Ordering is mandatory — the verdict hardening
  lands **before** anything that adds a job, or a new job can be added to a gate that ignores it.
  Selection governs the test, type-check and coverage lanes only; the lint lane and the job
  carrying a required status context are exempt. QFAI's exclusion set differs from the source
  repository's: the assistant tree is **not** documentation-only because it changes validate
  output, while the agent-integration mirrors are.

## US-0017-0002: Own-CI supply-chain hardening with an accountable pin owner

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-005
- Goal: As a maintainer accountable for supply-chain risk I want every own-CI job to have a
  reachable least-privilege permission block, every checkout to refuse to persist the token, and
  every action reference pinned to a full commit SHA with a named owner for bumping those pins —
  so these properties hold structurally rather than as review discipline
- Non-goals: relying on the repository-wide default permission set; making full history a
  workflow-wide default because two jobs need it; pinning without naming who bumps the pins;
  removing the publishing job's identity-token elevation, which is justified and stays
- Notes: covers spec-local REQ-0001, REQ-0002 and REQ-0003. Written against **reachability**, not
  declaration — a workflow-level block counts — so the measured gap is 8 jobs of 12, not 10. The
  conventional readable version trailer beside a pin is legal in this tree: the leakage guard
  resolves its root to the package directory and never scans the repository's own `.github/`
  (DTC-16), and the release workflow already carries a literal version marker with the guard
  exiting 0. No automated bump lane exists (OC-5), and creating one at the repository root needs
  explicit user approval (OC-3), so the owner is recorded in a durable repository artifact rather
  than deferred to whatever configuration lands later.

## US-0017-0003: One setup definition with a file-derived Node version

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-001
- Goal: As a contributor editing CI I want the setup preamble to exist exactly once in the
  repository and every own-CI job to consume that one definition, with the Node version read from
  a file rather than restated as a workflow-level literal — so changing the toolchain is one edit
  and a stale version comment becomes structurally impossible
- Non-goals: shipping this mechanism to adopters (a composite action under the shipped `.github/`
  is a hard pack failure, DTC-1); a reusable workflow, which adds per-job overhead that
  contradicts the cost objective; deriving the version unconditionally in a shipped template,
  where the absence of an adopter version file would make setup fail closed
- Notes: covers spec-local REQ-0004. The obligation is **single-definition**, not the mechanism; a
  repository composite action is what satisfies it today. Preamble content: enable the
  package-manager shim, set up Node with the package-manager cache and an explicit
  cache-dependency path, re-shim, install with a frozen lockfile. `OQ-0013` sequences this before
  build-artifact reuse, because the setup dedup is what makes reuse a win rather than a trade.

## US-0017-0004: Measurement-gated build reuse and artifact-upload hygiene

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-001
- Goal: As a maintainer paying for runner minutes I want the bundler build produced once and
  downloaded by the legs that need it, and the report upload to stop paying storage for cancelled
  runs — with the reuse accepted or rejected on captured before-and-after numbers rather than on
  argument
- Non-goals: asserting a saving without a baseline; caching keyed on a source hash instead of
  upload and download; narrowing the matrix to reduce builds; treating a measured regression as a
  failure to retry until it agrees; touching the two builds the pack-verification lifecycle fires,
  which are irreducible by artifact reuse (DTC-19)
- Notes: covers spec-local REQ-0005 and REQ-0009. Reuse adds a serializing dependency to jobs that
  are parallel today, so splitting the cheap producer from the expensive verifier is what changes
  the arithmetic. The obligation-preservation requirement on the job named `build` is the sharp
  edge here (DTC-28): that job is the repository's **only** required status check, and the quiet
  failure is a `build` that survives by name while pack verification and the publish dry run move
  out of it, leaving the required check green over almost nothing. Keeping the name is necessary
  and explicitly **not** sufficient.

## US-0017-0005: Layer-separated test lanes without a new check name

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-001
- Goal: As a maintainer reading a failed run I want the test layers separated into their own
  own-CI jobs and matrix legs by cost and duration, expressed as jobs **inside** the existing
  workflow file — so a failure names its layer without creating a check name that nobody can
  configure
- Non-goals: one workflow file per layer; splitting by credential need, which QFAI's suite cannot
  do because it is a single credential class with zero credentials; renaming the aggregate;
  deciding the cost partition before the parallelism measurement exists
- Notes: covers spec-local REQ-0008. The reason for the narrowing is no longer "the aggregate is
  the required check" — DTC-28 withdrew that — but that **every** check name is a repository
  settings surface no agent can configure, so creating one strands it unconfigured. Recorded
  explicitly so a later contributor does not "restore" the source repository's multi-file
  topology. The partition itself is settled by the measurement spec-local REQ-0010 produces, which
  is why this story is `should` rather than `must`.

## US-0017-0006: A workflow-hygiene lint lane that pull requests actually run

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

## US-0017-0007: Runner parallelism derived from QFAI's own workload

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-006
- Goal: As a maintainer tuning a 415-file suite I want each vitest project to carry explicit pool,
  worker, concurrency, file-parallelism and hook-timeout settings, and I want the three slice
  surfaces — vitest project names, the CI matrix slice list, and the per-slice scripts — to hold
  the same names as each other, so a slice is tunable and addressable by one name everywhere
- Non-goals: copying the source repository's numbers, which are justified as network-bound and so
  do not transfer to this filesystem- and subprocess-bound suite; introducing a retry setting;
  tuning several projects in one pull request; treating the declared starting value as final
  without measurement; revising the user's stated value without the user's sign-off
- Notes: covers spec-local REQ-0010 and REQ-0011. The declared starting value is **10** on the
  worker axis and **10** on the within-file concurrency axis, adopted from the user's instruction
  as a hypothesis rather than a constant. Only the _final_ value is measurement-gated; the
  structure lands with the starting value. No retry setting is introduced precisely so the
  filesystem races that more workers can surface are visible instead of masked. One dead project
  matches zero files and would fail on an unfiltered run, and two matrix slices have no
  corresponding script — the matrix works around that today by passing the project name through a
  generic script.

## US-0017-0008: Retire the duplicate validate workflow without weakening the required check

- Parent: CAP-0017
- Source: discussion-20260804173914356#DUS-001
- Goal: As a maintainer I want the repository's own duplicate of the shipped validate workflow
  deleted and its full-profile run folded into the `build` job, which already has a locally built
  binary — so exactly one workflow is pull-request-triggered, the thirteenth install and sixth
  build disappear, and the run under review actually exercises the change under review
- Non-goals: repointing the copy at the shipped file, which would resolve to the **published**
  package because the root manifest declares no dependency on it and provides no local binary,
  inverting the dogfooding; keeping both copies; deleting the copy before an automated gate exists
  over the shipped set
- Notes: covers spec-local REQ-0015. The copy has silently diverged from the shipped file of the
  same name, which is the defect a drift gate exists to prevent (DTC-5). The fold targets the job
  named `build`, so it inherits the obligation-preservation requirement: the folded full-profile
  run becomes part of the enumerated verification set that job must keep performing. Sequencing:
  the shipped-set contract gate in `spec-0003` lands in the same change or earlier — not because
  the tree would otherwise be both unmirrored and ungated, which DTC-5 records it already is, but
  because this copy is currently the only cross-check a reviewer can perform by eye.

## US-0017-0009: Layer-to-CI-lane mapping in a home the layer parser cannot see

- Parent: CAP-0017
- Source: discussion-20260804173914356#DSC-016
- Goal: As a contributor deciding which CI lane a test belongs to I want the mapping from the
  layer taxonomy to CI lanes written down in a sibling catalog file, cross-linked from the layer
  catalog, whose header states plainly that the layer-policy loader does not read it — so the
  document is discoverable without becoming vocabulary
- Non-goals: a new section inside the layer catalog, where explanatory prose extracts as a layer
  token and trips the vocabulary warning on its own; extending the built-in token set to legalize
  CI vocabulary; adding a layer, a layer token or a layer heading; writing anything that reads as
  activating per-level routing, which the catalog marks as not enforced; authoring the root copy
  directly
- Notes: covers spec-local REQ-0014, whose upstream row is `both`-surface; this spec owns the
  document. No `DUS-` story covers it — provenance is the success criterion `DSC-016` and the
  resolution of `OQ-0010`. The file must be authored under
  `packages/qfai/assets/init/.qfai/assistant/catalog/`, because the root `.qfai/assistant/**` tree
  is a generated byte-mirror of the asset tree: editing the root copy is reverted by the sync
  script and fails the tracked-tree diff in the gate aggregate (DTC-20). Verified by probe: a
  hyphenated phrase beginning with the layer prefix extracts as a token, while a filename or a
  spaced phrase does not (DTC-8).
