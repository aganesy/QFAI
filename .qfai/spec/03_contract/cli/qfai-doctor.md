# CLI Contract: `qfai doctor`

- Contract scope: public CLI surface for environment / profile / skill-integrity probing
- Owning flow: `BF-0003` for diagnostics, with `BF-0001` owning prototyping preconditions and assistant integrity
- Used-by: `/qfai-prototyping` (precondition check), CI lanes that gate on environment readiness
- SSOT modules:
  - `packages/qfai/src/cli/commands/doctor.ts`
  - `packages/qfai/src/core/doctor.ts` (doctor probe orchestration)
  - `packages/qfai/src/core/doctor/` — the side-effecting remediations
    reached only through `--clean` / `--autoremediate`
    (`autoremediate.ts`,
    `cleanReviewPacks.ts`, `cleanRunLogs.ts`,
    `migrateLegacyReviewPacks.ts`, `skillManifestProbe.ts`,
    `staleTtl.ts`) — with `archiveVisibility.ts` deciding, for one pack,
    whether the archive move would take it out of version control —
    `--clean` refuses the move when it would, because a rename into a
    git-ignored directory deletes a tracked pack from the repository
    rather than retaining it — plus two read-only checks that write
    nothing:
    `workflowsIntegrity.ts`, which backs the `workflows.integrity`
    check documented below, `assetLineBudget.ts`, which owns the
    per-file assistant asset line ceiling at runtime so a project
    holding only the published package can still check it, and
    `outDirCollisions.ts`, which backs the `output.outDirCollision`
    check and is also the ownership precondition `cleanRunLogs.ts`
    consults before it deletes anything
  - `packages/qfai/src/core/prototyping/playwrightLauncher.ts`
    (Playwright launcher candidate probe via `resolvePlaywrightLauncher`
    and the `getProbeOrder` candidate list)
  - `packages/qfai/src/core/skillsIntegrity.ts` (skill / asset
    checksum diff via `diffProjectSkillsAgainstInitAssets`)
- Companion contracts:
  - `.qfai/spec/03_contract/cli/shipped-workflows.md` — the file-state enum and
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
  that turns the exit code non-zero; see "Exit codes". Omitted, it
  follows `validation.failOn` in `qfai.config.yaml`, whose shipped
  default is `error`. `never` is the explicit opt-out: report, and
  always exit 0.
- `qfai.config.yaml#prototyping.execution.browserTool` — accepted
  values during the deprecation window: `"playwright"` (canonical)
  OR `"playwright-cli"` (legacy, emits `D-DEPRECATED-PROBE`
  warning). After sunset, only `"playwright"` is accepted (REQ-0108).
- `qfai.config.yaml#review.staleTtlDays` — the calendar-day TTL the
  `--clean` archive decision uses. Defaults to 14 when unset.
- `qfai.config.yaml#report.staleTtlDays` — the calendar-day TTL the
  `--clean` run-log prune decision uses. Defaults to 14 when unset;
  `0` opts the project out of pruning entirely.
- `qfai.config.yaml#report.keepLatestRuns` — how many newest
  `<outDir>/run-*` directories survive the prune regardless of age, so
  the `run_log:` pointer in `validate.log` can never be pruned away.
  Clamped up to 1 when set to `0`; use `report.staleTtlDays: 0` to keep
  everything.

## Side effects (written)

Doctor does not touch the repository unless `--clean` or
`--autoremediate` is passed; the one write available without either
is the report destination the operator names with `--out`.
`--autoremediate` supersedes `--clean`: when both are present, only
the autoremediate path runs (it archives review packs and prunes run
logs itself as phases of its own).

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

Archives TTL-expired review packs — moves, never deletes — and prunes
TTL-expired validate run logs, which it does delete.

| Path                        | Write              | Condition                                                                                                              |
| --------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `.qfai/review/review-<ts>/` | renamed (moved)    | pack mtime older than `review.staleTtlDays`                                                                            |
| `.qfai/review/_archive/`    | created if missing | at least one pack is archive-eligible                                                                                  |
| `<outDir>/run-<ts>/`        | removed            | older than `report.staleTtlDays`, outside the newest `report.keepLatestRuns`, and not the run `validate.log` points at |

`.qfai/review/_archive/` is itself skipped while enumerating packs, so
a re-run is a no-op. Under `--dry-run` the plan is reported (`would
move -> _archive/<pack>`, `would remove -> <run id>`) and neither the
rename nor the removal is issued.

