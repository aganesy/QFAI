# CLI Contract: `qfai doctor`

- Contract scope: public CLI surface for environment / profile / skill-integrity probing
- Owning spec: spec-0006 (the `qfai doctor` command itself, including
  `workflows.integrity`), with spec-0012 owning the prototyping profile inputs
  and spec-0004 the skill-integrity comparison
- Used-by: `/qfai-prototyping` (precondition check), CI lanes that gate on environment readiness
- SSOT modules:
  - `packages/qfai/src/cli/commands/doctor.ts`
  - `packages/qfai/src/core/doctor.ts` (doctor probe orchestration)
  - `packages/qfai/src/core/doctor/` — the side-effecting remediations
    reached only through `--clean` / `--autoremediate`
    (`autoremediate.ts`, `cleanReviewPacks.ts`,
    `migrateLegacyReviewPacks.ts`, `skillManifestProbe.ts`,
    `staleTtl.ts`) plus the read-only comparison
    `workflowsIntegrity.ts`, which backs the `workflows.integrity`
    check documented below and writes nothing
  - `packages/qfai/src/core/prototyping/playwrightLauncher.ts`
    (Playwright launcher candidate probe via `resolvePlaywrightLauncher`
    and the `getProbeOrder` candidate list)
  - `packages/qfai/src/core/skillsIntegrity.ts` (skill / asset
    checksum diff via `diffProjectSkillsAgainstInitAssets`)
- Companion contracts:
  - `.qfai/contracts/cli/shipped-workflows.md` — the file-state enum and
    provenance record that `workflows.integrity` reads

## Public sub-commands

### `qfai doctor [--profile <name>] [--format <text|json>] [--out <path>] [--fail-on <error|warning|never>] [--clean] [--autoremediate] [--dry-run] [--yes]`

Probes the active profile's required runtime preconditions and the
skill / asset integrity surface. Returns a structured summary grouping
findings into two buckets: "errors blocking the active profile" and
"warnings advisory of drift" (per REQ-0122).

The probe itself is read-only. `--clean` and `--autoremediate` are the
only paths that mutate the repository, and they run as pre-steps
BEFORE the diagnostic build so the summary reports the
post-remediation tree. Every path they write is enumerated under "Side
effects (written)" below, alongside the one operator-named write
`--out <path>` performs on any invocation.

Inputs (read; the repository is never written from them — `--out`
names a destination file, see its bullet):

- `--profile <name>` — when passed, doctor scopes the probe to the
  named profile's required runtime preconditions (e.g.
  `prototyping` requires the Playwright launcher to be probeable).
  A skill name (e.g. `qfai-prototyping`) instead scopes the probe to
  that skill manifest's `runtimeDependencies`.
  When omitted, doctor runs the profile-agnostic checks only.
- `--format <text|json>` — output shape. Defaults to `text`. Under
  `json` and WITHOUT `--out`, stdout carries the JSON document alone
  and every side-effect line is routed to stderr, so the stdout
  channel stays parseable. With `--out`, the document leaves stdout
  entirely — see the next bullet.
- `--out <path>` — writes the rendered summary to `<path>` INSTEAD of
  stdout, not in addition to it. The summary appears in the file
  only; stdout carries the single plain-text status line
  `doctor: wrote <absolute path>` under every `--format`. So
  `qfai doctor --format json --out report.json | jq` reads a status
  line rather than JSON — a consumer that wants the document reads
  the file. This is an operator-named report destination, not a
  repository mutation — but it IS a write, on every invocation and
  under no flag: see "`--out <path>`" under "Side effects (written)".
- `--fail-on <error|warning|never>` — selects the finding severity
  that turns the exit code non-zero; see "Exit codes". `never` is
  accepted and means "report, always exit 0" — the same outcome as
  omitting the flag, spelled explicitly for a lane that wants the
  intent recorded in the command line.
- `qfai.config.yaml#prototyping.execution.browserTool` — accepted
  values during the deprecation window: `"playwright"` (canonical)
  OR `"playwright-cli"` (legacy, emits `D-DEPRECATED-PROBE`
  warning). After sunset, only `"playwright"` is accepted (REQ-0108).
- `qfai.config.yaml#review.staleTtlDays` — the calendar-day TTL the
  `--clean` archive decision uses. Defaults to 14 when unset.

## Side effects (written)

