# CLI Contract: `qfai prototyping`

- Contract scope: public CLI surface backing the `/qfai-prototyping` skill
- Owning spec: `spec-0012`
- Used-by: `spec-0012`
- SSOT modules:
  - `packages/qfai/src/cli/commands/prototypingIterate.ts`
  - `packages/qfai/src/cli/commands/prototypingCertify.ts`
  - `packages/qfai/src/core/prototyping/iteration.ts` (cycle SSOT)
  - `packages/qfai/src/core/prototyping/specResolution.ts` (`resolveAllUiBearingSpecs()`)
  - `packages/qfai/src/core/prototyping/specsCovered.ts` (`readFrozenSpecsCovered()`, `readFrozenSpecsCoveredMultiSpec()`)
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
    `resolveSurfaceUnion(root)` result against. Detects mid-loop
    additions of new UI-bearing specs (strict marker / title marker /
    `primarySpecId` pin / UI contract) and deferrals; mismatch
    → exit 2. A missing or malformed `frozenSurfaceUnion` field at
    cycle ≥ 1 is itself exit 2: legacy records without the field must
    re-seed via `--cycle 0`. The drift gate does NOT silently fall
    back to the single-spec `frozenSpecsCovered` baseline — that
    fallback would compare a single-spec frozen scope against the
    live multi-spec union and false-positive-fire for any project
    with ≥ 2 UI-bearing specs.),
  - `frozenLicenseCatalog` (cycle-0 frozen stock-photo allowlist. The
    SSOT is the in-memory `DEFAULT_LICENSE_CATALOG` constant in
    `cli/commands/prototypingIterate.ts`; cycle 0 mirrors that constant
    into prototyping.json. Mid-loop edits to `allowedSources` /
    `licenseTiers` / `sourceHosts`, or a malformed shape on disk at
    cycle ≥ 1, are treated as lock drift → exit 2 — the verifier does
    not silently fall back to the in-memory default; it instructs the
    operator to refreeze via `--cycle 0`.).

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

| Code | Meaning                                                                                                                                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Continue: cycle accepted, paths assigned, loop should advance to next cycle.                                                                                                                                                                                                                                                                             |
| 2    | Input / lock-drift error. See the enumerated drift classes immediately below the table.                                                                                                                                                                                                                                                                  |
| 64   | STOP: converged. All spec × screen pairs reached the AND-convergence condition. This is also the exit code raised when Reviewer Playwright sessions fail across all reviewers for a given spec × screen (Reviewer-driven Playwright hard-stop class). The skill distinguishes the two by reading `iter-NN/spec-NNNN/<screen>.review.json#sessionStatus`. |
| 65   | STOP: budget exhausted. Latest iter index === `MAX_ITERATION_INDEX` (= 9) without convergence. Lagging specs are named in the aggregated record.                                                                                                                                                                                                         |
| 66   | STOP: license-verify failure. An `imageSources[]` slot resolved to a non-allowlisted source, unknown license tier, or HTTP (non-HTTPS) URL; license catalog SSOT was frozen at cycle 0. Non-recoverable within the run.                                                                                                                                  |

Exit-2 drift classes (the `2` row above expands to):

- **Input shape** — `--cycle <n>` out of range (must be `0..MAX_ITERATION_INDEX`); missing `--target-url` at cycle 0.
- **Zero UI-bearing specs mid-run** — `resolveAllUiBearingSpecs()` returns an empty list. Treated as a deterministic no-op only at cycle 0 (see note below); at cycle ≥ 1 against a non-empty cycle-0 frozen union it is exit 2.
- **DESIGN.md** missing / malformed / hash drift vs `DESIGN.md.lock.yaml`.
- **`prototyping.json#designMd`** missing on cycle ≥ 1.
- **`prototyping.json#specsCovered`** drift vs cycle-0 frozen primary spec.
- **Mid-run spec-set drift** — cycle ≥ 1 `resolveSurfaceUnion()` live UNION differs from the cycle-0 `prototyping.json#frozenSurfaceUnion` snapshot. Drifted spec(s) are deferred to the next `--cycle 0`.
- **`prototyping.json#frozenSurfaceUnion` missing or malformed on cycle ≥ 1** — legacy / unseeded record. The gate hard-fails rather than silently falling back to `frozenSpecsCovered` (the silent fallback would compare a single-spec frozen scope against a multi-spec live union and false-positive-fire on any project with ≥ 2 UI-bearing specs — that is the failure mode this hard-fail prevents).
- **`prototyping.json#frozenLicenseCatalog` drift** vs the in-memory `DEFAULT_LICENSE_CATALOG` SSOT — set-equality semantic (byte permutations OK; semantic differences exit 2).

