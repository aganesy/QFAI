# CLI Contract: `qfai doctor`

- Contract scope: public CLI surface for environment / profile / skill-integrity probing
- Owning spec: spec-0006 (the `qfai doctor` command itself, including
  `workflows.integrity`), with spec-0012 owning the prototyping profile inputs
  and spec-0004 the skill-integrity comparison
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
- Companion contracts:
  - `.qfai/contracts/cli/shipped-workflows.md` — the file-state enum and
    provenance record that `workflows.integrity` reads

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

## `workflows.integrity` — installed shipped-workflow drift

Reports an installed shipped GitHub Actions workflow whose bytes differ from
the copy inside the installed package. It is the adopter's only route by which a
corrected template becomes visible, because the shipped tree is copied
create-only and `qfai init --force` never refreshes it.

- Check id: `workflows.integrity` (dotted lowercase, matching the existing
  diagnostic scheme; a sibling of `skills.integrity`, which performs the same
  installed-versus-packaged comparison for the skills tree).
- Inputs (read; never written): `.qfai/install-provenance.json`, the adopter's
  `.github/workflows/`, and the packaged shipped tree resolved through
  `getInitAssetsDir()`.
- State vocabulary: exactly the closed enum in
  `.qfai/contracts/cli/shipped-workflows.md` §3. This check introduces no state
  of its own.

### Severity is `info`, not `warning`

The requirement is that the finding does not change the process exit code.
`shouldFailDoctor` in `cli/commands/doctor.ts` exits 1 when
`summary.warning + summary.error > 0` under `--fail-on warning`, so a
`warning`-severity finding **would** change the exit code — for every adopter
running one version behind, which is exactly the population the finding exists
to inform. `info` is the only severity that satisfies "exit code unchanged"
under every `--fail-on` value, and the text renderer already routes both
`warning` and `info` into the advisory bucket, so the finding is grouped
correctly without being blocking.

Promotion to `warning` is not a free later tightening: it is a behaviour change
to every adopter's `doctor --fail-on warning` lane, and it is only defensible
once a refresh command exists to clear the finding. That is the same release in
which the message below changes, so the two move together or neither moves.

### Emission per state

| State           | Emitted severity | Message content                                                |
| --------------- | ---------------- | -------------------------------------------------------------- |
| `installed`     | `ok`             | installed shipped workflows match the packaged copies          |
| `modified`      | `info`           | names each stale file and the manual repair (below)            |
| `declined`      | (not emitted)    | a declined file is never reported as stale                     |
| `adopter-owned` | (not emitted)    | no provenance entry — the file is the adopter's                |
| `absent`        | (not emitted)    | never installed; `qfai init` is the route, not a drift finding |

When more than one file is `modified`, one check is emitted naming all of them
in `details`, mirroring `skills.integrity`'s single-finding-with-lists shape.

### The message must not name a refresh command

No refresh command exists (`OQ-0021`). The message names the stale file and the
repair available at that moment: **replace it with the copy inside the installed
package**. It names a command only in the release that ships one, so this
contract and the deferred item cannot diverge into an advisory that tells an
adopter to run something that is not there.

Required message content:

- the repository-relative path of each stale file;
- the packaged source path to copy from;
- an explicit statement that QFAI will not overwrite the file itself;
- no imperative naming a `qfai` subcommand as the repair.

`details` carries the structured form: `{ workflowsDir, modified: [...],
declined: [...], packagedDir }`. `declined` is listed in `details` for
transparency — an operator can see that QFAI knows the file is gone and is
deliberately leaving it that way — while contributing nothing to the severity.

### Non-goals for this check

- It does not overwrite, recreate or delete anything. `qfai doctor` is
  read-only, including under `--autoremediate`: refreshing a shipped workflow is
  not an autoremediation, because the conflict policy for a hand-edited file is
  undecided (`OQ-0021`).
- It does not distinguish "QFAI shipped a newer template" from "the adopter
  hand-edited it" **in its severity**. The provenance record makes the two
  distinguishable and `details` may carry the distinction, but both are reported
  as `modified` at `info`, because the repair the message can honestly offer
  today is the same in both cases.
- It reports nothing for a workflow with no provenance entry. Adopters who
  installed before the record existed are outside the channel; the adoption path
  is recorded in the companion contract's §3 known limitation.

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
- `workflows.integrity` — an installed shipped GitHub Actions
  workflow differs from the packaged copy. Severity `info`, so it
  never changes the exit code under any `--fail-on` value. See the
  dedicated section above.

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
- `qfai doctor` does NOT refresh, recreate or prune a shipped
  GitHub Actions workflow. `workflows.integrity` is detection only;
  the repair half is deferred on `OQ-0021` and is gated behind the
  ownership contract in `.qfai/contracts/cli/shipped-workflows.md`.

## Determinism posture

- Probe order, candidate set per platform, error text, exit codes,
  and the bucket grouping are deterministic.
- The list of installed mirror checksums consumed by
  `skills.integrity` is deterministic for a given installed copy of
  the assistant tree.
- `workflows.integrity`'s state resolution is deterministic in the
  pair (provenance record, adopter tree) for a given installed
  package: the state table in
  `.qfai/contracts/cli/shipped-workflows.md` §3 is total over that
  pair, so there is no "unknown" outcome and no timestamp or
  environment input.
