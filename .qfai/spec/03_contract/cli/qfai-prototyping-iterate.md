# CLI Contract: `qfai prototyping iterate`

- Contract scope: full surface for the `iterate` sub-command of
  `qfai prototyping`, expanding the summary in
  `.qfai/spec/03_contract/cli/qfai-prototyping.md` with the flag
  surface, cycle-range validation, force / backup semantics, and
  exit code matrix introduced by the prototyping defect-remediation
  pack.
- Owning flow: `BF-0001`
- Used-by: `/qfai-prototyping` skill, CI lanes that drive
  the autonomous loop
- SSOT modules:
  - `packages/qfai/src/cli/commands/prototypingIterate.ts` (also hosts
    the local `clearEvidenceIterDirs` helper used by the cycle-0
    backup / clear path)
  - `packages/qfai/src/core/prototyping/iteration.ts` (cycle SSOT;
    `MAX_ITERATIONS = 10`, `MAX_ITERATION_INDEX = 9`)
  - `packages/qfai/src/core/prototyping/licenseVerify.ts`
    (license catalog + add-only patch)
  - `packages/qfai/src/core/prototyping/licensePatchAudit.ts`
    (`LicensePatchAuditRow` shape lockdown + `isLicensePatchAuditRow`
    classifier)

## Command shape

```text
qfai prototyping iterate --cycle <0..9> [--target-url <url>]
                         [--force]
                         [--dry-run]
                         [--capture]
                         [--auto-serve]
                         [--license-patch <file>]
                         [--check-convergence]
                         [--primary-ui-contract <CON-UI-NNNN>]
                         [--emit-skeletons]
                         [--skeleton-mode <placeholder|full|stub>]
                         [--mode <convergence|exploration>]
```