Doctor does not touch the repository unless `--clean` or
`--autoremediate` is passed; the one write available without either
is the report destination the operator names with `--out`.
`--autoremediate` supersedes `--clean`: when both are present, only
the autoremediate path runs (it archives review packs itself as one
of its phases).

### `--out <path>`

| Path              | Write                 | Condition         |
| ----------------- | --------------------- | ----------------- |
| `<path>`          | created / overwritten | `--out` is passed |
| `dirname(<path>)` | created recursively   | it does not exist |

Passed alone — no `--clean`, no `--autoremediate` — `--out` still
writes: doctor resolves the path against the process CWD, creates the
parent directories it needs, and writes the rendered summary there.
`--dry-run` does not suppress it; it governs the remediations, not the
report. This is the operator's own destination rather than a
repository mutation, which is why it is not part of the remediation
tables below, but a caller reasoning about what a doctor run touches
counts it.

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

| Path                                    | Write                              | Condition                                                                                                        |
| --------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `<root>/.gitignore`                     | managed block rewritten            | the managed block is missing or stale (see below); never in a detected CI environment                            |
| `qfai.config.yaml`                      | appended                           | a default-keyed field (`review:`) is absent from the PARSED document; user-authored values are never overwritten |
| `.qfai/review/review-<ts>/`             | renamed (moved)                    | same TTL rule as `--clean`                                                                                       |
| `.qfai/review/.legacy-packs`            | written (first run only)           | packs predating `revision_form` exist and no record has been taken yet                                           |
| `.qfai/review/review-<ts>/summary.json` | `revision_form: "legacy"` added    | the pack is named by `.legacy-packs` and declares no form of its own                                             |
| `node_modules/`                         | `npm install <name>`               | `--profile <skill>` names a manifest with unmet `runtimeDependencies`                                            |
| `package.json` + `package-lock.json`    | updated by that same `npm install` | same condition as the row above                                                                                  |

The `.gitignore` rewrite is checked, not unconditional. It is
attempted before the orchestrator on every non-CI `--autoremediate`
run, but the helper returns early — writing nothing — when the
existing managed block already carries the marker, every required
governance negation, those negations outranking any later matching
ignore line, and no retired legacy line. So a second
`--autoremediate` on an already-migrated repository leaves
`.gitignore` byte-identical.

Three of these rows land on version-controlled files, so an
`--autoremediate` run that has something to do leaves a diff. A
repeat run on a repository whose block is already current, whose
dependencies are installed, whose config carries every default key
and whose packs are all inside the TTL writes nothing at all and
leaves no diff — the whole pass is idempotent:

- The install runs `npm install <name>` WITHOUT `--no-save`, so under
  the default npm settings (`save=true`, `package-lock=true`) it
  records the dependency in `package.json` and rewrites
  `package-lock.json` — not `node_modules/` alone.
- The legacy-pack migration writes both halves of one fact: the
  `.legacy-packs` record AND a `revision_form: "legacy"` field in
  each named pack's `summary.json`. A pack that already declares a
  form is never reclassified.

#### Install scripts are an UNBOUNDED side effect

The install runs `npm install <name>` without `--ignore-scripts`, so
npm executes the target package's (and its dependencies')
`preinstall` / `install` / `postinstall` / `prepare` lifecycle
scripts. Those scripts are arbitrary code running with the operator's
own privileges: they can write anywhere the operator can, and nothing
in this contract bounds them to the table above. The declared
boundary covers the paths DOCTOR writes; it does not and cannot cover
what a third-party package's install hooks do.

This is deliberate rather than an oversight — a runtimeDependency
like `playwright` is unusable without its `postinstall` — but it is
the reason `--autoremediate --profile <skill>` is an
operator-confirmed action and not something to schedule unattended.
An operator who needs the enumerated set to be the whole story
installs the dependency themselves with `npm install <name>
--ignore-scripts` and re-runs doctor without `--autoremediate`.
Restricting doctor's own install to `--ignore-scripts` would be a
contract change in the other direction (it silently produces
half-installed packages), so it is not done implicitly.

Presence of the `review:` config key is decided by PARSING the YAML
document, not by matching raw text, so a quoted or spaced spelling
(`"review":`, `review :`) counts as present and is left untouched. A
`qfai.config.yaml` that does not parse as a YAML mapping is not
appended to at all; doctor reports the skip.

Without `--profile <skill>` there is no manifest to probe, so the
install phase is structurally skipped and doctor says so explicitly.

