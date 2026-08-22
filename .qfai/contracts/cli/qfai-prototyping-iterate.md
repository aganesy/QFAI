# CLI Contract: `qfai prototyping iterate`

- Contract scope: full surface for the `iterate` sub-command of
  `qfai prototyping`, expanding the summary in
  `.qfai/contracts/cli/qfai-prototyping.md` with the v1.9.1+ flag
  surface, cycle-range validation, force / backup semantics, and
  exit code matrix introduced by the prototyping defect-remediation
  pack.
- Owning spec: `spec-0012`
- Used-by: `spec-0012`, `/qfai-prototyping` skill, CI lanes that drive
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

```
qfai prototyping iterate --cycle <0..9> [--target-url <url>]
                         [--force]
                         [--capture]
                         [--auto-serve]
                         [--license-patch <file>]
                         [--check-convergence]
                         [--primary-spec-id <spec-id>]
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
`.qfai/evidence/prototyping/prototyping.json`, exits `0` when
`stopReason === "axes-exceptional"` with `acceptedIterationIndex`
non-null (the run converged), and exits `2` otherwise. The peek
performs no writes, no Playwright launches, and does not require
`--target-url`. `--cycle` may be omitted under `--check-convergence`
(defaults to `9`, the budget-exhaustion cycle); the normal
cycle-required guard is short-circuited on this path.

`--primary-spec-id <spec-id>` pins the primary UI-bearing spec at
cycle 0 when multiple candidates resolve. Accepted forms are digit
strings only — `12` / `0012` / the number `12`, all normalised to
`0012` by `parsePrimarySpecId`; a `spec-` prefix (e.g. `spec-0012`)
and any other shape are exit 2. Equivalent to the
`qfai.config.yaml` `prototyping.primarySpecId` field; the CLI flag
takes precedence when both are set.

`--target-url` is REQUIRED at cycle 0 (input-shape gate). At cycle ≥ 1
it is OPTIONAL by default — but when `--capture` is also set AND any
resolved `screens[].url` is route-relative (no `http://` / `https://`
scheme), `--target-url` becomes REQUIRED on that invocation too, so the
capture path can compose a navigable URL from the route. The route is
joined against `--target-url` via WHATWG `new URL(route, base)`;
absolute screen URLs pass through verbatim. Failure to provide
`--target-url` in this composition class returns exit 2 with the
operator-facing error text naming the screen id and the missing flag.
See the exit-code matrix below and `qfai-prototyping.md` §
"Exit-2 drift classes" for the canonical class enumeration.

## Cycle range and `--cycle N` validation (REQ-0117, REQ-0129)

`--cycle` accepts integer values in the closed range `0..9` (= 10
cycles total, `MAX_ITERATIONS = 10`).

### Out-of-range error text (REQ-0129)

When `iterate --cycle N` is invoked with `N` outside `0..9`, the error
text MUST explicitly state:

```
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
to `iter-00.backup-<ISO>/` (`<ISO>` = `YYYY-MM-DDTHHMMSSZ`) BEFORE
invoking the local `clearEvidenceIterDirs` helper, so evidence is
recoverable automatically — the operator does NOT need to `cp -r`
manually. The backup directory is **outside** the `/^iter-\d{2,}$/`
cleanup regex, so subsequent runs do not delete it.

## `--capture` and `--auto-serve` (REQ-0109 / REQ-0110)

See `qfai-prototyping.md` § "Capture & Serve Flags (v1.9.1+)" for the
full per-screen capture contract block, foreign-process safety
(NFR-0106), `tree-kill` / `taskkill /F /T` lifecycle, and the
combined-flag composition. The flags are opt-in and amend
DR-0012-0029 via DR-0012-0031 (`spec-0012/07_Decisions.md`);
absence of both flags preserves the DR-0012-0029 bit-default.

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
| 64   | STOP: converged OR Reviewer-Playwright hard-stop (distinguishable via `iter-NN/spec-NNNN/<screen>.review.json#sessionStatus`). On convergence, top-level `acceptedIterationIndex` and `stopReason` (per REQ-0111) MUST be set.                                                                                                                                                                                                                                                                                                                                                                                                             |
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

See `qfai-prototyping.md` § "Exit-2 drift classes" for the canonical
class enumeration.

## Cycle-0 freeze obligations (cross-link)

Cycle-0 freeze obligations (`prototyping.json#designMd`,
`specsCovered`, `frozenSpecsCovered`, `frozenSurfaceUnion`,
`frozenLicenseCatalog`) are documented in `qfai-prototyping.md` and
are unchanged by this contract. The `--force` and `--license-patch`
flags above interact with the freeze SSOT but do not redefine it.

## Per-cycle outputs

Per `qfai-prototyping.md`, iterate writes per cycle:

- `iter-NN/iterate-plan.json` — REQUIRED. Includes the per-screen
  `capture` block when `--capture` is enabled (per the schema in
  `qfai-prototyping.md` § "Capture & Serve Flags").
- `iter-NN/spec-NNNN/<screen>.review.json` — REQUIRED. The sole
  per-cycle Reviewer artifact (DR-0012-0029 preserved).
- `iter-NN/<screen-id>.png` and `iter-NN/<screen-id>.html` —
  CONDITIONAL on `--capture`. See REQ-0109 and the per-screen
  capture contract.
- `iter-NN/iterate-context.json` — OPTIONAL (REQ-0128 SHOULD).
  Summarizes the prior cycle's decisions for the next subagent
  invocation; schema in REQ-0128.

## Convergence + handoff (REQ-0116)

On convergence (exit 64 path with `stopReason: "axes-exceptional"`),
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
- `axes-below-exceptional` — axis name + current score.

Example wording:

```
[BLOCKED] exit-64 prevented by: 1023 designMdViolations (top:
color=#fff at iter-NN/scr_001.html:97), 0 anti-patterns, 1 axis
below exceptional (aesthetics: passing).
```

## Determinism posture

- Cycle gating, drift detection, exit codes, license-verify, per-screen
  capture contract emission, server lifecycle teardown, and the
  cycle-0 backup / clear path are deterministic.
- Reviewer Playwright session content, capture PNG bytes (subject to
  browser rendering variability), and HTML capture (subject to
  `page.content()` injection unless `htmlSourceCopy: true`) are
  NOT deterministic and MUST NOT be asserted for exact equality.