The run-log half deletes rather than moves, so it runs only after a
precondition check clears it: the config must have loaded without
issues, and no other project root in the monorepo may resolve
`paths.outDir` to the same directory. When either fails, the archive
half still runs and the prune is skipped with a reported reason —
the `output.outDirCollision` and config diagnostics that would
otherwise explain it are produced by the pass that runs AFTER the
clean phase. A removal that fails is reported per run id and makes the
command exit non-zero whatever `--fail-on` says: some directories are
irreversibly gone while others the operator asked to remove are not.

### `--autoremediate`

Runs install + clean + config-fill as one orchestrated pass.

| Path                                    | Write                              | Condition                                                                                                        |
| --------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `<root>/.gitignore`                     | managed block rewritten            | the managed block is missing or stale (see below); never in a detected CI environment                            |
| `qfai.config.yaml`                      | appended                           | a default-keyed field (`review:`) is absent from the PARSED document; user-authored values are never overwritten |
| `.qfai/review/review-<ts>/`             | renamed (moved)                    | same TTL rule as `--clean`                                                                                       |
| `<outDir>/run-<ts>/`                    | removed                            | same TTL / keep-latest / pointer rule and the same precondition check as `--clean`                               |
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
  of this contract (BR-0191): without
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
  warning text MUST name the sunset version under BR-0185.
  Downstream projects that already have `scripts/playwright-cli.cmd`
  wrappers continue to PASS, with the warning indicating the
  migration target.
- **At sunset**: severity **error**. The `playwright-cli` /
  `playwright-cli.cmd` / `playwright-cli.bat` candidates are removed
  from the probe order in the following minor. The sunset version
  is qfai 1.10.0 (canonical npm `package.json#version` pin).

### Probe-failure error text

When all probe candidates fail, the doctor error text MUST include:

```text
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
  `.qfai/spec/03_contract/cli/shipped-workflows.md` §3. This check introduces no state
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
warning` a non-empty "warnings" bucket does too. Without `--fail-on`,
doctor applies `validation.failOn` from `qfai.config.yaml`, whose
shipped default is `error`. `--fail-on never` is the explicit
opt-out: doctor reports its findings and returns 0.

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
- `qfai doctor` deletes ONE thing, under `--clean` and nothing else: a
  TTL-expired validate run log, and only once the preconditions the
  `--clean` section states have cleared — the config loaded without
  issues, no other project root in the monorepo resolves
  `paths.outDir` to the same directory, the run is outside the newest
  `report.keepLatestRuns`, and `validate.log` does not point at it.
  Stale review packs are RENAMED into `_archive/` and never removed.
  Nothing else is deleted on any flag.
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
  ownership contract in `.qfai/spec/03_contract/cli/shipped-workflows.md`.

## Determinism posture

- Probe order, candidate set per platform, error text, exit codes,
  and the bucket grouping are deterministic.
- The list of installed mirror checksums consumed by
  `skills.integrity` is deterministic for a given installed copy of
  the assistant tree.
- `workflows.integrity`'s state resolution is deterministic in the
  pair (provenance record, adopter tree) for a given installed
  package: the state table in
  `.qfai/spec/03_contract/cli/shipped-workflows.md` §3 is total over that
  pair, so there is no "unknown" outcome and no timestamp or
  environment input.

## Story-tree paths

Directory checks read `paths.specsDir` and `paths.contractsDir` from
`qfai.config.yaml`. Their defaults are `.qfai/spec` and
`.qfai/spec/03_contract`. The design lock is read at
`<contractsDir>/design/DESIGN.md.lock.yaml`. Skill integrity and the asset
line budget inspect the singular `.qfai/assistant/skill/` tree. The
test-glob diagnostic counts declared business flows in the story tree.
An absent configured `paths.testsDir` produces a `paths.testsDir` warning
with its resolved path. A configured deprecated `paths.promptsDir`, or a default directory containing
content beyond the shipped `.gitkeep`, produces a
`paths.promptsDirDeprecated` warning and directs migration to `skillsDir`.
The absent default and the shipped empty directory are not drift.