Recovery for every exit-2 drift class is the same: restart from cycle 0
(`qfai prototyping iterate --cycle 0 --target-url <url>`) to refreeze
the loop.

Note on zero UI-bearing specs: `resolveAllUiBearingSpecs()` returning an
empty list at cycle 0 is a deterministic no-op (the skill exits 0 without
writing any iter dirs). It is exit 2 only if encountered mid-run after a
non-empty cycle-0 freeze.

### `qfai prototyping certify [--check]`

Validates the final-iter aggregate against the cycle-0 frozen spec set and
emits / verifies the completion certificate.

Inputs:

- `.qfai/evidence/prototyping/prototyping.json` — the certify driver
  reads the cycle-0 frozen spec set with a `readFrozenSpecsCoveredMultiSpec(...)
?? readFrozenSpecsCovered(...)` precedence: the multi-spec
  `frozenSpecsCovered[]` field is the first source, falling back to
  the legacy single-spec `specsCovered[]` only when the multi-spec
  field is absent. The resolved set drives the per-spec loop.
- `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` for
  every spec ∈ resolved frozen spec set and every screen declared in
  that spec's UI contracts at the accepted iter
  (`acceptedIterationIndex === iterations.length - 1`).

License-class enforcement (`imageSources[]` and the
`frozenLicenseCatalog` allowlist) is NOT a certify-side input. The
license gate is enforced exclusively by `qfai prototyping iterate`
(exit 66 — see the iterate exit codes above). `certify` does not
read `imageSources[]` or invoke `licenseVerify()`. The
`prototype-handoff.yaml#imageSources[]` payload is produced by the
post-loop handoff stage and consumed by audit / hand-off tooling,
not by certify.

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

