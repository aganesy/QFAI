# CLI Contract: `qfai prototyping`

- Contract scope: public CLI surface backing the `/qfai-prototyping` skill
- Owning spec: `spec-0012`
- Used-by: `spec-0012`
- SSOT modules:
  - `packages/qfai/src/cli/commands/prototypingIterate.ts`
  - `packages/qfai/src/cli/commands/prototypingCertify.ts`
  - `packages/qfai/src/core/prototyping/iteration.ts` (cycle SSOT)
  - `packages/qfai/src/core/prototyping/specResolution.ts` (`resolveAllUiBearingSpecs()`)
  - `packages/qfai/src/core/prototyping/specsCovered.ts` (`readFrozenSpecsCovered()`)
  - `packages/qfai/src/core/prototyping/licenseVerify.ts` (license-class gate)

## Public sub-commands

Only these three sub-commands are part of the stable public surface. The
parent `qfai prototyping` token is not itself an orchestration command;
dispatch must go through one of the sub-commands.

### `qfai prototyping iterate --cycle <0..9>`

Drives one cycle of the autonomous prototyping loop. The skill invokes
`iterate` before each cycle; the command is responsible for cycle-0 freeze,
cycle ≥1 lock-drift detection, per-cycle path assignment, and deterministic
stop-condition checks.

Required inputs (read; never written by this sub-command unless noted):

- `--cycle <n>` — integer in `0..9` (`MAX_ITERATION_INDEX = 9`,
  `MAX_ITERATIONS = 10`); out-of-range value → exit 2.
- `--target-url <url>` — REQUIRED at cycle 0 (Reviewer-launched Playwright
  navigates here); REUSED from cycle-0 state for cycle ≥1.
- `DESIGN.md` (repo root) — must exist and parse; sha256 must equal
  `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.
- `.qfai/evidence/prototyping/prototyping.json` — at cycle ≥1, must carry:
  - `designMd.sha256` matching the live `DESIGN.md` hash (else exit 2),
  - `specsCovered[]` (cycle-0 frozen primary spec; shallow-equal
    compared to `[resolvePrimaryPrototypingSpec(root)]`; mismatch
    → exit 2),
  - `frozenSpecsCovered[]` (cycle-0 frozen primary spec — single-spec
    in v1.8.10; shallow-equal compared to the currently-resolved
    primary; mismatch → exit 2),
  - `frozenSurfaceUnion[]` (cycle-0 frozen multi-spec UI-bearing UNION
    snapshot — the SSOT the cycle ≥ 1 drift gate compares the live
    `resolveSurfaceUnion(root)` result against. Added since the
    11th-wave fix (codex r3265480688); detects mid-loop additions of
    new UI-bearing specs (strict marker / title marker /
    `primarySpecId` pin / UI contract) and deferrals; mismatch
    → exit 2. A missing or malformed `frozenSurfaceUnion` field at
    cycle ≥ 1 is itself exit 2: legacy pre-12th-wave records without
    the field must re-seed via `--cycle 0`. The drift gate does NOT
    silently fall back to the single-spec `frozenSpecsCovered`
    baseline — that fallback re-enabled the MAJOR/P1 false-positive
    closed by the 11th-wave fix (codex r3265953324 13th-wave Fix)),
  - `frozenLicenseCatalog` (cycle-0 frozen stock-photo allowlist. The
    SSOT is the in-memory `DEFAULT_LICENSE_CATALOG` constant in
    `cli/commands/prototypingIterate.ts`; cycle 0 mirrors that constant
    into prototyping.json. Mid-loop edits to `allowedSources` /
    `licenseTiers` / `sourceHosts`, or a malformed shape on disk at
    cycle ≥ 1, are treated as lock drift → exit 2 — the verifier does
    not silently fall back to the in-memory default; it instructs the
    operator to refreeze via `--cycle 0` (codex r3265947252 13th-wave
    Fix, P2)).

Cycle-0 freeze (written by `iterate --cycle 0`):

- `prototyping.json.designMd = { path, sha256 }`
- `prototyping.json.specsCovered = [resolvePrimaryPrototypingSpec(root)]`
  — single primary spec ID. The cycle-0 freeze itself is single-spec in
  v1.8.10 because the certify driver still gates on the flat
  `iter-NN/<screen>.review.json` layout for multi-spec frozen sets; the
  multi-spec freeze (`resolveAllUiBearingSpecs(root)`) is deferred to
  the per-spec layout migration (TDD-0384 / OQ-0012-0006). Mid-run
  additions of new UI-bearing specs do NOT trigger a cycle-0 restart
  and are deferred to the next `/qfai-prototyping` invocation; they
  ARE surfaced as a hard-stop at the cycle ≥1 drift check (see
  `prototyping.json.frozenSpecsCovered` above).
- `prototyping.json.frozenSpecsCovered = [resolvePrimaryPrototypingSpec(root)]`
  — mirrors `specsCovered` until the per-spec layout migration lands.
- `prototyping.json.frozenSurfaceUnion = resolveSurfaceUnion(root, config)`
  — the cycle-0 snapshot of the multi-spec UI-bearing UNION (strict
  `surface_type: ui-bearing`, legacy `# … prototyping …` title marker,
  `prototyping.primarySpecId` config pin, and
  `.qfai/contracts/ui/<spec-id>*.yaml` contract signals). This is the
  SSOT the cycle ≥ 1 drift gate compares against.