### `--dry-run` / `--yes` interaction

- `--dry-run` applies to both `--clean` and `--autoremediate`: the
  plan is reported in the future tense (`would run` / `would fill` /
  `would archive` / `would move -> _archive/<pack>`) and no
  filesystem write is issued. The archive count a dry-run prints is
  the count a live run WOULD move; it never reads as already moved.
- The plan is DECIDED, not assumed. A dry-run runs every read-only
  check the live pass runs and reports only the changes that pass
  would actually make. For the config-fill that means parsing
  `qfai.config.yaml` and naming the missing fields
  (`would fill default-keyed config fields: review`); a config that
  already declares the key previews as
  `config-fill not needed, default-keyed fields present`, and one
  that is not a parseable mapping previews with the same
  `skipped config-fill` line the live run emits. A `would` line is
  therefore a commitment: if the preview names no change, the live
  run makes none.
- `--yes` skips the interactive confirmation that `--autoremediate`
  REQUIRES by default. That confirmation is a mandatory safety gate
  of this contract (spec-0006 REQ-0156 / BR-0006-0014): without
  `--yes`, `--autoremediate` must not install dependencies or write
  tracked files until the operator confirms.
  **Known implementation deviation:** the shipped binary is
  non-interactive and never prompts, so today an `--autoremediate`
  run proceeds as though `--yes` had been passed. This contract does
  NOT ratify that; the gate stands as required and the binary is in
  breach of it. Until the prompt lands, treat every
  `--autoremediate` invocation as unattended and preview it with
  `--dry-run` first.
- A standard CI environment disables `--autoremediate` entirely
  (AC-0006-0018): doctor emits `autoremediate disabled in CI`, skips
  the `.gitignore` rewrite and every remediation, and returns 0
  without building the diagnostic. `--clean` is not CI-suppressed.
  Detection is the repo-wide `isCiEnvironment` predicate — any `CI`
  value that is not `""`, `false` or `0` (trimmed, case-insensitively)
  OR `GITHUB_ACTIONS=true`. The truthy-by-presence spellings (`CI=1`,
  `CI=yes`) are therefore INSIDE the guarantee, not outside it;
  `CI=false` and `CI=0` read as local and do remediate.

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

- It does not overwrite, recreate or delete anything. This check stays read-only
  even under `--autoremediate`: refreshing a shipped workflow is not one of the
  remediations enumerated under "Side effects (written)", because the conflict
  policy for a hand-edited file is undecided (`OQ-0021`).
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

The non-zero row is gated on `--fail-on`: with `--fail-on error` the
"errors" bucket being non-empty returns 1, and with `--fail-on
warning` a non-empty "warnings" bucket does too. `--fail-on never` is
the third accepted value; it is dropped before reaching the doctor
run, so it behaves exactly like omitting the flag. Without
`--fail-on` — or with `never` — doctor reports its findings and
returns 0; the summary is the signal, not the exit code.

## Non-goals

- `qfai doctor` is read-only BY DEFAULT and does NOT attempt repairs
  on its own. Repairs happen only when the operator opts in with
  `--clean` or `--autoremediate`, and the paths DOCTOR ITSELF writes
  are bounded by those enumerated under "Side effects (written)"
  (plus the operator-named `--out` destination). Widening that set is
  a contract change. The bound stops at doctor's own writes: the
  `npm install <name>` the autoremediate install phase shells out to
  runs the target package's lifecycle scripts, whose writes are
  unbounded — see "Install scripts are an UNBOUNDED side effect".
- `qfai doctor` does NOT delete anything. `--clean` renames stale
  review packs into `_archive/`; no path is removed on any flag.
- `qfai doctor` does NOT remediate in a detected CI environment
  (any truthy `CI` value, or `GITHUB_ACTIONS=true`): that disables
  `--autoremediate` (AC-0006-0018).
- `qfai doctor` does NOT trigger `playwright install` on any path,
  and does NOT run any install command on the probe path. Install
  hints are emitted as text; the operator decides whether to act. The
  one exception is `--autoremediate --profile <skill>`, which runs
  `npm install <name>` for that skill manifest's unmet
  `runtimeDependencies` — and that install, having no `--no-save`,
  updates `package.json` / `package-lock.json` as well. The install
  list comes from that manifest, never from the Playwright launcher
  probe's failed candidates.
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