`--emit-skeletons` is cycle-0 only: it writes one placeholder
`.qfai/evidence/prototyping/iter-00/<screenId>.html` per declared screen
(the cycle's `iterationDir(0)`) as a seed aid and never an `index.html`;
`iterate` ignores it at cycle >= 1. `--skeleton-mode` selects the
emission shape and has no effect without `--emit-skeletons`; any value
other than `placeholder` (default, token-driven static HTML) / `full`
(placeholder plus the caller-replaces-via-generation marker) / `stub`
(minimal `<!doctype html>` marker) is rejected in `args.ts` as a parse
error, which prints the usage text and exits 1 (the prototyping
sub-commands do not raise `invalidExitCode` to 2). SSOT:
`packages/qfai/src/core/prototyping/emitSkeletons.ts`.

`--mode` selects the loop posture: `convergence` (default) keeps every
rubric gate blocking, `exploration` relaxes the soft-rubric gates to
warning. Any other value is the same `args.ts` parse error as above —
usage text plus exit 1. The posture is resolved and recorded at cycle 0
only, onto the seed iteration written by `writeSeedMetadata`; at
cycle >= 1 the flag is echoed but neither re-recorded nor cleared, so
switching posture mid-loop requires a `--cycle 0 --force` re-seed.
`qfai prototyping certify` exits 2 on any loop that contains an
exploration-mode iteration (`detectExplorationCertifyAttempt`).

`--check-convergence` is a read-only peek path: it reads
`.qfai/evidence/prototyping/prototyping.json`, prints `stopReason`,
`acceptedIterationIndex` and the number of recorded iterations, exits `0`
when `stopReason === "converged"` with `acceptedIterationIndex` a
non-negative integer (the run converged), and exits `2` otherwise. The peek
performs no writes, no Playwright launches, and does not require
`--target-url`. `--cycle` may be omitted under `--check-convergence`
(defaults to `9`, the budget-exhaustion cycle); the normal
cycle-required guard is short-circuited on this path.

`--primary-ui-contract <CON-UI-NNNN>` pins the primary UI contract.
The full ID is required and is never normalised. The flag takes
precedence over `qfai.config.yaml#prototyping.primaryUiContract`.

`--target-url` is REQUIRED at cycle 0 (input-shape gate). At cycle ≥ 1
it is OPTIONAL by default — but when `--capture` is also set AND any
resolved `screens[].url` is route-relative (no `http://` / `https://`
scheme), `--target-url` becomes REQUIRED on that invocation too, so the
capture path can compose a navigable URL from the route. The route is
joined against `--target-url` via WHATWG `new URL(route, base)`;
absolute screen URLs pass through verbatim. Failure to provide
`--target-url` in this composition class returns exit 2 with the
operator-facing error text naming the screen id and the missing flag.
See the exit-code matrix below and `qfai-prototyping.md` for the
scope and drift rules.

## Cycle range and `--cycle N` validation (REQ-0117, REQ-0129)

`--cycle` accepts integer values in the closed range `0..9` (= 10
cycles total, `MAX_ITERATIONS = 10`).

### Out-of-range error text (REQ-0129)

When `iterate --cycle N` is invoked with `N` outside `0..9`, the error
text MUST explicitly state:

```text
`--cycle` accepts 0..9 (=10 cycles total). `--cycle 10` would be the
11th cycle and is not supported.
```

The error MUST recommend `--cycle 9 --check-convergence` (or the
equivalent peek-mode alias once OQ-0118 is resolved; until then the
`--check-convergence` recommendation is the canonical wording).

### Cycle-0 re-run requires `--force` (REQ-0117)

`qfai prototyping iterate --cycle 0` MUST refuse to run when
`.qfai/evidence/prototyping/iter-00/` is non-empty UNLESS `--force` is
passed. On refusal, the error MUST name:

- the existing evidence path
  (`.qfai/evidence/prototyping/iter-00/`), AND
- the recovery hint
  `qfai prototyping iterate --cycle 0 --force`.

When `--force` is passed, iterate itself moves the existing `iter-00/`
to `iter-00.backup-<ISO>/` (`<ISO>` = the UTC time with `:` and `.`
written as `-`, for example `2026-01-01T00-00-00-000Z`) BEFORE
invoking the local `clearEvidenceIterDirs` helper, so evidence is
recoverable automatically — the operator does NOT need to `cp -r`
manually. The backup directory is **outside** the `/^iter-\d{2,}$/`
cleanup regex, so subsequent runs do not delete it.

Every cycle-0 run that resets the loop, with or without `--force`, also
moves the aggregate
`screenshots/` and `html/` directories into `aggregate.backup-<ISO>/`,
beside `iter-00.backup-<ISO>/` and with the same `<ISO>` when both are
written, and logs each moved file to `mutation-log.jsonl`. The
required-path check reads the aggregate directories before the
iteration directories, so a restarted loop holds no evidence until it
captures again. A project with no UI-bearing spec ends cycle 0 before the
reset, so nothing is moved there. The move comes before the `iter-00`
backup, and the log entries are written once both have succeeded: a
failure in either, a file the reset cannot list or size for the log, an
`aggregate.backup-<ISO>/` that already exists, or a log write that fails
stops the run before any evidence is cleared and puts back what the
reset had moved. A log write that fails part-way is cut back to the
log's prior length.

## `--capture` and `--auto-serve` (REQ-0109 / REQ-0110)

See `qfai-prototyping.md` § "Capture and serve flags" for the
full per-screen capture contract block, foreign-process safety
(NFR-0106), `tree-kill` / `taskkill /F /T` lifecycle, and the
combined-flag composition. The flags are opt-in under
`decisions.md#DEC-0199`; without them, the cycle performs neither
capture nor automatic serving.

## `--license-patch <file>` (REQ-0123)

Accepts an **add-only** diff to the cycle-0 frozen license catalog
(`prototyping.json#frozenLicenseCatalog.allowedSources`,
`licenseTiers`, `sourceHosts`). The frozen catalog itself is NOT
rewritten — it stays byte-equal to `DEFAULT_LICENSE_CATALOG` so the
cycle >= 1 drift gate keeps passing. The patch is recorded instead as an
audit-log entry appended to `prototyping.json#licensePatchAudit[]`, and
the effective catalog is rebuilt from baseline + ledger on every cycle
(see the replay paragraph below). The entry records:

```yaml
licensePatchAudit:
  - appliedAt: string # ISO 8601 timestamp; non-empty
    patchSha256:
      string
      # 64-hex sha256 of the raw patch bytes
      # (lowercase, matches /^[a-f0-9]{64}$/)
    addedSources: string[] # newly-allowed sources
    addedLicenseTiers?: # OPTIONAL: tier additions, replayed
      { [source: string]: string[] } # on cycle >= 1 by effectiveLicenseCatalog
```

The runtime classifier (`isLicensePatchAuditRow` in
`core/prototyping/licensePatchAudit.ts`) enforces this canonical shape:
3 required keys (`appliedAt`, `patchSha256`, `addedSources`) plus an
optional 4th key (`addedLicenseTiers`). Unknown extra keys, missing
required keys, non-string values, or a non-64-hex `patchSha256` are
rejected. `addedLicenseTiers` is OMITTED when the patch only adds
sources without tier metadata, preserving backward-compat with legacy
3-key rows. Any further audit fields (e.g. `patchedFromFile`,
`addedHosts`, `operator`) require a contract amendment and a matching
classifier update — they MUST NOT be silently appended to rows produced
by current implementations.

The cycle >= 1 replay path (`effectiveLicenseCatalog(frozen, auditRows)`)
unions `addedSources` into the frozen `allowedSources` AND
`addedLicenseTiers` into the frozen `licenseTiers`. Without the tier
replay, a cycle-0 patch that introduces both a new source and its tier
mapping would cause cycle-1 license-verify to raise
`license-tier-unknown` on the previously-accepted entry. `sourceHosts`
is NOT replayed — the audit row schema persists no hosts, so the
effective `sourceHosts` is always the frozen baseline and a
patch-added source carries no host binding. `licenseVerify` skips the
host check for a source with no `sourceHosts` entry, so a patched
source accepts any HTTPS host. Persisting host additions requires the
contract amendment + classifier update named above (`addedHosts`).

The ledger is NOT per-loop state: `writeSeedMetadata` resets
`iterations[]` / `reviewerGate` / `imageSources` / the frozen fields on
a `--cycle 0 --force` re-seed but leaves `licensePatchAudit[]` in
place, so prior rows are unioned back into the effective catalog from
cycle 1. Revocation is therefore a manual edit of
`prototyping.json#licensePatchAudit[]` (the array is not covered by the
`frozenLicenseCatalog` lock-drift gate), not a side effect of the
re-seed.

The patch apply block is NOT cycle-gated: `--license-patch` may be
passed at any cycle, so the catalog can be broadened mid-program without
a cycle-0 restart (US-0012-0135). Deletions and modifications are
REJECTED with a hint to use the cycle-0-restart path (re-seed via
`--cycle 0`). The rejection error text MUST name (a) the removed /
modified key, (b) the recovery command. Full unfreeze automation remains deferred (OQ-0114=A,
add-only path only).

## Exit codes (canonical matrix)

| Code | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Argument parse error: a value-taking flag with no value, or an out-of-enum `--skeleton-mode` / `--mode` value. `args.ts#markInvalid` raises `invalidExitCode` to 2 only for `guardrails`, so the prototyping sub-commands print the usage text and exit 1 here — not 2. An UNKNOWN flag is NOT in this class today: the `args.ts` option switch ends in `default: break`, so an unrecognised token is dropped silently and the run continues (a typo such as `--captur` yields a normal iterate with capture OFF, not a usage error). Rejecting unknown flags is a behavioural change tracked separately from this documentation contract. |
| 0    | Continue: cycle accepted, paths assigned, loop should advance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2    | Input / lock-drift error. Drift classes enumerated in `qfai-prototyping.md` § "Exit-2 drift classes"; the cycle-range out-of-range path (REQ-0129), cycle-0 refusal without `--force` (REQ-0117), foreign-process port conflict under `--auto-serve` (NFR-0106), `--license-patch` rejection (delete / modify), AND the capture URL composition path (route-relative `screens[].url` with no `--target-url` at any cycle when `--capture` is set) ALSO map to exit 2 with the explicit error text named in this contract. See the prose paragraph immediately below for the cycle 0 vs cycle ≥ 1 distinction.                              |
| 64   | STOP: converged OR Reviewer-Playwright hard-stop (distinguishable via `iter-NN/CON-UI-NNNN/<screen>.review.json#sessionStatus`). On convergence, top-level `acceptedIterationIndex` and `stopReason` (per REQ-0111) MUST be set.                                                                                                                                                                                                                                                                                                                                                                                                           |
| 66   | STOP: license-verify failure. `imageSources[]` resolved to non-allowlisted source / unknown license tier / non-HTTPS URL / per-source host mismatch / missing attribution. The verifier reads the EFFECTIVE catalog — `effectiveLicenseCatalog(DEFAULT_LICENSE_CATALOG, licensePatchAudit[])` — i.e. the cycle-0 immutable baseline unioned with every audit row. Recovery MUST inspect BOTH `frozenLicenseCatalog` and `licensePatchAudit[]`: the frozen field alone omits every permission an earlier `--license-patch` added.                                                                                                           |

Note: exit 65 ("budget exhausted") is described in
`qfai-prototyping.md` § exit-code table for completeness; the
prototyping defect-remediation pack does not change the exit-65
semantics, but converged-iterate output at exit 65 (lagging specs)
MUST still emit the REQ-0111 top-level fields with
`stopReason: "max-iterations"`.

### Capture URL composition: cycle 0 vs cycle ≥ 1

The capture URL composition class above (`--capture` + route-relative
`screens[].url` + missing `--target-url`) applies at any cycle, but
the cycle-0 path catches it earlier:

- **Cycle 0** — `--target-url` is REQUIRED by the upstream input-shape
  gate regardless of `--capture`, so a missing flag exits 2 before the
  per-screen composer even runs. The composition class therefore
  surfaces only as the same operator-contract requirement expressed at
  the input-shape layer.
- **Cycle ≥ 1** — `--target-url` is OPTIONAL by default. The
  composition class is the cycle ≥ 1 manifestation of the same
  contract: when `--capture` is set AND any resolved `screens[].url`
  is route-relative, the per-screen composer requires `--target-url`
  to build a navigable URL. Failure exits 2 with the per-screen error
  text naming the screen id and the missing flag.

See `qfai-prototyping.md` for the scope and drift rules.

## Cycle-0 freeze obligations (cross-link)

Cycle-0 freeze obligations (`prototyping.json#designMd`,
`uiContractsCovered`, `frozenSurfaceUnion`,
`frozenLicenseCatalog`) are documented in `qfai-prototyping.md` and
are unchanged by this contract. The `--force` and `--license-patch`
flags above interact with the freeze SSOT but do not redefine it.

## Per-cycle outputs

Per `qfai-prototyping.md`, iterate writes per cycle:

- `iter-NN/iterate-plan.json` — REQUIRED. Includes the per-screen
  `capture` block when `--capture` is enabled (per the schema in
  `qfai-prototyping.md` § "Capture & Serve Flags").
- `iter-NN/CON-UI-NNNN/<screen>.review.json` — REQUIRED. The sole
  per-cycle Reviewer artifact (DR-0012-0029 preserved).
- `iter-NN/<screen-id>.png` and `iter-NN/<screen-id>.html` —
  CONDITIONAL on `--capture`. See REQ-0109 and the per-screen
  capture contract.
- `iter-NN/iterate-context.json` — OPTIONAL (REQ-0128 SHOULD).
  Summarizes the prior cycle's decisions for the next subagent
  invocation; schema in REQ-0128.

## Convergence + handoff (REQ-0116)

On convergence (exit 64 path with `stopReason: "converged"`),
iterate mirrors the accepted-iter content into the aggregate-dir
SSOT for every `screens[].id`:

- `.qfai/evidence/prototyping/screenshots/<screen-id>.png` — copied
  from `iter-NN/<screen-id>.png` when `--capture` was used at the
  accepted iter. Required for handoff when `--capture` is used.
- `.qfai/evidence/prototyping/html/<screen-id>.html` — copied from
  `iter-NN/<screen-id>.html` under the same condition.

`<screen-id>` MUST be the underscore-normalized form per DR-0001-0007
(OQ-0110=A) end-to-end.

## Exit-64 blocking-cause summary (REQ-0118)

On every non-converged cycle, iterate MUST print a one-screen
summary naming the top-3 categories blocking exit-64 with concrete
offenders:

- `designMdViolations` — count + first offender
  `kind=color,...,path,line`.
- `layoutAntiPatternsDetected` — count + first lap code.
- `blockingFindings` — count + the first line the reviewer wrote.

Example wording:

```text
[BLOCKED] exit-64 prevented by: 1023 designMdViolations (top:
color=#fff at iter-NN/scr_001.html:97), 0 anti-patterns, 1
blockingFindings (top: the checkout step gives no confirmation).
```

## Determinism posture

- Cycle gating, drift detection, exit codes, license-verify, per-screen
  capture contract emission, server lifecycle teardown, and the
  cycle-0 backup / clear path are deterministic.
- Reviewer Playwright session content, capture PNG bytes (subject to
  browser rendering variability), and HTML capture (subject to
  `page.content()` injection unless `htmlSourceCopy: true`) are
  NOT deterministic and MUST NOT be asserted for exact equality.

## UI contract scope

Cycle 0 freezes every UI-bearing `CON-UI-NNNN` in
`uiContractsCovered[]` and `frozenSurfaceUnion[]`. The plan's
`uiContracts[]` lists the full IDs. A captured screen records
`uiContractIds[]` for all declaring contracts, so retiring one
contract does not remove a screen still required by another.

A record with the earlier spec fields exits 2 at cycle ≥ 1 and
requires a cycle-0 re-seed. Earlier `iter-NN/spec-NNNN/` evidence is
preserved. Current reviews reside at
`iter-NN/CON-UI-NNNN/<screen>.review.json`. Exit 65 names lagging
UI contracts. `--auto-serve` serves
`.qfai/prototype/iter-NN/`.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Examples                                                                                                                                                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0270 | Reviewer-driven Playwright session - The Reviewer sub-agent MUST itself launch Playwright (or equivalent harness) per spec × screen (per UI contract × screen on the story tree) per cycle and perform human-like operation (click / type / navigate / scroll) on the live prototype. - No scripted interaction transcript file is produced; no AC selector / assertion is required. - The default run is reviewer-driven: a separate fixed `devops-ci-engineer` capture pipeline is not required. Opt-in `--capture` may write PNG and HTML evidence, while the reviewer still owns the Playwright assessment and review payload.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0119-01, EX-0001-0119-02, EX-0001-0120-06, EX-0001-0123-03, EX-0001-0125-02, EX-0001-0122-03, EX-0001-0122-04, EX-0001-0124-01, EX-0001-0125-03, EX-0001-0118-03, EX-0001-0124-02, EX-0001-0124-03, EX-0001-0118-04, EX-0001-0104-01 |
| BR-0271 | Qualitative review payload schema - Each `<screen>.review.json` MUST contain the 4 ordinal UX axes (informationArchitecture / navigationFlow / usability / functionality, each in `{weak, acceptable, strong, exceptional}`) AND six `*Feel` short-prose fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`), each ≤ 200 words. - `layoutAntiPatternsDetected[]` and `designMdViolations[]` remain present and govern convergence; quantitative AC-pass / transition-pass thresholds are NOT recorded. - On the story tree the payload names its UI contract as `uiContractId` in place of `specId`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0120-01, EX-0001-0120-02, EX-0001-0110-01                                                                                                                                                                                            |
| BR-0272 | Convergence is an AND over the cycle-0 frozen uiContractsCovered[] set: the four ordinal UX scores are exceptional and every (UI contract, screen) review has empty blockingFindings[], layoutAntiPatternsDetected[] and designMdViolations[]. Quantitative AC-pass and transition-pass thresholds do not gate. At the cycle-9 hard stop, the aggregator names every lagging UI contract ID.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0120-03, EX-0001-0120-04, EX-0001-0116-01, EX-0001-0112-03                                                                                                                                                                           |
| BR-0273 | Stock-photo license catalog and per-image recording - Every image slot MUST be filled from the cycle-0 frozen license catalog (allowlist: Unsplash, Pexels per OQ-0002 / SRC-0005 / SRC-0006). - Every fill MUST record `{url, license, attribution, source}` in `prototype-handoff.yaml#imageSources[]`. - License-verify failure (unknown license / non-allowlisted source / missing field) MUST hard-stop the run with exit 66 (OQ-0008). - The runtime cycle ≥ 1 license-verify gate MUST reject any `imageSources[]` entry whose `attribution` is undefined, empty string, or whitespace-only with error code `license-missing-attribution` → exit 66. This is the runtime-side counterpart of the write-side recording rule above; the gate does not silently tolerate "field present but blank".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0121-01, EX-0001-0121-02, EX-0001-0122-02                                                                                                                                                                                            |
| BR-0274 | The run is autonomous through cycles 0..9: no per-cycle stdin read or user prompt occurs, including on hard stops. Lock or frozen UI-contract-set drift exits 2; reviewer Playwright failure exits 64 with sessionStatus retryExhausted or launchFailed and the affected (UI contract, screen); license verification failure exits 66. A missing uiContractsCovered[] or legacy specsCovered/frozenSpecsCovered state exits 2 on cycle >= 1, certify and show-ui-contract, naming the cycle-0 re-seed command.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0122-01, EX-0001-0115-02, EX-0001-0122-05, EX-0001-0127-04, EX-0001-0122-06, EX-0001-0122-08                                                                                                                                         |
| BR-0275 | Per-spec iter-dir namespacing — review.json only - Iter-dir layout MUST be `iter-NN/spec-NNNN/<screen>.review.json` only. No `.png`, no `.html`, no `.interaction.json`, no other sidecar. - Path helpers (`iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs`) MUST descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics. - On the story tree the layout MUST be `iter-NN/CON-UI-NNNN/<screen>.review.json` only, and the path helpers MUST descend into `CON-UI-NNNN` with the same cleanup semantics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0123-01, EX-0001-0123-02, EX-0001-0113-01                                                                                                                                                                                            |
| BR-0278 | Spec set frozen at cycle 0; mid-run additions deferred - The resolved spec set MUST be frozen at cycle 0 and persisted in cycle-0 evidence. - The cycle ≥ 1 mid-run spec-set drift gate MUST compare the live `resolveSurfaceUnion(root, config)` result set-equal against the cycle-0 frozen `prototyping.json#frozenSurfaceUnion` snapshot (not against the legacy single-spec `frozenSpecsCovered` / `specsCovered` fields, which carry only the primary-spec scope under review and are NOT the multi-spec drift baseline). A missing or malformed `frozenSurfaceUnion` snapshot on cycle ≥ 1 is a hard-stop and instructs the operator to re-seed via `--cycle 0`. - Mid-run additions of new UI-bearing specs MUST NOT trigger cycle-0 restart; they are deferred to the next `/qfai-prototyping` invocation (OQ-0009 Option A). - On the story tree the frozen set MUST be the resolved UI contract set, persisted as the one field `uiContractsCovered[]` in place of `specsCovered[]` and `frozenSpecsCovered[]`. A missing, empty, non-array or non-string value, or an entry that is not a canonical `CON-UI-NNNN`, MUST exit 2. The drift gate MUST compare the live union of UI-bearing UI contracts set-equal against `frozenSurfaceUnion`, which holds `CON-UI-NNNN` IDs, and a UI contract added mid-run is deferred the same way. | EX-0001-0125-01, EX-0001-0125-04, EX-0001-0122-07                                                                                                                                                                                            |
| BR-0279 | Per-spec time-budget soft warning - Per-spec time-budget cap is 5 min/spec per cycle (OQ-0004 / NFR-0001), and 5 min per UI contract per cycle on the story tree. Overruns SHOULD be recorded in `softWarnings.timeBudget` inside the per-spec review payload. - The convergence aggregator MUST NOT gate on per-spec budget overrun; only the global 10-cycle budget hard-fails the run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0101-03                                                                                                                                                                                                                              |
| BR-0287 | `iterate --capture` opt-in (default OFF, DR-0012-0029 preserved) - `qfai prototyping iterate` MUST accept `--capture` as opt-in; default OFF preserves the existing `DR-0012-0029` no-PNG / no-HTML / no-interaction.json posture. - When `--capture` is passed, iterate drives Playwright per the Capture contract; when `htmlSourceCopy: true`, iterate MUST copy from `.qfai/prototypes/iter-NN/<screen-id>.html` (`.qfai/prototype/iter-NN/<screen-id>.html` with the `rule/ skill/ agent/ prompt/` assistant tree; not `page.content()`). - The `DR-0012-0029` amendment is pinned by `DR-0012-0031` (parallel agent assignment; orchestrator reconciles after merge). - NFR-0107 floor: per-screen capture budget 30s; overrun emits soft warning, not hard-fail. - Async capture errors MUST be caught and reported with per-screen context (no silent skip).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0134-01, EX-0001-0113-02, EX-0001-0103-01                                                                                                                                                                                            |
| BR-0288 | `iterate --auto-serve` opt-in with foreign-process protection - `qfai prototyping iterate` MUST accept `--auto-serve` as opt-in; default OFF preserves the existing posture. - When passed, iterate MUST call the server runner once and invoke the teardown it returns at cycle end and on SIGINT. It continues when the runner reports a recovered prior owner, and exits 2 reporting the runner's reason when the runner refuses. - The default runner, used when no runner is injected, MUST serve in-process and MUST refuse a port another process holds, naming the port, rather than pick another one. - A runner that spawns a server subprocess MUST tear down its tree with `tree-kill` (Linux/macOS) or `taskkill /F /T` (Windows), and MUST NOT kill a process it did not start. - NFR-0106 protection: the foreign-process refusal path is integration-tested. - The `DR-0012-0029` amendment is pinned by `DR-0012-0031`.                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0135-01                                                                                                                                                                                                                              |
| BR-0289 | `prototyping.json` validate-conformant emit - Every `iterations[i]` written by `iterate` MUST be `qfai validate --profile prototyping --fail-on error` conformant out of the box: non-null `commitSha` (sentinel `"uncommitted"` accepted), non-empty `proseCritique`, `scores`, `layoutAntiPatternsDetected`, `designMdViolations`, `pivotDirective`, `reviewerId`, and `evidenceRefs[]` (one entry per `screens[].id`). - On convergence, `acceptedIterationIndex` AND `stopReason ∈ {"converged", "max-iterations", "license-verify-fail", "input-error"}` MUST be written at the top level.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0136-01                                                                                                                                                                                                                              |
| BR-0292 | Aggregate-dir mirror + underscore casing (OQ-0110 Option A) - On convergence (exit 64), iterate MUST mirror the accepted-iter content into `.qfai/evidence/prototyping/screenshots/<screen-id>.png` AND `.qfai/evidence/prototyping/html/<screen-id>.html` for every `screens[]` entry. - Screen-id casing MUST be underscore form end-to-end; the validator rejects hyphen-form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0139-01                                                                                                                                                                                                                              |
| BR-0293 | `--cycle 0 --force` backup safety (NFR-0114) - `qfai prototyping iterate --cycle 0` MUST refuse when `iter-00/` is non-empty unless `--force` is passed. - When `--force` is passed, iterate MUST move `iter-00/` → `iter-00.backup-<ISO>/` BEFORE invoking `clearEvidenceIterDirs`. - Backup integrity is byte-equivalence-verified by integration test (NFR-0114 enforcement). - On the story tree a `--cycle 0` re-seed over a `prototyping.json` that carries `specsCovered` or `frozenSpecsCovered`, or lacks `uiContractsCovered`, MUST delete none of the evidence under `iter-NN/spec-NNNN/` (`.qfai/spec/03_contract/cli/qfai-prototyping.md#story-tree-layout`, "Records written before the change").                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0140-01                                                                                                                                                                                                                              |
| BR-0294 | Exit-64 blocking-cause summary (NFR-0103) - On every non-converged cycle, `iterate` MUST emit a one-screen `[BLOCKED]` summary naming the top-3 categories with concrete offenders. - Category identifiers are stable names — additive only across versions (NFR-0103).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0141-01                                                                                                                                                                                                                              |
| BR-0296 | md5 duplicate-capture + missing-route detection (NFR-0113, OQ-0109) - `iterate` MUST compute md5 of each PNG; ≥ 2 identical md5s among distinct declared `screens[].id` entries surface `lap-009: duplicate-capture`. - For every `screens[].id`, iterate MUST verify a reachable hashchange or path-based route; missing routes surface `lap-010: missing-route`. - Both findings are advisory-failing (severity error; mandatory Reviewer `justification:` for override). - NFR-0113 determinism: same screen set → same `lap-009` finding set across re-runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0143-01                                                                                                                                                                                                                              |
| BR-0297 | `--license-patch` add-only (SHOULD) - `--license-patch <file>` SHOULD accept add-only diffs; writes new catalog + appends `licensePatchAudit[]` row `{appliedAt, patchSha256, addedSources[]}`. - Deletions and modifications MUST be rejected with cycle-0-restart hint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0144-01                                                                                                                                                                                                                              |
| BR-0298 | Subagent iter-context hint (SHOULD) - `iter-NN/iterate-context.json` SHOULD be written with `{ priorCycle, priorScores, openBlockers, priorTailwindContract }`. - Absence MUST NOT fail certify; the file is purely advisory and orthogonal to `prototyping.json` (REQ-0012-0063).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0145-01                                                                                                                                                                                                                              |
| BR-0299 | `--cycle N` out-of-range error clarity (SHOULD) - Error text MUST read literally `--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.` and SHOULD recommend the peek-mode equivalent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0146-01                                                                                                                                                                                                                              |
| BR-0300 | With `--emit-skeletons`, cycle 0 emits token-styled placeholder HTML for each frozen UI contract screen without a per-screen generation call in placeholder mode. After convergence `prototyping.json#iterations[i].evidenceRefs[]` has at least one `{kind: screenshot, path}` and one `{kind: html, path}` for each frozen screen. Skeleton emission is opt-in; `--skeleton-mode` accepts `full`, `placeholder`, and `stub`, with `placeholder` as the default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0147-01, EX-0001-0147-02                                                                                                                                                                                                             |
| BR-0304 | cycle-0 aggregate reset (REQ-0174) - Every `iterate --cycle 0` run MUST move `.qfai/evidence/prototyping/screenshots/` and `html/` into `aggregate.backup-<ISO>/`, whether or not an `iter-00` exists to back up. - The move MUST precede `clearEvidenceIterDirs`, and MUST be put back when a later step of the same reset fails. - Each moved file MUST be recorded in `mutation-log.jsonl`, as REQ-0165 requires of every destructive mutation. - A reset's backups MUST NOT be sealed into the completion certificate's evidence digests, and a change inside one MUST NOT count as evidence newer than the run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0140-02                                                                                                                                                                                                                              |
| BR-0305 | `iterate` and `certify` append a JSON Lines entry to the git-ignored `.qfai/evidence/prototyping/mutation-log.jsonl` for every destructive mutation under `iter-NN`, including cycle-0 backup moves. Each entry records `ts`, `caller`, root-relative `path`, `action`, `priorSize`, and `newSize`. A mutation without a log entry is an error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0151-01, EX-0001-0151-02                                                                                                                                                                                                             |
| BR-0335 | - `prototyping iterate` cycle 0 MUST delete any legacy `fullHarness` block from the live `prototyping.json` as part of the hard reset, so the post-1.8.9 evolution loop never re-reads stale `full-harness` / `perfect-100` / `weighted-total` runtime state from a prior pre-1.8.9 session.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0165-01                                                                                                                                                                                                                              |
| BR-0524 | A cycle-0 iterate run with a valid `--target-url` and a UI-bearing UI contract writes `iter-00/iterate-plan.json` and exits 0 while the loop continues. Without `--target-url`, cycle 0 exits 2 before writing the seed. A non-converged cycle before index 9 exits 0 when no input or drift error occurs. Convergence is governed by BR-0272.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0112-01, EX-0001-0112-02, EX-0001-0112-04                                                                                                                                                                                            |
| BR-0529 | When the teardown the server runner returns rejects, iterate MUST print `qfai prototyping iterate --auto-serve: teardown failed (<reason>)` on stdout, `<reason>` being the rejection reason. The rejection MUST NOT change the exit code: iterate returns what the cycle returned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0135-02                                                                                                                                                                                                                              |
| BR-0531 | `--check-convergence` MUST read `.qfai/evidence/prototyping/prototyping.json`, and MUST NOT write a file, launch Playwright or start a cycle. It does not require `--target-url`. `--cycle` MAY be omitted and then defaults to 9; a `--cycle` given is reported back and does not change what is read. Converged means `stopReason` is `converged` and `acceptedIterationIndex` is a non-negative integer, and exits 0. Every other state exits 2 and names why: `max-iterations`, `license-verify-fail`, `input-error`, no terminal state yet, a `converged` record with no accepted iteration, or no readable `prototyping.json`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0191-01                                                                                                                                                                                                                              |
| BR-0532 | Under `--capture`, a `screens[].url` beginning `http://` or `https://` MUST be opened as written, and a route-relative one MUST be joined to `--target-url` with WHATWG `new URL(route, base)`. A screen with no URL falls back to `--target-url`, or to no URL when that is absent. A route-relative URL with no `--target-url`, or a pair that does not compose into a URL, MUST fail that screen with a reason naming the screen and `--target-url`, and iterate exits 2. The default capture runner MUST treat a navigation that answers HTTP 400 or above, or answers nothing, as a capture failure for that screen and MUST NOT take its screenshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0134-02, EX-0001-0134-03                                                                                                                                                                                                             |