- `prototyping.json.frozenLicenseCatalog = { allowedSources, licenseTiers, sourceHosts? }`
  — the cycle-0 mirror of the in-memory `DEFAULT_LICENSE_CATALOG`
  constant (`cli/commands/prototypingIterate.ts`). v1.8.10 sources this
  from the constant; future revisions may source from discussion / skill
  stock-photo configuration without changing this contract's drift
  semantics.

Per-cycle outputs (written for every cycle, including cycle 0):

- `.qfai/evidence/prototyping/iter-NN/iterate-plan.json` — assigned paths,
  target URL, DESIGN.md token snapshot (Tailwind-shaped config), and the
  per-spec × screen list the Reviewer is expected to evaluate.
- `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` —
  Reviewer-emitted qualitative payload per spec × screen (see Review
  payload section below). This is the **only** per-cycle Reviewer
  artifact; no `.png`, no `.html`, no `.interaction.json`.

Per-spec evidence root: `.qfai/evidence/prototyping/iter-NN/spec-NNNN/`.
No artifact may be written above this root for a given spec. Path helpers
`iterationDirPerSpec(iter, specId)`,
`iterationReviewPathPerSpec(iter, specId, screen)`,
`findIterationReviewFiles(...)`, `findStaleIterDirs(...)`,
`deleteStaleIterDirs(...)` all descend into `spec-NNNN` and preserve
the `/^iter-\d{2,}$/` cleanup regex semantics. These helpers live in
`core/prototyping/iterationPaths.ts`; the legacy single-spec helpers
`iterationDir(iter)` / `iterationReviewPath(iter)` in
`core/prototyping/iteration.ts` remain in place until TDD-0384 (the
per-spec iter-dir migration in `prototypingIterate.ts`) lands.

> **Implementation status (v1.8.10):** the iterate driver still writes
> flat `iter-NN/<screen>.html` + `iter-NN/iterate-plan.json`. The
> certify driver gates on the per-spec layout when present and falls
> back to the flat layout otherwise. The per-spec migration is deferred
> to a dedicated wave (see `_policies/10_delta.md` Deferred + spec-0012
> `10_Plan.md#Deferred follow-ups`). Until that wave lands, downstream
> consumers SHOULD treat both layouts as valid.

Convergence (evaluated at cycle ≥1 after Reviewer payloads land):
the AND across every spec × screen pair of
`(all 4 axes == exceptional) AND layoutAntiPatternsDetected.empty AND designMdViolations.empty`.
Quantitative AC-pass% and transition-pass% thresholds are NOT used.

