# CLI Contract: `qfai doctor`

- Contract scope: public CLI surface for environment / profile / skill-integrity probing
- Owning spec: spec-0012 (prototyping profile inputs) and spec-0004 (skill integrity)
- Used-by: `/qfai-prototyping` (precondition check), CI lanes that gate on environment readiness
- SSOT modules:
  - `packages/qfai/src/cli/commands/doctor.ts`
  - `packages/qfai/src/core/doctor.ts` (doctor probe orchestration;
    single-file module — there is no `core/doctor/` directory)
  - `packages/qfai/src/core/prototyping/playwrightLauncher.ts`
    (Playwright launcher candidate probe via `resolvePlaywrightLauncher`
    and the `getProbeOrder` candidate list)
  - `packages/qfai/src/core/skillsIntegrity.ts` (skill / asset
    checksum diff via `diffProjectSkillsAgainstInitAssets`)

## Public sub-commands

### `qfai doctor [--profile <name>]`

Probes the active profile's required runtime preconditions and the
skill / asset integrity surface. Returns a structured summary grouping
findings into two buckets: "errors blocking the active profile" and
"warnings advisory of drift" (per REQ-0122).

Required inputs (read; never written):

- `--profile <name>` — when passed, doctor scopes the probe to the
  named profile's required runtime preconditions (e.g.
  `prototyping` requires the Playwright launcher to be probeable).
  When omitted, doctor runs the profile-agnostic checks only.
- `qfai.config.yaml#prototyping.execution.browserTool` — accepted
  values during the deprecation window: `"playwright"` (canonical)
  OR `"playwright-cli"` (legacy, emits `D-DEPRECATED-PROBE`
  warning). After sunset, only `"playwright"` is accepted (REQ-0108).

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

## Non-goals

- `qfai doctor` does NOT attempt repairs. It is read-only.
- `qfai doctor` does NOT trigger `playwright install` or any other
  install command. Install hints are emitted as text; the operator
  decides whether to act.
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
