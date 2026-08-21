# CLI Contract: `qfai doctor`

- Contract scope: public CLI surface for environment / profile / skill-integrity probing
- Owning spec: spec-0012 (prototyping profile inputs) and spec-0004 (skill integrity)
- Used-by: `/qfai-prototyping` (precondition check), CI lanes that gate on environment readiness
- SSOT modules:
  - `packages/qfai/src/cli/commands/doctor.ts`
  - `packages/qfai/src/core/doctor.ts` (doctor probe orchestration)
  - `packages/qfai/src/core/doctor/` (the side-effecting remediations
    reached only through `--clean` / `--autoremediate`:
    `autoremediate.ts`, `cleanReviewPacks.ts`,
    `migrateLegacyReviewPacks.ts`, `skillManifestProbe.ts`,
    `staleTtl.ts`)
  - `packages/qfai/src/core/prototyping/playwrightLauncher.ts`
    (Playwright launcher candidate probe via `resolvePlaywrightLauncher`
    and the `getProbeOrder` candidate list)
  - `packages/qfai/src/core/skillsIntegrity.ts` (skill / asset
    checksum diff via `diffProjectSkillsAgainstInitAssets`)

## Public sub-commands

### `qfai doctor [--profile <name>] [--format <text|json>] [--out <path>] [--fail-on <error|warning>] [--clean] [--autoremediate] [--dry-run] [--yes]`

Probes the active profile's required runtime preconditions and the
skill / asset integrity surface. Returns a structured summary grouping
findings into two buckets: "errors blocking the active profile" and
"warnings advisory of drift" (per REQ-0122).

The probe itself is read-only. `--clean` and `--autoremediate` are the
only paths that write, and they run as pre-steps BEFORE the diagnostic
build so the summary reports the post-remediation tree. Every path they
write is enumerated under "Side effects (written)" below.

Inputs (read; never written):

- `--profile <name>` — when passed, doctor scopes the probe to the
  named profile's required runtime preconditions (e.g.
  `prototyping` requires the Playwright launcher to be probeable).
  A skill name (e.g. `qfai-prototyping`) instead scopes the probe to
  that skill manifest's `runtimeDependencies`.
  When omitted, doctor runs the profile-agnostic checks only.
- `--format <text|json>` — output shape. Defaults to `text`. Under
  `json`, stdout carries the JSON document alone and every
  side-effect line is routed to stderr, so the stdout channel stays
  parseable.
- `--out <path>` — writes the rendered summary to `<path>` in
  addition to stdout. This is an operator-named report destination,
  not a repository mutation.
- `--fail-on <error|warning>` — selects the finding severity that
  turns the exit code non-zero; see "Exit codes".
- `qfai.config.yaml#prototyping.execution.browserTool` — accepted
  values during the deprecation window: `"playwright"` (canonical)
  OR `"playwright-cli"` (legacy, emits `D-DEPRECATED-PROBE`
  warning). After sunset, only `"playwright"` is accepted (REQ-0108).
- `qfai.config.yaml#review.staleTtlDays` — the calendar-day TTL the
  `--clean` archive decision uses. Defaults to 14 when unset.

## Side effects (written)

Doctor writes nothing unless `--clean` or `--autoremediate` is
passed. `--autoremediate` supersedes `--clean`: when both are
present, only the autoremediate path runs (it archives review packs
itself as one of its phases).

### `--clean`

Archives TTL-expired review packs — moves, never deletes.

| Path                        | Write              | Condition                                   |
| --------------------------- | ------------------ | ------------------------------------------- |
| `.qfai/review/review-<ts>/` | renamed (moved)    | pack mtime older than `review.staleTtlDays` |
| `.qfai/review/_archive/`    | created if missing | at least one pack is archive-eligible       |

`.qfai/review/_archive/` is itself skipped while enumerating packs, so
a re-run is a no-op. Under `--dry-run` the plan is reported (`would
move -> _archive/<pack>`) and no rename is issued.