Exit codes:

| Code | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Continue: cycle accepted, paths assigned, loop should advance to next cycle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2    | Input / lock-drift error. Covers: `--cycle` out of range; missing `--target-url` at cycle 0; `resolveAllUiBearingSpecs()` returned zero (treated as deterministic no-op only at cycle 0 — see note); `DESIGN.md` missing / malformed / hash drift vs `DESIGN.md.lock.yaml`; `prototyping.json#designMd` missing on cycle ≥1; `prototyping.json#specsCovered` drift vs cycle-0 frozen primary spec; mid-run spec-set drift (cycle ≥1 `resolveSurfaceUnion()` live UNION differs from cycle-0 `frozenSpecsCovered` — deferred to next `--cycle 0`); `prototyping.json#frozenLicenseCatalog` drift vs frozen catalog (license-catalog lock drift). |
| 64   | STOP: converged. All spec × screen pairs reached the AND-convergence condition. This is also the exit code raised when Reviewer Playwright sessions fail across all reviewers for a given spec × screen (Reviewer-driven Playwright hard-stop class). The skill distinguishes the two by reading `iter-NN/spec-NNNN/<screen>.review.json#sessionStatus`.                                                                                                                                                                                                                                                                                        |
| 65   | STOP: budget exhausted. Latest iter index === `MAX_ITERATION_INDEX` (= 9) without convergence. Lagging specs are named in the aggregated record.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 66   | STOP: license-verify failure. An `imageSources[]` slot resolved to a non-allowlisted source, unknown license tier, or HTTP (non-HTTPS) URL; license catalog SSOT was frozen at cycle 0. Non-recoverable within the run.                                                                                                                                                                                                                                                                                                                                                                                                                         |

Note on zero UI-bearing specs: `resolveAllUiBearingSpecs()` returning an
empty list at cycle 0 is a deterministic no-op (the skill exits 0 without
writing any iter dirs). It is exit 2 only if encountered mid-run after a
non-empty cycle-0 freeze.

### `qfai prototyping certify [--check]`

Validates the final-iter aggregate against the cycle-0 frozen spec set and
emits / verifies the completion certificate.

Inputs:

- `.qfai/evidence/prototyping/prototyping.json#specsCovered` — read via
  `readFrozenSpecsCovered()`; drives the per-spec loop.
- `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` for
  every spec ∈ `specsCovered` and every screen declared in that spec's
  UI contracts at the accepted iter (`acceptedIterationIndex ===
iterations.length - 1`).
- `prototype-handoff.yaml#imageSources[]` — every row must have non-empty
  `{url(https), license, attribution, source}`; license value must be
  drawn from the frozen `frozenLicenseCatalog`.

Outputs:

- `.qfai/evidence/prototyping/completion-certificate.json` — aggregated
  per spec; lists `specsCovered`, `convergedSpecs[]`, `laggingSpecs[]`,
  `cyclesUsed`, `imageSourcesCount`, `acceptedIterationIndex`.
- `prototype-handoff.yaml` — `{ finalIterIndex, finalArtifact,
extractedDesignSystem (= DESIGN.md deterministic mirror),
implementationNotes, imageSources[] }`.

Modes:

- (default, write mode) — recomputes the certificate from the current
  evidence tree and writes it.
- `--check` (read mode) — validates the existing certificate and the
  evidence tree without writing. Exit 0 is the sole DONE signal for the
  skill.

Exit codes:

| Code | Meaning                                                                                                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Certify passed. (Required for `/qfai-prototyping` DONE.)                                                                                                                                                                                                                                                                         |
| 2    | Input error. Missing / unreadable `prototyping.json`, missing `specsCovered[]`, accepted iter dir absent, certificate schema malformed.                                                                                                                                                                                          |
| 64   | Coverage rejection: at least one spec lacks a `<screen>.review.json` for a declared screen at the accepted iter, OR the multi-spec frozen set (`frozenSpecsCovered.length > 1`) is incompatible with the flat-iter layout still emitted by `prototyping iterate` (per-spec layout migration deferred — TDD-0384 / OQ-0012-0006). |
| 66   | License-verify rejection: `imageSources[]` violates the frozen `frozenLicenseCatalog` (non-allowlisted source, unknown license, non-https url, missing attribution).                                                                                                                                                             |

### `qfai prototyping show-spec`

Read-only: prints a JSON payload describing the cycle-0 frozen spec set
and the live UI-bearing UNION so the operator can see which specs the
current `/qfai-prototyping` run will iterate over and spot any drift
before re-seeding. Exit 0 on success; exit 2 if `prototyping.json` is
missing or malformed (the command hard-requires a seeded
`prototyping.json` — operators who previously ran `show-spec` _before_
cycle 0 must now run `iterate --cycle 0` first; see CHANGELOG `[1.8.10]`
BREAKING). Not part of the convergence path; cannot mutate state.

Output JSON schema (SSOT):

```yaml
schema:
  frozenSpecsCovered:
    string[] # cycle-0 frozen primary spec ids
    # (single-element in v1.8.10)
  frozenSpecsCoveredSource:
    enum: [frozenSpecsCovered, specsCovered]
    # which prototyping.json field the
    # `frozenSpecsCovered` array was read from.
    # post-Wave-3 records carry the dedicated
    # `frozenSpecsCovered` field; pre-Wave-3
    # records carry only `specsCovered`. This
    # tag lets operators detect legacy-seeded
    # records without re-reading the file
    # (14th-wave Fix, codex r3269198684 MINOR).
  frozenSurfaceUnion:
    string[] | null
    # cycle-0 frozen multi-spec UI-bearing
    # UNION snapshot, or null on
    # legacy pre-12th-wave records
  liveUiBearing:
    string[] # live `resolveSurfaceUnion()` result —
    # spec IDs (the same resolver iterate's
    # cycle ≥ 1 drift gate uses; covers strict
    # `surface_type: ui-bearing` + title-marker
    # + `primarySpecId` config pin + UI contract
    # signals). Bare IDs (not SpecRef objects)
    # because the non-strict resolution paths
    # (title-marker / primarySpecId) do not
    # carry per-spec metadata; per-spec
    # `specMdPath` / `source` for the resolved
    # primary is available in the optional
    # `primary` block below (15th-wave / 16th-wave
    # Fix, codex r3269453293 P2 + codex r3269597174 P2).
  primary?: # present iff a primary spec resolves
    specId: string
    specMdPath: string # repo-root-relative POSIX path
    source: string # resolution-source tag
```

The pre-12th-wave top-level keys `specId` / `specMdPath` / `source` have
been demoted to the optional `primary` block (BREAKING in `[1.8.10]`).
Operator tooling that grepped `show-spec | jq '.specId'` MUST migrate to
`primary.specId`; the migration is one-line per call site.

## Review payload (`<screen>.review.json`) shape

The Reviewer sub-agent emits exactly one of these per spec × screen per
cycle. Numeric scores are not produced; only ordinal verdicts plus short
prose.

```yaml
schema:
  specId: string # e.g. "spec-0012"
  screenId: string # declared screen id from the spec's UI contract
  cycle: integer # 0..9
  sessionStatus: # Reviewer Playwright session outcome
    enum: [ok, retryExhausted, launchFailed]
  retryCount: integer # bounded retries actually consumed (NFR target N=3)
  ordinalAxes: # the canonical 4 UX axes
    informationArchitecture: enum [weak, acceptable, strong, exceptional]
    navigationFlow: enum [weak, acceptable, strong, exceptional]
    usability: enum [weak, acceptable, strong, exceptional]
    functionality: enum [weak, acceptable, strong, exceptional]
  layoutAntiPatternsDetected: string[] # lap-001..lap-008 ids; empty list required for convergence
  designMdViolations: object[] # output of findDesignMdViolations(); empty required for convergence
  impressions: # short-prose fields, each ≤ 200 words; NOT asserted for exact equality
    operability: string
    transitionFeel: string
    crossScreenContinuity: string
    userStoryFeel: string
    acceptanceCriteriaFeel: string
    menuReachabilityFeel: string
  wallTimeSec: number # Reviewer-recorded per-session wall-time
  softWarnings:
    timeBudget: bool # true ⇔ wallTimeSec exceeded per-spec cap (NFR target 5 min/spec)
```