## Rules

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Examples                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| BR-0178 | Without `--format`, doctor prints its diagnosis as text: the root, the config path and whether it was found, the checks and the summary. `--format json` prints one JSON document whose top-level keys include `root`, `config`, `checks` and `summary`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0003-0001-01, EX-0003-0005-01                                                    |
| BR-0179 | Doctor reports whether `qfai.config.yaml` was found. When it is present, `config.found` is `true` and `config.configPath` names the file. When it is absent, `config.found` is `false` and the `config.search` check is a `warning`. When the configuration loader reports issues, the `config.load` check is `error` and `details.issues` lists them. A configured non-default directory that does not exist is reported as a `warning` whose `details.path` names the resolved path.                                                                                                                                                                                                                                                                           | EX-0003-0001-03, EX-0003-0001-05, EX-0003-0001-07, EX-0003-0002-01                  |
| BR-0180 | When `--root` is not given, doctor searches from the start directory upward for `qfai.config.yaml` and takes the directory holding it as the root.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0003-0001-02, EX-0003-0001-06                                                    |
| BR-0181 | Without `--fail-on`, doctor applies `validation.failOn` from `qfai.config.yaml`, whose shipped default is `error`. `error` exits 1 when error > 0; `warning` exits 1 when warning + error > 0; `never` always exits 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0003-0012-01, EX-0003-0012-02, EX-0003-0012-03, EX-0003-0012-04, EX-0003-0011-09 |
| BR-0182 | With `--out`, the report is written to the file and not to stdout. Stdout carries only the line `doctor: wrote <absolute path>`. Missing parent directories are created.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0003-0005-02, EX-0003-0005-03, EX-0003-0005-04                                   |
| BR-0183 | summary は ok, info, warning, error のカウントを含む                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0003-0001-04                                                                     |
| BR-0184 | `qfai doctor --profile prototyping` probes launchers in order: (1) `node_modules/.bin/playwright`, including the Windows `playwright.cmd`, `playwright.bat` and `playwright.ps1` variants, then (2) `npx --no-install playwright --version`, then (3) the deprecated `playwright-cli` (BR-0185). The first stage that resolves is reported as the launcher.                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0003-0006-01, EX-0003-0006-05                                                    |
| BR-0185 | `playwright-cli`, including its `.cmd` and `.bat` variants, is stage (3) of BR-0184 and still resolves as a launcher. Past its `1.10.0` sunset, resolving it emits `D-DEPRECATED-PROBE` at severity `error`, and the message carries `sunset: 1.10.0` and the install hint `npm i -D playwright`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0003-0006-02                                                                     |
| BR-0186 | playwright も playwright-cli も検出されず npx fallback も失敗した場合、error text は install hint `npm i -D playwright` を必ず含む。曖昧表現 (例: "install playwright manually") は禁止                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0003-0006-03                                                                     |
| BR-0187 | `qfai doctor` の `skills.integrity` check は finding severity を既定で `warning` とする (`error` ではない)。`--fail-on error` でも skills.integrity 単独では exit 0 を維持する (advisory)。`--fail-on warning` では従来通り exit 1 になる                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0003-0007-01, EX-0003-0007-03                                                    |
| BR-0188 | The text summary splits findings into two groups under the headers "errors blocking the active profile" and "warnings advisory of drift", and those header strings are stable identifiers. `skills.integrity` is always in the second group, whatever its message says. JSON output carries no group key; a consumer derives the group from each check's `severity`.                                                                                                                                                                                                                                                                                                                                                                                             | EX-0003-0007-02                                                                     |
| BR-0189 | `qfai doctor --clean` moves each review pack under `.qfai/review/<ts>/` whose age is strictly greater than the TTL to `.qfai/review/_archive/<ts>/`. The TTL defaults to 14 days (DEC-0114) and is set per project by `qfai.config.yaml#review.staleTtlDays`. A pack within the TTL stays. A pack git tracks also stays when `.qfai/review/_archive/` is git-ignored, because the move would take it out of version control.                                                                                                                                                                                                                                                                                                                                     | EX-0003-0008-01, EX-0003-0008-03, EX-0003-0008-04, EX-0003-0008-05                  |
| BR-0190 | archival は move のみで NEVER delete; restore は手動 `mv` 戻し。`qfai validate --profile review` は top-level `.qfai/review/<ts>/` のみ scan し `_archive/` 配下を out-of-scope として扱う。in-scope pack の `QFAI-REVIEW-003/004/005` 挙動は不変                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0003-0008-02                                                                     |
| BR-0191 | Among its writes, `qfai doctor --autoremediate` (a) runs `npm install` for the `runtimeDependencies` of the manifest `--profile <skill>` names (BR-0193), (b) runs the `--clean` TTL archive (BR-0189), and (c) writes missing default-keyed fields to `qfai.config.yaml`. The install phase runs only when `--profile <skill>` names a manifest; without it the phase is skipped and doctor says so. The complete list of writes is the Side effects (written) section of this contract. Interactive confirmation is required by default, and `--yes` skips it. User-authored values are never overwritten.                                                                                                                                                     | EX-0003-0009-01, EX-0003-0009-06                                                    |
| BR-0192 | When a standard CI environment is detected, `--autoremediate` is off by default and doctor prints the line `autoremediate disabled in CI`. A standard CI environment is any `CI` value other than `false`, `0` or empty, or `GITHUB_ACTIONS=true`. `--dry-run` previews the remediation plan and performs no install, archive or config write.                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0003-0009-02, EX-0003-0009-03, EX-0003-0009-04, EX-0003-0009-05, EX-0003-0009-07 |
| BR-0193 | `qfai doctor --profile <skill>` reads `<paths.skillsDir>/<skill>/manifest.json`, probes `node_modules/.bin/...` / `node_modules/<name>/` for each `runtimeDependencies` entry, and reports a missing dependency with its install command. The path comes from `paths.skillsDir`, so a project that relocates its skill tree, or renames it to the singular `skill/`, keeps its manifest resolved (`.qfai/spec/03_contract/cli/qfai-doctor.md#story-tree-paths`)                                                                                                                                                                                                                                                                                                  | EX-0003-0010-01, EX-0003-0010-03                                                    |
| BR-0194 | A manifest whose `runtimeDependencies` is an empty array produces no probe finding. Authoring the manifest schema and linting the shipped manifests are outside doctor; the probe is doctor's part.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0003-0010-02                                                                     |
| BR-0195 | `qfai doctor` compares each shipped workflow installed under the adopter tree's `.github/workflows/` with the copy in the installed package, by content after line-ending normalization, as `skills.integrity` does for skills. Only names with an entry in `.qfai/install-provenance.json` are compared; a name without one is `adopter-owned` and is not reported, even when it collides with a shipped name. Drift is a non-empty `changed` set; `missing` (that is, `declined`) and `extra` are not drift. The provenance record is written and owned under `.qfai/spec/03_contract/cli/shipped-workflows.md`; doctor only reads it. The check id is `workflows.integrity`, and matching content is severity `ok`. Rationale and rejected options: DEC-0116. | EX-0003-0011-01, EX-0003-0011-04, EX-0003-0011-12, EX-0003-0011-13                  |
| BR-0196 | The `workflows.integrity` finding defaults to severity `info`. `info` is the only severity that leaves the exit code unchanged under every `--fail-on` value, a stronger guarantee than the `--fail-on error` advisory of `skills.integrity` (BR-0187). It is shown in the "warnings advisory of drift" group (BR-0188). The drift is reported only on doctor's diagnostic surface; `qfai validate` adds no finding for it. The rationale for the severity, the rejected options and why it is not in `validate` are in DEC-0115. The leg that tells `info` apart from `warning` is BR-0198.                                                                                                                                                                     | EX-0003-0011-02, EX-0003-0011-09                                                    |
| BR-0197 | The finding's message names the stale file path and the manual repair: replace the file with the copy inside the installed package. It names no refresh command, CLI verb or flag, because the refresh half is deferred (OQ-0003); a command is named only in the release that ships one. A shipped workflow absent from the adopter tree raises no drift finding; how an absent name is classified belongs to `.qfai/spec/03_contract/cli/shipped-workflows.md`. When the packaged copy cannot be resolved, the check is skipped at severity `info`.                                                                                                                                                                                                            | EX-0003-0011-03, EX-0003-0011-10, EX-0003-0011-11                                   |
| BR-0198 | A `workflows.integrity` drift finding counts in `summary.info` and never in `summary.warning`. On a tree with no other warning or error, `qfai doctor --fail-on warning` therefore exits 0. Adding one unrelated warning finding to the same tree makes it exit 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0003-0011-05, EX-0003-0011-06                                                    |
| BR-0199 | The drift finding's `details` carry `{ workflowsDir, modified, declined, packagedDir }`. `declined` (a name with a provenance entry that is absent from the adopter tree) adds nothing to the severity or the exit code, but is listed in `details.declined` so the operator can see that QFAI knows the file is gone and leaves it that way. The message does not name a declined file as stale. `declined` does not trigger the finding, so when `modified` is empty no finding and no `details` are emitted. The state vocabulary and the definition of `declined` belong to `.qfai/spec/03_contract/cli/shipped-workflows.md` §3; doctor reads and surfaces them.                                                                                            | EX-0003-0011-07, EX-0003-0011-08                                                    |
| BR-0525 | Doctor resolves configured paths from `qfai.config.yaml`. An absent configured `paths.testsDir` produces a `paths.testsDir` warning with `details.path` naming the resolved path and guidance to configure or create it. A configured deprecated `paths.promptsDir` or default directory with content beyond the shipped `.gitkeep` produces a `paths.promptsDirDeprecated` warning with the legacy path and migration guidance to `skillsDir`. The absent default and the shipped empty directory do not warn.                                                                                                                                                                                                                                                  | EX-0003-0003-01, EX-0003-0004-01, EX-0003-0004-02, EX-0003-0004-03, EX-0003-0004-04 |
| BR-0526 | A newly initialized project with Playwright installed and no other blocking precondition passes `qfai doctor --profile prototyping` without any `[error]` line. Warnings remain advisory under the default `--fail-on` behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0003-0006-04                                                                     |