### `--autoremediate`

Runs install + clean + config-fill as one orchestrated pass.

| Path                               | Write                   | Condition                                                                               |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `<root>/.gitignore`                | managed block rewritten | always (before the orchestrator), unless `CI=true`                                      |
| `qfai.config.yaml`                 | appended                | a default-keyed field (`review:`) is absent; user-authored values are never overwritten |
| `.qfai/review/review-<ts>/`        | renamed (moved)         | same TTL rule as `--clean`                                                              |
| `.qfai/review/` legacy-pack record | appended                | packs predating `revision_form` exist and are not yet recorded                          |
| `node_modules/`                    | `npm install <name>`    | `--profile <skill>` names a manifest with unmet `runtimeDependencies`                   |

Without `--profile <skill>` there is no manifest to probe, so the
install phase is structurally skipped and doctor says so explicitly.

### `--dry-run` / `--yes` interaction

- `--dry-run` applies to both `--clean` and `--autoremediate`: the
  plan is reported in the future tense (`would run` / `would fill` /
  `would move`) and no filesystem write is issued.
- `--yes` skips interactive confirmation. The remediation paths are
  non-interactive today, so `--yes` is accepted as a documented
  forward-compatible flag and changes no behavior on its own.
- `CI=true` disables `--autoremediate` entirely (AC-0006-0018):
  doctor emits `autoremediate disabled in CI`, skips the `.gitignore`
  rewrite and every remediation, and returns 0 without building the
  diagnostic. `--clean` is not CI-suppressed.

## Playwright probe order (`--profile prototyping`)

Per REQ-0107, the probe order is:

1. **Primary**: `node_modules/.bin/playwright`. On Windows, additionally
   probe `playwright.cmd`, `playwright.bat`, `playwright.ps1` (Windows
   shim wrappers emitted by some `npm install` topologies).
2. **Fallback**: `npx --no-install playwright --version`. The
   `--no-install` flag is required so the probe never silently
   triggers an install on a CI checkout.
3. **Deprecation-window fallback**: `playwright-cli` (and on Windows
   `playwright-cli.cmd` / `playwright-cli.bat`). When found, doctor
   accepts the probe AND emits `D-DEPRECATED-PROBE` (severity:
   warning during the window; error at sunset).
4. **Final failure**: when none of the above resolve, doctor emits
   `E-PROBE-PLAYWRIGHT-NOT-FOUND` (severity: error, blocks the
   active profile) with install hint text: `npm i -D playwright`.

### `D-DEPRECATED-PROBE` lifecycle

- **During the window** (current minor): severity **warning**. The
  warning text MUST name the sunset version per spec-0003 REQ-0023.
  Downstream projects that already have `scripts/playwright-cli.cmd`
  wrappers continue to PASS, with the warning indicating the
  migration target.
- **At sunset**: severity **error**. The `playwright-cli` /
  `playwright-cli.cmd` / `playwright-cli.bat` candidates are removed
  from the probe order in the following minor. The sunset version
  is qfai 1.10.0 (canonical npm `package.json#version` pin).

### Probe-failure error text

When all probe candidates fail, the doctor error text MUST include:

```
Playwright launcher not found. Tried:
  - node_modules/.bin/playwright
  - node_modules/.bin/playwright.cmd  (Windows)
  - node_modules/.bin/playwright.bat  (Windows)
  - node_modules/.bin/playwright.ps1  (Windows)
  - npx --no-install playwright --version
  - node_modules/.bin/playwright-cli  (DEPRECATED; sunset at qfai 1.10.0)
  - node_modules/.bin/playwright-cli.cmd  (DEPRECATED; sunset at qfai 1.10.0)
  - node_modules/.bin/playwright-cli.bat  (DEPRECATED; sunset at qfai 1.10.0)
Install hint: npm i -D playwright
```