## Hard-stop classes (autonomous run)

The run is fully autonomous from cycle 0 through cycle 9; there are no
mid-run stdin prompts. Hard-stops are deterministic and explicitly
enumerated:

1. **Lock drift** — `DESIGN.md` sha256 mismatch vs `DESIGN.md.lock.yaml`,
   OR `frozenLicenseCatalog` drift vs cycle-0 frozen catalog. Exit 2.
2. **Reviewer Playwright failure** — Reviewer-launched Playwright fails to
   complete its session for a given spec × screen after the bounded retry
   budget (N = 3, exponential backoff) for every reviewer attempted on
   that pair. Exit 64 (with `sessionStatus = retryExhausted | launchFailed`
   recorded in the payload to distinguish from converged-exit-64).
3. **License-verify failure** — `imageSources[]` resolves to a
   non-allowlisted source / unknown license tier / non-https URL, or
   `licenseVerify()` cannot reach the source on cycle 0. Exit 66.
4. **Mid-run spec-set change** — live `resolveSurfaceUnion(root)` (the
   UNION of strict `surface_type: ui-bearing`, legacy `# … prototyping
…` title-marker, `prototyping.primarySpecId` config pin, and
   `.qfai/contracts/ui/<spec-id>*.yaml` contract signals) differs from
   the cycle-0 `prototyping.json#frozenSpecsCovered` snapshot. Exit 2.
   New UI-bearing specs are not added to the in-flight run; they are
   deferred to the next `/qfai-prototyping` invocation. (v1.8.10
   `frozenSpecsCovered` is itself single-spec — see Cycle-0 freeze
   note above — so this drift gate is the load-bearing detector for
   mid-loop multi-spec scope changes until the per-spec layout
   migration lands.)

No prompt, recovery path, or partial-success continuation exists for any
of the above. CI fixtures close stdin and assert the run completes
without `EBADF` / `EINTR` on stdin reads (NFR autonomy boundary).

## Non-goals (out of contract)

- `qfai prototyping` as a top-level orchestration command (only the three
  sub-commands above are public).
- `--mode` flag or any `low-cost` / `standard` / `full-harness` mode
  selection.
- Capture pipeline (PNG / HTML / per-action interaction transcript)
  artifacts.
- Scripted-interaction generator or AC selector / assertion synthesis.
- Quantitative AC-pass% / transition-pass% thresholds.
- Configurable cycle budget (`MAX_ITERATIONS` is a code constant; not
  configurable).
- Per-spec time-budget hard-fail (5 min/spec is enforced only as a soft
  warning in `<screen>.review.json#softWarnings.timeBudget`).
- Best-of-history winner selection (latest iter is always accepted).
- LLM-subjective DONE (only `certify --check` exit 0 is the DONE signal).

## Determinism posture

- Cycle gating, evidence tree layout, exit codes, lock-drift detection,
  license-verify, and coverage validation are deterministic.
- Reviewer `impressions.*` short-prose fields are NOT deterministic and
  MUST NOT be asserted for exact equality by tests or downstream
  consumers. Ordinal verdicts (`ordinalAxes.*`), structural presence
  (`<screen>.review.json` existence), `layoutAntiPatternsDetected`,
  `designMdViolations`, and `imageSources[]` are the stable contract
  surfaces.