| Code | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Certify passed. (Required for `/qfai-prototyping` DONE.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2    | Input error. Missing / unreadable `prototyping.json`; missing `specsCovered[]`; accepted iter dir absent; certificate schema malformed; `frozenSpecsCovered[]` carries a non-canonical spec id (any value not matching bare 4-digit `NNNN` or fully-qualified `spec-NNNN` — including path-traversal, slash-injected, whitespace, non-numeric, or wrong-digit-count entries — rejected before any review-path construction); `frozenSpecsCovered` present-but-malformed (the key is on the record but its value is non-array, empty array, non-string entry, empty-string entry, OR an explicit `null` / `undefined` on a present key — rejected by the SSOT classifier instead of silently falling back to legacy `specsCovered`). Recovery for the `frozenSpecsCovered` classes: re-run `qfai prototyping iterate --cycle 0` to regenerate `prototyping.json` with canonical ids. |
| 64   | Coverage rejection: at least one spec lacks a `<screen>.review.json` for a declared screen at the accepted iter, OR the multi-spec frozen set (`frozenSpecsCovered.length > 1`) is incompatible with the flat-iter layout still emitted by `prototyping iterate` (per-spec layout migration deferred — TDD-0384 / OQ-0012-0006).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

License-verify (exit 66) is enforced only by `qfai prototyping iterate`.
The certify driver does not read `imageSources[]` and does not call
`licenseVerify()` — operators MUST observe the license-class
hard-stop on the iterate side (see the `iterate` exit codes above).

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
    # Records written before `frozenSpecsCovered`
    # existed carry only `specsCovered`; this tag
    # lets operators detect legacy-seeded records
    # without re-reading the file.
  frozenSurfaceUnion:
    string[] | null
    # cycle-0 frozen multi-spec UI-bearing
    # UNION snapshot, or null on legacy
    # records that pre-date the field.
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
    # `primary` block below.
  primary?: # present iff a primary spec resolves
    specId: string
    specMdPath: string # repo-root-relative POSIX path
    source: string # resolution-source tag
```

The earlier top-level keys `specId` / `specMdPath` / `source` (used by
pre-`[1.8.10]` releases) have been demoted to the optional `primary`
block (BREAKING in `[1.8.10]`). Operator tooling that grepped
`show-spec | jq '.specId'` MUST migrate to `primary.specId`; the
migration is one-line per call site.

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
   non-allowlisted source, unknown license tier, non-HTTPS URL,
   per-source host mismatch vs the cycle-0 frozen
   `frozenLicenseCatalog.sourceHosts`, or missing / empty / whitespace-only
   `attribution`. Exit 66. `licenseVerify()` is a pure static validator
   over the `imageSources[]` shape; it does NOT probe network
   reachability. Dead or unreachable URLs that satisfy the static
   validation rules above are accepted at this gate (network egress
   is not part of the contract).
4. **Mid-run spec-set change** — live `resolveSurfaceUnion(root)` (the
   UNION of strict `surface_type: ui-bearing`, legacy `# … prototyping
…` title-marker, `prototyping.primarySpecId` config pin, and
   `.qfai/contracts/ui/<spec-id>*.yaml` contract signals) differs from
   the cycle-0 `prototyping.json#frozenSurfaceUnion` snapshot — that
   is the actual baseline field the cycle ≥ 1 drift gate
   (`evaluateCycleGteOneGate` in
   `cli/commands/prototypingIterate.ts`) compares against, NOT the
   single-spec `frozenSpecsCovered`. Exit 2. New / removed UI-bearing
   specs are not added to the in-flight run; they are deferred to
   the next `/qfai-prototyping` invocation. A missing or malformed
   `frozenSurfaceUnion` field on cycle ≥ 1 is also exit 2 (legacy /
   unseeded record — see the exit-code table above and the
   `frozenSurfaceUnion[]` clause in the cycle-0 freeze section).

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

## Capture & Serve Flags (v1.9.1+)

The opt-in capture / serve flags are introduced by REQ-0109 / REQ-0110 and
amend DR-0012-0029 via DR-0012-0031 (`spec-0012/07_Decisions.md`). Absence
of both flags preserves the DR-0012-0029 bit-default: per-iter output
remains `<screen>.review.json` only.

### `--capture`

When passed, `iterate` drives Playwright per the Capture contract block
emitted into `iter-NN/iterate-plan.json` and writes per-screen artifacts
for every entry in the spec's UI contract `screens[]`.

Per-screen capture contract block (emitted at cycle 0 freeze; one entry
per `screens[].id`):

```yaml
capture:
  <screen-id>: # snake_case per DR-0001-0007 (OQ-0110=A)
    viewport:
      width: integer # device-pixel CSS viewport width
      height: integer # device-pixel CSS viewport height
    deviceScaleFactor: number # Playwright deviceScaleFactor; typically 1 or 2
    waitUntil: enum # Playwright waitUntil: "load" | "domcontentloaded" | "networkidle" | "commit"
    htmlSourceCopy: boolean # true → copy source HTML; false → page.content()
```

Output paths (written when `--capture` is passed):

- `iter-NN/<screen-id>.png` — full-page screenshot at the configured
  viewport / deviceScaleFactor. Always written when `--capture` is on.
- `iter-NN/<screen-id>.html` — HTML snapshot. When
  `htmlSourceCopy: true`, the source HTML is copied byte-for-byte from
  `.qfai/prototypes/iter-NN/<screen-id>.html` (the iterate-emitted
  source) rather than calling `page.content()`. This avoids the runtime
  style-block injection that Playwright would otherwise serialize into
  the captured HTML.

Capture failures surface via the iterate command itself rather than
through layout anti-pattern codes: when the default
`runCapturePath` runner cannot complete (Playwright not installed,
navigation timeout, screenshot write failure, etc.) iterate exits `2`
with the operator-actionable reason on stderr. The implemented
advisory band is `lap-009` (md5 duplicate, REQ-0124) and `lap-010`
(missing route, REQ-0124); both are advisory-failing per DR-0001-0006
and counted in `layoutAntiPatternsDetected[]`. Higher `lap-011` /
`lap-012` codes are reserved but not currently emitted.

### `--auto-serve`

When passed, `iterate` manages a local HTTP server lifecycle bound to
the configured port (or the port derived from `targetUrl`) for the
duration of the cycle. **Default port: `4321`** (override by passing
`--target-url <url>:<port>` with an explicit port component, or by
supplying a custom `serverRunner` via the DI escape hatch below).
4321 was picked because it does not collide with common dev-server
defaults (Vite 5173, Next 3000, Vue CLI 8080, webpack-dev-server 9000,
Storybook 6006). The SSOT for the literal is
`DEFAULT_AUTO_SERVE_PORT` in `defaultServerRunner.ts`.
The **default runner** (`defaultServerRunner.ts`)
is an in-process `node:http` server — there is no subprocess spawn:

- **Start** — iterate creates a `node:http` server before the first
  Playwright navigation; the server roots at the project's prototype
  tree with a path-traversal guard.
- **Teardown** — on SIGINT (and on normal cycle completion), iterate
  calls `server.close()` with a 2-second bound, then exits. Because
  there is no child process, `tree-kill` / `taskkill /F /T` are not
  used by the default runner.
- **Foreign-process safety (NFR-0106)** — if `listen()` fails with
  `EADDRINUSE`, iterate MUST NOT attempt to kill the owning process.
  Iterate refuses to attach to the foreign owner, surfaces the
  offending PID + owning command line (from `/proc` on Linux,
  `ps -o command=` on macOS, `Get-Process | Select-Object Id, Path,
CommandLine` on Windows) to the operator, and exits `2` with a
  recovery hint to either free the port manually or change the
  configured port.

#### DI escape hatch (programmatic consumers only)

Operators that need subprocess-spawn semantics — spawning an external
dev server (`vite`, `next dev`, `python -m http.server`, etc.) and
tearing it down with `tree-kill` (Linux/macOS) or `taskkill /F /T`
(Windows) — supply their own runner via the `options.serverRunner`
DI surface on `runPrototypingIterate(...)`. Custom runners are
responsible for their own process-tree management and SIGINT
teardown semantics; the CLI does not ship a subprocess-spawn default.

The default (absence of `--auto-serve`) preserves the cycle-0 contract
that the operator manages serving externally (e.g. via the
orchestrator script). Existing orchestrator-managed flows are not
broken.

### Combined `--capture --auto-serve`

Both flags compose: iterate starts the in-process `node:http` server,
drives capture against it, and tears down the server via
`server.close()` before exit. The PNG / HTML artifacts above are
written.

## prototyping.json Schema (v1.9.1+)

REQ-0111 makes `prototyping.json` validate-conformant without
orchestrator post-processing. The `iterations[i]` block and the
convergence-time top-level fields are specified below.

### `iterations[i]` required fields (per-cycle)

```yaml
iterations:
  - cycle: integer # 0..9
    commitSha:
      string
      # repo HEAD commit at iter emit time, OR the sentinel
      # "uncommitted" when no HEAD commit is applicable
      # (clean workspace before any commit, detached state,
      # CI ephemeral checkout where HEAD is rewritten, etc.).
      # Validators MUST accept "uncommitted" as canonical
      # and MUST NOT fail prototyping-profile validate on it.
    proseCritique: string # non-empty; reviewer-emitted prose summary
    scores: # ordinal axes per DR-0012-0012 (preserved)
      informationArchitecture: enum [weak, acceptable, strong, exceptional]
      navigationFlow: enum [weak, acceptable, strong, exceptional]
      usability: enum [weak, acceptable, strong, exceptional]
      functionality: enum [weak, acceptable, strong, exceptional]
    layoutAntiPatternsDetected: string[] # lap-001..lap-010 (implemented band); empty required for convergence
    designMdViolations: object[] # findDesignMdViolations() output; empty required for convergence
    pivotDirective: string # reviewer's next-cycle directive; empty allowed only at converged-cycle
    reviewerId:
      string
      # resolved reviewer sub-agent identity; placeholder
      # values "qfai" / "default" / "auto" / "system" /
      # "unknown" / "" are rejected per DR-0201 (preserved).
    evidenceRefs: # one entry per evidence artifact at this iter
      - kind: enum [screenshot, html]
        path:
          string
          # POSIX-form relative path under
          # .qfai/evidence/prototyping/, e.g.
          # "iter-NN/<screen-id>.png" or
          # "iter-NN/<screen-id>.html". `<screen-id>` MUST be
          # the underscore-normalized form per DR-0001-0007
          # (OQ-0110=A).
```

When `--capture` is **not** passed for an iteration, `evidenceRefs[]`
MAY be empty for that iteration (DR-0012-0029 default preserved).
When `--capture` IS passed, `evidenceRefs[]` MUST contain at least one
`kind: screenshot` entry per `screens[].id` (and a `kind: html` entry
when `htmlSourceCopy: true` for that screen).

### Convergence-time top-level fields

On convergence (exit 64), `iterate` MUST set on the top-level
`prototyping.json` record:

```yaml
acceptedIterationIndex: integer # 0..9; index into iterations[]
stopReason: enum
  - axes-exceptional # all (spec,screen) pairs reached exceptional + empty laps + empty designMdViolations
  - max-iterations # exit 65 path (budget exhausted without convergence)
  - license-verify-fail # exit 66 path
  - input-error # exit 2 path
```

`qfai validate --profile prototyping --fail-on error` MUST PASS on a
converged-iterate output WITHOUT orchestrator post-processing. This is
the machine-checkable acceptance signal for REQ-0111.

### Screen-id casing (OQ-0110=A, end-to-end underscore)

Per DR-0001-0007, `screens[].id` is **snake_case** (underscore-separated)
end-to-end:

- UI contract authoring (`primary_tasks` slot per REQ-0115) uses
  underscore form.
- Iterate emit (`iter-NN/<screen-id>.{png,html,review.json}`) uses
  underscore form.
- Validator expectation matches underscore form.
- Aggregate-dir mirror on convergence
  (`.qfai/evidence/prototyping/screenshots/<screen-id>.png` and
  `.qfai/evidence/prototyping/html/<screen-id>.html`) uses underscore
  form.
- The `evidenceRefs[].path` field uses underscore form.

Existing hyphen-form iter outputs are accepted during the deprecation
window (`D-DEPRECATED-PATH` warning); sunset is qfai 1.10.0 per
`package.json#version`.