The install hint MUST be `npm i -D playwright` (NOT `npx playwright
install`; NOT `pnpm`; NOT `yarn`). The packageManager-agnostic
detection for the installed package is the probe order above; the
install hint is a per-project recommendation, and operators on pnpm /
yarn projects substitute the equivalent install command.

## `skills.integrity` severity

Per REQ-0122, `skills.integrity` (the check that compares skill /
asset checksums against the installed mirror) defaults to severity
**warning**. The check identifies drift between the installed assets
and the expected mirror, but drift here is advisory: it does not
block the active profile because the prototyping / validate paths
operate on the actual installed files, not the expected mirror.

`skills.integrity` warnings belong to the "warnings advisory of
drift" bucket regardless of message wording.

## Finding grouping

The doctor summary MUST group findings into exactly two buckets per
REQ-0122:

### 1. Errors blocking the active profile

Findings that prevent the named profile from running correctly.
Examples:

- `E-PROBE-PLAYWRIGHT-NOT-FOUND` — Playwright launcher candidates
  all failed (only emitted when `--profile prototyping`).
- `E-CONFIG-BROWSERTOOL-INVALID` — `browserTool` config value not
  in the accepted set for the current minor.
- `E-CONFIG-MISSING` — required config block absent for the active
  profile.

### 2. Warnings advisory of drift

Findings that surface drift without blocking the profile. Examples:

- `D-DEPRECATED-PROBE` — `playwright-cli` candidate accepted; see
  lifecycle above.
- `W-SKILLS-INTEGRITY` — installed skill / asset checksum differs
  from the expected mirror.
- `D-DEPRECATED-PATH` — legacy assistant-tree path encountered
  (mirrors the `qfai validate` finding code; reused here for
  visibility).

## Exit codes

| Code | Meaning                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | All probes for the active profile passed; warnings (if any) are advisory only.                                                                              |
| 1    | At least one finding in the "errors blocking the active profile" bucket. The doctor summary names every blocking finding and the recovery hint per finding. |

The non-zero row is gated on `--fail-on`: with `--fail-on error` the
"errors" bucket being non-empty returns 1, and with `--fail-on
warning` a non-empty "warnings" bucket does too. Without `--fail-on`,
doctor reports its findings and returns 0 — the summary is the signal,
not the exit code.

## Non-goals

- `qfai doctor` is read-only BY DEFAULT and does NOT attempt repairs
  on its own. Repairs happen only when the operator opts in with
  `--clean` or `--autoremediate`, and are bounded by the paths
  enumerated under "Side effects (written)". Widening that set is a
  contract change.
- `qfai doctor` does NOT delete anything. `--clean` renames stale
  review packs into `_archive/`; no path is removed on any flag.
- `qfai doctor` does NOT remediate in CI. `CI=true` disables
  `--autoremediate` (AC-0006-0018).
- `qfai doctor` does NOT trigger `playwright install` on any path,
  and does NOT run any install command on the probe path. Install
  hints are emitted as text; the operator decides whether to act. The
  one exception is `--autoremediate --profile <skill>`, which runs
  `npm install <name>` for that skill manifest's unmet
  `runtimeDependencies`. The install list comes from that manifest,
  never from the Playwright launcher probe's failed candidates.
- `qfai doctor` does NOT probe network reachability of any target
  URL. Network probes are out of scope; they belong to the
  profile-specific gate (e.g. iterate's cycle-0 target-url
  navigation check).
- `qfai doctor` does NOT enforce `skills.integrity` as an error in
  the current minor (REQ-0122). Promotion to error severity, if
  pursued, is deferred to a post-1.10.0 review.

## Determinism posture

- Probe order, candidate set per platform, error text, exit codes,
  and the bucket grouping are deterministic.
- The list of installed mirror checksums consumed by
  `skills.integrity` is deterministic for a given installed copy of
  the assistant tree.
