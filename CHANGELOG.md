# Changelog

この変更履歴は Keep a Changelog と Semantic Versioning に基づきます。

## [Unreleased]

### Changed

- **The Coverage Depth Matrix has a committed home.** `/qfai-atdd` gates
  completion on it three times — Mandatory Output 2, a Definition-of-Done
  condition and a Not-done criterion — and `qa-gatekeeper` REVISEs when it is
  absent, but nothing said where it goes. The only file the skill mandates
  writing is `.qfai/evidence/atdd-<spec-id>.md`, whose eleven Required sections
  had no slot for it and which the managed `.gitignore` block ignores, so the
  judgement that discharges those gates — why a given `❌` cell is acceptable —
  was guaranteed never to reach a commit, and "unjustified ❌" was unfalsifiable
  for every later reader. The matrix and its per-`❌` justifications now go to
  `.qfai/evidence/coverage-depth-<spec-id>.md`, negated in the managed block
  alongside Change Requests and decision records; the stage evidence file gains
  a section that links to it and carries the totals. `qa-gatekeeper` treats a
  matrix that exists only inside the ignored stage evidence as a missing matrix.
  Existing projects pick the negation up on the next `qfai init`; no ignore line
  is removed, so nothing previously tracked becomes untracked.
- **Re-init no longer resurrects an ignore line a project deleted.**
  `ensureRootGitignoreEntries` rewrote the managed block from the canonical list
  whenever its freshness check failed — and shipping a new governance negation
  is exactly what makes it fail. A project that had removed `.qfai/evidence/*`
  to track its own audit trail got that line back from the very release meant to
  widen tracking. A block that is already current-shaped now keeps its own
  ignore lines and only gains the governance negations it is missing. A block
  still carrying retired lines is provably outdated rather than curated, so it
  is migrated wholesale as before.
- **`qfai init` migrates a legacy `.qfai/evidence/.gitignore`.** Earlier
  versions wrote a per-directory ignore whose first line is `*`. Git applies the
  deepest matching file, so that `*` beat every root-level negation and the
  governance records — Change Requests, decision records, and now the Coverage
  Depth Matrix — stayed ignored however correct the managed block was. The
  leaf negations are appended to that file when it exists; nothing else in it is
  touched.
- **`qfai init --force` regenerates `assistant/agents` and
  `assistant/manifest/agent-catalog.yml`, not only `assistant/skills`.** Every
  other `.qfai/**` path is create-only, so a correction to an agent definition
  or to the catalog reached new projects and nobody else — an installed
  repository kept the old reviewer instructions with no command that would
  update them. Those are generated in the same sense `skills/` is. The rest of
  `assistant/manifest/` is **not** touched: `agent-routing.yml` and
  `review-profiles.yml` are yours to tune, and `--upgrade-assistant-tree`
  migrates them. `specs/`, `contracts/` and `steering/` stay create-only.

## [1.10.0] - 2026-08-03

### Changed

- **Correction to the 1.9.2 deprecation notice.** That release announced four
  deprecations escalating "from warning to error" at 1.10.0. An audit against the
  code found the notice was accurate for one of them. `surface_type`-absent specs
  (`D-SURFACE-TYPE-MISSING`) did emit a warning and now escalate as promised. The
  pre-mutation-log iterate emit was already `error` under
  `R-EVIDENCE-MUTATION-UNLOGGED`, so no window ever applied to it. But
  `D-HANDOFF-LEGACY-FORMAT` and string-only `primary_tasks` **emitted nothing at
  all** during the 1.9.x window — the code that would have warned was never built.
  Escalating those two now would hand consumers a zero-length window, which is what
  REQ-0169 — the requirement the constraint cites as its own justification — exists
  to prevent. Both are re-pinned to 1.11.0 in `_policies/07_Constraints.md` and will
  emit a warning first.
- **`D-SURFACE-TYPE-MISSING` escalates to error.** A spec with a UI contract
  companion but no `surface_type` marker is excluded from the UI-bearing set, so its
  screens are skipped downstream — silently, while the finding said to "treat it as
  priority-2 cleanup rather than blocking". Affects projects with marker-less
  UI-bearing specs; run `/qfai-sdd`, which populates the field. Alongside it,
  `detection/surfaceType.ts` narrowed its companion match from `.ya?ml` to `.yaml`,
  matching `prototyping/specResolution.ts` — otherwise a stray `.yml` would now
  hard-fail as a companion nothing else recognises.
- **`prototyping certify` reports the legacy `prototyping.json` shape.** A record
  with `fullHarness.runId` instead of a top-level `runId` was accepted in silence,
  sealing a completion certificate with no operator signal while the migration memo
  said the shape was rejected. It now emits `D-DEPRECATED-SCHEMA` at the
  version-computed severity and still seals — the acceptance path stays, per OC-60.
- **A sunset can no longer be announced without being enforced.**
  `tests/core/sunsetLedger.test.ts` fails when a `SUNSETS` key has no consumer, when
  a constraint row names a finding code no source emits, or when a file parses a
  version next to a sunset instead of calling the shared comparator. The previous
  guard compared `isAtOrPastSunset` against `deprecationSeverity` — a tautology over
  the latter's own body — and iterated existing keys, while every gap found in this
  release was a missing one.
- **The legacy assistant-tree sunset joined that sweep.** `LEGACY_STEERING_SUNSET`
  was a fourth, separately-shaped SSOT (`{ major, minor }`) that `isAtOrPastSunset`
  could not parse, so three hand-rolled comparators had grown around it — in
  `assistantTreeMigration`, `skillDocReferences` and `init`. Two ignored the patch
  and prerelease fields, so they disagreed with every other deprecation about
  `1.10.0-rc.1`. The pin is now `SUNSETS.legacyAssistantSteering` and the label
  derives from it. `qfai init` reported the layout as "read-compatible for the
  current minor release only" with no version input at all, and wrote that same
  sentence into a commit-immutable migration memo — false at 1.10.0, and
  contradicted by `qfai validate` calling the identical layout an error. Both now
  compute their wording, and post-sunset the init line goes to stderr at error
  severity. **The readers are deliberately unchanged**: `qfai-validate.md` puts
  reader removal in the minor _after_ the sunset, and `qfai init
--upgrade-assistant-tree` has to keep reading the legacy tree to migrate it.
  `init` still exits 0, so no bootstrap script breaks; `qfai validate` remains the
  surface that fails the build.
- **Every sunset pinned to 1.10.0 is now enforced, not just documented.**
  Sunsets were declared in prose beside the code they governed, and each site
  decided separately whether to act: `prototyping.execution.browserTool:
"playwright-cli"` was documented as "at sunset only `playwright` is
  accepted" while the config loader accepted it unconditionally, the
  `D-DEPRECATED-PROBE` doctor check hard-coded `warning`, and `QFAI-AUD-001`
  hard-coded `info`. Shipping this version would have made all three notices
  false. `core/sunset.ts` now holds the single comparator and the sunset SSOT,
  and each site reads its severity from it:
  - `browserTool: "playwright-cli"` is refused by `loadConfig`, which falls
    back to the `playwright` default so a run that ignores the issue still
    targets a supported launcher. Only projects that set the value explicitly
    are affected.
  - `D-DEPRECATED-PROBE` reports `error`. The `sunset: 1.10.0` substring
    remains part of the wire contract.
  - `QFAI-AUD-001` on a UI contract authored before the `primary_tasks` slot
    reports `error`. Add the slot during the next `/qfai-sdd` cycle.

### Removed

- `.qfai/assistant/steering/` — the legacy pre-recut assistant layout reached
  the sunset pinned in `assistantPaths.ts#LEGACY_STEERING_SUNSET`, so
  `D-DEPRECATED-PATH` escalates from `warning` to `error` at this version.
  All eleven files already had canonical homes under
  `.qfai/assistant/manifest/` and `.qfai/assistant/catalog/`, and
  `qfai init` has not shipped the directory since v1.9.0 — only this
  repository still carried the copy. A project upgrading from an older tree
  runs `qfai init --upgrade-assistant-tree` to migrate.

### Added

- `TDDLIST_UNKNOWN_LEVEL` (warning): `tdd/test-list.md` validation now reports
  a `Level` value in `06_Test-Cases.md` that matches neither the coverage-target
  vocabulary nor the non-coverage vocabulary, lists the accepted values, and
  states that an unrecognized value is still treated as a coverage target. The
  finding is attributed to `06_Test-Cases.md` — the file whose cell must be
  edited — so `scope.paths` waivers match the real input, and it is emitted
  under rule id `TDDLIST-002` so a project that deliberately uses its own Level
  vocabulary can suppress or downgrade it through `.qfai/waivers.yml`.

### Fixed

- A waiver's `rule:` now accepts the `code` a finding actually publishes. The
  grammar was `^[A-Z]+-\d{3}$`, which matched none of the identifiers
  `qfai validate` prints: copying `QFAI-ATDD-112` out of `validate.json` — the
  only spelling the CLI, the JSON report and the GitHub annotations ever show —
  failed with a hard `QFAI-WAIVER-001` whose remediation text named
  `COMPAT-003`, a rule no validator emits. The form the engine did key on
  (`ATDD-112`) appeared in no shipped artifact, and 46 emitted codes —
  every `TDDLIST_*`, `W-*`, `E_*` and `R-*` rule, plus `D-DEPRECATED-PATH`,
  `D-SCAFFOLD-PLACEHOLDER` and `QFAI-CFG-LINK-00x` — matched neither branch and
  were unwaivable by construction. `rule:` now takes any code shape the package
  emits (`QFAI-ATDD-112`, `TDDLIST_UNKNOWN_LEVEL`, `E_TC_ORPHAN`,
  `D-SCAFFOLD-PLACEHOLDER`); the `QFAI-`-stripped form still resolves, so
  existing waiver files keep applying unchanged. A well-formed but unknown rule
  is now reported as `QFAI-WAIVER-004` (warning) rather than `QFAI-WAIVER-001`
  (error). `suppressed.byRule` is keyed by the spelling the waiver used. This
  also makes the newer `TDDLIST_*` findings waivable for the first time —
  `qfai-implement/SKILL.md` and `references/execution-ledger.md` already
  instruct operators to waive `TDDLIST_EVIDENCE_STATUS_ONLY` under
  `TDDLIST-004`, which the old grammar made impossible.
- The shipped `.qfai/waivers.yml` example named `COMPAT-003`, which no validator
  emits; it now shows `TDDLIST_UNKNOWN_LEVEL`, a real waivable warning.
  `STATIC_RULE_SEVERITY` no longer pre-declares the never-emitted `COMPAT-*`,
  `CTYPE-*`, `DELTA-*` and `VFY-*` families, its remaining entries carry every
  spelling a waiver may use, and a severity actually observed in the run now
  outranks the static declaration instead of the reverse. `README.md` and
  `qfai-verify/SKILL.md` state which spelling to write.

### Changed

- The TDD coverage-level filter now recognizes the `L1`…`L5` codes the shipped
  `06_Test-Cases.md` template actually produces, not only the word spellings.
  Previously every `L*` value was unknown and therefore a coverage target, so
  `TDDLIST_TC_NOT_COVERED` demanded a ledger row for every test case including
  the integration/api/e2e layers. Projects whose specs use the code form will
  see those `TDDLIST_TC_NOT_COVERED` findings disappear for `L3`–`L5` rows and
  remain for `L1`/`L2` rows.
- `QFAI-REVIEW-001` (root `.gitignore` managed-block check) now also
  requires the `.qfai/state.json` entry. The file is per-runtime state
  (written by `qfai discussion use`, `qfai atdd scaffold` escalation
  counters, and future single-file state holders); its header already
  states "NOT committed configuration". Existing consumers whose root
  `.gitignore` was generated by an earlier `qfai init` will see
  `QFAI-REVIEW-001` re-fire on validator upgrade — recovery is to
  re-run `qfai init` (idempotent: `ensureRootGitignoreEntries` strips
  the existing QFAI managed block via `removeManagedBlock` and then
  appends the current `QFAI_GITIGNORE_BLOCK` verbatim, so the new
  `.qfai/state.json` entry lands alongside the current managed
  entries (legacy lines listed in `QFAI_GITIGNORE_LEGACY_LINES` are
  stripped in the same pass; see the migration contract constants
  in `core/gitignore.ts` and the `removeManagedBlock` /
  `ensureRootGitignoreEntries` writer in `cli/commands/init.ts`)
  in a single block rewrite. The init branch also writes the new
  entry on fresh repos.

## [1.9.2] - 2026-06-01

### Added (second-wave defect remediation)

- Cycle-0 screen-coverage skeletons: `qfai prototyping iterate --cycle 0 --emit-skeletons`
  (opt-in) emits one token-driven placeholder HTML per declared screen, styled from
  the root `DESIGN.md` tokens, so every screen has both screenshot and HTML evidence
  after convergence without hand-skeletoning. `--skeleton-mode full|placeholder|stub`
  tunes cycle-0 fidelity per run (default `placeholder`). Unflagged default behavior is
  unchanged.
- DESIGN.md patch zone: a front-matter `patch_zone:` block lists line ranges / token
  names that may be edited without invalidating prototyping evidence. In-zone edits
  update only a `patchHash`; out-of-zone edits invalidate as before.
- `prototyping.mode` discriminator: `qfai.config.yaml#prototyping.mode` and
  `qfai prototyping iterate --mode <convergence|exploration>` (CLI overrides config;
  default `convergence`). Exploration mode relaxes the axes-exceptional and
  design-compliance gates to warning; structural and license gates stay hard.
  `qfai prototyping certify` rejects exploration-mode iterations.
- Stale review-pack archival: `qfai doctor --clean` moves review directories older than
  a configurable TTL (default 14 days, `review.staleTtlDays`) to `.qfai/review/_archive/`;
  never deletes. `qfai doctor --autoremediate` installs declared skill runtime
  dependencies, runs the archive, and writes missing default config keys
  (`--yes` / `--dry-run`; off by default in CI).
- `qfai atdd scaffold --spec <spec>` bulk-generates one test skeleton per declared test
  case (with TODO markers and framework imports); idempotent. `qfai validate` warns with
  `D-SCAFFOLD-PLACEHOLDER` until the TODO is removed (escalates to error after 3 cycles,
  `atdd.scaffoldEscalateCycles`).
- Per-skill `manifest.json` declaring `runtimeDependencies`; `qfai doctor --profile <skill>`
  probes each declared dependency and reports the install command for missing ones.
- `## Default Autopilot Policy` section in every SKILL.md (auto-decide / ask-user /
  hard-required buckets), reducing avoidable confirmation prompts per session.
- Cross-skill `handoff.yaml` canonical schema (`packages/qfai/src/core/schemas/handoff.ts`,
  documented in `references/handoff.md`); `qfai handoff upgrade <legacy-file>` converts a
  legacy file and preserves original fields under `legacy:`.
- Envelope-deviation decision audit log under `.qfai/evidence/decisions/` (git-ignored);
  `qfai audit log` lists records with `--scope` / `--operator` / `--clause` filters and
  `--format table|json`.
- Evidence-mutation audit log at `.qfai/evidence/prototyping/mutation-log.jsonl`
  (git-ignored) recording destructive mutations to per-iteration evidence.
- Active discussion session pointer: `.qfai/state.json#discussion.currentId` as the source
  of truth; `qfai discussion list --active` prints it. Multiple-active ambiguity is rejected
  with a recovery command.
- `qfai validate --profile saas-package` lightweight verify profile (prototyping profile +
  design-system attestation + handoff schema; ATDD / implement gates skipped with info
  findings). `qfai prototyping certify --scope saas-package` seals with
  `scope: "saas-package"` and a `notes:` field; does not claim full DONE.
- New Reviewer-Gate finding codes (severity error, mandatory justification):
  `R-AUTOPILOT-POLICY-MISSING`, `R-HANDOFF-SCHEMA-DRIFT`, `R-EVIDENCE-MUTATION-UNLOGGED`,
  `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (warning), `R-PACK-LOCATION-DRIFT`, `R-SKILL-MANIFEST-DRIFT`,
  `R-EXPLORATION-CERTIFY-ATTEMPT`, `R-MOCK-HREF-DRIFT`.
- Pack-location CI lane: `scripts/check-pack-locations.mjs` (wired into `pnpm ci:lint`)
  rejects `review-*/` / `discussion-*/` directories outside `tmp/`, `.qfai/review/<ts>/`,
  `.qfai/discussion/<ts>/`.

### Changed (second-wave defect remediation)

- `qfai-discussion` HTML mock template emits anchor-form hrefs (`#name`) by default and
  SKILL.md instructs authors accordingly; the mock-href validator stays strict (anchor and
  external URLs PASS, same-origin absolute paths still rejected). Template and validator are
  a locked SSOT-sync pair.
- The primary-tasks audit names a recommended count band (3..7) in the UI contract template
  and guide; the audit profile accepts both string-only and structured
  `{ id, label, acceptance }` items.
- `/qfai-sdd` auto-populates `surface_type: ui-bearing` frontmatter for specs with a UI
  contract companion.
- Reference docs (`iteration-loop.md`, `generator-prompt.md`, `handoff.md`,
  `evidence-requirements.md`) and each SKILL.md are realigned to the implemented behavior.

### Deprecated (second-wave defect remediation)

- Legacy ad-hoc handoff files (`D-HANDOFF-LEGACY-FORMAT`), `surface_type`-absent specs with
  a UI contract (`D-SURFACE-TYPE-MISSING`), string-only primary-tasks items, and
  pre-mutation-log iterate emit are accepted during a one-minor deprecation window.
  Sunset is qfai 1.10.0, at which the deprecation findings escalate from warning to error
  and the legacy forms are no longer accepted. See
  `.qfai/assistant/process/migrations/1.9.2-second-wave-defect-remediation.md` for the
  per-capability migration and recovery steps.

## [1.9.1] - 2026-05-24

### Added (qfai-prototyping defect remediation — CHG-005)

- Capture / serve as opt-in iterate flags: `qfai prototyping iterate --capture`
  and `qfai prototyping iterate --auto-serve` re-introduce capture infrastructure
  as **opt-in only** (default OFF). Formally amends `DR-0012-0029` ("no PNG /
  HTML / interaction.json capture") via `DR-0012-0031`; default behavior
  unchanged. `--capture` ships with the default Playwright runner
  (`defaultCaptureScreen.ts`, dynamic `await import("playwright")` so Playwright
  stays in `optionalDependencies`; per-screen
  `viewport`/`deviceScaleFactor`/`waitUntil`/`htmlSourceCopy` contract).
  `--auto-serve` ships with the default in-process `node:http` server
  (`defaultServerRunner.ts`) — no subprocess, `server.close()` with a 2s
  SIGINT teardown bound, and EADDRINUSE on a foreign owner is refused
  (exit 2 with the offending PID + command-line surfaced) rather than
  killed. Operators that need subprocess-spawn semantics (tree-kill /
  `taskkill /F /T`) supply their own `options.serverRunner` via the DI
  escape hatch. A read-only `--check-convergence` peek path is also
  shipped (TDD-0497): reads `.qfai/evidence/prototyping/prototyping.json`,
  exits 0 when `stopReason === "axes-exceptional"` with
  `acceptedIterationIndex` set, exits 2 otherwise. (REQ-0109 / REQ-0110,
  AC-0012-0059..0060.)
- `prototyping.json` validate-conformant schema: `iterations[i]` MUST carry
  non-null `commitSha` (accepts `"uncommitted"` sentinel), non-empty
  `proseCritique`, `scores`, `layoutAntiPatternsDetected`, `designMdViolations`,
  `pivotDirective`, `reviewerId`, and `evidenceRefs[]` with
  `{kind:"screenshot"|"html", path:"iter-NN/<screen-id>.<ext>"}` for every
  declared `screens[].id`. On convergence: top-level `acceptedIterationIndex`
  (number|null) and `stopReason ∈ {"axes-exceptional","max-iterations","license-verify-fail","input-error"}`.
  (REQ-0111, AC-0012-0061.)
- Profile-suffixed validate output: `.qfai/report/validate-<profile>.json` per
  profile + always-latest `.qfai/report/validate.json` with explicit `profile`
  field. Legacy `.qfai/output/validate.json` accepted during the deprecation
  window with `D-DEPRECATED-PATH` warning; sunset at qfai 1.10.0.
  Post-sunset, the legacy file is no longer written and `D-DEPRECATED-PATH`
  escalates to error severity, but only when on-disk evidence of a legacy
  consumer is present (the stale legacy file exists) — clean projects that
  never used the legacy surface see no finding. `qfai prototyping certify`
  now reads `validate.json#profile` and refuses with the recovery command
  `qfai validate --profile prototyping --fail-on error` on mismatch.
  (REQ-0120, BR-0004-0025..0026.)
  **Upgrade impact**: consumers (CI scripts, agent prompts, dashboards)
  reading `.qfai/output/validate.json` must migrate to
  `.qfai/report/validate.json` (always-latest, carries `profile` field) or
  `.qfai/report/validate-<profile>.json` (per-profile, independent files)
  before upgrading past qfai 1.10.0. The legacy path is still written
  during the v1.9.x window; at 1.10.0 it stops being written and the
  finding escalates to error. Delete any stale `.qfai/output/validate.json`
  after migrating to silence the post-sunset finding.
- SSOT-sync pair-changed CI lane: new `scripts/check-prompt-scanner-pair.mjs`
  wired into `pnpm ci:lint`. Rejects PRs that edit only one half of the
  `findDesignMdViolations.ts` (scanner) ↔ `generator-prompt.md` (LLM contract)
  pair with `R-PROMPT-SCANNER-DRIFT` (3-part justification: modified file,
  un-paired counterpart, unmatched clause). Both-changed and neither-changed
  PRs pass silently. (REQ-0102, BR-0004-0027..0028.)
- `qfai doctor` probe rebuild: `node_modules/.bin/playwright` (with Windows
  `.cmd`/`.bat`/`.ps1` variants) is the primary launcher candidate;
  `npx --no-install playwright --version` fallback; `playwright-cli`
  accepted-with-warning during the deprecation window (sunset 1.10.0).
  Failure-mode error text includes the install hint `npm i -D playwright`.
  `skills.integrity` default severity downgraded to `warning`; doctor summary
  groups findings into "errors blocking the active profile" vs
  "advisory findings (drift, non-blocking by default)". (REQ-0107 / REQ-0122,
  AC-0006-0010..0014.)
  **Upgrade impact**: pipelines using `qfai doctor --fail-on error` will no
  longer fail on `skills.integrity` drift (the severity now defaults to
  `warning`). Use `--fail-on warning` to preserve the old gate, or accept the
  new advisory semantics. The skills-integrity check itself is unchanged —
  only its severity classification.
- Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` (severity error) emitted when a
  future PR wires `certify` to read validator output requiring `/qfai-atdd`
  or `/qfai-implement` artifacts at the prototyping phase. Resolution path:
  `verify.json#scope: "prototyping" | "full" | "atdd"` discriminator;
  `certify --check` accepts `scope: "prototyping"` as the phase-gate condition.
  (REQ-0112 / REQ-0113, DR-0001-0004, BR-0015-0008.)
- Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` (severity error) emitted on
  asymmetric modification of the
  `findDesignMdViolations.ts` ↔ `generator-prompt.md` SSOT-sync pair.
  Backed by a new `pnpm ci:lint` lane. Justification: 3-part required
  text naming (a) modified file path, (b) un-paired counterpart path,
  (c) unmatched contract clause. `qfai validate` rejects empty / whitespace-only
  justifications as advisory-failing errors. (REQ-0102 / REQ-0125,
  BR-0004-0027..0028, BR-0015-0009.)
- Tailwind ↔ DESIGN.md scanner contract: hybrid β (preflight literal allowlist
  for the 5 sentinels `#fff`, `#9ca3af`, `#e5e7eb`, `rgb(59 130 246 / 0.5)`,
  `--tw-ring-*`) + γ (scanner gate scope narrowed to `<body>`-only) per
  `DR-0001-0001`. `--*-shadow*:` custom-property declarations stripped per
  `DR-0001-0002`. CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`,
  `currentColor`) accepted by all 4 scanners. `scanFonts` / `scanRadius` /
  `scanShadow` import `unwrapVarReference` consistently with `scanColors`.
  (REQ-0101 / REQ-0103..0105, AC-0012-0053..0056.)
- CJK-aware `proseCritique` length validation: Intl.Segmenter (`word`
  granularity) primary with OR-fallback (`200..500 words OR 600..2500 chars`)
  per `DR-0001-0003`. Japanese-only 800–1500-char fixtures pass without
  regression to English 200–500-word fixture acceptance. (REQ-0106,
  AC-0012-0057.)
- Iterate ergonomics: `--cycle 0 --force` moves prior `iter-00/` to a
  timestamped backup (`iter-00.backup-<ISO>/`) before
  `clearEvidenceIterDirs` runs; non-converged cycle prints a top-3
  blocking-cause summary; md5-based duplicate-capture detection
  (`lap-009`, advisory-failing) + missing-route detection
  (`lap-010`, advisory-failing). (REQ-0117 / REQ-0118 / REQ-0121.)
- SDD UI contract template carries a `primary_tasks` slot per `screens[]`
  entry (shipped pre-populated with one example entry so the sample passes
  its own validate); `requirements-analyst` agent guide instructs ≥ 1
  primary_task per screen. QFAI-AUD-001 aligned validate lane uses a
  2-stage emission to distinguish slot-absent (legacy) contracts from
  slot-empty (intentional violation) contracts: key-absent → severity=info
  (non-blocking) under a one-minor-release deprecation window
  (sunset: qfai 1.10.0); key-empty (`primary_tasks: []`) → severity=error
  (blocking, intentional violation). All QFAI-AUD-001 findings name the
  offending file path, the screen id, and the rule token in a single
  user-facing message. (REQ-0115 / REQ-0117, AC-0013-0018.)
  **Upgrade impact**: consuming projects whose UI contracts predate v1.9.1
  do not carry the `primary_tasks` slot. On upgrade, `qfai validate` will
  surface QFAI-AUD-001 at severity=info (non-blocking) for each affected
  screen during the deprecation window, with a remediation message naming
  the sunset version. Recovery before sunset: add a `primary_tasks` slot
  (with at least one task) to each screen contract; at qfai 1.10.0 the
  slot becomes required and missing slots will block.
- Multi-spec posture: `/qfai-prototyping` SKILL.md realigned to single-spec
  per `DR-0001-0005` (option A); `resolveSurfaceUnion()` retained as an
  internal helper for validators / `show-spec` only. Full per-spec layout
  migration deferred. (REQ-0114.)
- Screen-id casing normalized to underscore end-to-end (iterate emit ↔
  validator expectation ↔ aggregate-dir filename ↔ `screens[].id`) per
  `DR-0001-0007`. Aggregate-dir mirror on convergence:
  `.qfai/evidence/prototyping/screenshots/<screen-id>.png` +
  `html/<screen-id>.html`. (REQ-0116.)
- One-minor-release deprecation window (`OC-60`) for all path / probe /
  schema changes; sunset = qfai 1.10.0. Migration memo
  `.qfai/assistant/process/migrations/v1.9.1-prototyping-defect-remediation.md`
  (immutable per `OC-61`). (REQ-0126 / REQ-0127.)

### Changed (CHG-005)

- spec-0012 `DR-0012-0031` formally amends `DR-0012-0029` ("no capture")
  by introducing opt-in `--capture` / `--auto-serve` flags. Inner-loop
  reviewer-driven Playwright posture from `DR-0012-0027` / `DR-0012-0029`
  preserved as the default.
- `_policies/05_Contracts.md` Contract Index gains `CLI-DOC` (new) and
  `CLI-PITER` (new); `CLI-PROT` / `CLI-VAL` / `DCON-005` updated.
- `_policies/06_Glossary.md` gains 9 finding-code / contract terms.
- `_policies/07_Constraints.md` gains `OC-60` / `OC-61` / `OC-62`.
- `_policies/08_Decisions.md` gains `DR-0001-0001..0009` resolving
  9 deferred OQs (OQ-0103/0104/0105/0107/0108/0109/0110/0111/0112).

## [1.9.0] - 2026-05-23

### Added (assistant-layer recut + steering work-log surface — CHG-003)

- 4-layer assistant-tree: `.qfai/assistant/{constitution,manifest,catalog,process}/`
  replaces the legacy single-layer `.qfai/assistant/steering/`. `qfai init`
  seeds the new layout; `qfai init --upgrade-assistant-tree` migrates
  existing projects (REQ-0018..0023 in spec-0003).
- Project-root `.qfai/steering/` repurposed as the AI work-log surface
  (entries with `kind: decision | risk | blocker | scope-down | …`).
  Skill bodies are the writers; `qfai validate` enforces frontmatter
  schema (`W-WORKLOG-SCHEMA`), link integrity (`W-WORKLOG-BROKEN-LINK`),
  staleness (`W-WORKLOG-STALE` at 90 days), and decision-promotion gate
  (`W-PENDING-PROMOTION`).
- Reviewer-Gate drift findings: `R-WORKLOG-DRIFT`, `R-REJECTED-READOPT`,
  `R-HANDOFF-INCOMPLETE` — finding-code implementation owned by
  spec-0004 (REQ-0036 / REQ-0042) and reviewer-input-bundle / R-\*
  schema obligation owned by spec-0015 CHG-003 (see
  `.qfai/specs/spec-0015/09_delta.md` "CHG-003" block and
  `.qfai/contracts/cli/qfai-validate.md` "New finding codes" table
  for per-code Source REQ mapping). Reviewer reports MUST carry
  non-empty `justification:` on these findings; empty values are
  rejected (advisory-failing).
- `assistantPaths.ts` SSOT module (`packages/qfai/src/core/paths/`)
  produces every distributed assistant-tree path string (REQ-0022 in
  spec-0003); hard-coded literals in `path.join(...)` position are
  lint-rejected by the SSOT import test in
  `tests/integration/initSpec0003.test.ts`.
- Migration memo authored at
  `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md`
  by `qfai init --upgrade-assistant-tree`; commit-immutable per OC-53.
  Sunset version inside the memo is computed via
  `nextMinorVersion(resolveToolVersion())` so no future-version
  literal ships in `dist/`.
- New validators wired into the SDD profile:
  `validateWorklogSurface`, `validateAssistantTreeMigration`,
  `validateSkillDocReferences`, `validateReviewerJustification`.
  Implementations under `packages/qfai/src/core/validators/`.
- New `--upgrade-assistant-tree` flag plumbed through `parseArgs`,
  `runInit` → `runUpgradeAssistantTree`. Legacy steering content is
  re-located into the appropriate new layer via
  `classifyLegacySteeringEntry`; existing files at the destination are
  preserved with a `W-USER-EDIT-PRESERVED` informational note.
- `W-USER-EDIT-PRESERVED` informational pass-through emitted by the
  migration helper and recognized by `qfai validate` as info-only.
- ATDD coverage closure for spec-0012 TC-0012-0396..0432 (PR #208
  late-review waves 11..50) appended to
  `tests/integration/qfai-traceability.md`.
- TC-0012-0416 / TDD-0436 cycle-9 idempotency regression test landed in
  `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`.

### Changed

- `.codex/README.md` and `.github/copilot-instructions.md` now reference
  the cross-AI rules under `.agents/rules/` (closing pre-existing
  drift caught by `agentsRulesSurface.test.ts`).
- spec-0003 / spec-0004 per-spec SDD pass: REQ-0018..0023 (spec-0003)
  and REQ-0034..0044 (spec-0004 — renumbered from initial REQ-0023..
  0033 draft in wave-7 ce5a6613 to preserve pre-existing AC/TC refs
  to REQ-0023..0031) fanned out into US/AC/BR/EX/TC, then
  TDD-0021..0026 (spec-0003) and TDD-0015..0025 (spec-0004) landed
  with full RED→GREEN evidence in `tdd/test-list.md`.

### Deprecated

- Legacy `.qfai/assistant/steering/` layout is read-compatible for the
  current minor release window only. `qfai validate` emits
  `D-DEPRECATED-PATH` whose body literally contains `sunset: vX.Y.Z`
  computed via `nextMinorVersion(resolveToolVersion())` (resolves to
  `sunset: v1.10.0` on this release). The same condition escalates
  to error from `v1.10.0+`.
- `W-SKILL-DOC-BROKEN-REF` (`qfai-*` SKILL.md referencing a legacy
  `.qfai/assistant/{instructions,steering}/<file>` path) follows the
  same escalation timeline: warning during the v1.9.x window, error
  from `v1.10.0+`. The headline shape branches with severity
  ("Read-compatible only..." pre-sunset; "past the announced
  sunset..." post-sunset) so consumers can disambiguate which mode
  fired. User-defined (non-`qfai-*`) skills are NOT flagged.

## [1.8.10] - 2026-05-19

### BREAKING CHANGES (PR #208 — `qfai prototyping show-spec` JSON schema reshape)

- **`qfai prototyping show-spec` JSON payload was reshaped** in the
  12th late-review wave (codex r3265482150). The pre-wave payload
  emitted three top-level keys (`specId`, `specMdPath`, `source`)
  resolved from the live primary spec; the new payload emits
  `{ frozenSpecsCovered, frozenSurfaceUnion, liveUiBearing, primary? }`
  where the pre-wave triple has been demoted to the optional `primary`
  block and `frozenSpecsCovered` / `frozenSurfaceUnion` / `liveUiBearing`
  are new top-level fields surfaced for drift visibility. Pinned-branch
  authorization ships this under v1.8.10 (codex r3265949051 /
  r3265954849 13th-wave Fix promoted the schema reshape from a buried
  `### Fixed` bullet to its own BREAKING block).
  - Migration (operator tooling): replace `show-spec | jq '.specId'`
    with `show-spec | jq '.primary.specId'`; the same one-liner applies
    to `.specMdPath` → `.primary.specMdPath` and `.source` → `.primary.source`.
    The `primary` block is itself optional (absent when no primary spec
    resolves), so robust callers should guard with `// empty` or `?`.
    The new top-level keys are SSOT-pinned in
    `.qfai/contracts/cli/qfai-prototyping.md#qfai prototyping show-spec`.
  - Intra-PR migration follow-up (waves 15 + 16, within v1.8.10): the
    `liveUiBearing` field also evolved within this PR — wave-15
    switched the resolver to `resolveSurfaceUnion` (the same resolver
    iterate's drift gate uses, so live scope is apples-to-apples with
    enforcement) and wave-16 aligned the documented schema with the
    actual emitted type (`string[]` of bare spec IDs, not `SpecRef[]`).
    Per-spec metadata is now solely available via the optional
    `primary` block. Operator tooling that grepped `show-spec | jq
'.liveUiBearing[].specId'` MUST migrate to `show-spec | jq
'.liveUiBearing[]'` (or `show-spec | jq '.primary.specId'` when
    only the primary spec is needed). See the
    `### Fixed (PR #208 16th late-review wave)` entry below for the
    underlying alignment commit; this sub-bullet exists to keep the
    BREAKING block self-contained.
  - Precondition change: `show-spec` now hard-requires a seeded
    `prototyping.json` and exits 2 when the file is missing or
    malformed. Operators who previously ran `show-spec` _before_
    `iterate --cycle 0` to plan the run must now seed via cycle 0
    first; this is the contracted precondition for reading the
    cycle-0 frozen `frozenSpecsCovered[]`.

### BREAKING CHANGES (PR #208 — ImageSource attribution required)

- **`ImageSource.attribution` is now read at the runtime license gate.**
  Prior to the 12th late-review wave, `licenseVerify` did not validate
  attribution at all; the field was deferred to the handoff stage. The
  CLI contract's exit-66 class always listed "missing attribution"
  among the rejection conditions, so unattributed stock photos that
  satisfied the source/license/host gates passed iterate silently and
  only surfaced at certify time. The runtime now emits
  `{code: "license-missing-attribution", source, url}` whenever
  `attribution` is undefined or an empty string, exiting 66 alongside
  the other license-class rejections.
  - The `ImageSource` type carries `attribution?: string` (optional at
    the type level so existing fixtures continue to compile). The
    runtime gate enforces non-empty.
  - `collectImageSources` promotes a missing / non-string attribution
    to `""` (rather than treating it as an input-shape error → exit 2)
    so the rejection lands in the license-class (exit 66) per the
    contract.
  - Migration: any consumer constructing `ImageSource` values directly
    must now populate `attribution`; otherwise `licenseVerify` returns
    a `license-missing-attribution` error. The behavior is intentional
    — entries that previously slipped through the iterate gate
    unattributed will now be caught at iterate time rather than at
    certify time. No auto-migration shim; offending entries surface a
    structured error per affected URL.
  - Pinned-branch authorization is preserved: this lands in 1.8.10
    because `feature/v1.8.10` is the release pin.

### Fixed (PR #208 50th late-review wave)

- **`hasMatchingUiContract` file-vs-directory discrimination (codex
  r3271969283, P2 — chatgpt-codex-connector):** the direct-match
  arm in `core/prototyping/specResolution.ts` used
  `access(<uiDir>/<specId>.yaml)` to confirm existence, but
  `access` does NOT distinguish a file from a directory. A
  misauthored project with `<contractsDir>/ui/0007.yaml/` as a
  directory would have made `hasMatchingUiContract()` return
  `true`, falsely classifying spec-0007 as UI-bearing and driving
  `resolveSurfaceUnion()` / `resolvePrimaryPrototypingSpec()` to
  report a phantom UI surface — `prototyping iterate` / drift
  gates would then run against that phantom instead of taking the
  documented no-op path. Switched to `stat().isFile()`, consistent
  with the entries-walk branch's `entry.isFile()` filter for the
  spec-prefixed / ui-prefixed candidates. Removed the now-unused
  `access` import. New TC-0012-0432 + TDD-0452 + EX-0012-0161 —
  fixture creates a directory named like a UI-contract file at
  the canonical path and asserts `resolveAllUiBearingSpecs()`
  returns `[]`.

### Fixed (PR #208 49th late-review wave)

- **Partner-helper regression test (codex r3271867391, P1 —
  implementation-reviewer + codex r3271867923 MAJOR — qa-gatekeeper,
  same finding):** wave-48 fixed `readUiContractScreenContracts`
  (`path.join` → `path.resolve`) for partner-helper consistency
  with the wave-47 `readPerSpecScreens` fix, but did not add a
  regression test. The two helpers have the SAME responsibility on
  the certify path, so without a structural symmetry test a future
  `path.join` regression in the project-wide reader would silently
  break certify on explicit-contracts-dir workflows (project-wide
  pass returns empty while per-spec returns full set → asymmetric
  screen discovery). New TC-0012-0431 + TDD-0451 + EX-0012-0160
  pin the symmetry directly via the exported
  `readUiContractScreenContracts` API — fixture writes a
  project-wide `screens.yaml` at an absolute `contractsDir`
  outside `root` and asserts the reader returns both declared
  screens. AC anchor: AC-0012-0047 (same as TC-0012-0430 so the
  partner-helper pair shares the AC binding). r3271868724 PASS
  NIT (requirements-reviewer OQ-0012-0012 well-formedness audit)
  closed without action.

### Fixed (PR #208 48th late-review wave)

- **`readUiContractScreenContracts` absolute-path fix (codex
  r3271787723, P1 — architecture-reviewer):** partner to wave-47's
  `readPerSpecScreens` fix. The project-wide screen reader in
  `core/contracts/screenContracts.ts` used the same
  `path.join(root, contractsDirRelative, "ui")` pattern, so an
  absolute `paths.contractsDir` override would have made the
  project-wide pass produce different discovery results than the
  per-spec pass after wave-47 — a least-astonishment / SoC
  violation between two helpers with the same responsibility.
  Switched to `path.resolve()`.
- **Systematic audit deferred follow-up (codex r3271787723, P1
  architectural concern — deferred):** the same review thread
  flagged ~11 other `path.join(root, config.paths.*, ...)` call
  sites with the same bug class (lockAbs in iterate / certify,
  `doctor.ts`, `validators/bpApDb.ts`,
  `validators/designAudit.ts`,
  `validators/designContractReadiness.ts`,
  `validators/designToken.ts`,
  `validators/uiDefinitionConsistency.ts`). Several run only
  during validate-time gates, not the prototyping loop. Deferred
  to a focused follow-up PR per the reviewer's "scope-out +
  explicit follow-up record" option. New OQ-0012-0012
  registered with the full call-site list, due 2026-06-30,
  recommending helper consolidation
  (`resolveContractsDir(root, config)` / `resolveSpecsDir(root, config)`)
  - a lint rule (`no-restricted-syntax` on the offending
    pattern) so the regression cannot reappear.

### Fixed (PR #208 47th late-review wave)

- **`readPerSpecScreens` absolute-path fix (codex r3271715563, P1 —
  chatgpt-codex-connector):** the helper built
  `uiDir = path.join(root, contractsDirRelative, "ui")`. When
  `qfai.config.yaml` carries an absolute `paths.contractsDir`
  override (e.g. `/abs/contracts`), `path.join` concatenates root +
  absolute rather than resetting, so the probe at
  `<root>/abs/contracts/ui` misses every per-spec contract file at
  the real `/abs/contracts/ui/spec-NNNN.yaml`. The helper returned
  `null` and certify's per-(spec × screen) gate silently fell back
  to the project-wide screen list, enforcing the wrong
  `(spec, screen)` coverage for explicit-contracts-dir workflows.
  Switched to `path.resolve()` which correctly resets to the
  latter absolute segment when one is supplied. Same pattern as
  the wave-45 `specDirExists` fix for `paths.specsDir`. New
  TC-0012-0430 + TDD-0450 + EX-0012-0159 — fixture writes the
  per-spec UI contract at an absolute `contractsDir` pointing
  OUTSIDE root and asserts `readPerSpecScreens()` returns the
  declared screens rather than `null`.
- **Cross-platform absolute-path narrative (codex r3271709884,
  MINOR — requirements-reviewer):** the wave-45 EX-0012-0158 /
  TC-0012-0429 narratives said only "ABSOLUTE path" without
  explicitly noting cross-platform coverage. Both now explicitly
  note the contract holds for POSIX (`/abs/...`), Windows
  drive-letter (`C:\...`), and UNC (`\\host\share\...`) absolute
  paths; the OS-native `mkdtemp` fixture exercises whichever
  absolute shape the CI matrix lane's OS produces (Node's
  `path.resolve` is platform-aware and treats either as absolute).

### Fixed (PR #208 46th late-review wave)

- **TC-0012-0429 fixture dead-key cleanup (codex r3271708081, MINOR
  — requirements-reviewer + r3271706477 / r3271707791 NIT — same
  finding):** the wave-45 fixture passed `specsDirOverride: "<abs>"`
  to `seedSimpleConfig.extra[]`, which inserted an unknown YAML key
  into the test `qfai.config.yaml`. The qfai.config schema has no
  `specsDirOverride` field (the canonical key is `paths.specsDir`);
  `loadConfig` ignored it, and the actual override flowed through a
  subsequent string-replace step. The dead key risked misleading
  future readers and could trip a future strict-unknown schema
  validator. Removed the line and added a comment documenting that
  the override is performed via the canonical `paths.specsDir`
  patch only.

### Fixed (PR #208 45th late-review wave)

- **`specDirExists` absolute-path fix (codex r3271656121, P1 —
  chatgpt-codex-connector):** `specDirExists()` in
  `core/prototyping/specResolution.ts` built the probe path with
  `path.join(root, specsDir, dirName)`. When `qfai.config.yaml`
  carries an absolute `paths.specsDir` override (e.g. `/tmp/specs`),
  `path.join` silently concatenates root + absolute rather than
  resetting to the absolute, so the probe at
  `<root>/tmp/specs/spec-NNNN` misses the real on-disk spec dir at
  `/tmp/specs/spec-NNNN`. `resolveSurfaceUnion()` then drops the
  `prototyping.primarySpecId` pin and `prototyping iterate
--cycle 0` hits the zero-UI short-circuit (exit 0) for
  explicit-primary workflows using absolute path overrides.
  Switched to `path.resolve()` which correctly resets to the
  latter absolute segment when one is supplied (relative
  `specsDir` still composes against `root` the same way
  `path.join` did). New TC-0012-0429 + TDD-0449 + EX-0012-0158 —
  fixture writes an absolute `specsDir` pointing OUTSIDE root,
  seeds the primary spec there, and asserts
  `resolveSurfaceUnion(root, config)` returns the pinned id.

### Fixed (PR #208 44th late-review wave)

- **show-spec stderr 2-block layout (codex r3271639132, NIT —
  product-surface-reviewer):** the wave-43 stderr re-narrowing
  produced a 3-segment single sentence that buried the operator-
  actionable CTA inside a long claim → narrowing → recovery chain on
  narrow terminals. Restructured to the 2-block layout the
  iterate-side `frozenSurfaceUnion missing` diagnostic uses
  (introduced wave-24 for the same scan-readability parity): CTA
  headline + blank separator + indented `Reason:` block. CTA
  `Re-run qfai prototyping iterate --cycle 0` now leads; the
  rationale (certify hard-error symmetry + iterate-side
  separate-mechanism note) follows on the `Reason:` line. No
  behaviour change; runtime-string layout only. Existing
  TC-0012-0428 substring assertion still passes (loose `"present"`
  - `"malformed"` match).

### Fixed (PR #208 43rd late-review wave)

- **show-spec runtime stderr surface-scope narrowing (codex
  r3271608582, MINOR — requirements-reviewer):** the wave-38
  `error(...)` runtime string emitted by `runPrototypingShowSpec`
  on the malformed branch still carried the "iterate / certify
  both treat a malformed multi-spec frozen scope as a hard error"
  over-claim, even though wave-41 / 42 corrected the same wording
  in AC-0012-0052 / EX-0012-0157 / show-spec JSDoc. Operator-visible
  stderr is the most-exposed SSOT surface — re-narrowed to
  acknowledge that iterate-side handles present-but-malformed
  `frozenSpecsCovered` via a different mechanism (legacy
  `specsCovered` reader + `frozenSurfaceUnion` drift gate),
  matching the rhetorical anchor of the spec-side / JSDoc fixes.
  No code-path / behavior change; runtime-string only.

### Fixed (PR #208 42nd late-review wave)

- **AC-0012-0052 wording correction — surface-scope alignment
  (codex r3271136886, MINOR — architecture-reviewer):** the
  wave-40 AC-0012-0052 sub-clause carried the same "iterate and
  certify both treat the same input as a hard error" over-claim
  that wave-41 already corrected in EX-0012-0157 and the
  `prototypingCertify.ts` show-spec JSDoc. AC and JSDoc are now
  consistent: certify treats the same input as a hard error per
  class (h); iterate-side handles present-but-malformed
  `frozenSpecsCovered` via the legacy `specsCovered` reader +
  `frozenSurfaceUnion` drift gate (a different mechanism), so the
  cross-surface symmetry the absent-vs-malformed contract
  enforces is certify ↔ show-spec, not all three commands.
  AC-0012-0052 sub-clause also condensed to fit the markdownlint
  MD013 line-length budget.

### Fixed (PR #208 41st late-review wave)

- **EX-0012-0157 surface-scope narrowing (codex r3271095022, MINOR —
  requirements-reviewer):** the wave-38 EX-0012-0157 Then clause
  claimed "iterate / certify both treat a present-but-malformed
  `frozenSpecsCovered` as a hard error", but iterate-side
  present-but-malformed is handled via the legacy `specsCovered`
  reader + `frozenSurfaceUnion` drift gate — NOT the SSOT
  classifier path that certify / show-spec share. The wave-40
  JSDoc rewording acknowledged this surface split but EX-0012-0157
  still carried the overstated cross-command claim, creating an
  Example ⇄ AC drift (no iterate-side AC anchor exists). Rewrote
  the Then clause to cite AC-0012-0045 class (h) (certify) and
  AC-0012-0052 (show-spec) directly and note that iterate-side
  handles the same input via a different mechanism. No code or
  test change.

### Fixed (PR #208 40th late-review wave)

- **JSDoc orphan re-fix (codex r3271087212, NIT —
  architecture-reviewer):** the wave-38 `CANONICAL_SPEC_DIR`
  insertion orphaned the existing `hasPerSpecSubdir` JSDoc (TSDoc
  binds only the last JSDoc to the next declaration — the same
  hazard waves 32 / 35 already fixed on `normalizeSpecDirName`).
  Reordered so `CANONICAL_SPEC_DIR` const + JSDoc precede
  `hasPerSpecSubdir` and the function's own JSDoc sits adjacent.
- **TC-0012-0427 AC-Ref rebind (codex r3271092532, MINOR —
  requirements-reviewer):** the regression test pins certify-side
  per-spec presence aggregation, not iter-dir layout regulation.
  AC-Ref rebound from AC-0012-0046 (per-spec iter-dir namespacing)
  to AC-0012-0047 (certify aggregates per-spec presence) across
  06_Test-Cases.md / 16_Traceability-ledger.md / tdd/test-list.md.
- **AC-0012-0052 sub-clause + TC-0012-0428 AC-Ref rebind (codex
  r3271093350, MINOR — requirements-reviewer):** AC-0012-0052
  (show-spec JSON payload contract) now carries a sub-clause
  mirroring AC-0012-0045 class (h) onto the show-spec surface, so
  the absent-vs-malformed discrimination contract holds across all
  three CLI surfaces. TC-0012-0428 AC-Ref rebound from
  AC-0012-0045 to AC-0012-0052.
- **show-spec scope-narrowing JSDoc rewording (codex r3271093206,
  FYI — architecture-reviewer):** the wave-38 motivation rhetoric
  ("iterate / certify both treat the same input as a hard error")
  overstated iterate's semantic. iterate handles present-but-
  malformed `frozenSpecsCovered` via the legacy `specsCovered`
  reader + `frozenSurfaceUnion` drift gate, not the SSOT
  classifier. JSDoc reworded to acknowledge the surface split.
- **r3271007632 closure attribution moved to wave-37 (codex
  r3271094169, MINOR — requirements-reviewer):** the
  `null`/`undefined` enumeration backfill landed in wave-37
  (`ef013528`), not wave-38. 09_delta closure attribution moved
  to the correct entry; wave-38 header recount adjusted to 5
  threads.

### Fixed (PR #208 39th late-review wave)

- **EX-0012-0154 / EX-0012-0155 BDD structure (codex r3271039452,
  MAJOR — requirements-reviewer):** the 32nd-wave EX-0012-0154 was
  missing the When / Then clauses, and the 33rd-wave EX-0012-0155
  had two duplicated When / Then pairs that mixed in EX-0012-0154's
  responsibility (path-traversal defence). Restructured both to
  canonical Given / When / Then format: EX-0012-0154 now carries
  the path-traversal When/Then (`reads the record and validates
each entry against CANONICAL_SPEC_ID`, `exits 2 with the
malformed id echoed verbatim`); EX-0012-0155 carries only the
  absent-vs-malformed discrimination When/Then.
- **EX-0012-0155 enumeration drift (codex r3271037888, MINOR —
  requirements-reviewer):** the wave-37 enumeration backfill
  extended the AC + CLI contract classes (h) with `explicit null /
undefined` but did not cascade into EX-0012-0155's Given clause.
  Example layer was still showing the wave-33 4-classes shape, so
  TC-0012-0426 (which now covers 5 classes via the `explicit null`
  it.each row) was no longer SSOT-aligned with its EX-Ref. Extended
  EX-0012-0155 Given with the 5th class and the Then clause with
  the corresponding `value is null` / `value is undefined`
  rejection reasons.
- **"no user prompt is emitted" scope restoration (codex
  r3271039011, MINOR — requirements-reviewer):** the wave-37
  AC-0012-0045 restructure lifted the ordering invariant out of
  class (h) but left `AND no user prompt is emitted.` as an
  indented continuation of class (h)'s Then block. Original
  CHG-002 intent was a cross-class postcondition binding all of
  (a)-(h). Lifted to its own catalog-level bullet with explicit
  "applies cross-class to (a)-(h)" wording so a grep of
  AC-0012-0045 cannot misread it as class-(h)-specific.

### Fixed (PR #208 38th late-review wave)

- **show-spec fail-closed on malformed `frozenSpecsCovered` (codex
  r3271018000, P2 — chatgpt-codex-connector):** `runPrototypingShowSpec`
  previously read `frozenSpecsCovered` via
  `readStringArrayField(...) ?? readStringArrayField(specsCovered)`,
  collapsing "field absent" and "field present-but-invalid" into one
  null fallback. A hand-edited multi-spec record with a malformed
  `frozenSpecsCovered` would silently downgrade the reported scope
  to the legacy `specsCovered` field, misleading operators /
  automation making recovery decisions because iterate / certify
  both treat the same input as a hard error. show-spec now consumes
  the SSOT classifier `classifyFrozenSpecsCoveredMultiSpec()` and
  exits 2 with a "present but malformed" diagnostic on the
  malformed branch — only `absent` (key omitted) still legitimately
  falls back to legacy `specsCovered`.
- **`hasPerSpecSubdir` restricted to canonical `spec-\d{4}` dirs
  (codex r3271018003, P2 — chatgpt-codex-connector):** the per-spec
  layout probe activated the per-(spec × screen) gate on any
  iteration directory whose name started with `spec-`. An incidental
  sibling like `spec-assets/`, `spec-temp/`, or `spec-archive/` in a
  legacy flat-iter project would spuriously activate the gate and
  fail with missing review-json coverage the run never intended to
  produce. The probe now requires an anchored
  `^spec-\d{4}$` match so gate activation only fires on canonical
  per-spec evidence directories.
- **Wave-35 P1 traceability stitch (codex r3271008259 MINOR —
  qa-gatekeeper + codex r3271011545 MAJOR — requirements-reviewer):**
  the wave-35 `indexPerSpecScreens()` removal closed the partial-set
  bug but shipped without a registered TC / TDD / EX anchor. Added
  `TC-0012-0427` + `TDD-0447` + `EX-0012-0156` with a regression
  test pinning the contract: multi-file subdir layout where two
  specs share a `screenId` and one spec carries a unique screen
  forces certify to enumerate the FULL per-spec union via
  `readPerSpecScreens()` (the partial indexed re-parse would let
  a missing shared-screenId review.json pass silently). AC anchor:
  AC-0012-0046 (per-spec iter-dir namespacing).
- **TDD-0444 wave-label cascade (codex r3271013103 MINOR —
  requirements-reviewer):** the wave-35 `29th-wave Fix` →
  `30th-wave Fix` comment correction in
  `prototypingIterate.ts:1298` was not cascaded into the
  `tdd/test-list.md` and `16_Traceability-ledger.md` TDD-0444
  narratives, which still read "29th late-review wave" /
  "29th-wave". Both narratives now read "30th late-review wave" /
  "30th-wave" so all four artifacts pinning codex r3270687650 P1
  (iterate src comment, TC narrative, test-list, ledger) carry a
  consistent wave label.

### Fixed (PR #208 37th late-review wave)

- **Wave-36 enumeration backfill (codex r3271006127, MINOR —
  chatgpt-codex-connector):** wave-34 introduced operator-facing
  enumerations of the present-but-malformed sub-classes in both the
  CLI contract certify exit-2 row and AC-0012-0045 class (h)
  (`non-array, empty array, non-string entry, empty-string entry`).
  Wave-36 extended the classifier to also classify explicit `null` /
  `undefined` on a present key as `malformed`, but did not update
  those enumerations. An operator hand-editing
  `"frozenSpecsCovered": null` would see a
  `present but malformed (value is null)` diagnostic that did not
  match any class enumerated in the SSOT. Both the contract row and
  AC class (h) now list `null` / `undefined` alongside the four
  existing sub-classes.
- **AC-0012-0045 ordering invariant restructured (codex r3271006396,
  MINOR — requirements-reviewer):** the 34th-wave ordering invariant
  was added as a continuation of class (h)'s Then block via
  `AND no user prompt is emitted, AND **(ordering invariant ...)**`,
  which could be misread as a class-(h)-specific postcondition. The
  clause is actually a cross-class scheduling rule applying to the
  full hard-stop catalog (a)-(h). Lifted to its own bullet at the AC
  catalog level (sibling of When / Then) with an explicit "applies
  cross-class to (a)-(h); not a postcondition of any single class"
  note so a future `shouldStop`-first regression can cite a single
  AC bullet rather than chase the clause inside a class continuation.

### Fixed (PR #208 36th late-review wave)

- **Classifier explicit-null tightening (codex r3270923641, P1 —
  chatgpt-codex-connector):** wave-33's
  `classifyFrozenSpecsCoveredMultiSpec()` returned
  `kind: "absent"` when `prototyping.json#frozenSpecsCovered` was
  explicitly `null` (or `undefined`) on a present key, which on the
  certify side triggered the legacy fallback to single-spec
  `specsCovered` — re-opening the same evidence-gap vector wave-33
  had closed. A hand-edited `"frozenSpecsCovered": null` is a
  corrupt edit, not a "field omitted" record. The classifier now
  returns `kind: "malformed"` with reason `"value is null"` (or
  `"value is undefined"`) so certify fails closed instead of
  silently downgrading to primary-spec scope. New `it.each`
  integration row for explicit-null at the certify call site;
  unit suite extended with 2 new malformed-branch `it` blocks
  (removed the previous "absent when null/undefined" branch).

### Fixed (PR #208 35th late-review wave)

- **Per-spec screens partial-set bug (codex r3270911400, P1 —
  chatgpt-codex-connector):** the wave-9 `indexPerSpecScreens()`
  optimisation pre-built a per-spec map from project-wide
  `screenContracts.sourceRef` and used it whenever the indexed entry
  was non-empty, only falling back to `readPerSpecScreens()` on
  missing/empty. For multi-file subdir layouts (`spec-NNNN/<sub>.yaml`)
  where some screens shared `screenId` with another spec, project-wide
  dedup left only the surviving sourceRef paths in the bucket —
  partial files in the indexed re-parse, and the per-(spec × screen)
  gate falsely passed without requiring `<spec>/<shared-screen>.review.json`.
  Removed the index optimisation entirely; certify now calls
  `readPerSpecScreens()` unconditionally for every spec in the
  frozen set (the helper does its own authoritative `fg()` discovery).
  `indexPerSpecScreens` / `chooseWinningFiles` /
  `extractSpecDirFromUiRel` helpers removed (only the indexing
  pathway used them).
- **JSDoc orphan on `normalizeSpecDirName` (codex r3270895911, MINOR —
  architecture-reviewer):** wave-32 inserted a JSDoc block for
  `CANONICAL_SPEC_ID` directly above `normalizeSpecDirName`,
  orphaning the latter's docs (TypeDoc / IDE bind only the LAST
  JSDoc to the next declaration). Relocated `CANONICAL_SPEC_ID`
  (with its JSDoc) to the top-of-file module-constants section,
  restoring `normalizeSpecDirName`'s JSDoc adjacency.
- **Wave-number comment correction (codex r3270896487, NIT —
  completion-reviewer):** `prototypingIterate.ts` L1298 comment
  `29th-wave Fix` corrected to `30th-wave Fix` (commit `d9fed238`
  was the 30th late-review wave; archaeology / regression
  triangulation needs the wave label to match the commit history).
- **TC-0012-0424 branch-coverage gap (codex r3270897052, MINOR —
  qa-gatekeeper):** the wave-30 reorder moved TWO drift classes
  before `shouldStop()` (`frozenUnion === null` + `drift.drifted`).
  TC-0012-0424 only pinned the second branch. Added a second `it`
  block covering the first: converged loop with `frozenSurfaceUnion`
  field omitted from `prototyping.json` exits 2
  (`frozenSurfaceUnion is missing or malformed`) instead of
  returning the convergence exit 64.
- **TC-0012-0425 leading-whitespace coverage (codex r3270897573, NIT —
  qa-gatekeeper):** the canonical-id validation gate's `it.each`
  table only covered trailing whitespace. Added 2 rows
  (`" 0001"` leading whitespace + `"\t0001"` tab whitespace) so a
  future "strip leading whitespace before validation" defensive
  transform cannot slip a `" /../foo"`-style path-traversal vector
  past the canonical-id gate.

### Fixed (PR #208 34th late-review wave)

- **CLI contract certify exit-2 row enumeration (codex r3270886845,
  MINOR — product-surface-reviewer):** `.qfai/contracts/cli/qfai-prototyping.md`
  certify exit-2 row now enumerates the two `frozenSpecsCovered`
  classes added in waves 32 / 33 — non-canonical entries (any value
  not matching bare 4-digit `NNNN` or fully-qualified `spec-NNNN`)
  and present-but-malformed field (key on record but value
  non-array / empty / non-string / empty-string). Pre-fix the row
  only listed "Missing / unreadable `prototyping.json`, missing
  `specsCovered[]`, accepted iter dir absent, certificate schema
  malformed" so operators looking at the contract after a
  hand-edited / corrupt `prototyping.json` exit-2 could not predict
  the cause from contract alone (stderr → contract traceability
  broken). Recovery path (`iterate --cycle 0`) also named in the row.
- \*\*09_delta narrative backfill — waves 26-31 (codex r3270888066 MINOR
  - r3270889565 MAJOR — requirements-reviewer + completion-reviewer):\*\*
    `.qfai/specs/spec-0012/09_delta.md` previously jumped wave-25 →
    wave-32 with six waves of narrative missing, breaking spec ↔
    commit-history correspondence. Backfilled R26 / R27 / R28 / R29 /
    R30 / R31 entries (each with thread IDs + AC-Refs / TC-Refs +
    impact scope) so the spec-side SSOT is reconstructable without
    `git log` excavation.
- **AC-0012-0045 ordering invariant (codex r3270889168 MINOR —
  requirements-reviewer):** the wave-30 drift-gate-before-`shouldStop`
  ordering invariant was previously pinned only by EX-0012-0153 and
  TC-0012-0424 / TDD-0444; AC-0012-0045's hard-stop catalog
  enumerated classes (a)-(h) but did not normatively require
  hard-stop classes to be evaluated BEFORE convergence / budget
  signals. AC-0012-0045 Then clause now carries the ordering invariant:
  "Hard-stop classes (a)-(h) MUST be evaluated BEFORE convergence /
  budget-exhaustion signals; when both fire in the same invocation,
  the hard-stop class wins and convergence is suppressed." This
  gives the wave-30 behaviour a normative AC anchor so a future
  `shouldStop`-first regression has a requirements-layer violation
  to cite, not just an example / test contradiction.

### Fixed (PR #208 33rd late-review wave)

- **Certify-side absent-vs-malformed `frozenSpecsCovered`
  discrimination (codex r3270861808, P1 —
  chatgpt-codex-connector):** new SSOT classifier
  `classifyFrozenSpecsCoveredMultiSpec()` in
  `core/prototyping/specsCovered.ts` returns
  `{kind: "absent" | "malformed" | "ok"}`. Pre-fix the certify
  per-(spec × screen) gate AND the cert-sealing call site used
  `readFrozenSpecsCoveredMultiSpec(...) ?? readFrozenSpecsCovered(...)`,
  which collapsed "missing" and "present-but-invalid" into one
  branch. A partial / corrupt edit of `frozenSpecsCovered` (key on
  the record but value non-array / empty / non-string entry /
  empty-string entry) would silently fall back to legacy
  single-spec `specsCovered`, downgrading multi-spec certification
  scope to the resolved primary spec only and letting missing
  secondary-spec review evidence ship a sealed completion
  certificate. Post-fix both call sites consume the classifier
  directly: `malformed` exits 2 with a "present but malformed"
  diagnostic naming the rejection reason (e.g. `not an array`,
  `empty`, `non-string`, `empty-string`); `absent` (key omitted)
  still legitimately falls back to legacy `specsCovered` for
  pre-Wave-3 evidence compatibility. AC-0012-0045 hard-stop catalog
  extended with class (h). New TC-0012-0426 + TDD-0446 +
  EX-0012-0155 (5 parametrized integration `it` blocks + 1
  absent-fallback companion + 8 unit `it` blocks for the
  classifier in `specsCovered.test.ts`).

### Fixed (PR #208 32nd late-review wave)

- **Certify-side canonical-spec-id validation gate (codex r3270776268,
  P2 — chatgpt-codex-connector):** `prototypingCertify.ts#runPrototypingCertify`
  now validates every `prototyping.json#frozenSpecsCovered[]` entry
  against `CANONICAL_SPEC_ID` (`/^(?:spec-)?\d{4}$/u`) BEFORE the
  per-(spec × screen) review.json presence gate calls
  `normalizeSpecDirName` / `path.join`. Pre-fix `normalizeSpecDirName`
  only stripped/re-added the `spec-` prefix, so a hand-edited
  `prototyping.json` carrying values like `"../../../etc/passwd"`,
  `"spec-0001/../../escape"`, `"0001 "` (whitespace), `"spec-abcd"`,
  or `"spec-001"` (wrong digit count) would have flowed straight
  into `path.join(root, "iter-NN", id, "<screen>.review.json")` and
  let the gate probe outside the intended `iter-NN/spec-NNNN/`
  subtree — potentially "satisfying" missing-review checks with
  unrelated files. Post-fix certify exits 2 with the malformed id
  echoed verbatim (`JSON.stringify` form) and the canonical shape
  (`spec-NNNN` / 4-digit `NNNN`) named in stderr; operator is
  directed to re-run `qfai prototyping iterate --cycle 0` to
  regenerate the record. AC-0012-0045 hard-stop catalog extended
  with class (g); new TC-0012-0425 + TDD-0445 + EX-0012-0154 (six
  `it` blocks: path-traversal / slash-injected / whitespace /
  non-numeric / wrong-digit-count malformed variants + one
  canonical-coexistence happy path proving bare `0012` and
  fully-qualified `spec-0007` ids still pass).

### Fixed (PR #208 31st late-review wave)

- **Certify spec-set source contract (codex r3270736005, P2 —
  chatgpt-codex-connector):** the `qfai prototyping certify` Inputs
  section previously claimed it reads `prototyping.json#specsCovered`
  via `readFrozenSpecsCovered()`. The implementation actually
  resolves the spec set with `readFrozenSpecsCoveredMultiSpec(...) ??
readFrozenSpecsCovered(...)` — the multi-spec `frozenSpecsCovered[]`
  field is the first source, legacy `specsCovered[]` is the
  fallback. The contract now names that precedence so operators /
  automation diagnosing certify exit-64 coverage rejections don't
  mistake `specsCovered` for the SSOT field. SSOT module list also
  updated to mention `readFrozenSpecsCoveredMultiSpec()`.
- **Certify imageSources / licenseVerify (codex r3270736007, P2 —
  chatgpt-codex-connector):** the certify Inputs list previously
  required `prototype-handoff.yaml#imageSources[]` and license
  verification — contradicting the same contract's later (wave-26)
  statement that license-verify is iterate-only and certify does
  NOT read `imageSources[]`. The Inputs section now explicitly
  states license-class enforcement is iterate-side only (exit 66),
  certify does not invoke `licenseVerify()`, and the
  `prototype-handoff.yaml#imageSources[]` payload is a post-loop
  handoff artifact consumed by audit / hand-off tooling — not by
  certify.

### Fixed (PR #208 30th late-review wave)

- **Drift gate ordering (codex r3270687650, P1 —
  chatgpt-codex-connector):** the cycle ≥ 1 lock-drift gates
  (`frozenSurfaceUnion` missing / malformed + live-vs-frozen
  spec-set drift) now run BEFORE `shouldStop()` so a converged or
  max-budget loop cannot mask a mid-loop drift. Pre-fix the order
  was `designMd hash → shouldStop → drift`; a loop that satisfied
  `shouldStop` (axes-exceptional or max-iterations) returned exit
  64/65 immediately and the drift gate never fired — a mid-loop UI
  marker removal or contract edit was silently accepted as a
  successful convergence / exhaustion instead of the documented
  exit-2 lock-drift. Order is now `designMd hash → frozenSurfaceUnion
presence → spec-set drift → shouldStop`. New regression test
  `TC-0012-0424 / TDD-0444`: a multi-UI project with iter-0
  fully-converged + spec-0002 marker removed mid-loop returns
  exit 2 (`spec-set drift detected mid-loop` + `removed=[0002]`),
  NOT exit 64.

### Fixed (PR #208 29th late-review wave)

- **CLI contract internal-label residuals (codex r3270625675 NIT +
  r3270626085 / r3270626517 / r3270627244 MINOR —
  product-surface-reviewer):** the 24th-wave internal-label scrub
  left three residuals in `.qfai/contracts/cli/qfai-prototyping.md`
  — `MAJOR/P1 bug closed by the 11th-wave fix` (now: a behavioural
  "what fallback would do" sentence); `post-Wave-3` / `pre-Wave-3`
  schema-comment leakage (now: "records written before
  `frozenSpecsCovered` existed"); and the wave-27 certify exit-66
  meta-commentary ("Pre-fix this table previously listed exit 66 …
  is corrected here") removed entirely. Verified with
  `grep -nE 'MAJOR/P[0-9]|[0-9]+(st|nd|rd|th)-wave|Wave-[0-9]|codex r[0-9]|Pre-fix'` →
  zero hits.
- **AC ↔ contract baseline-field cascade (codex r3270628554, MINOR
  — requirements-reviewer):** the wave-27 contract correction
  (cycle ≥ 1 drift gate baseline is `frozenSurfaceUnion`, not
  `specsCovered` / `frozenSpecsCovered`) is now cascaded into
  AC-0012-0049 and BR-0012-0038 Then clauses. Both now explicitly
  name `frozenSurfaceUnion` as the SSOT baseline, note that the
  legacy fields carry only the primary-spec scope under review (not
  the multi-spec drift baseline), and call out the missing-snapshot
  hard-fail. Closes the AC ↔ contract drift the reviewer flagged.
- **SKILL.md L73 wrap polish (codex r3270627813, NIT —
  product-surface-reviewer):** the wave-25 wrap fix left L73 at
  ~96 chars, breaking the bullet-block rhythm. Re-wrapped to
  match the surrounding ~75-char wrap width.

### Fixed (PR #208 28th late-review wave)

- **Recursive-DFS contract pin (codex r3270624828, MINOR —
  architecture-reviewer):** the wave-26 rename to
  "recursively accepts ... nested in a child folder" left the test
  body only exercising a single nested level, while
  `hasMatchingUiContract`'s implementation is an unbounded DFS and
  the TC narrative claims recursive walk. Add a 2-level-deep
  fixture (`spec-0007/screens/auth/login.yaml`) so the unbounded-DFS
  contract is pinned and a future single-level "optimisation"
  cannot regress green. Test names, TC-0012-0423 narrative, and
  TDD-0443 ledger row aligned to "recursively walks (≥ 1 level)"
  wording (5 `it` blocks total: (a) basic match / (b) 1-level /
  (c) 2-level / (d) empty subdir non-match / (e) `.yml`
  non-match).

### Fixed (PR #208 27th late-review wave)

- **Hard-stop class 4 baseline-field correction (codex r3270572395, P2
  — chatgpt-codex-connector):** the contract's hard-stop class 4
  (Mid-run spec-set change) now names `prototyping.json#frozenSurfaceUnion`
  as the comparison baseline — the actual SSOT field that
  `evaluateCycleGteOneGate` reads. Pre-fix the prose said
  `frozenSpecsCovered`, which would send operators to inspect / edit
  the wrong field during recovery and yield repeated exit-2 failures
  after they thought drift was resolved. Class 4 also now explicitly
  enumerates the missing-or-malformed-snapshot hard-fail.
- **Certify exit-66 row scrub (codex r3270572400, P2 —
  chatgpt-codex-connector):** the `qfai prototyping certify` exit-code
  table no longer lists exit 66. `prototypingCertify.ts` does not
  read `imageSources[]` or call `licenseVerify()` — the license-class
  hard-stop is enforced on the `iterate` side only. The table now
  carries an explicit prose note redirecting operators / CI scripts
  to the iterate exit-code table for the license-class hard-stop.
  Pre-fix wording promised a code 66 certify return that the
  implementation cannot produce, which would break orchestrator
  branches that wait on 66-specific remediation.
- **Outdated (codex r3270572406, P2 — chatgpt-codex-connector):**
  duplicate of the wave-26 fix (codex r3270555207). The remaining
  `cannot reach the source on cycle 0` claim was already removed
  from hard-stop class 3 in `8a86b3ee` and replaced with the
  explicit 5-rejection enumeration plus a "no network egress" note.

### Fixed (PR #208 26th late-review wave)

- **Code cleanup (codex r3270526761 + r3270527599, MINOR):** dropped
  the unreachable outer `try { ... } catch (subErr) { if
(!isEnoent(subErr)) throw subErr; }` around the subdir DFS in
  `hasMatchingUiContract` — the only throw path inside the loop is
  the inner `readdir`, which is already discriminated as
  ENOENT-continue / propagate. Renamed the wave-25 nested-subdir
  test from `nested one level deep` to
  `recursively accepts a per-spec subdirectory contract nested in a
child folder` (and updated the code comment) so the wording
  matches the unbounded-DFS semantic the README candidate #5 layout
  documents (multi-component `<subpath>`).
- **CLI contract reachability scrub (codex r3270555207, P2 —
  chatgpt-codex-connector):** removed the false "`licenseVerify()`
  cannot reach the source on cycle 0" reachability claim from
  hard-stop class 3. `licenseVerify` is a pure static validator over
  the `imageSources[]` shape; it does NOT probe network egress. The
  contract now explicitly enumerates the five static rejection
  classes (`license-not-allowlisted`, `license-tier-unknown`,
  `license-non-https-url`, `license-host-mismatch`,
  `license-missing-attribution`) and calls out that dead /
  unreachable URLs that pass the static rules are accepted at this
  gate. Operators and automation that grepped the contract for
  network reachability semantics will now see the accurate scope.
- **Resolved as FYI (codex r3270527316 + r3270527439):** wave-23
  qa-gatekeeper PASS verdict and architecture-reviewer observations
  on the subdir fallback — no code change needed.

### Fixed (PR #208 25th late-review wave)

- **Traceability stitch — TC-0012-0423 registration (codex r3270527912,
  MAJOR — requirements-reviewer):** the 23rd-wave `hasMatchingUiContract`
  per-spec subdirectory fallback gains a registered TC entry:
  `TC-0012-0423` in `06_Test-Cases.md`, `TDD-0443` in
  `tdd/test-list.md` and `16_Traceability-ledger.md`, new
  `EX-0012-0152` in `05_Examples.md`, and the three new `it` blocks
  in `tests/core/prototyping/specResolution.test.ts` are annotated
  `// QFAI:SPEC-0012:TC-0012-0423`. AC-Refs: `AC-0012-0037` (cycle-0
  precheck UI-bearing input candidates) + `AC-0012-0049` (mid-run
  spec-set freeze). AC-0012-0037 Given clause extended with the
  subdir-layout signal alongside the existing strict marker / single-
  file fallbacks.
- **Edge-case test coverage (codex r3270529771, MINOR):** add an
  explicit `it` block asserting the subdir branch rejects a `.yml`
  (single-l) file as the sole content — pins the deliberate
  asymmetry between the subdir branch (`.endsWith(".yaml")`) and the
  top-level anchored regex (`^...\.yaml$`). Policy comment added to
  `specResolution.ts` explaining the asymmetry.
- **09_delta narrative backfill (codex r3270529342, MINOR —
  requirements-reviewer):** five narrative entries added for waves
  21 / 22 / 23 / 24 / 25 so the rolling delta-document SSOT matches
  the CHANGELOG.
- **SKILL.md wrap repair (codex r3270528363 / r3270528371, NIT —
  product-surface-reviewer):** L72 re-wrapped so the wave-23
  `qfai-config.yaml` slash-command-parse fix does not leave the
  `Operators authoring` continuation visually dangling past the
  bullet's wrap rhythm.

### Fixed (PR #208 24th late-review wave)

- **specs-coverage report regen (codex r3270453832, MAJOR —
  qa-gatekeeper):** `.qfai/report/specs-coverage/spec-0012.md` rebuilt
  via `qfai validate` so AC counts reflect the wave-22 TC-0012-0416
  AC-Ref migration (AC-0012-0044 → AC-0012-0038) and the wave-20 +
  wave-22 AC additions (`AC-0012-0052` show-spec contract).
- **Operator-facing contract scrub (codex r3270457491 MINOR —
  product-surface-reviewer):** `.qfai/contracts/cli/qfai-prototyping.md`
  no longer references internal codex review IDs / wave labels /
  internal severity tokens (`codex r3265480688`, `11th-wave fix`,
  `MAJOR/P1`, `22nd-wave operator-facing layout per codex r3270257688
MINOR`, etc.). Operator-readable language only — internal-trace
  metadata stays in `09_delta.md` / `CHANGELOG.md`.
- **Stderr two-line layout polish (codex r3270459355, NIT —
  product-surface-reviewer):** the `frozenSurfaceUnion missing`
  diagnostic now inserts a blank `error("")` line between the primary
  CTA and the indented `Reason:` block so narrow-terminal wrap does
  not visually fuse the two. The `why:` prefix is also re-cased to
  `Reason:` per the suggestion.
- **Outdated threads (already addressed by wave-23 commit
  `1edd8051`):** wave-22 CI BLOCKERs on `promptRefs.test.ts` because
  of the `.qfai/contracts/config/qfai-config.yaml` literal path
  (codex BLOCKER r3270452746 / r3270453722 + clarification
  r3270455565); the SKILL.md markdown bullet continuation indent on
  the same hunk (codex MINOR r3270455737); the
  `.qfai/contracts/config/qfai-config.yaml` / `qfai doctor --explain`
  dangling references (codex MAJOR r3270454138).
- **Deferred (codex r3270455347 MINOR + r3270456831 NIT):** stderr
  two-line layout convention across the other cycle ≥ 1 drift
  classes, and an explicit OQ for removing the
  `prototypingIterate.ts` `resolveSurfaceUnion` re-export once
  wave-8/10/13 unit tests migrate their imports — both noted here as
  follow-up surface for a focused subsequent wave.
- **FYI (codex r3270455436):** wave-21 commit message used "test
  annotations updated" while no `tests/` diff was emitted; clarified
  that TC-0012-0416 is a deferred follow-up (`status: todo`, test
  file: planned) and the "annotations" refer to the spec markdown
  AC-Ref tags. No code change needed.

### Fixed (PR #208 23rd late-review wave)

- **`hasMatchingUiContract` per-spec subdirectory fallback (codex
  r3270307469, P1 — chatgpt-codex-connector):** the helper now detects
  the documented per-spec subdirectory layout
  (`.qfai/contracts/ui/spec-<specId>/<sub>.yaml`, candidate #5 in
  `.qfai/contracts/ui/README.md`). Pre-fix the helper only listed
  top-level basenames; a project that authored UI contracts as
  `.qfai/contracts/ui/spec-0007/home.yaml` (without
  `surface_type: ui-bearing` on the spec) was silently treated as
  non-UI-bearing — `resolveAllUiBearingSpecs` returned empty, the
  cycle-0 precheck no-op'd, and the iterate command exited 0 without
  producing iter dirs. The fix walks the spec subdir (one level deep)
  looking for at least one `.yaml` file. Tests added:
  `accepts the per-spec subdirectory contract fallback`,
  `accepts a per-spec subdirectory contract nested one level deep`,
  `does NOT match a per-spec subdirectory that contains no .yaml files`.

### Fixed (PR #208 22nd late-review wave)

- **SKILL.md operator narrative ↔ implementation (codex r3270253034,
  MAJOR — architecture-reviewer):** Step 2-A now correctly says the
  skill resolves the UI-bearing union via `resolveSurfaceUnion()` (the
  resolver the precheck / cycle ≥ 1 drift gate / show-spec actually
  invoke), with `resolveAllUiBearingSpecs()` documented as the strict
  frontmatter sub-component the union composes internally. Pre-fix
  the narrative claimed `resolveAllUiBearingSpecs()` was the resolver
  the skill calls — true for the test guard but false against the
  implementation. SKILL.md also gains a pointer (`see
.qfai/contracts/config/qfai-config.yaml or qfai doctor --explain
prototyping for the exact key name`) for the config-pinned spec id
  so operators can still discover the config key without the
  forbidden literal token (codex r3270259409 MINOR — discoverability
  partial restore).
- **AC ↔ BR pairing (codex r3270250830, MINOR — requirements-reviewer):**
  `BR-0012-0034` AC-Refs extended to include `AC-0012-0052`
  (`show-spec` JSON payload contract) so the REQ → BR → AC chain is
  not broken at the operator drift-analysis surface.
- **REQ ledger (codex r3270252059, MINOR — requirements-reviewer):**
  `REQ-0011` Refers-To extended with `AC-0012-0052`; `Date Updated`
  bumped to `2026-05-20` to reflect the wave-20 amendment.
- **09_delta narrative AC-Ref history (codex r3270253036, MINOR —
  requirements-reviewer):** 13th-wave Fix 3 narrative annotated with
  the AC-Ref binding history (`AC-0012-0044` → `AC-0012-0045 class
(f)` per the 20th-wave rebinding). Mirrors the wave-19 narrative
  annotation pattern.
- **CLI contract exit-2 cell (codex r3270257688, MINOR —
  product-surface):** the exit-2 row in
  `.qfai/contracts/cli/qfai-prototyping.md` now points operators at
  an enumerated bullet list immediately below the table; the inline
  cell was ~870 chars / 1000+ char rendered which was unreadable in
  GitHub / VSCode preview. Common recovery (`--cycle 0` re-seed) is
  named in a separate paragraph.
- **Stderr layout (codex r3270255983, NIT — product-surface):** the
  cycle ≥ 1 legacy-record diagnostic in `prototypingIterate.ts`
  splits into a short primary CTA (`Re-run with --cycle 0
--target-url <url> …`) + a separate `why:` line so the
  recovery action is the headline and the rationale follows.

### Fixed (PR #208 21st late-review wave)

- **AC-Ref consistency (codex r3270214641, MAJOR — requirements-reviewer):**
  TC-0012-0416 / OQ-0012-0011 references rebound from `AC-0012-0044`
  to `AC-0012-0038`. The cycle-9 idempotency Then-clause moved from
  AC-0044 to AC-0038 in the 19th-wave (per codex r3270052195), but
  the TC-0012-0416 row and the OQ-0012-0011 `Couples:` / Question
  prose were not migrated alongside TDD-0439 / TC-0012-0419.
- **JSDoc consistency (codex r3270215029 / r3270209821, NIT/MINOR):**
  `prototypingCertify.ts` L695-696 comment now names
  `core/prototyping/specResolution.ts` as the canonical location of
  `resolveSurfaceUnion` (matched to the 19th-wave move) and notes the
  CLI-layer re-export as back-compat-only.
- **API surface annotation (codex r3270215675 / r3270214114, MINOR):**
  the back-compat re-export of `resolveSurfaceUnion` from
  `prototypingIterate.ts` is now wrapped in an `@internal` JSDoc that
  explicitly directs new call sites to import from
  `core/prototyping/specResolution.ts` and notes that the re-export
  exists only so the wave-8/10/13 unit tests keep resolving until
  their import paths migrate.
- **Outdated review threads (already addressed by wave-20 commit
  `6fe7a45d`):** SKILL.md regression / forbidden-phrase contract
  (codex BLOCKER r3270212184 / r3270213902 / r3270216674); TC AC-Ref
  binding for TC-0012-0420 / 0421 / 0422 (codex MAJOR r3270212594 /
  r3270216588); ledger TDD-0441 / 0442 AC-Ref drift (codex MAJOR
  r3270213639 / r3270217340); TC-0012-0420 stderr assertion pin
  (codex MAJOR r3270215064); cycle ≥ 1 drift gate stderr internal
  labels (codex MAJOR r3270212694); AC-0012-0045 class (e)
  "pre-12th-wave" marker (codex MINOR r3270218216).

### Fixed (PR #208 20th late-review wave)

- **CI integration BLOCKER (codex r3270133293 + r3270145337, BLOCKER):**
  revert the 18th-wave `SKILL.md` Step 2-A edit to satisfy
  `tests/skill/prototypingSkill.test.ts#TC-0012-0356` — restore "every
  UI-bearing spec ... in one invocation via
  `resolveAllUiBearingSpecs()`" wording and remove the `primarySpecId`
  literal that the forbidden-phrase guard blocks. The `resolveSurfaceUnion`
  documentation is preserved alongside but kept clear of the
  forbidden-phrase / required-regex contracts so the multi-spec wiring
  invariant remains pinned.
- **Traceability — unregistered EX-Refs (codex r3270134830, MAJOR):**
  register `EX-0012-0145..EX-0012-0151` in `05_Examples.md`
  (cycle-9 idempotency, reviewer payload schema, per-spec UI contract
  precedence, zero-UI cycle-0-only semantic, legacy-record hard-fail,
  license-catalog set-equality drift, show-spec JSON payload
  discriminant) so the 14th + 17th + 18th-wave TC additions have
  registered EX entries. Closes the CLAUDE.md
  "TDD-IDs / TC-Refs must not reference unregistered entries" gap.
- **AC layer — hard-stop catalogue (codex r3270141326 MAJOR + codex
  r3270143584 MINOR):** extend `AC-0012-0045` hard-stop catalogue
  with class **(f) `frozenLicenseCatalog` drift** (set-equality
  semantic: byte permutations OK, semantic differences exit 2) and
  broaden class (e) to cover the legacy-shape variant (record exists
  but the `frozenSurfaceUnion` field is missing). Rebind
  `TC-0012-0421` from `AC-0012-0043` (license-verify exit 66, wrong
  axis) to `AC-0012-0045` class (f); `TC-0012-0420` remains on
  `AC-0012-0045` class (e). Ledger updated to match.
- **AC layer — show-spec contract (codex r3270138113 MAJOR):** add
  new `AC-0012-0052` (`show-spec` JSON payload contract) covering
  `frozenSpecsCovered` / `frozenSpecsCoveredSource` discriminant /
  `frozenSurfaceUnion` / `liveUiBearing: string[]` / optional `primary`
  block. Rebind `TC-0012-0422` from `AC-0012-0044` (autonomous-run,
  wrong axis) to the new `AC-0012-0052`. Ledger updated.
- **Operator-facing surface (codex r3270142020, MAJOR — product-surface):**
  scrub the cycle ≥ 1 drift gate stderr of internal labels
  (`legacy pre-12th-wave record`, `11th-wave Fix (codex r3265480688)`,
  `MAJOR/P1`). Replace with the observable contract statement: "the
  gate does not fall back to the single-spec `frozenSpecsCovered`".
  `TC-0012-0420` assertion narrowed to match the new wording so the
  test pins the contract (no silent fallback) rather than the wave
  label.
- **Test specificity (codex r3270136775, MINOR):** narrow
  `TC-0012-0421(c)` from `expect(exit).toBe(0)` (over-coupled to
  unrelated future gates) to `expect(stderr).not.toMatch(/drifted .../)`
  - `expect(exit).not.toBe(2)` — the contract this case pins is
    catalog-gate non-firing under set-equality, scoped to the gate
    rather than the whole pipeline.
- **CLI contract (codex r3270152438, P2 — chatgpt-codex-connector):**
  the exit-code table in `.qfai/contracts/cli/qfai-prototyping.md`
  now names the actual drift baseline field
  (`prototyping.json#frozenSurfaceUnion`) and the missing /
  malformed-field hard-fail. Pre-fix the table named
  `frozenSpecsCovered` (the original pre-11th-wave baseline);
  operators inspecting the wrong field during recovery would have
  hit repeated exit-2 failures.
- **specs-coverage report (codex r3270147998, MAJOR — outdated but
  applied):** bump `AC-0012-0037` / `AC-0012-0045` / `AC-0012-0049`
  counts and register the new `AC-0012-0052` entry to reflect the
  wave-18 + wave-20 TC additions and the AC-Ref rebinding above.

### Fixed (PR #208 19th late-review wave)

- **Architecture (codex r3270055214, MAJOR — architecture-reviewer):**
  move `resolveSurfaceUnion` (and its private helper `specDirExists`)
  from `cli/commands/prototypingIterate.ts` to
  `core/prototyping/specResolution.ts`. The CLI → CLI sideways import
  `prototypingCertify` had to take to align with iterate's drift gate
  (wave-15) is replaced by both CLI commands importing the resolver
  from the core layer. `prototypingIterate` re-exports the symbol for
  back-compat with the wave-8/10/13 unit tests.
- **AC layer (codex r3270053231 / r3270091255 MINOR):** narrow
  AC-0012-0037 to "zero UI-bearing specs **at cycle 0**" and add an
  explicit clause that cycle ≥ 1 zero-UI is a hard-stop drift class.
  The pre-19th-wave AC text was unconditionally "exit 0 deterministic
  no-op", which contradicted the 15th + 17th-wave behavioural change
  to exit 2 at cycle ≥ 1.
- **AC layer (codex r3270094588 MINOR + r3270091255 MINOR):** extend
  AC-0012-0045 hard-stop catalogue with new class (e) — "cycle ≥ 1
  invocation without a recorded cycle-0 `frozenSurfaceUnion` seed →
  exit 2 with re-seed instruction". Formalises the wave-15 / wave-17
  Seed-the-loop-first diagnostic that TC-0012-0419 already pins.
  Class (d) is broadened to cover removed-mid-loop in addition to
  added-mid-loop.
- **AC layer (codex r3270052195 MINOR):** move the cycle-9 idempotency
  Then-clause that briefly lived on AC-0012-0044 to AC-0012-0038
  (10-cycle iteration budget) — terminator routing is an
  iteration-budget concern, not an autonomous-run / no-prompts
  concern.
- **TC binding (codex r3270093532 MINOR — architecture-reviewer):**
  TC-0012-0419 AC-Refs corrected from `AC-0012-0044` (autonomous-run
  / no-prompts — wrong axis) to `AC-0012-0037` + `AC-0012-0045` +
  `AC-0012-0049` so the test's four `it` blocks land on the AC clauses
  they actually exercise. Traceability ledger TDD-0439 updated to
  match.
- **Code (codex r3270092241 MINOR):** rewrite the precheck JSDoc to
  match the implementation — the cycle ≥ 1 branch always returns
  exit 2; it never falls through to `evaluateCycleGteOneGate`. The
  pre-19th-wave comment claimed the empty-frozen branch fell through,
  which was incorrect after the wave-17 refactor.
- **Code (codex r3270093043 MINOR — product-surface):** scrub the
  internal wave label "12th-wave schema" from the operator-facing
  stderr string and replace with observable facts ("either the file
  does not exist yet or it is a legacy record without the
  `frozenSurfaceUnion` field"). The wave label was meaningless to
  end users.
- **Code (codex r3270095015 NIT + r3270092346 NIT):** drop the
  redundant `&& frozenUnionForPrecheck.length > 0` guard in the
  precheck branch — `readFrozenSurfaceUnionField` returns `null`
  whenever the field is empty / malformed, so a `!== null` check is
  sufficient. The helper's JSDoc was tightened to declare the
  empty-→-null post-condition explicitly so two-place semantic
  duplication does not silently drift.
- **Docs (codex r3270056361 MINOR + r3270051957 MINOR):** refresh the
  `runPrototypingShowSpec` JSDoc to describe the current resolver
  (`resolveSurfaceUnion`), document the `frozenSpecsCoveredSource`
  discriminant field, and adjust the `indexPerSpecScreens` JSDoc tone
  so it accurately reflects the post-13th-wave reality (the
  optimisation is path discovery, not file I/O — the project-wide
  reader still parses every file, and the per-spec re-parse runs
  again on the winning file).
- **CHANGELOG (codex r3270093210 MINOR):** repair the soft-wrap
  indentation drift on L138-140 of the 17th-wave entry (was
  zero-indent continuation, now matches the surrounding two-space
  bullet style).
- **09_delta.md (codex r3270050901 MINOR — requirements-reviewer):**
  register `OP-APPEND-080` for `OQ-0012-0011` (Cycle-9 idempotency
  follow-up) so the OQ ↔ OP pairing that OQ-0012-0006..0010 already
  follow is consistent for OQ-0012-0011. Closes the wave-14 Fix-6
  self-consistency gap.

### Fixed (PR #208 18th late-review wave)

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`:
  Step 2-A resolver SSOT alignment — the skill now correctly documents
  `resolveSurfaceUnion()` (the full UI-bearing union the cycle ≥ 1
  drift gate enforces) as the resolver the skill invokes, with
  `resolveAllUiBearingSpecs()` (strict signals only) called out as an
  input subset. Pre-fix the skill claimed the narrower strict-only
  resolver, leaving operators with title-marker / `primarySpecId` /
  UI-contract-only projects expecting "not resolved" behaviour that
  would not match the iterate gate. Resolves codex MAJOR r3270057960
  (distributed-surface drift).
- `tests/cli/commands/prototypingIterate.test.ts`: add regression
  coverage for the 13th-wave legacy-record hard-fail (TC-0012-0420,
  TDD-0440) — `prototyping.json` without `frozenSurfaceUnion` exits 2
  with a re-seed instruction and explicitly does NOT silent-fall-back
  to `frozenSpecsCovered` (which would re-enable the pre-11th-wave
  MAJOR/P1 false-positive). Resolves codex MAJOR r3270058882.
- `tests/cli/commands/prototypingIterate.test.ts`: add regression
  coverage for the 13th-wave license-catalog drift gate (TC-0012-0421,
  TDD-0441) — three `it` blocks: (a) tampered `allowedSources`
  (`pinterest` added) → exit 2 with `drifted from the cycle-0 frozen
license catalog`; (b) `sourceHosts` removed (malformed) → exit 2;
  (c) order-permuted catalog still passes (`licenseCatalogsEqual`
  set-equality semantic). Resolves codex MAJOR r3270057892.
- `tests/cli/prototypingCertify.test.ts`: add regression coverage
  for the 14th-wave + 15th/16th-wave show-spec payload semantic
  changes (TC-0012-0422, TDD-0442) — three `it` blocks pinning the
  new `frozenSpecsCoveredSource` discriminant (`"frozenSpecsCovered"`
  vs `"specsCovered"`) and the post-wave-16 `liveUiBearing: string[]`
  shape. Resolves codex MINOR r3270061025.
- `CHANGELOG.md`: extend the `### BREAKING CHANGES (PR #208 —
show-spec JSON schema reshape)` block with a sub-bullet covering
  the intra-PR `liveUiBearing` migration (wave-15 / wave-16 resolver
  - schema alignment) so operators reading the BREAKING block see
    the full migration surface in one place. Resolves codex MINOR
    r3270061586.
- _FYI only (codex r3270059627, no behavioural change):_ noted the
  `validateLayeredTraceability` strictness around informational AC →
  BR back-references as a future SDD profile design seed; no
  in-PR action required.

### Fixed (PR #208 17th late-review wave)

- `prototypingIterate.ts`: refine the 15th-wave zero-UI precheck
  short-circuit at cycle ≥ 1 so the error message accurately reflects
  the underlying state. The pre-17th-wave message always claimed
  "the cycle-0 frozen scope is no longer reachable" on any zero-UI
  cycle ≥ 1 invocation, including fresh projects that ran `--cycle 1`
  before `--cycle 0` (no prototyping.json on disk yet) — violating the
  principle of least astonishment. The fix reads `prototyping.json`
  before short-circuiting and discriminates two diagnostics: (a)
  non-empty cycle-0 `frozenSurfaceUnion` → "UI markers removed
  mid-loop" hard-stop (names the frozen union for clarity); (b)
  missing / malformed `frozenSurfaceUnion` (fresh project or
  pre-12th-wave record) → "Seed the loop first with `--cycle 0`".
  Resolves codex MINOR r3270050451.
- `tests/cli/commands/prototypingIterate.test.ts`: add a new
  describe block (TC-0012-0419, TDD-0439) with 4 `it` blocks pinning
  the wave-15 / wave-17 zero-UI precheck branches — cycle 0 no-op
  preserved; cycle ≥ 1 + non-empty frozen union → exit 2 with
  `no longer reachable`; cycle ≥ 1 + missing prototyping.json → exit 2
  with `Seed the loop first`; cycle ≥ 1 + legacy record without
  `frozenSurfaceUnion` → same `Seed the loop first` path.
  06_Test-Cases.md / tdd/test-list.md / 16_Traceability-ledger.md
  registered. Resolves codex MAJOR r3270050284 (regression coverage)
  per CLAUDE.md "All source changes must have corresponding test
  coverage".

### Fixed (PR #208 16th late-review wave)

- `.qfai/contracts/cli/qfai-prototyping.md`: align the documented
  `liveUiBearing` shape in the `qfai prototyping show-spec` JSON schema
  with the actual emitted type (`string[]`) after the 15th-wave switch
  to `resolveSurfaceUnion`. Pre-fix the contract still claimed
  `SpecRef[]` (objects with `specId` / `specMdPath` / `source`), which
  matched the older `resolveAllUiBearingSpecs` path; the new resolver
  also covers the non-strict title-marker / `primarySpecId` paths that
  have no per-spec metadata, so the union has to be a bare ID list.
  Per-spec metadata for the resolved primary is still available via the
  optional `primary` block. Resolves codex P2 r3269597174
  (chatgpt-codex-connector).

### Fixed (PR #208 15th late-review wave)

- `prototypingIterate.ts`: the cycle-0 zero-UI-bearing precheck no
  longer silently exits 0 at cycle ≥ 1. Pre-fix, an in-progress frozen
  run whose UI markers / contracts were removed mid-loop would
  short-circuit through the precheck before `evaluateCycleGteOneGate`
  ran, masking the `removed=[...]` drift event. The fix preserves the
  zero-UI no-op semantic only at cycle 0 (no specs to seed); at
  cycle ≥ 1 a zero-UI live result against a non-empty cycle-0 frozen
  union is treated as hard-stop drift → exit 2 with a re-seed
  instruction. Resolves codex P1 r3269453276
  (chatgpt-codex-connector).
- `prototypingCertify.ts#runPrototypingShowSpec`: `liveUiBearing` now
  uses `resolveSurfaceUnion` — the same resolver iterate's drift gate
  uses — so the live scope reported by show-spec is apples-to-apples
  with what iterate actually enforces. Pre-fix show-spec called the
  narrower `resolveAllUiBearingSpecs` (strict signals only) and
  projects relying on non-strict markers (title marker /
  `primarySpecId` config pin / UI contract signals) saw false drift
  diagnostics that did not match the iterate gate. Resolves codex P2
  r3269453293 (chatgpt-codex-connector).

### Fixed (PR #208 14th late-review wave)

- `.qfai/specs/spec-0012/tdd/test-list.md`: TDD-0347 Status column reverted
  from the invalid `superseded` token to `exception` (which is in the
  `tddList.ts#VALID_STATUSES` enum). The supersede semantic is carried by
  the Notes column ("superseded by TDD-0371"). Pre-fix `qfai validate`
  reported `TDDLIST_INVALID_STATUS` and failed the CI build job. Resolves
  codex BLOCKER r3269192039 / r3269196044 / r3269196302 / r3269200030
  (qa-gatekeeper + completion-reviewer).
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`:
  add exit 66 to the C1..9 exit-code summary and to the "Exit codes" prose
  block; add a new "License-verify hard-stop (exit 66)" subsection that
  enumerates the five `licenseVerify` error codes and the recovery path
  (inspect `frozenLicenseCatalog`, edit `imageSources[]`, re-seed via
  cycle 0). Resolves codex MAJOR r3269196571 (product-surface-reviewer).
- `packages/qfai/src/core/prototyping/licenseVerify.ts`: tighten
  `license-missing-attribution` to reject whitespace-only attribution
  (`"   "`, `"\t\n"`, ideographic space, mixed) via `.trim()`; add
  parameterized boundary regression tests (4 `it.each` cases). Resolves
  codex MINOR r3269193005.
- `.qfai/specs/spec-0012/04_Business-Rules.md`: extend BR-0012-0033 with
  a runtime-gate clause that mirrors the AC-0012-0043 14th-wave amendment
  — license-verify rejects undefined / empty / whitespace-only
  attribution with `license-missing-attribution` → exit 66. Closes the
  AC-without-BR pairing asymmetry. Resolves codex MAJOR r3269193861
  (requirements-reviewer).
- `.qfai/specs/spec-0012/06_Test-Cases.md` + `03_Acceptance-Criteria.md`:
  TC-0012-0416 AC-Refs binding corrected from `AC-0012-0045` (hard-stop
  classes catalogue) to `AC-0012-0044` (autonomous-run bound); the
  AC-0012-0044 Then clause is extended with the cycle-9 idempotency
  requirement (single `--cycle 9` invocation must surface exit 65
  directly). Resolves codex MAJOR r3269195807 (requirements-reviewer).
- `.qfai/specs/spec-0012/08_Open-questions.md`: register `OQ-0012-0011`
  (Cycle-9 idempotency — single `--cycle 9` invocation on non-converged
  10-iter loop) coupled to TDD-0436 / TC-0012-0416 / AC-0012-0044 so the
  deferred-followup follows the OQ ↔ TDD pairing pattern established
  in the 10th-wave (OQ-0012-0006..0010). Resolves codex MINOR
  r3269198118 (requirements-reviewer).
- `packages/qfai/src/cli/commands/prototypingCertify.ts#runPrototypingShowSpec`:
  add `frozenSpecsCoveredSource: "frozenSpecsCovered" | "specsCovered"`
  to the JSON payload so operators doing drift analysis can detect
  legacy pre-Wave-3 seed records (which only carry the legacy
  `specsCovered` field on disk) without re-reading
  `prototyping.json`. Contract amended in lockstep. Resolves codex
  MINOR r3269198684 (product-surface-reviewer).
- Outdated review threads (already addressed by the 13th-wave commit
  `d7f3cdaf` but re-raised against `c51df21f` before the push landed):
  prettier format / build-job formatting failure (codex BLOCKER
  r3269199076 / r3269199764 / r3269204297), and the
  `frozenSurfaceUnion` contract drift (codex BLOCKER r3269201316).

### Fixed (PR #208 13th late-review wave)

- `packages/qfai/README.md`: rewrite the prototyping description (Release
  status `## Release status` block + CLI command summary + skill listing)
  to match CHG-002 — multi-spec parallel evolution, frozen UI-bearing
  spec set at cycle 0, `cycle 0..9`, `review.json`-only per-iter evidence
  (no `screenshot.png` / `index.html` / `interaction.json`), AND
  convergence (`4 axes exceptional AND layoutAntiPatternsDetected empty
AND designMdViolations empty`), and exit codes (0 / 64 / 65 / 66 / 2).
  Pre-fix the README still described the v1.8.9 single-thread /
  one-prototype / anti-slop model, drift that bled into operator
  expectations. Resolves codex MAJOR r3265800332 / r3265808732 /
  r3265811785.
- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`:
  rewrite the intro paragraph (multi-spec evolution / one lineage per
  `spec × screen` pair / frozen spec set) and the "Cycle 9 budget
  exhaustion" subsection (handoff artifacts CAN be written for
  inspection; only `qfai prototyping certify --check` rejects DONE).
  Resolves codex MAJOR r3265801777 and codex MINOR r3265802899.
- `packages/qfai/assets/init/.qfai/assistant/steering/agent-routing.yml`:
  rewrite the `qfai-prototyping` routing comment to "Multi-spec
  evolution loop" with the full surface (4 axes + 6 \*Feel + anti-pattern
  - DESIGN.md gates) instead of the v1.8.9 single-thread label.
    Resolves codex MINOR r3265803600.
- `CHANGELOG.md`: remove the contradictory `optional
timeBudgetSoftWarning?: string` claim from the Wave 2 schema
  description; the BREAKING CHANGES (ReviewerPayload schema) block is
  the authoritative diff and the closed-schema parser now rejects the
  legacy key. Resolves codex MAJOR r3265805771.
- `CHANGELOG.md`: promote the `qfai prototyping show-spec` JSON schema
  reshape from a `### Fixed` bullet to a dedicated `### BREAKING
CHANGES` block (see above) so the operator-facing migration is
  surfaced alongside the existing `ImageSource.attribution` BREAKING.
  Resolves codex MAJOR r3265949051 and codex MEDIUM r3265954849.
- `.qfai/contracts/cli/qfai-prototyping.md`: enumerate the new
  cycle-0-freeze field `frozenSurfaceUnion[]` (the SSOT the cycle ≥ 1
  drift gate compares against), document the license-catalog drift
  exit-2 semantics, and pin the JSON schema for the `qfai prototyping
show-spec` payload. Resolves codex MAJOR r3265951894 and codex
  MEDIUM r3265954849.
- `prototypingIterate.ts`: drop the legacy `frozenSurfaceUnion ??
frozenSpecsCovered ?? frozenSpecs` fallback chain at the cycle ≥ 1
  drift gate. The fallback silently restored the MAJOR/P1 pre-11th-wave
  baseline for legacy `prototyping.json` records (the very bug
  TC-0012-0415 / codex r3265480688 closed), so v1.8.10 binaries running
  against v1.8.9-seeded records re-enabled the false-positive. The
  drift gate now hard-fails with exit 2 + an explicit "legacy record;
  re-run `--cycle 0`" message when `frozenSurfaceUnion` is missing or
  malformed. Resolves codex MAJOR/P1 r3265953324.
- `prototypingIterate.ts`: detect cycle ≥ 1 drift of
  `frozenLicenseCatalog` against the in-memory SSOT
  (`DEFAULT_LICENSE_CATALOG`) and exit 2 instead of silently honouring
  the edited catalog as the verifier authority. Mid-loop additions to
  `allowedSources` / `licenseTiers` / `sourceHosts` no longer let
  otherwise-unallowed `imageSources[]` entries pass with exit 0. The
  in-memory constant is now the verifier authority (cycle 0 mirrors it
  into prototyping.json). Resolves codex P2 r3265947252.
- `prototypingCertify.ts`: re-parse each spec's winning UI contract
  file(s) via `parseUiScreenFile` inside `indexPerSpecScreens` instead
  of reusing the project-wide-deduplicated `screenContracts` collection.
  Pre-fix two specs declaring the same `screenId` (e.g. `home`) hit the
  project-wide `findIndex` dedup, which kept only one entry; the index
  then false-negative-passed the `<spec>/<screen>.review.json` gate
  for the spec whose entry was dropped. The per-spec re-parse isolates
  the dedup scope. Resolves codex MAJOR r3265806993.
- `prototypingCertify.ts`: return the full multi-file union from
  `chooseWinningFiles` (renamed from `chooseWinningFile`) for the
  subdir (#5) and glob (#4) layouts instead of returning `null` and
  forcing the call site to re-probe via `readPerSpecScreens`. The
  pre-indexed multi-file path discovery now flows into the same
  per-spec re-parse, restoring the N+1 optimization for subdir / glob
  layouts. Resolves codex MAJOR r3265809880.
- `prototypingCertify.ts#parseUiScreenFile`: replace bare `catch {}` on
  the readFile / parseYaml branches with per-file `warn` lines that
  name the offending path and narrow the error class (read vs parse).
  Pre-fix a half-failure (some matched files parsed, one silently
  failed) was invisible because the call site's aggregate warn only
  fired on the all-empty case. The function still returns `[]` on
  failure so callers keep their contracts; CLAUDE.md "every async path
  must have explicit error handling" is now satisfied via the named
  warn line. Resolves codex MINOR r3265813656.
- `core/prototyping/evaluatorReview.ts`: tighten the closed-schema
  `cycle` validation to reject `cycle > MAX_ITERATION_INDEX` (currently
  `> 9`). Pre-fix the parser accepted `cycle: 99` because the
  upper-bound check was absent — asymmetric with the closed-schema
  `unknown field` and per-field word-count rejections. Adds a boundary
  regression test (`rejects when cycle exceeds MAX_ITERATION_INDEX`)
  covering `10 / 99 / 100`. Resolves codex MAJOR r3265809796 and codex
  MINOR r3265811203 / NIT r3265814987.
- `.qfai/specs/_policies/03_Capabilities.md`: extend CAP-0012
  success-metrics with the `6 *Feel fields (200-word bounded)` reviewer
  payload extension so the capability success-metric carries the same
  shape as the spec-0012 contract surface. Resolves codex MINOR
  r3265808939.
- `.qfai/specs/_policies/05_Contracts.md`: extend the DCON-008
  (prototype-handoff) Purpose cell with `imageSources[] (closed schema,
CHG-002 — validated by core/prototyping/handoff.ts)` so the contract
  index reflects the closed-schema `imageSources` field that already
  lives in `prototype-handoff.yaml`. Resolves codex MINOR r3265811914.
- `.qfai/contracts/ui/README.md`: restructure the candidate-precedence
  table so the `Order` column is split into `Tier` (single-file vs
  multi-file) and `Precedence within tier`, and extend the
  Recommendations to enumerate the mixed-layout cases (`spec-0007.yaml`
  - `ui-0007-home.yaml`; `spec-0007.yaml` + `spec-0007/home.yaml`) so
    authoring choices match the resolver's TRUE first-hit-wins +
    multi-file aggregation semantics. Resolves codex MINOR r3265814788 /
    r3265815283.
- `.qfai/specs/spec-0012/16_Traceability-ledger.md`: register
  TDD-0336..TDD-0369 (34 entries) as a v2.0-baseline ledger block so
  the CLAUDE.md project rule "TDD-IDs and TC-Refs must not reference
  unregistered entries" is satisfied for every TDD landed in
  `tdd/test-list.md`. Resolves codex HIGH r3265822700.
- `.qfai/specs/spec-0012/tdd/test-list.md`: TDD-0353 Notes — replace
  "single-thread serial iteration with at most 15 iters" with the
  CHG-002 value `at most 10 iters (CHG-002, MAX_ITERATIONS=10)` so the
  ledger row matches the post-CHG-002 sweep that already updated
  TDD-0347. Resolves codex MEDIUM r3265823332.
- `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts` +
  `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`:
  annotate the 11th-wave-added describe blocks (`parseEvaluatorReview
— new required fields (cycle / retryCount / wallTimeSec)` and the
  four `respects the * canonical layout` / `uses candidate #1 only`
  cases) with concrete `QFAI:SPEC-0012:TC-...` IDs and register the
  matching rows in `06_Test-Cases.md` / `tdd/test-list.md` /
  `16_Traceability-ledger.md`. The 09_delta entry for the 11th-wave
  cluster names the AC-Refs (`AC-0012-0041` / `AC-0012-0046`).
  Resolves codex MAJOR r3265811711.
- `prototypingIterate.ts` / `prototypingCertify.ts` / `licenseVerify.ts`:
  rename inline JSDoc / comment labels from `11th-wave Fix (codex r...)`
  to `12th-wave Fix (codex r...)` so the wave label matches the
  commit subject and CHANGELOG H3 (`### Fixed (PR #208 12th
late-review wave)`). Pre-fix the same codex review IDs were tagged
  as "11th-wave" inline and "12th-wave" in CHANGELOG / commit subject;
  `git blame` / `grep "12th-wave Fix"` therefore could not locate the
  inline comments. Documentation-only; no behaviour change. Resolves
  codex MEDIUM r3265950622 and codex P3 r3265953161.

### Fixed (PR #208 12th late-review wave)

- `licenseVerify.ts`: compare URL host and per-source allowlist host
  case-insensitively on BOTH sides (was already case-insensitive on
  the URL side via `urlHost()`'s `.toLowerCase()`, but the catalog
  side passed entries verbatim, so a user catalog with
  `"Images.Unsplash.com"` could false-positive reject a valid URL).
  RFC 3986 §3.2.2: host is case-insensitive. New `it()` block under
  the existing TC-0012-0411 describe. Resolves codex P2 r3265474144.
- `licenseVerify.ts` + `prototypingIterate.ts`: enforce non-empty
  attribution at the runtime license gate (see BREAKING CHANGES above
  for the schema diff). New error code `license-missing-attribution`
  on `LicenseVerifyError` and new TC-0012-0414 (2 `it` blocks).
  Resolves codex P2 r3265482144.
- `prototypingIterate.ts`: persist the cycle-0 UI-bearing UNION as
  `frozenSurfaceUnion` in prototyping.json and use it as the
  apples-to-apples baseline at the cycle ≥ 1 drift gate. Pre-fix the
  gate compared the single-spec frozen scope (`frozenSpecsCovered`)
  against the live multi-spec UNION; any baseline already carrying
  ≥ 2 UI-bearing specs false-positive-fired `added=[secondaries...]`
  at cycle 1 → exit 2, making convergence unreachable. Backward-compat:
  pre-12th-wave records (no `frozenSurfaceUnion` field) fall back to
  `frozenSpecsCovered`. New TC-0012-0415 regression test. Resolves
  codex MAJOR/P1 r3265480688.
- `prototypingCertify.ts`: missing per-spec `<screen>.review.json`
  coverage now returns exit 64 (coverage-rejection class) instead of
  exit 2 (input-error class) to match the CLI contract §Exit codes
  table and the adjacent multi-spec flat-iter coverage branch. The
  existing TC-0012-0381 test was tightened from `not.toBe(0)` to
  `toBe(64)`, and a new dedicated per-spec layout assertion was added.
  Resolves codex P2 r3265482136.
- `prototypingCertify.ts#runPrototypingShowSpec`: read the cycle-0
  frozen `specsCovered[]` from prototyping.json (with
  `frozenSurfaceUnion` and the live UI-bearing union surfaced for
  drift visibility) instead of resolving the live primary from config
  / spec markers. Exit 2 when prototyping.json is missing or malformed,
  per the CLI contract §`qfai prototyping show-spec`. Resolves codex
  P2 r3265482150.
- `prototypingIterate.ts`: rewrite the stale fence comment that
  claimed `earlyUiBearing` is still computed for bypass / drift
  signals; the variable / type field was removed in Fix A and the
  drift gate now re-resolves the live UNION via `resolveSurfaceUnion`.
  Resolves codex MINOR r3265482249.
- `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`: extend
  AC-0012-0043 Then clause to enumerate the malformed-imageSources
  exit-2 class alongside the license-verify exit-66 class so the AC
  surface matches the implemented + tested behavior of TC-0012-0413.
  Resolves codex MEDIUM r3265479524.
- `.qfai/specs/spec-0012/10_Plan.md` + `tdd/test-list.md` +
  `16_Traceability-ledger.md` + `06_Test-Cases.md`: reserve TDD-0436
  / TC-0012-0416 for the cycle-9 idempotency follow-up so the
  deferred-followup row carries a stable TDD/TC handle (pre-fix the
  row was `(none) | (none)` and could not be mirrored into the
  test-list ledger). Resolves codex LOW r3265481161.

### BREAKING CHANGES (PR #208 — ReviewerPayload schema)

- **ReviewerPayload shape is now SSOT-compliant with the CLI contract**
  (`.qfai/contracts/cli/qfai-prototyping.md` §Review payload, L161-200).
  This is a breaking change relative to the v1.8.9 shape that the
  9th-wave / 11th-wave reviews exposed. Per the project's pinned-branch
  version-discipline rule, the breaking change ships in 1.8.10 because
  the branch pin `feature/v1.8.10` is the user's release authorization;
  in normal SemVer terms this would typically warrant a minor bump.
  Pinned-branch authorization is preserved here.
  - Removed: top-level `timeBudgetSoftWarning?: string` (flat string,
    optional).
  - Added (required): `cycle: number` (0..9), `retryCount: number`,
    `wallTimeSec: number`, and `softWarnings: { timeBudget: boolean }`
    nested record. `softWarnings` is closed-schema (the single key
    `timeBudget` is required; unknown nested keys are rejected).
  - Pre-fix: 7 top-level fields, with optional `timeBudgetSoftWarning`.
    Post-fix: 11 top-level fields, all required, matching the CLI
    contract §Review payload §schema declaration.
  - Migration: existing flat `iter-NN/spec-NNNN/<screen>.review.json`
    files written under the v1.8.9 shape will be rejected by
    `parseEvaluatorReview` with `missing field: cycle` /
    `missing field: retryCount` / `missing field: wallTimeSec` /
    `missing field: softWarnings` errors. No auto-migration shim is
    provided — consumers must regenerate `review.json` files via the
    product-surface-reviewer sub-agent. The legacy
    `timeBudgetSoftWarning` key now surfaces as `unknown field:
timeBudgetSoftWarning` so authoring drift is caught fail-closed
    instead of silently dropped.

### Fixed (PR #208 11th late-review wave)

- `evaluatorReview.ts`: align `ReviewerPayload` schema with the CLI
  contract §Review payload SSOT (11 required top-level fields).
  Documented as a BREAKING CHANGE above. Resolves codex P2
  r3265368922 + P1 r3265379781 (dup).
- `screenContracts.ts` + `prototypingCertify.ts`: export
  `extractUiScreens` from the core module and rewrite
  `readPerSpecScreens` to reuse the shared parser via a new
  `parseUiScreenFile` helper. Removes the duplicated YAML / shape
  extraction logic that had drifted between the project-wide and
  per-spec readers. Resolves codex MAJOR r3265374692 + P2 r3265379531
  - P2 r3265382282 (dup).
- `prototypingCertify.ts#readPerSpecScreens`: implement TRUE
  first-hit-wins for canonical single-file candidates (`spec-NNNN.yaml`
  > `<bare>.yaml` > `ui-<bare>.yaml`). Pre-fix the loop pushed every
  > matching file into a single `matched[]` and unioned screens across
  > authoring forks (e.g. both `spec-0007.yaml` and `ui-0007.yaml` on
  > disk produced surprising cross-file behaviour). JSDoc precedence
  > table updated to reflect the impl. Resolves codex MAJOR r3265378130.
- `prototypingCertify.ts#readPerSpecScreens`: add the recursive
  per-spec subdirectory layout (`<contractsDir>/ui/<spec-id>/<sub>.yaml`)
  as candidate #5. Pre-fix the per-spec reader was flat-only, so a
  project organising contracts as `.qfai/contracts/ui/spec-0007/home.yaml`
  fell through to the project-wide list and re-opened the 9th-wave
  cross-product false-positive. Resolves codex P2 r3265377858.
- `prototypingCertify.ts`: collapse the N+1 fs probe in the per-(spec
  x screen) gate by pre-indexing the project-wide `screenContracts`
  into a per-spec Map via the new `indexPerSpecScreens` /
  `extractSpecDirFromUiRel` / `chooseWinningFile` helpers. Map honors
  the same first-hit-wins precedence as `readPerSpecScreens`; multi-file
  layouts fall through to the fs-probe fallback. Resolves codex MINOR
  r3265376125.
- `.qfai/contracts/ui/README.md`: document all 5 per-spec UI contract
  resolution candidates with a precedence table + authoring
  recommendations (canonical single-file `<spec-id>.yaml` is preferred;
  multi-file shapes #4 / #5 are supported with first-write-wins
  deduplication). Pre-fix only the legacy `ui-XXXX-<slug>.yaml`
  convention was documented and only candidate #1 was test-covered.
  Added tests for candidates #2 (`<bare>.yaml`), #3 (`ui-<bare>.yaml`),
  #5 (subdir), and the true-first-hit-wins regression. Resolves codex
  P2 r3265376163.
- `prototypingCertify.ts#readPerSpecScreens`: dedup JSDoc / impl
  mismatch — change the "last-write wins" line to "first-write wins
  (matches readUiContractScreenContracts dedup semantics)". The impl
  has always used `findIndex` which is first-write. Resolves codex
  MAJOR r3265372889.
- `prototypingCertify.ts#readPerSpecScreens`: emit a `warn` line when
  per-spec UI contract files matched but extracted zero valid screens
  (YAML parse error, `screens:` typo, non-array `screens`). Pre-fix
  the silent skip cascaded through a null return and a project-wide
  fallback, which re-opened the cross-product false-positive without
  any diagnostic surface. Resolves codex LOW r3265378799.
- `lint-shipping.ts` + `check-no-internal-version-leakage.sh` +
  `distributedSurfaceLeakage.test.ts` + `.agents/rules/distributed-surface.md`:
  add `OQ-NNNN-NNNN` to the forbidden-class set across all 4 SSOT-sync
  layers (per the distributed-surface-discipline 4-layer rule). The
  pattern catches internal open-question IDs that the spec authoring
  workflow uses. Resolves codex LOW r3265386185.

### Fixed (PR #208 4th late-review wave)

- Renumber CHG-002 cascade TDD IDs from TDD-0409..0414 to TDD-0415..0420 to
  remove the collision with the v2.1 planned `TDD-0409 | TC-0012-0392`..
  `TDD-0412 | TC-0012-0395` rows previously registered in the
  `16_Traceability-ledger.md` v2.1 block. Mirrored across
  `09_delta.md`, `tdd/test-list.md`. Added TDD-0421 / TC-0012-0401 for the
  symmetric cycle-1 drift regression test on the title-marker bypass code
  path (the primarySpecId bypass had a cycle-1 test via TC-0012-0397; the
  title-marker bypass via TC-0012-0398 only covered cycle 0). Resolves
  CRITICAL r3264654080.
- `prototypingCertify`: make the per-(spec x screen) review.json presence
  gate opt-in based on actual per-spec subdir presence at the accepted
  iter. Flat-iter projects (the legacy `iter-NN/index.html` shape that
  `prototypingIterate` and the shipped SKILL.md still emit) skip the gate
  with a one-line stderr info note. Pre-fix the gate ran unconditionally
  and would fail every (spec, screen) pair on a normal run that followed
  the documented plan. New helper `hasPerSpecSubdir`; new integration test
  pinning the flat-iter skip behaviour. Resolves P1 r3264630513.
- `specResolution.ts`: extract `TITLE_MARKER_RE` as an exported SSOT and
  rebuild the legacy composite `PROTOTYPING_MARKER_RE` from
  `UI_BEARING_MARKER_RE.source + "|" + TITLE_MARKER_RE.source`. Move the
  `findTitleMarkerSpecs` helper out of `cli/commands/prototypingIterate.ts`
  into `core/prototyping/specResolution.ts` (re-exported as
  `resolveTitleMarkerSpecs`). Eliminates the string-duplicate regex /
  function pair flagged by review and adds a JSDoc note above
  `UI_BEARING_MARKER_RE` documenting the intentional asymmetry vs the
  legacy composite. Resolves MAJOR r3264651323 + MINOR r3264490653.
- spec-0012 `09_delta.md`: add OP-APPEND-075..078 entries mirroring
  OQ-0012-0006..0009 in `08_Open-questions.md`, matching the OP-APPEND-074
  pattern established for OQ-0012-0001. Resolves required r3264563268.

### Changed (implementation)

- Reduce prototyping cycle budget from 15 to 10 iterations
  (`MAX_ITERATIONS = 10`, derived `MAX_ITERATION_INDEX = 9`). Cascade refresh
  of boundary test literals in `prototypingE2E.test.ts` and
  `prototypingIterate.test.ts`, JSDoc / inline comments in
  `prototypingIterate.ts` and `prototypingEvidence.ts`, and the user-facing
  strings in `cli/main.ts` (`--cycle (0..9)`) and `observability/guidance.ts`
  ("10 cycles"). CHG-002 Wave 3 foundation; spec-0012 TDD-0371 (TC-0012-0359).
- Add `shouldStop` boundary regression guard for `index===9` →
  `"max-iterations"`, `index===8` → `null`. No production change required —
  the symbolic `MAX_ITERATION_INDEX` consumption already honors the new
  boundary; the test pins the contract. spec-0012 TDD-0372 (TC-0012-0357).
- Add `shouldStopAcrossSpecs(pairs)` to `core/prototyping/iteration.ts` with
  `PerSpecScreenIter` and `MultiSpecStopResult` types. Pure function: returns
  `{ stopReason: "axes-exceptional", laggingSpecs: [] }` only when every
  `(spec, screen)` pair passes `allFourAxesExceptional`; otherwise returns
  `{ stopReason: null, laggingSpecs: [...sortedUnique specIds...] }`.
  Existing single-spec `shouldStop(iterations)` unmodified. spec-0012
  TDD-0376/0377 (TC-0012-0367/0368).
- Add per-(spec × screen) `<screen>.review.json` presence check to
  `qfai prototyping certify`. When the cycle-0 frozen spec set AND screen
  contracts are both non-empty, certify exits non-zero and names every
  missing `spec-NNNN / <screen>` pair in stderr (capped 20 lines). New
  helpers `fileExists` / `normalizeSpecDirName` (canonicalizes bare `"0012"`
  ↔ `"spec-0012"`). Legacy single-page fixtures untouched. spec-0012
  TDD-0387 (TC-0012-0381).
- Rephrase cycle-≥1 DESIGN.md hash-mismatch stderr to include the canonical
  phrase "DESIGN.md hash mismatch — ... re-run from cycle 0" while
  preserving the legacy "sha256 mismatch" / "edited mid-loop" tokens for
  backward-compat. spec-0012 TDD-0380 (TC-0012-0373).
- Add integration coverage: `runPrototypingIterate` autonomous-mode test
  (no `process.stdin` reads via source-grep + runtime throwing-getter probe
  across cycle 0 / cycle 1 / cycle 9), boundary exit-65/exit-0 synthesis,
  serial-budget structural shape, and `shouldStop` quantitative-gate
  absence assertions. spec-0012 TDD-0373/0374/0375/0378.

### Added (Wave 1 — new core modules)

- New module `core/prototyping/iterationPaths.ts`: per-spec iter-NN helpers
  (`iterationDir(idx, specId)` → `.qfai/evidence/prototyping/iter-NN/spec-NNNN`,
  `iterationReviewPath(idx, specId, screen)`, `findIterationReviewFiles(root, idx)`,
  `findStaleIterDirs(root)` + `deleteStaleIterDirs(root)` matching only
  `/^iter-\d{2,}$/`, `parseIterationReviewPath(rel)` round-trip). spec-0012
  TDD-0389/0390/0391/0392 (TC-0012-0378/0379/0380/0392).
- New module `core/prototyping/licenseVerify.ts`: pure
  `licenseVerify(imageSources, catalog)` returning `{ok:true}` when every
  source is allowlisted and license is in the catalog tier, otherwise
  `{ok:false, errors:[…]}` with structured `{code:"license-not-allowlisted"|"license-tier-unknown", …}`
  entries. Exit-code mapping (66) is caller responsibility. spec-0012
  TDD-0393/0394 (TC-0012-0370/0395).
- New module `core/prototyping/reviewerDispatch.ts`: interface stub
  `dispatchReviewerToPair(specId, screen, options)` with injectable
  `playwrightRunner`, attempt-limit retry, structured `ReviewerOutcome`.
  Real Playwright wiring deferred. spec-0012 TDD-0399/0400
  (TC-0012-0362/0363); TDD-0401/0402 (TC-0012-0374/0383) deferred to a
  subsequent integration cycle.

### Changed (Wave 1 — specResolution + skill asset)

- Extend `core/prototyping/specResolution.ts` with
  `resolveAllUiBearingSpecs(root, config)`. Detection: `surface_type: ui-bearing`
  marker in `01_Spec.md`; fallback to matching `.qfai/contracts/ui/<spec-id>.yaml`.
  Returns deduped lex-sorted spec IDs. Existing single-spec
  `resolvePrimaryPrototypingSpec` preserved (deprecated; removal in next
  cycle when callers migrate). spec-0012 TDD-0395/0398
  (TC-0012-0354/0391).
- Extend `core/prototyping/specsCovered.ts` with
  `checkSpecsCoveredDrift(frozenSpecsCovered, currentLive)`. Pure; uses the
  frozen value as baseline. spec-0012 TDD-0397 (TC-0012-0386).
- Rewrite the `qfai-prototyping` SKILL.md Step 2-A bullet (asset under
  `assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`): remove
  "confirm the selected spec is UI-bearing" prompt language; replace with
  multi-spec wording that references `resolveAllUiBearingSpecs()` and
  states the zero-specs no-op exit. spec-0012 TDD-0396 (TC-0012-0356).

### Changed (Wave 3 blocked-resolved after Wave 1)

- `runPrototypingIterate` zero-UI-bearing behavior flipped from exit 2 to
  exit 0 with stderr "no UI-bearing specs resolved" and no iter-NN/
  directory creation (section 0 pre-check using `resolveAllUiBearingSpecs`).
  Existing test inverse-updated in-place. spec-0012 TDD-0379 (TC-0012-0355).
- `runPrototypingIterate` cycle 0 now writes `frozenSpecsCovered: [...]`
  and `frozenLicenseCatalog: { allowedSources, licenseTiers }` into
  `prototyping.json` via extended `writeSeedMetadata`. New
  `DEFAULT_LICENSE_CATALOG` constant (allowedSources `["unsplash","pexels"]`).
  spec-0012 TDD-0381/0382 (TC-0012-0388/0389).
- `runPrototypingIterate` hard-stops with exit 66 when any
  `imageSources[]` entry has a non-allowlisted source or unknown license
  tier; stderr names the offending URL. Reads `imageSources[]` from
  `prototyping.json` directly (handoff-yaml extraction deferred). spec-0012
  TDD-0383 (TC-0012-0371).
- `runPrototypingIterate` cycle ≥1 spec-set drift detection via
  `checkSpecsCoveredDrift`. Drift → exit 2 with stderr listing added /
  removed specs; no auto-restart at cycle 0. spec-0012 TDD-0385
  (TC-0012-0385).
- Pin `readFrozenSpecsCovered` input-order preservation and
  `buildCompletionCertificate` order propagation. spec-0012 TDD-0386
  (TC-0012-0382).
- Pin frozen SSOT immutability across cycles: mutating in-memory live
  arrays does not back-write to the persisted record; consumer
  defensive-copy contract enforced. spec-0012 TDD-0388 (TC-0012-0390).

### Added (Wave 2 — schema extensions)

- New `parseEvaluatorReview(input)` parser in
  `core/prototyping/evaluatorReview.ts` validating the v2.0 review payload:
  4 ordinal axes (`informationArchitecture` / `navigationFlow` / `usability`
  / `functionality`), 6 `*Feel` fields (`operability` / `transitionFeel`
  / `crossScreenContinuity` / `userStoryFeel` / `acceptanceCriteriaFeel`
  / `menuReachabilityFeel`), `layoutAntiPatternsDetected[]`,
  `designMdViolations[]`, and the closed nested record
  `softWarnings: { timeBudget: boolean }` (required). The flat
  `timeBudgetSoftWarning?: string` key that earlier Wave 2 drafts
  carried is no longer part of the schema and is rejected by the
  closed-schema gate — see the "BREAKING CHANGES (PR #208 —
  ReviewerPayload schema)" entry above for the authoritative
  removed/added diff.
  New constants `FEEL_FIELDS`, `FEEL_FIELD_MAX_WORDS = 200`. Named-path
  validation errors: `missing field: <name>` / `missing field: scores.<axis>`
  / `unknown field: <name>` / per-field word-count rejection. Legacy
  `buildEvaluatorReview` path untouched. spec-0012 TDD-0403/0404/0405/0406/0407
  (TC-0012-0364/0365/0366/0384/0387).
- New module `core/prototyping/handoff.ts` with `validateImageSources(input)`.
  Closed schema: each entry exactly `{url, license, attribution, source}`
  (all strings); missing/non-string fields emit
  `imageSources[N].FIELD is required` named-field errors; unknown keys
  rejected; multi-entry error aggregation. spec-0012 TDD-0408
  (TC-0012-0372).

### Deferred (tracked for follow-up)

- TDD-0384 (TC-0012-0377): per-spec `iter-NN/spec-NNNN/<screen>.review.json`
  layout migration. Requires coordinated change to `iteration.ts` SSOT
  helpers, validator path predicates, certify scan logic, and the
  iterate-plan template paths. Surgical scope exceeded; would cascade
  through 8+ existing tests. Defer to a dedicated migration wave.
- TDD-0401/0402 (TC-0012-0374/0383): Reviewer Playwright-session failure
  hard-stop + menu-entry navigation count. Requires real Playwright
  wiring; deferred to a subsequent integration cycle.

### Changed (spec / contract only — implementation lands separately)

- **`/qfai-prototyping` redefinition (CHG-002, spec-0012)**: spec pack rewritten
  per discussion-20260516144141078 (REQ-0001..0013). The new model is
  multi-spec per invocation (`resolveAllUiBearingSpecs()` replaces the
  per-invocation primary-spec selection prompt), 10-cycle budget
  (`MAX_ITERATIONS = 10`, `MAX_ITERATION_INDEX = 9`), reviewer-driven
  Playwright per spec × screen (no scripted interaction transcript, no
  PNG / HTML / `interaction.json` capture), qualitative-only convergence
  (AND across every spec × screen pair of the 4 ordinal UX axes at
  `exceptional` AND `layoutAntiPatternsDetected[]` empty AND
  `designMdViolations[]` empty — no quantitative AC-pass% /
  transition-pass% thresholds), autonomous cycle 0..9 with four
  deterministic hard-stop classes (lock drift exit 2 / Reviewer
  Playwright failure exit 64 + `sessionStatus` discriminator /
  license-verify failure exit 66 / mid-run spec-set change exit 2),
  per-spec iter-dir layout
  `iter-NN/spec-NNNN/<screen>.review.json`, cycle-0 freeze of the
  resolved spec set AND the stock-photo license-class catalog, and
  per-image license recording in
  `prototype-handoff.yaml#imageSources[]`. Phase 0 contract authored at
  `.qfai/contracts/cli/qfai-prototyping.md`. Five integration follow-ups
  captured as OQ-0012-0001..0005 in `spec-0012/08_Open-questions.md` to
  resolve before code lands.

## [1.8.9] - 2026-05-07

### Fixed (Breaking — pre-1.8.9 internal pipelines only)

- **design-system.yaml accepts the post-1.8.9 DESIGN.md token mirror**:
  `validateDesignSystem` now accepts the new mirror shape
  (`visual.colors`, `visual.typography`, `visual.radius`,
  `visual.shadow`) documented in
  `qfai-prototyping/references/handoff.md`. The legacy
  `checklist.{color,typography,...}` shape is still accepted as a
  fallback so existing projects keep validating until they regenerate
  their design-system.yaml. Without this, a freshly generated mirror
  would fail QFAI-DCON-005 before certification, blocking the
  validate → verify → certify sequence.
- **prototype-handoff.yaml string fields require non-empty scalars**:
  Each string field (`finalArtifact`, `designMdPath`, `designMdSha256`,
  `designSystemMirror`, `implementationNotes`) is now validated as a
  non-empty string. Previously the helper passed arrays / mappings as
  "meaningful content", so a handoff like `finalArtifact: { uri: "..." }`
  or `designSystemMirror: ["a.yaml", "b.yaml"]` slipped past
  QFAI-DCON-013 even though downstream consumers (`/qfai-implement`,
  certify, ref-integrity) require scalar paths. The
  `validateRequiredStringArrayKeys` helper is now removed (it was
  the source of the type-laxity).
- **prototyping ref-integrity rejects non-string handoff paths**:
  `validatePrototypingArtifactRefIntegrity` now treats
  `prototype-handoff.finalArtifact` and
  `prototype-handoff.designSystemMirror` as required, so a
  non-string or empty value produces QFAI-PROT-009 instead of
  silently passing the ref-integrity gate.
- **DESIGN.md color scanner restricted to CSS contexts**:
  `findDesignMdViolations` color scan now reads only inline `style="..."`
  values and `<style>...</style>` block content, not arbitrary HTML
  text. Previously hex literals in non-CSS contexts (`<a href="#deadbeef">`,
  SVG `url(#abc)` references, Tailwind `class="bg-[#...]"` arbitrary
  values, commit-hash prose) were flagged as DESIGN.md drift, making
  `qfai prototyping certify` reject otherwise-compliant prototypes.
- **DESIGN.md scanner strips `url(...)` fragments before color scan**:
  CSS `url(...)` invocations (SVG / filter / mask references such as
  `filter:url(#abc)` or `mask:url("#defaced")`) no longer surface their
  fragment-id as a DESIGN.md color violation. The strip-pass runs
  inside `extractCssRegions`'s output before HEX_RE / RGB_RE / HSL_RE
  match, complementing the prior CSS-context restriction.
- **DESIGN.md scanner detects mixed-case CSS property names**:
  `RADIUS_RE`, `SHADOW_RE`, and `FONT_RE` now use the `i` flag so
  `Border-Radius: 1.5rem`, `BOX-SHADOW: 0 0 8px red`, and
  `Font-Family: "Comic Sans"` are caught. CSS property names are
  case-insensitive per spec; without the flag, off-spec authored
  prototypes could leak DESIGN.md drift through the certify gate.
- **DESIGN.md scanner rejects CSS named-color keywords**:
  A new property-anchored regex (`color`, `background-color`,
  `border-color`, `outline-color`, `fill`, `stroke`, etc.) catches
  values like `color: red` / `background-color: white` / `fill: blue`.
  Previously the scanner only matched hex / rgb / hsl literals, so a
  prototype that authored `color: red` could slip past certify even
  though red is not in DESIGN.md. The check skips `transparent` /
  `currentcolor` / `inherit` / `var(...)` references; if the
  DESIGN.md authored a named color as a token (`primary: red`) the
  match is allowed. Multi-token shorthand values
  (e.g. `border-color: red blue green red` for top/right/bottom/left)
  are now split on whitespace and each token is checked
  independently, so 4-side longhand drift is no longer silent. The
  property allow-list now also includes the common shorthands
  (`background`, `border`, `border-{top,right,bottom,left}`,
  `outline`) so named colors authored as `background: red` /
  `border: 1px solid red` / `outline: 2px dashed blue` are also
  caught. Hex / rgb / hsl tokens are skipped per-token (rather than
  at the value level), so a mixed shorthand like
  `border-color: red #ff0000 blue #00ff00` surfaces every token —
  the literal scanner catches the hex tokens, and the named-color
  pass catches the keyword tokens.
- **design-system.yaml mirror values cross-checked against DESIGN.md**:
  `validateDesignSystem` now compares the mirror's
  `visual.colors.{12 keys}`, `visual.typography.{family_*3}`,
  `visual.radius.{4 keys}`, `visual.shadow.{3 keys}` against the
  parsed root DESIGN.md tokens. Each mismatch surfaces a DCON-005
  with the diverging value diff (e.g. "mirror=#FF0000, DESIGN.md=
  '#1F2937'"). Previously the mirror was shape-only (top-level
  records non-empty), so a hand-authored mirror that disagreed with
  DESIGN.md could pass `qfai validate --profile prototyping` and
  bind downstream `/qfai-implement` to a tampered identity.
- **prototype-handoff.yaml designMdPath / designMdSha256 cross-check
  against DESIGN.md.lock**: `validatePrototypeHandoff` now requires
  `designMdPath` to resolve to the repo-root DESIGN.md (accepting
  `DESIGN.md` and `./DESIGN.md`) and requires `designMdSha256` to
  be a 64-hex value equal to `DESIGN.md.lock.yaml#designMdSha256`.
  Without this, a handoff with a path pointing at an alternate file
  or a stale arbitrary sha could pass `qfai validate` while binding
  downstream `/qfai-implement` to a DESIGN.md identity that diverges
  from the frozen root lock.
- **DESIGN.md `visual.typography.scale` strict-parse**:
  `parseDesignMd` now rejects non-string and padded /
  whitespace-only typography scale values (`base: 1`,
  `base: " 1rem "`). Pre-fix, `readStringRecord` coerced numbers to
  strings and accepted padded values, so malformed type-scale
  tokens leaked into the lock and the design-system.yaml mirror
  as "validated" tokens that downstream CSS engines reject. Now
  rejected with `invalid-type` / `invalid-format` at the brand
  SSOT.
- **DESIGN.md `visual.typography.weight` numeric strict-parse**:
  `parseDesignMd` now rejects non-number values for typography
  weight tokens (`regular` / `medium` / `bold`). Pre-fix, an
  authored `regular: "400"` (quoted string) silently dropped from
  the resulting weight record, leaving the mirror cross-check with
  an empty / partial expected and accepting a handoff that lost
  authored weight tokens. Now rejected with `invalid-type` at the
  brand SSOT so the contract is enforced before downstream
  consumers see the data.
- **DESIGN.md `visual.spacing` strict-parse**: `parseDesignMd` now
  rejects `visual.spacing.base` values with leading / trailing
  whitespace (e.g. `" 0.25rem "`) at parse time, and requires
  `visual.spacing.scale` to be a finite-number array per the
  canonical `design-md-spec.md` (`scale: number[]`). Mixed
  number/string entries (`[0, "wide"]`) and non-array values are
  rejected with `invalid-type` / `invalid-format` errors. Without
  this, malformed spacing tokens could freeze into the DESIGN.md
  lock and the design-system.yaml mirror, then surface as render-
  time CSS rejections at the `/qfai-implement` step. The
  `DesignMd["visual"]["spacing"]["scale"]` type tightens from
  `Array<number | string>` to `number[]`.
- **iterate gap-check uses typed isRecord predicate**:
  `prototypingIterate.ts` corrupt-history check no longer carries a
  bare `as { index?: unknown }` assertion. A local `isRecord` user-
  defined type predicate guards `it.index` access through control-
  flow narrowing, satisfying the project rule "avoid bare `as` type
  assertions; prefer type narrowing".
- **iterate frozen-specs check compares element-wise**:
  `prototypingIterate.ts` cycle >= 1 spec-frozen check now uses
  `arraysShallowEqual` instead of comparing only the first element.
  Today `specs` is single-element, but `specsCovered` is a
  multi-element array per the prototyping.json schema, and the
  contract is "every covered spec must match across cycles" — a
  first-element-only check would silently drift on non-zero indices
  if the loop ever extends to multi-spec coverage.
- **iterate fail-fast when frozen specsCovered seed is missing**:
  Cycle >= 1 now exits 2 when `prototyping.json#specsCovered` is
  absent, empty, or contains non-string entries (i.e.
  `readFrozenSpecsCovered` returns null). Previously the null path
  was a silent skip that allowed iterate to write a fresh resolved
  spec into `iterate-plan.json` while certify later blocked on the
  same gap. Single, clear error pointing at
  `--cycle 0 --target-url <url>` to refreeze.
- **DESIGN.md scanner: shadow-embedded colors are scoped to box-shadow**:
  `collectAllowedColors` no longer widens the global color allow-set
  with literals embedded in registered box-shadow tokens. Instead,
  `scanColors` strips `box-shadow:` declarations from the cssText
  before the literal scan via a new `SHADOW_DECL_STRIP_RE`. Pre-fix,
  an unrelated `background-color: rgba(15,23,42,0.05)` would
  silently pass when the same rgba happened to appear inside a
  registered shadow value (it had been added to the global allow-
  set). The scoped fix preserves the original "shadow value with
  embedded rgba is legitimate" exemption while closing the
  cross-property leak. `scanShadow` continues to validate the full
  shadow string against `dm.visual.shadow` independently. The strip
  is intentionally box-shadow-only — `text-shadow` has no
  independent validator, so its `text-shadow:` declarations remain
  in the literal-scan input and hex / rgb / hsl drift inside a
  text-shadow value still surfaces (named-color drift in
  text-shadow is uncovered until a future spec adds a
  `dm.visual.textShadow` token contract).
- **DESIGN.md scanner: text-decoration / column-rule shorthands**:
  COLOR_PROP_RE now also captures `text-decoration` and
  `column-rule` shorthands. `text-decoration: underline red`
  (named color in the second slot) and
  `column-rule: 1px solid red` (named color in the third slot) now
  surface as DESIGN.md drift. Pre-fix only the dedicated
  `text-decoration-color` / `column-rule-color` longhands were
  caught.
- **design-system.yaml mirror: optional tokens cross-checked**:
  When DESIGN.md authors `visual.spacing`, `visual.typography.scale`,
  or `visual.typography.weight`, the mirror is now required to copy
  them verbatim — divergent values, missing keys, and fabricated
  extra keys all surface as DCON-005. Pre-1.8.9 only the required
  tokens (colors, family triple, radius, shadow) were cross-checked,
  leaving the optional sections as a silent gap. New helpers
  `crossCheckTypographyScale` / `crossCheckTypographyWeight` /
  `crossCheckSpacing` handle the heterogeneous shapes (string vs
  number values, scalar vs array). When DESIGN.md does NOT author
  these optional tokens, the mirror is also required to omit them
  — the verbatim-mirror contract is set-equal in both directions.
  A "third state" where the mirror authors a section that DESIGN.md
  does not is now rejected via dedicated
  `rejectMirrorOnlyTypographySubKey` / `rejectMirrorOnlySpacing`
  helpers.
- **designContractReadiness: bidirectional mirror cross-check**:
  `crossCheckMirrorValues` now runs in both directions. The
  DESIGN.md → mirror direction was already added; the new mirror →
  DESIGN.md direction surfaces fabricated extra keys (e.g. a
  hand-authored `visual.colors.fabricated_token: "#FF00FF"` not in
  DESIGN.md) as a DCON-005 with the rationale "the mirror must be
  a verbatim copy of DESIGN.md (no fabricated keys)". The contract
  is now structurally enforced: the mirror's per-section key set
  must be set-equal to DESIGN.md's. The reverse loop accepts an
  `optionalKeys` whitelist so legitimate nested optional sub-keys
  (`typography.scale`, `typography.weight`) handled by dedicated
  helpers do not surface as fabricated false-positives.
- **designContractReadiness: handoff cross-check skips placeholders**:
  The `designMdPath` / `designMdSha256` cross-check skip predicate
  now also excludes `PLACEHOLDER_RE` matches (`tbd`, `todo`, `n/a`,
  etc.). Pre-fix, an operator who left `designMdPath: TBD` saw two
  DCON-013 entries for the same authoring fix — once from the
  upstream string-field gate (which already rejects placeholders),
  once from the cross-check ("TBD is not DESIGN.md"). Post-fix,
  the cross-check defers to the upstream gate; only one DCON-013
  fires per placeholder field.
- **designContractReadiness: parse DESIGN.md even without lock**:
  `parseDesignMd` is no longer gated on `lockText !== null`. A
  UI-bearing project in the common initial state (DESIGN.md
  authored but malformed, lock not yet generated) now surfaces both
  DCON-031 (missing lock) AND DCON-033 (parse failure), pointing
  the operator at the file that actually needs repair. Pre-fix,
  only DCON-031 fired and `/qfai-sdd Phase 0` would keep failing
  on the invalid front-matter without the validator naming it.
- **specsCovered SSOT module**: `readFrozenSpecsCovered` is now a
  single shared helper at
  `core/prototyping/specsCovered.ts`. Both `prototypingIterate`
  (cycle >= 1 hash gate) and `prototypingCertify` (final-spec
  resolution) import it. Pre-1.8.9 each command had its own copy
  of the predicate, with the comment "same shape as the helper in
  prototypingCertify" — the SSOT consolidation removes the manual
  shape-mirror obligation and adds dedicated unit tests for the 4
  null trigger paths.
- **renderCritique reads the canonical prototyping.json path**:
  `collectRenderEvidenceViewports` now imports
  `PROTOTYPING_JSON_REL` (`.qfai/evidence/prototyping/prototyping.json`)
  instead of the pre-1.8.9 hard-coded
  `.qfai/evidence/prototyping.json`. Without this, viewport
  metadata written by iterate / validate at the canonical path was
  invisible to render-critique and surfaced as spurious
  QFAI-CRIT-003/004 even when the iter HTML had the right viewport
  entries.
- **DESIGN.md typography scale/weight allowlist**: `parseDesignMd()`
  now rejects unknown nested keys under `visual.typography.scale`
  (allowed: `xs sm base lg xl 2xl 3xl`) and
  `visual.typography.weight` (allowed: `regular medium bold`),
  matching the canonical spec. Authored extras (`scale.hero`,
  `weight.black`) no longer freeze into the lock while iteration /
  certification ignore them.
- **prototype-handoff.yaml `finalIterIndex` error message accuracy**:
  The DCON-013 message now distinguishes missing-field vs invalid-
  type/value cases. Operators who DID write the field but with the
  wrong type/range no longer see "missing required field"
  (Principle of Least Astonishment); they see "must be a non-negative
  integer (got X)".
- **certify enforces per-screen HTML in the accepted iter (multi-screen)**:
  `qfai prototyping certify` now reads UI contracts via
  `readUiContractScreenContracts` and rejects with exit 2 when any
  declared screen lacks a matching `<screenId>.html` in the
  accepted iter dir. Previously a stale older
  `iter-NN/<missing-screen>.html` could let `validate` stay green
  (validateUiEvidenceArtifacts accepts a screen file from any iter
  directory), and certify would seal the run as long as the
  accepted iter had at least one HTML — closing that gap.
- **iterate rejects mid-loop primary-spec change**:
  `qfai prototyping iterate --cycle N` (N >= 1) now compares the
  resolved primary spec against the frozen
  `prototyping.json#specsCovered`. A mismatch (e.g.
  `prototyping.primarySpecId` was edited or a new `surface_type:
ui-bearing` marker landed mid-loop) exits 2 — preventing the
  scenario where iterations write the new spec into
  `iterate-plan.json` while certify keeps reporting the frozen one.
- **iterate detects corrupt iterations history**:
  Before deriving the expected next cycle from `iterations.length`,
  `runPrototypingIterate` now confirms `iterations[i].index === i`
  for every entry. A hand-edited or partially-corrupted
  `prototyping.json` (e.g. `iterations.length === 3` but
  `iterations[2].index === 5`) exits 2 at the command boundary,
  rather than letting the validator's per-index check produce a
  delayed cryptic error one cycle later.
- **iterate diagnostic message tightened**: The out-of-sequence
  error message no longer repeats the same number twice
  ("must be 5 (next sequential index after iterations.length=5)").
  New form: "expected --cycle N (iterations.length=N); got --cycle X.
  Re-run with the expected cycle, or restart the loop with
  `--cycle 0 --target-url <url>`." The hint now includes the
  `--target-url` requirement so the operator does not fall into a
  second exit-2 on the restart path.
- **`prototyping iterate` rejects out-of-sequence cycles**: Calling
  `qfai prototyping iterate --cycle N` when `iterations.length !== N`
  now exits 2 with a message naming the expected cycle. Previously a
  call like `--cycle 3` after only `iter-00` was recorded would
  silently create an `iter-03/iterate-plan.json` that the validator
  later rejected (`iterations[i].index === i` invariant), blocking
  validation/certification with a delayed cryptic error. The check
  runs AFTER `shouldStop`, so converged or max-budget loops still
  return their 64/65 stop reason cleanly.
- **DESIGN.md nested unknown-key reject (colors/radius/shadow)**:
  `parseDesignMd()` now rejects unknown keys nested under
  `visual.colors`, `visual.radius`, and `visual.shadow` at parse
  time (not just at validate time). Previously
  `readStringRecord` silently dropped non-scalar values
  (`visual.colors.gradients: [...]`, `visual.radius.breakpoints: {...}`)
  before the validator could see them, so the offending directive
  would freeze into the lock without surfacing a parse error. New
  TC-1.1.22..24 anchor the contract.
- **`RejectScope` discriminated union**: The `rejectUnknownKeys`
  helper's scope parameter is now a discriminated union of
  `{ kind: "root" }` and `{ kind: "section"; name; path }`. The
  prior shape carried a dead `name: ""` placeholder for the root
  invocation; the union form makes that unrepresentable, and TS
  exhaustiveness checks every callsite.
- **`finalIterIndex` numeric handling in prototype-handoff validator**:
  `validatePrototypeHandoff` now treats `finalIterIndex` as a
  numeric field (`Number.isInteger && >= 0`) rather than forwarding
  it through `hasMeaningfulContractContent`, which only accepts
  strings/arrays/records. Without this, every spec-conformant
  `prototype-handoff.yaml` (where `finalIterIndex` is a YAML number)
  would fail QFAI-DCON-013 and block the validate → verify → certify
  sequence. New positive test asserts well-formed handoff produces
  zero DCON-013 issues; new negative tests assert non-integer and
  negative values are still rejected. The handoff sample
  (`assets/init/.../prototype-handoff.sample.yaml`) is updated to the
  new field set so `qfai init` ships a passing example.
- **`designSystemMirror` ref-integrity check (was extractedDesignSystem)**:
  `validatePrototypingArtifactRefIntegrity` now checks
  `prototype-handoff.yaml#designSystemMirror`, matching the renamed
  field. The previous code checked the legacy `extractedDesignSystem`
  name, so a handoff that pointed `designSystemMirror` at a missing
  artifact was silently passed by ref-integrity (only DCON-013 from
  the readiness validator caught the missing field, and the missing-
  TARGET case slipped through entirely). New positive test seeds a
  handoff with a missing `designSystemMirror` target and asserts
  PROT-009 surfaces the field name + path.
- **prototype-handoff.yaml validator aligned with new contract**:
  `validatePrototypeHandoff` now requires `finalIterIndex`,
  `finalArtifact`, `designMdPath`, `designMdSha256`,
  `designSystemMirror`, `implementationNotes` — the fields documented
  in `qfai-prototyping/references/handoff.md`. The legacy
  multi-option fields (`sourcePrototypeRefs`, `surfaceProfiles`,
  `screens`, `visualDna`, `implementationHandoff`) are retired
  together with the preserve/adapt/copy split, since the loop became
  single-thread when DESIGN.md became the brand SSOT. Pre-1.8.9
  pipelines that wrote a handoff with the legacy field names will
  now fail QFAI-DCON-013 and must be re-run from the new handoff
  authoring step in `/qfai-prototyping`.
- **DESIGN.md `visual.spacing` unknown-key reject**:
  `parseDesignMd()` now rejects unknown keys under `visual.spacing`
  (e.g. `gutter`, `density`) with the same `unknown-key` ParseError
  shape as the other sections. Allowlist: `base`, `scale`. New
  TC-1.1.21 anchors the contract.
- **assets/ retired-sidecar reference sweep + guard**: Migrated 6
  more `assets/` doc files (14_Review-Request.md L38/L40/L41,
  product-experience-architect.md L31, contract-artifact-rules.md L12,
  comparison-review.md L8, contracts-review.md L25, scoring-review.md
  rewritten) so distributed surfaces stop pointing operators at the
  retired `33_exploration_rubric.md` / `34_evaluator_calibration.md`
  sidecars. Added a guard test in `uiuxSidecar.test.ts` that
  greps every `assets/**/*.md` for the forbidden phrases
  (`exploration brief|rubric` / `evaluator calibration` /
  `33_exploration_rubric` / `34_evaluator_calibration`) and only
  whitelists the two warning lines in `00_index.md` Forbidden
  Legacy Files. Future partial fixes will fail this test in CI.
- **DESIGN.md `rejectUnknownKeys` SSOT**: New
  `rejectUnknownKeys(record, allowed, pathPrefix, sectionLabel)`
  helper in `core/design/designMd.ts` replaces 6 inline copies of
  the unknown-key reject pattern (root, `brand`, `visual`,
  `visual.typography`, `audience`, `accessibility`). Each call site
  is now `const err = rejectUnknownKeys(...); if (err) return { error: err };`.
  Future spec sections that grow a new key add their allowlist + a
  single `rejectUnknownKeys` call rather than copy-pasting the
  filter / first-match / ParseError shape.
- **DESIGN.md `accessibility` unknown-key reject**: `parseDesignMd()`
  now rejects unknown keys under `accessibility` (e.g. `focus_ring`,
  `reduced_motion_details`) with the same `unknown-key` ParseError
  shape as the other sections. Allowlist: `contrast_ratio_min`,
  `motion`. Closes the final remaining gap in the "Unknown keys at
  any level are rejected" contract — every section (`brand`, `visual`,
  `visual.typography`, `audience`, `accessibility`) and the root now
  enforce it.
- **DESIGN.md root unknown-key reject**: `parseDesignMd()` now rejects
  unknown root-level keys (e.g. `platform:`, `references:`) with the
  same `unknown-key` ParseError shape as `visual` / `visual.typography`
  / `audience`. Allowlist: `brand`, `visual`, `audience`, `accessibility`.
  Closes the last gap in the "Unknown keys at any level are rejected"
  contract.
- **DESIGN.md shadow whitespace reject**: `validateDesignMd` now
  rejects leading/trailing whitespace in `visual.shadow.{sm,md,lg}`
  (new `invalid-shadow-format` code), matching the existing color /
  font / radius byte-anchored validation. Otherwise certify's
  exact-string box-shadow comparison can flag compliant CSS as drift
  because the token froze a stray-whitespace variant.
- **DESIGN.md `audience` unknown-key reject**: `parseDesignMd()` now
  rejects unknown keys under `audience` (e.g. `audience.references`)
  with the same `unknown-key` ParseError as `visual` and
  `visual.typography`. Previously such keys were silently dropped
  from the parsed tokens consumed by iteration / certify while still
  being hashed into `DESIGN.md.lock.yaml`, letting authors freeze
  directives that the parser ignored.
- **canonical sidecar pruning end-to-end**: The init template
  surfaces (`uiux/00_index.md` File Inventory,
  `uiux/50_review_input_bundle.md` Bundle Contents,
  `14_Review-Request.md` reviewer checklist,
  `qfai-sdd/references/ui-design-contract-normalization.md`,
  `assets/uix-rev/scoring-review.md`) no longer reference the
  retired `33_exploration_rubric.md` / `34_evaluator_calibration.md`
  sidecars. The previous validator-only fix left a documented
  expectation that operators create the deleted sidecars, which then
  fell into the legacy-format guard. Reviewer alignment is now
  pinned to the four canonical UX axes fixed in
  `core/prototyping/evaluatorReview.ts#ORDINAL_AXES`.
- **shared `isEnoent` errno helper**: New `src/core/fs/errno.ts`
  exports `isEnoent(err: unknown): boolean` and is now the SSOT for
  all 11 ENOENT narrowing call sites in the package: `init.ts`,
  `core/config.ts`, `core/specLayout.ts`, `cli/commands/report.ts`,
  `cli/commands/prototypingIterate.ts`, `core/calibration/loader.ts`,
  `core/validators/atddLedger.ts`,
  `core/validators/requirementsContext.ts`,
  `core/validators/reviewArtifacts.ts`,
  `core/validators/reviewGate.ts`,
  `core/validators/uix/designSystemPresence.ts`,
  `core/validators/uix/foundation.ts`. The legacy
  `isMissingFileError` alias in `core/validators/utils.ts` is removed.
  Future errno codes (`EACCES`, `EBUSY`, `EPERM`, ...) extend
  `errno.ts` rather than sprouting new inline checks.
- **forbidden legacy file patterns extended**: `threeLayer.ts#FORBIDDEN_LEGACY_PATTERNS`
  now matches `^3[34]_.*\.md$` (covers `33_exploration_rubric.md`
  and `34_evaluator_calibration.md`). Operators following stale docs
  who recreate either file now hit `UIX-VAL-3LAYER-FORBIDDEN-FILE`
  at validate time instead of being silently ignored. The init
  template surfaces (`uiux/00_index.md` Forbidden Legacy Files,
  `uiux/50_review_input_bundle.md` Trend-derived focus + Review
  Checklist) updated to match.
- **certify reads frozen `specsCovered` from cycle 0**:
  `qfai prototyping certify` no longer re-resolves the primary spec
  via `resolvePrimaryPrototypingSpec`. It now reads
  `prototyping.json#specsCovered` (seeded by `iterate --cycle 0`)
  and fails fast when the slot is missing, malformed, or empty.
  A config edit (`prototyping.primarySpecId`) or a new
  `surface_type: ui-bearing` marker landing between cycle 0 and
  certify can no longer silently re-baseline the certificate to a
  spec the loop never exercised. The cycle 0 seed is the SSOT for
  what was actually reviewed.
- **DESIGN.md font violation regex respects style attribute boundary**:
  `findDesignMdViolations` font scan no longer captures past the
  enclosing inline-style quote. Previously
  `<div style="font-family: Inter" class="card">` resolved to
  `Inter" class="card"` (because `[^;}<>]+` allowed the trailing
  attribute quote inside the value), which made `fontMatches` reject
  an otherwise-allowed family and could fail compliant generated HTML
  during `qfai prototyping certify`. The regex now models CSS
  font-family as a comma-separated list of either fully-quoted
  strings or unquoted tokens, so `"Comic Sans"` inside a `<style>`
  block still resolves correctly.
- **DESIGN.md overlay alpha accepts `1.0` / `1.00` (CSS-equivalent to `1`)**:
  The strict overlay regex introduced earlier accepted only the
  integer `1`, surprising authors writing the CSS-equivalent
  `rgba(0,0,0,1.0)` and rejecting templates that already used the
  decimal form. Alpha branch is now `0|1(?:\.0+)?|0?\.\d+`, which
  also collapses the dead `\.\d+` alternation that was a subset of
  the existing `0?\.\d+` branch.
- **prototyping handoff order documented end-to-end**: Cross-doc drift
  in the `qfai-prototyping/references/handoff.md` "Cert" section and
  `qfai-verify/SKILL.md` reviewer-gate checklist is fixed: the
  handoff reference now spells out the validate → /qfai-verify →
  certify order with the explicit precondition that certify requires
  both gate files in place; the verify reviewer-gate no longer asks
  the reviewer to confirm the completion-certificate (which only
  exists AFTER verify in the new order).
- **threeLayer canonical sidecar family pruned**: `validateThreeLayerModel`
  / `validateThreeLayerFamilyCompleteness` no longer require
  `33_exploration_rubric.md` and `34_evaluator_calibration.md`. These
  sidecars were retired when DESIGN.md became the brand SSOT and the
  evaluator axes were fixed (`ORDINAL_AXES`); they are no longer
  generated by `qfai init`. Discussion packs created from current init
  assets used to fail `qfai validate --profile discussion` because the
  validator demanded the deleted files. Canonical family is now
  `00_index.md`, `40_screen_contracts.md`, `50_review_input_bundle.md`.
- **prototyping cycle 0 stale-state cleanup hardened**:
  `qfai prototyping iterate --cycle 0` now also unlinks any stale
  `.qfai/evidence/prototyping/completion-certificate.json` (so
  consumers reading the cert during the reset window do not observe
  the prior loop's signoff). The iter-NN cleanup is now restricted
  to actual directories (a stray non-dir entry matching the regex is
  preserved) and surfaces an `info()` hint when a removal fails (e.g.
  Windows file lock) so the operator notices the leftover instead of
  silent rot. The cert cleanup treats ENOENT as silent.
- **DESIGN.md overlay regex tightened**: `visual.colors.overlay` now
  validates against an `rgba(R,G,B,A)`-only pattern with R/G/B in
  0..255 and alpha in `{0, 1, 0.x, .x}`. The previous shared regex
  `^rgba?\(...\)$` accepted the alpha-less `rgb(...)` form even though
  the distributed DESIGN.md spec and the validator's own error message
  both reserved overlay for `rgba(...)`. Hex (6 or 8-digit) is also
  rejected for overlay; only the explicit-alpha rgba literal is valid.
- **DESIGN.md typography unknown-key reject**: `parseDesignMd()` now
  rejects unknown keys under `visual.typography` (e.g. `font_pairing`,
  `fallback_policy`) with the same `unknown-key` ParseError as the
  visual top level. Previously such keys were silently dropped from
  the parsed tokens consumed by iteration and certification while
  still being hashed into `DESIGN.md.lock.yaml`.
- **prototyping cycle 0 hard-reset includes legacy `fullHarness`**:
  `qfai prototyping iterate --cycle 0` now also deletes a stale
  `fullHarness` block (legacy pre-UX-loop schema) alongside the
  existing `iterations` / `reviewerGate` / `acceptedIterationIndex`
  / `stopReason` reset. Pre-1.8.9 projects that retained
  `fullHarness.{runId,status,scoringTrace,...}` could otherwise show
  prior-loop completion data in `validate` / `report` surfaces
  (PROT-329 etc.) alongside the freshly-frozen loop.
- **prototyping certify ↔ iter binding**: `prototypingCertify` now anchors
  the final-iteration HTML scan to
  `prototyping.json#iterations[iterations.length - 1]` instead of the
  highest-indexed `iter-NN/` directory found on disk. After a
  `qfai prototyping iterate --cycle 0` reset, stale `iter-NN/` directories
  from a prior loop could otherwise survive on disk; the previous
  filesystem-max resolver would scan and digest those stale artifacts as
  the "final" iteration, binding the completion certificate to evidence
  the current reviewer gate did not approve. As defense-in-depth,
  `prototypingIterate --cycle 0` also deletes any pre-existing
  `iter-NN/` directories under `.qfai/evidence/prototyping/` during its
  hard-reset; non-iter siblings (e.g. operator notes) are preserved.
- **prototyping path SSOT**:
  `validators/prototyping/completionCertificate.ts#isCompletionClaimed`
  was reading the legacy `.qfai/evidence/prototyping.json`, silently
  bypassing QFAI-PROT-335 / QFAI-PROT-336 in the new UX-loop
  pipeline. The validator now reads the canonical
  `.qfai/evidence/prototyping/prototyping.json` (matching the
  `iterate` / `certify` writers), and a new
  `src/core/prototyping/paths.ts` exports `PROTOTYPING_JSON_REL`
  consumed by all 6 prior literal sites. Pipelines that previously
  passed `validate` while claiming completion without a certificate
  will now correctly emit QFAI-PROT-335 — re-run
  `qfai prototyping certify` to seal a valid certificate.

### Changed (BREAKING)

- **spec layout**: spec-0017 (CAP-0017 v2.0 single-thread evolution loop / UX-loop redesign) decomposed into spec-0012 (primary) + spec-0004 (validators) + spec-0010 (discussion) + spec-0011 (implement) + spec-0013 (sdd) + spec-0014 (verify) + spec-0015 (agent routing) + spec-0007 (guardrails). CAP-0017 absorbed into CAP-0012. `.qfai/specs/spec-0017/` and `CAP-0017` permanently retired (gap reserved per slice-policy §ID 安定性ルール 5). Backward compatibility intentionally NOT preserved.
- **spec-0012 v1.x purge**: legacy AC-0012-0011..0019, BR-0012-0011..0016, EX-0012-0090..0097/0108..0109, TC-0012-0287..0288/0297..0309/0314..0318, DR-0012-0004/0006/0007/0008/0009/0011 removed. EX-0012-0098..0102 (Delegation Scope, Validate/Verify Gates, Non-UI Exclusion, Legacy Traceability Space) remain active. mode budgets / `fullHarness.iterations[]` / `scoringTrace[]` / `allReviewerAxesPerfect100` / weighted-total scoring / r5/r3/r2/r1 round funnel / hard-floor evaluation-rubric enforcement are no longer in the active spec surface.
- **`designContractReadiness` / `doctor` lock-sha contract tightened**: `DESIGN.md.lock.yaml#designMdSha256` is now required to be a 64-character hex string (case-insensitive, normalized to lower-case). Previously the validator path accepted any non-empty string and silently disagreed with the doctor path (regex-anchored 64 hex). Existing locks generated by `/qfai-sdd` Phase 0 are 64-hex by construction; manually-edited locks with placeholder or shortened sha values now surface as DCON-031 instead of slipping through validate. The new `src/core/design/designMdLock.ts#readDesignMdLockSha` is the single SSOT extractor and is consumed by `doctor.ts`, `validators/designContractReadiness.ts`, `cli/commands/prototypingIterate.ts`, and `cli/commands/prototypingCertify.ts`.

This release also rewrites `qfai-prototyping` around a single root
`DESIGN.md` brand source of truth, swaps the evaluator axes for a
UX-focused set, and removes the visual-aesthetic anti-slop registry
together with the legacy UI-bearing sidecars and yaml contracts.
Backward compatibility is intentionally not preserved.

### Breaking changes

- **DESIGN.md is the single source of truth for brand visual identity.**
  `qfai init` now writes a `DESIGN.md` template at the consuming-project
  root (front-matter tokens for colors / typography / spacing / radius /
  shadow plus a `# Brand Philosophy` body). `/qfai-discussion` drafts it
  and `/qfai-sdd` Phase 0 freezes it into
  `.qfai/contracts/design/DESIGN.md.lock.yaml` (sha256 + frozen schema
  tokens). `/qfai-prototyping` and `/qfai-implement` consume the root
  `DESIGN.md` plus the lock file in place of the previous yaml contracts.
  Existing `--force` invocations of `qfai init` do not overwrite an
  existing `DESIGN.md`.
- **Evaluator axes swapped (UX-focused).** The four ordinal review axes
  change from `designQuality` / `originality` / `craft` / `functionality`
  to `informationArchitecture` / `navigationFlow` / `usability` /
  `functionality`. `designQuality` is replaced by a hard
  `designMdViolations` gate over the final iteration HTML;
  `originality` is dropped (branding is frozen up-front);
  `craft` is absorbed into `usability`. `prototyping.json` reviews,
  `evaluatorReview` output, and the renamed cap field
  `layoutAntiPatternsDetected` (was `slopPatternsDetected`) are not
  backward compatible with prior runs — existing artifacts must be
  regenerated.
- **shadcn / visual-aesthetic anti-slop set removed.** `slop-001-shadcn-zinc`,
  `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`,
  and `slop-010-rounded-2xl-shadow-lg` are deleted; the entire
  `designSlop` validator (which scanned discussion-pack markdown) is
  removed. Their concerns are now enforced by the DESIGN.md compliance
  gate on iter HTML. A new layout-anti-pattern set `lap-001..lap-008`
  ships in its place (`packages/qfai/src/core/validators/layoutAntiPatterns.{ts,json}`),
  scoped to prototyping iter HTML and capping
  `informationArchitecture` at `acceptable` on detection. The
  `slop-*` ID namespace is no longer issued.
- **Legacy UI-bearing sidecars deleted.** The qfai-discussion
  templates `uiux/30_exploration_brief.md`, `uiux/31_reference_pool.md`,
  and `uiux/32_design_anti_goals.md` are removed. Their content is
  now expressed directly in `DESIGN.md` (front-matter tokens plus the
  `audience.do_not_look_like` field and the `# Brand Philosophy` body).
  Discussion artifact rules and the UI-bearing playbook no longer list
  these files as required outputs.
- **Legacy yaml design contracts deleted.** The qfai-sdd templates
  `contracts/brand-design.sample.yaml`,
  `contracts/exploration-brief.sample.yaml`, and
  `contracts/reference-pool.sample.yaml` are removed.
  `designContractReadiness` no longer requires these files; the
  required-files set becomes root `DESIGN.md` plus
  `.qfai/contracts/design/DESIGN.md.lock.yaml`. The DCON validator
  IDs tied to the deleted yaml are renumbered (gap-allowed): new
  `DCON-030` / `DCON-031` / `DCON-032` are added for the DESIGN.md
  surface, while the prior `DCON-002` / `DCON-003` / `DCON-004` /
  `DCON-006` / `DCON-007` / `DCON-008` / `DCON-010` / `DCON-011` /
  `DCON-014` / `DCON-015` / `DCON-016` / `DCON-017` / `DCON-018` /
  `DCON-020` / `DCON-021` slots are vacated. The `qfai-implement`
  Read order is rewritten to consume root `DESIGN.md` and
  `DESIGN.md.lock.yaml` instead of the deleted yaml contracts.

### Added

- `qfai prototyping iterate` records the root `DESIGN.md` sha256 in
  `prototyping.json` at cycle 0 and exits 2 on any subsequent cycle
  whose recomputed hash diverges from either the cycle-0 value or the
  `DESIGN.md.lock.yaml` value (DESIGN.md is frozen for the duration of
  a loop; edit and rerun from cycle 0 to change brand).
- `qfai prototyping certify` enforces a DESIGN.md compliance gate by
  running `findDesignMdViolations` over the final iter HTML; certification
  fails if any color / font / radius / shadow value falls outside the
  DESIGN.md token set.
- `qfai doctor --profile prototyping` adds three preflight checks for
  the prototyping profile: `designMdRoot` (root `DESIGN.md` exists and
  parses), `designMdLock` (`.qfai/contracts/design/DESIGN.md.lock.yaml`
  exists and parses), `designMdSha` (the lock sha matches the live
  file). `qfai prototyping preflight` aliases this profile.
- New core module `src/core/design/designMd.ts` (`parseDesignMd`,
  `validateDesignMd`, `hashDesignMd`) and
  `src/core/prototyping/designMdViolations.ts` (`findDesignMdViolations`).

### Fixed

- Copilot code review reviewer assignment migrated from REST
  `requested_reviewers` (silently ignored by GitHub since the
  late-April 2026 Copilot platform tightening) to GraphQL
  `requestReviews.botIds`. The workflow now requires the `GH_TOKEN`
  repo secret to be a fine-grained PAT with `Pull requests: write`;
  the default `GITHUB_TOKEN` is no longer accepted for bot reviewer
  assignment.
- `bestSubjectMatch` excludes `Scope > Out:` tokens from the overlap
  haystack. Subjects that a spec explicitly declares as out-of-scope
  must not bias the closest-match selection (otherwise append-first
  could route a REQ onto a spec that has already disowned the subject).
- `classifyTriage` `removalHint` branch now mirrors the additive path
  and emits `MERGE` (with a removal-intent rationale) when a REQ matches
  multiple capability-keyed specs, rather than silently collapsing onto
  `capabilityMatches[0]` and dropping the cascade across the other
  matched specs.

## [1.8.8] - 2026-05-02

Strengthens `/qfai-sdd` so that, when specs already exist and a new
requirement arrives, the skill chooses the right granularity
(create / append / modify / remove / delete / split / merge / supersede)
through a deliberate Stage 1 Triage step rather than implicit
subject-existence checks. The classifier is biased to **append-first**:
default to UPDATE on an existing active spec; CREATE is reserved for
genuine scope deviations that introduce a new capability. Also
introduces the cross-AI rules master at `.agents/rules/` and the
branch-name version-pin guard, plus the distributed-surface
`schemaVersion` / internal-version-marker scrub.

### Removed (BREAKING)

- `prototyping.json` and `completion-certificate.json` no longer carry a
  `schemaVersion` field; validators no longer read it. Pre-1.8.8 artifacts
  must be regenerated.
- Validator error code prefix `QFAI-PROT2-NNN` collapsed to `QFAI-PROT-NNN`
  with renumbered slots (the schemaVersion gate is removed; remaining six
  codes are renumbered contiguously).
- Validator entry point `validatePrototypingEvidenceV3` renamed to
  `validatePrototypingEvidence`; the prior empty stub of the same name is
  removed. Test files renamed in lockstep.
- Internal QFAI spec IDs (spec-0010..) and internal version markers
  (v1.x, v2.0, v3.0) removed from `README.md`, CLI help, `report.md`
  output, validator messages, and `qfai init` templates under
  `assets/init/**`. The npm package version is the only canonical
  version surface.
- `packages/qfai/docs/MIGRATION-2.0.md` and `MIGRATION-1.8.4.md` removed.
- `packages/qfai/scripts/check-no-legacy-concepts.sh` removed.

### Added

- `packages/qfai/scripts/check-no-internal-version-leakage.sh` — CI guard
  that fails if QFAI-internal spec IDs, version markers, internal trace
  IDs, or `schemaVersion` fields appear in distributed surfaces (README,
  assets, dist).
- `/qfai-sdd` Stage 1 Triage: a mandatory step between preflight and
  Phase 0 (Contracts-first). Documented in
  `assets/init/.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`
  and wired into the execution playbook and phase checklists.
- 8 first-class triage operations: CREATE, UPDATE:APPEND / MODIFY /
  REMOVE, DELETE, SPLIT, MERGE, SUPERSEDE. CREATE / DELETE / SPLIT /
  MERGE / SUPERSEDE / UPDATE:REMOVE require AskUserQuestion approval.
- Spec lifecycle `Status:` bullet on every `01_Spec.md`
  (`active | superseded | deprecated | removed`) with
  `Superseded-by:` and `Deprecated-at:` companions.
- New validator codes:
  - `QFAI-STATUS-001..006` — spec lifecycle status field validation
    (missing / invalid enum / superseded chain / deprecated date).
  - `QFAI-TRIAGE-001..005` — `## Triage` section structure on
    `09_delta.md` and `_policies/10_delta.md` (warning when missing,
    errors for missing columns / invalid Operation / invalid Sub-op /
    missing approval).
  - `QFAI-TRIAGE-006` — every CREATE row must cite a `CAP-NNNN` in the
    Rationale column AND that capability must already be registered in
    `_policies/03_Capabilities.md`.
- Core helpers `src/core/specSummary.ts` (`collectSpecSummaries`) and
  `src/core/sddTriage.ts` (`classifyTriage`, `renderTriageMarkdown`,
  `requiresApproval`, `bestSubjectMatch`). Internal helpers
  (`tokenize`, `overlapCount`, `topLevelOp`, `subOp`) are not part of
  the public API surface.
- Append-first principle and impact-cascade pattern documented across
  `assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md`,
  `references/sdd-triage.md`, `references/sdd-execution-playbook.md`,
  `references/sdd-phase-checklists.md`, and
  `templates/specs/_policies/11_Slice-Policy.md`.
- Cross-AI rules master at `.agents/rules/`. Existing rules
  (`distributed-surface`, `root-additions-policy`, `temporary-files`)
  are migrated here from `.claude/rules/`; the original paths are kept
  as symlinks so existing references continue to resolve.
- New rule `version-discipline.md` (master at `.agents/rules/`):
  branch-name version pin and the prohibition on AI-driven
  `package.json#version` bumps / `chore(release):` commits. Surfaced
  to every AI tool via `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`,
  and `.codex/README.md`.
- Surface test `tests/integration/agentsRulesSurface.test.ts` verifying
  the master/symlink layout and entrypoint references.
- Automated guard `packages/qfai/scripts/check-branch-version-pin.sh`
  enforcing the version-discipline rule: extracts the SemVer from the
  current branch name and fails if it disagrees with
  `packages/qfai/package.json#version`. Wired into the CI lint job
  (alongside the existing distributed-surface leakage guard) and
  exposed as `pnpm --filter qfai run lint:branch-version` for local
  use. `VERSION_PIN_SKIP=1` can override for coordinated release PRs.
- Test coverage `tests/scripts/checkBranchVersionPin.test.ts`
  (8 cases: matching SemVer, suffix tolerance, mismatch failure,
  no-SemVer skip on `main`/`chore/*`, override env, PR-context
  `GITHUB_HEAD_REF` precedence).
- Templates updated:
  `templates/specs/spec/01_Spec.md` declares `Status: active`;
  `templates/specs/spec/09_delta.md` and
  `templates/specs/_policies/10_delta.md` ship a `## Triage` skeleton;
  `templates/specs/_policies/11_Slice-Policy.md` rewritten to the
  8-operation table with the APPEND-vs-CREATE algorithm and
  size-threshold rules.
- Test coverage: `tests/core/parseSpecStatus.test.ts`,
  `tests/core/specSummary.test.ts`, `tests/core/sddTriage.test.ts`,
  `tests/validators/specPack/statusValidation.test.ts`,
  `tests/validators/specPack/triageSection.test.ts`,
  `tests/integration/sddTriageSection.test.ts`,
  `tests/integration/sddSkillTriagePhase.test.ts`.

### Changed

- CI workflow runs the new leakage guard in both the lint job (assets +
  README) and the build job (post-build, including dist).

### Changed (BREAKING)

- Every `01_Spec.md` MUST declare a valid `Status:` bullet. Specs
  without a Status now fail validation with `QFAI-STATUS-001`.
  Operational specs in this repository are migrated to
  `Status: active`.
- `_policies/11_Slice-Policy.md` (template + operational) is rewritten
  around the 8-operation triage model. The legacy 3-row table
  (CREATE / UPDATE / DELETE only) is removed.
- `validateStatusInSpecs` is renumbered from `QFAI-STATUS-001` to
  `QFAI-STATUSLEAK-001` to free the `QFAI-STATUS-NNN` namespace for
  the new spec lifecycle validator. The validator no longer matches
  the bare `status:` token because the new `Status:` bullet is a
  legitimate definition-level field; other operational fields
  (`progress`, `risk_state`, `review_gate`, `last_updated_at`,
  `release_candidate`) continue to fire `QFAI-STATUSLEAK-001`.
- `assets/init/.qfai/assistant/skills/qfai-sdd/SKILL.md` rewritten as
  a Stage 0 / Stage 1 / Phase 0..4 surface (346 -> 238 lines). Detailed
  procedure pulled out into `references/sdd-triage.md`,
  `references/sdd-execution-playbook.md`, and
  `references/sdd-phase-checklists.md`.
- `classifyTriage` is biased to APPEND-first. When a REQ's capability
  does not match any active spec exactly, the classifier falls back to
  UPDATE:APPEND on the spec whose title / scope / capability shares the
  most subject tokens, upgrading to SPLIT if the closest spec exceeds
  AC/TC thresholds. CREATE is only emitted when there is **zero** token
  overlap with any active spec.
- The runtime slice policy (template + operational) leads with a
  "Principle (read first)" block and the APPEND-vs-CREATE algorithm
  has an explicit subject-overlap fallback step plus a CREATE step
  that requires citing a registered `CAP-NNNN`.

## [1.8.7] - 2026-05-02

### Added

- `qfai prototyping iterate --cycle <n>` driver for the single-thread design evolution loop. Exit codes 0 / 64 / 65 / 2 (continue / convergence / max-iterations / input error).
- `core/prototyping/iteration.ts` — `Iteration`, `OrdinalScore`, `PivotDirective`, `shouldStop()`, `MAX_ITERATIONS = 15`, path helpers.
- `core/prototyping/evaluatorReview.ts` — 4-axis ordinal review (200–500 word prose critique, anti-slop cap on `originality`).
- `core/validators/prototypingEvidence.ts` — schema validator with `QFAI-PROT-NNN` error codes (collapsed and renamed in 1.8.8).
- `qfai-prototyping/references/{iteration-loop,generator-prompt,reviewer-prompt,handoff}.md` references.
- `packages/qfai/scripts/check-no-legacy-concepts.sh` — CI sanity grep for re-introduction of legacy concepts.
- A migration guide was published with this release and removed again in 1.8.8.
- `tests/e2e/prototypingE2E.test.ts` — end-to-end iter-00..iter-03 cycle (renamed in 1.8.8).

### Changed (BREAKING)

- `prototyping.json` schema rewritten: `iterations[]` replaces the prior `rounds[]` / `polishCycles[]` / `bestOfHistory` / `breakthrough` / `mode` / `fullHarness` shape. Old runs fail to load.
- `completion-certificate.json` schema rewritten (`polishCycleCount` removed).
- `/qfai-prototyping` SKILL.md rewritten as the single-thread loop with global anti-slop pattern list.
- `/qfai-discussion`, `/qfai-sdd`, `/qfai-implement`, `/qfai-verify` SKILL.md aligned with the new contract surface.
- `agent-routing.yml`: prototyping routing rewritten as 3-phase loop (seed / loop / handoff); `review_profile: full-harness` removed.
- `core/observability/{guidance,types}.ts`: `mode: "full-harness"` literal replaced by `mode: "single-thread-loop"`.

### Removed (BREAKING)

- Legacy prototyping mode tier (`low-cost` / `standard` / `full-harness`) and the entire `core/harness/` subsystem.
- Legacy funnel: `r5/r3/r2/r1` rounds, harvest, absorption, reimplementation, branch planner, plateau detector, candidate concepts, prior evaluator-review schema.
- Legacy design contracts: `evaluation-rubric.yaml`, `evaluator-calibration.yaml`, `absorption-policy.yaml`, `selected-direction.yaml`.
- Legacy discussion sidecars: `uiux/33_exploration_rubric.md`, `uiux/34_evaluator_calibration.md`.
- Legacy CLI: `qfai prototyping round-start` / `round-harvest` / `round-narrow` / `round-absorb` / `round-reimplement-verify`; `--mode`, `--round`, `--candidates`, `--survivors`.
- Legacy `bestOfHistory` acceptance rule and `100/100 every axis` completion gate.
- `prototype-handoff.yaml` `mustPreserve` / `mayAdapt` / `mustNotCopy` triple (the artifact itself is the SSOT).
- `core/evidence/{bundleWriter,specCoverage,uiObservation,fakeUiDetection,actionCoverage,uiFidelityBuilder,runtimeObservation,runtimeGateBuilder,evidenceHandler,fsEvidenceWriter,captureStatus}.ts`.
- `core/validators/prototyping/{modeInvariant,executionPlan,lighthouseGate,screenshotDir,iterationGate,designSystemThreshold}.ts`.
- ~3,000+ lines of legacy code and ~25 legacy-coupled test files.

## [1.8.6] - 2026-04-30

Simplifies the design workflow contracts as a deliberate breaking
change, removing compatibility aliases that made the prototyping and
SDD boundaries harder to reason about.

### Added

- **Design readiness phase split**: explicit SDD and prototyping design
  contract readiness validators replace the previous stage option API.
- **Skill size guardrail**: `qfai-prototyping/SKILL.md` now has an asset
  test that keeps the orchestration file concise enough for agent use.

### Changed

- **Canonical design workflow only**: downstream design execution now
  relies on normalized contracts and rejects retired selected-direction
  aliases instead of preserving compatibility paths.
- **Prototyping skill compression**: large workflow details are moved
  into existing references while preserving mandatory execution intent.

### Removed

- **Legacy design contract aliases**: retired design contract references
  and selected-direction alias handling were removed from shipped
  assistant assets and validators.

## [1.8.5] - 2026-04-28

Hardens prototyping full-harness readiness so preflight, doctor, and
shipped skill assets agree on delegation roles, launcher availability,
and distributed agent metadata before runtime delegation starts.

### Added

- **Prototyping readiness policy + launcher probing**: centralizes the
  required full-harness roles / supported wrapper integrations and adds
  bounded `playwright-cli` launcher resolution across project wrapper,
  `node_modules/.bin`, `PATH`, and `npx --no-install`.
- **Structured Playwright execution metadata**: command plans now carry
  logical `toolId`, `args`, and `stdoutPath` fields alongside the
  rendered command so evaluators can execute capture steps without
  shell-redirection assumptions.

### Changed

- **Doctor / preflight / skill alignment**: `qfai doctor --profile
prototyping`, `qfai prototyping preflight`, validators, and shipped
  `qfai-prototyping` assets now diagnose active wrapper integrations,
  literal required-input paths, launcher readiness, and runtime
  hard-stop expectations from the same policy.
- **Distributed agent asset compatibility**: shipped agent cards drop
  undistributed `.instruction/...` required inputs and align shared
  metadata/frontmatter across Claude Code, GitHub Copilot, and Codex.
- **Full-harness follow-up hardening**: target URL forwarding,
  certificate loading, invalid `--format` rejection, Linux launcher
  cleanup, and integration coverage were tightened around prototyping
  flows.

### Removed

- なし

## [1.8.4] - 2026-04-27

Structural refactor of the prototyping skill driven by the v1.8.3
retrospective report (RR §8). Closes the dangling-ID class of bug
(RR §8.3), the dual-SoT class (RR §8.2), the dead-code-validator class
(RR §8.6), and the install-site-assumption class (RR §8.1) by adding
preventive mechanisms at every layer of the stack.

### Added

- **Single completion artifact**:
  `.qfai/evidence/prototyping/completion-certificate.json`. Carries
  SHA-256 digests of every evidence file, runId, validate/verify run
  refs, reviewer signoff, iteration / polish counts, and resolved spec
  coverage. Generated only when every gate passes; tampering is
  detected by digest comparison. Closes RR §8.4 (completion semantics
  multi-source).
- **New CLI subcommands**:
- `qfai prototyping certify` — generates the certificate after gates
  pass (validate.json error count = 0, verify.json status = PASS,
  reviewer gate result = PASS, fullHarness.runId present).
- `qfai prototyping certify --check` — recomputes evidence digests
  and verifies them against the certificate; non-zero exit on drift.
- `qfai prototyping show-spec` — prints the resolved primary
  prototyping spec (config or marker-scan), eliminating the
  SKILL.md hardcode.
- **Spec resolution helper** `resolvePrimaryPrototypingSpec`: resolves
  via (1) explicit `qfai.config.yaml: prototyping.primarySpecId`,
  (2) marker scan for `surface_type: ui-bearing`, (3) undefined.
  Closes RR §8.1 (primary-spec hardcode in shipped templates).
- **Validator wiring registry** + **CI-enforced meta-test**
  (`tests/unit/validators-are-wired.test.ts`): walks the symbol graph
  from `validate.ts` and asserts every public Issue[]-returning
  validator under `validators/prototyping/` is reachable from
  `runPrototypingValidators`. The Phase 2 meta-test surfaced four
  pre-existing dead validators (`validateScreenshotDir`,
  `validateLighthouseGate`, `validateIterationGate`,
  `validateDesignSystemThreshold`); Phase 3 wired them via
  `validateStateGate`. The PENDING_WIRING set is now empty and locked
  by sentinel: NEW dead-code validators cannot enter the codebase
  silently. Closes RR §8.6 (validators implemented but never invoked).
- **ID linkage integrity validators** (Phase 7):
- `validateConfigReferenceIntegrity` — qfai.config.yaml values
  resolve to real filesystem entities (primarySpecId, paths.\*,
  calibration.packPath).
- `validatePrototypingArtifactRefIntegrity` — every xxxRef string in
  prototyping.json / review-bundle.json / breakthrough.json points
  to an existing file.
- `validateSpecIdLinkage` — spec IDs in prototyping.json.specs[],
  review-bundle.json.spec, candidate dirs, and polish cycle
  iteration dirs reference entities that exist.
- **Package self-containment lint** (`npm run lint:shipping`,
  invoked by `npm test`): detects spec-NNNN, AC|TC|REQ-NNNN-NNNN,
  and `.qfai/specs/spec-NNNN/` literals in shipped runtime data
  (yaml / yml / json / ts under assets/init/) and source code.
  Markdown documentation and YAML/TS comments are exempt by design
  because they don't ship as runtime data. Inline pragma
  `qfai-shipping:allow reason="<concrete reason>"` for explicit
  opt-out. Closes RR §8.1 root-cause class structurally.
- **Filesystem-first report aggregation**: report.md round artifact
  counts (absorptionPlans, reimplementations, harvestArtifacts,
  narrowDecisions) are now sourced from
  `.qfai/evidence/prototyping/rounds/<rN>/*.json` directly. The
  curated index (`prototyping.json.rounds[]`) is no longer
  authoritative for these counts; index/filesystem drift is surfaced
  as a warning. Closes RR §8.2 (`absorption plans: 0` while files
  exist on disk).
- **Internal `docs/design-principles.md`** (P1–P6, contributor
  reference, not shipped via init).
- **17 new error codes** (each with description, severity, and
  suggested action):
- `QFAI-PROT-310` — executionPlan absent in full-harness
- `QFAI-PROT-311` — delegationMap role violation
- `QFAI-PROT-331` — fullHarness.scoringTrace[].screenshotDir missing
- `QFAI-PROT-332` — Lighthouse report missing in full-harness + web
- `QFAI-PROT-333` — iteration 1 cannot be marked converged
- `QFAI-PROT-334` — designSystemCompliance below 0.75 threshold
- `QFAI-PROT-335` — completion certificate absent while completion claimed
- `QFAI-PROT-336` — completion certificate digest mismatch
- `QFAI-CFG-LINK-001` — primarySpecId points to missing spec dir
- `QFAI-CFG-LINK-002` — paths.\* points to missing directory (warning)
- `QFAI-CFG-LINK-003` — calibration.packPath missing
- `QFAI-PROT-REF-001` — dangling artifact ref in prototyping.json /
  review-bundle.json / breakthrough.json
- `QFAI-PROT-LINK-001` — prototyping.json.specs[].specId references
  missing spec
- `QFAI-PROT-LINK-002` — review-bundle.json.spec references
  missing spec
- `QFAI-PROT-LINK-003` — candidate artifact dir missing
- `QFAI-PROT-LINK-004` — polish cycle iteration dir missing
- **100+ new test cases** across 13 new test files (state gate,
  certificate, ID linkage, lint-shipping, RR-8-2 regression, etc.).
  Final test suite: 203 test files / 1557 cases, all green.

### Changed

- `report.md` aggregator scans the filesystem directly for round
  artifacts; `prototyping.json.rounds[]` is no longer authoritative
  for harvest / narrowDecision / absorptionPlan / reimplementation
  counts.
- `executionPlan` and `delegationMap` validators are now wired into
  `runPrototypingValidators` (via `validateStateGate`) and emit
  standard `Issue[]` with codes `QFAI-PROT-310 / 311`.
- `screenshotDir`, `lighthouseGate`, `iterationGate`, and
  `designSystemThreshold` validators are now wired into
  `runPrototypingValidators` (via `validateStateGate`).
- `buildReviewBundle` and `buildRoundReviewBundle` require a
  `primarySpecId` parameter; `review-bundle.json.spec` is the
  resolved spec ID, not a hardcoded literal.
- `ReviewBundle.spec` and `RoundReviewBundle.spec` types widened from
  `"0017"` literal to `string`. Reader (`readRoundReviewBundleFile`)
  accepts any non-empty string.
- SKILL.md and `references/{evidence-requirements,reviewer-gate}.md`
  no longer hardcode a specific spec id. The "primary SSOT" entry now
  instructs the consumer to run `qfai prototyping show-spec` to
  discover the resolved path.
- `vitest.workspace.ts` adds a `scripts` project for tests/scripts/.

### Removed (BREAKING)

- **BREAKING**: legacy custom-Issue functions and types removed.
  Callers MUST use the `*Issues` adapters that return standard
  `Issue[]`. Removed:
- `validateExecutionPlan` / `ExecutionPlanIssue` →
  `validateExecutionPlanIssues`
- `validateDelegationMap` / `DelegationViolationIssue` →
  `validateDelegationMapIssues`
- `validateScreenshotDir` / `ScreenshotDirIssue` →
  `validateScreenshotDirIssues`
- `validateLighthouseGate` / `LighthouseGateIssue` →
  `validateLighthouseGateIssues`
- `validateIterationGate` / `IterationGateIssue` →
  `validateIterationGateIssues`
- `validateDesignSystemThreshold` /
  `DesignSystemThresholdIssue` →
  `validateDesignSystemThresholdIssues`
- Removed `tests/integration/prototypingSkillV1716Integration.test.ts`
  (redundant after absorption — every TC is now unit-tested
  in dedicated `*Issues` adapter test files).

### Compatibility notes (severity escalation timeline)

The new ID-linkage validators ship at **warning** severity in v1.8.4
to give existing user repos a one-release transition window:

- `QFAI-PROT-LINK-001..004` (spec ID linkage in prototyping.json
  artifacts): warning. Escalates to error in a future release (TBD).
- `QFAI-PROT-REF-001` (dangling artifact ref): warning. Escalates
  to error in a future release (TBD).
- `QFAI-CFG-LINK-001` / `QFAI-CFG-LINK-003` (config-time
  primarySpecId / calibration packPath dangling): error from v1.8.4
  (config typos benefit from immediate signal).
- `QFAI-CFG-LINK-002` (paths.\* directory absent): warning (init-time
  lazy creation rationale).

`qfai validate --profile prototyping --fail-on error` therefore PASSes
on v1.8.3 → v1.8.4 upgrade even when prototyping.json carries
absorbed-spec history. See the corresponding CHANGELOG entry.
for the recommended cleanup path.

### Deferred to a follow-up release

- Full V1 lifecycle removal (`iterations[]` schema, `cycle*` path
  helpers, V1 `buildReviewBundle` / `writeReviewBundles`,
  `prototyping.json.completionCertificate` block). The structural
  fixes that drove the v1.8.4 PR (RR §8.x) are already closed by the
  Phase 1–9 commits; V1 cleanup is a separate refactor that does not
  block the release.

## [1.8.3] - 2026-04-26

### Added

- prototyping V2 lifecycle (`rounds[]` / `polishCycles[]` / `completionCertificate` / `allReviewerAxesPerfect100`); V1 (`iterations[]`) lifecycle remains valid for existing packs.
- `qfai init` ships `.github/workflows/qfai-validate.yml` for downstream CI (`npx qfai validate --profile full --fail-on error`, Node 20 / npm). Pinned-allow-list pack guard ensures the workflow file always ships.
- `QFAI-TEST-001` test-todo stub validator: detects `it.todo` / `test.todo` / `describe.todo` in files matched by `validation.traceability.testFileGlobs`. Configurable via `validation.testStrategy.forbidTestTodoStubs` (default: true).
- `V2` round-funnel and per-candidate evidence validation in `validateV2Lifecycle`: enforces `r5 → r3 → r2 → r1` order, per-round candidate counts (5/3/2/1), unique candidateIds within a round, and the presence/shape of `screenEvidenceByCandidate` / `evaluatorReviewRefsByCandidate`.
- `maxCycles` vs `maxIterations` conflict detection in mode invariant validator.
- `round-absorb` and `round-start` (absorption rounds) now require `--candidates` / `--survivors` to match the prior `narrow-decision.json`.

### Changed

- spec-0012 absorbs the former spec-0017 (Playwright CLI harness) and spec-0018 (round/candidate/absorption harness) registries (REQ / AC / BR / DEC / TC). The standalone `spec-0017/` and `spec-0018/` directories are deleted.
- prototyping skill / agent terminology unified to `round` / `absorption` (qfai-prototyping, qfai-sdd, qfai-implement, qfai-verify, qfai-discussion, qfai-atdd, qfai-configure).
- `CandidateId` is now a nominal brand type (was the template-literal `c${number}` which over-accepted `c0` / `c-1` / `c1.5`); both `parseCandidateIds` and `isCandidateId` mint via `CANDIDATE_ID_PATTERN`.
- V1 `PrototypingEvidenceRecord` field renamed `cycles` → `iterations` to match `validatePrototypingEvidence` and the on-disk `.qfai/evidence/prototyping/iterations/<n>/` URL convention.
- CI profile guard now allows `tdd` alongside `full` / `verify` (was `full` / `verify` only); narrow phase profiles (discussion / sdd / prototyping / atdd) are still rejected in CI.
- `QFAI-TEST-001` issues now set `issue.file` to the bare repo path with the line number in `issue.loc.line` (was `path:line`); rule code follows the `QFAI-<RULE-###>` waiver-resolver convention.

### Removed

- **BREAKING**: library exports `createPlaywrightRenderAdapter` and `createPlaywrightBrowserQaProvider` are no longer re-exported from `qfai` (Node Playwright runtime retired in spec-0017).
  - migration: use the Playwright CLI path — `qfai prototyping round-start ...` for the supported entry point, or build command plans via `buildPlaywrightCliCommandPlan` (still exported) and run them through your own Playwright CLI invocation.
- Active `spec-0017/` and `spec-0018/` directories (absorbed into `spec-0012`).

### Fixed

- Numerous late-review integrity findings: `verify-pack` `.github` allow-list (now requires the workflow file as a regular file), V2 evidence record now accepts `runtimeGate` / `uiFidelity` / `completionCertificate` so `writePrototypingEvidenceRecordV2({ completionClaimed: true, … })` cannot produce a self-contradicting record, V1-vs-validator `cycles`/`iterations` mismatch, prettier and markdownlint drift across docs / spec packs, plateau detector test fixtures aligned to the 0..100 scoring scale, downstream `qfai-validate.yml` Node version aligned with `engines: ">=20.0.0"`.

## [1.8.2] - 2026-04-23

### Added

- なし

### Changed

- package root export (`qfai`) で full-harness helper の互換公開を維持
- restored: `loadHistory`, `appendIteration`, `computeTerminationReason`
- restored: `validateReviewer`, `resolveCommitSha`, `REVIEWER_PLACEHOLDERS`
- restored: `FullHarnessHistory`, `MeasurementInput` などの harness type export

### Removed

- **BREAKING**: experimental full-harness runtime entrypoints `runFullHarness`, `computeWeightedTotal`, `determineDecision` are no longer exported from the package root
- migration: runtime execution is now skill/workflow driven; package consumers should use persisted evidence plus validator/report APIs instead of invoking the removed runtime helpers directly

## [1.8.0] - 2026-03-29

### Added

- skills: Web Research Enhancement skill template
- 8-stage standard research pipeline (search, rank, fetch, extract, sanitize, cache, verify, cite)
- MCP integration templates for Brave Search, Firecrawl, Playwright (3 agent formats each)
- Content sanitization layer (control chars, aria-hidden, display:none removal)
- Domain/URL allowlist with default-deny enforcement
- Research session log schema with secret exclusion
- Cache strategy (hash(URL+etag) key, 24h default TTL)
- Evaluation metrics (citation precision, coverage, freshness, security hygiene)
- HITL risk-based review gates
- specs: SDD artifacts (Web Research Enhancement, CAP-0034)
- specs: TDD execution ledger (28 items, all done)
- discussion: v1.8.0 Web Research Enhancement discussion pack (`discussion-20260328212829687`)
- tests: 28 integration tests for web-research skill (pipeline, security, skill, observability, evaluation)

## [1.7.15] - 2026-04-08

### Added

- Full-harness runtime truthfulization: measurement-driven iteration engine replaces fake planner/generator/evaluator loop
- Trend scan canonicalization: `04_Sources.md#Trend Scan` is the sole canonical location; `uiux/20_trend_scan.md` removed
- Root/init SSOT unification: `scripts/sync-init-to-root.mjs` ensures `packages/qfai/assets/init/` is the single source of truth
- Evidence schema v2: `fullHarness` block requires calibrationRef, L1/L2 panel scores, commitSha, limitations, reviewer logs
- New harness modules: `measurement.ts`, `panelScore.ts`, `history.ts`, `reviewerIdentity.ts`, `gitRevision.ts`
- Validator hardening: reviewer placeholder rejection, weightedTotal = min(L1, L2) enforcement, commitSha/limitations mandatory
- Calibration wiring: `qfai.config.yaml > prototyping.calibration` is the sole runtime parameter source for full-harness

### Changed

- **BREAKING**: full-harness is now measurement-driven; 1 CLI invocation = 1 iteration measurement, multiple iterations require real code changes between runs
- **BREAKING**: `--reviewer <id>` is mandatory for full-harness mode; `config.prototyping.execution.reviewer` removed
- **BREAKING**: `weightedTotal = min(l1.total, l2.total)` replaces generic weighted average
- **BREAKING**: `fullHarness` evidence schema v2 with calibrationRef, iterations array, scoringTrace, reviewerLogs, limitations
- `04_Sources.md` template restructured: Source Registry, Trend Scan (4 canonical categories), Competitive Reference Registry, Traceability
- CLI: added `--change-summary` and `--limitation` flags for full-harness mode
- Prototyping SKILL.md: full-harness described as measurement-driven iterative workflow
- Discussion README: `04_Sources.md` responsibilities expanded to include trend scan and competitive registry
- Evidence README: fullHarness schema v2 field table added, uiFidelity observation-only policy documented
- Review profiles and agent routing synced between root and init assets

### Removed

- Fake planner/generator/evaluator loop (`planner.ts`, `generator.ts`, `evaluator.ts`, `loop.ts`)
- `uiux/20_trend_scan.md` template and all references
- `config.prototyping.execution.reviewer` config option
- `resolvedReviewer ?? "qfai"` placeholder reviewer logic
- uiFidelity expected→observed synthetic fallback
- Legacy fullHarness schema v1 compatibility

## [1.7.14] - 2026-04-07

### Added

- Full-harness iteration protocol: 4-step cycle (Evaluate→Identify→Fix→Re-evaluate), MIN_ITERATIONS=5, 4 termination conditions (converged/max-iterations/plateau/manual-stop)
- Independent evaluator panel: 3-layer structure (product-surface-reviewer L1, product-experience-architect L2, qa-gatekeeper L3) with background mode invocation
- Score scope separation: discussion 3-layer scores ≠ prototyping scoringTrace, copy prohibition
- Evaluation rigor rules: 3-tier rubric (existence_gate/quality_criteria/excellence_criteria), L1/L2/L1-manual finding classification
- Asset acquisition strategy: free assets MUST, emoji prohibition (U+1F000–U+1FAFF, U+2600–U+27BF), placeholder prohibition, WCAG 2.1 AA checklist
- Reviewer gate strengthening: 6 full-harness-specific checks, Limitations section obligation
- Full-harness validator rules QFAI-PROT-290~294: iteration integrity validators (single-pass convergence, scoringTrace count, terminationReason cross-check, maxIterations cap, score progression)
- Full-harness review profile in review-profiles.yml (always_required: completion-reviewer, product-surface-reviewer, qa-gatekeeper)
- product-experience-architect added to agent-routing.yml prototyping evidence phase
- Semantic invariant SSOT: validateRecommendationSemantics() shared across parser/resolver/execution/CLI/validator/preflight
- Canonical strategy decision vocabulary (template, component-library, design-system, native-pattern, bespoke, none)

### Changed

- PrototypingSurface canonical names: web-ui/mobile-ui/desktop-ui → web/mobile/desktop, cli/mixed added
- IssueCategory simplified: "compatibility" removed, "canonical" | "change" only
- prototyping.yaml schema: namespaced-only (`prototyping:` block mandatory), legacy top-level keys hard-rejected
- Classification separation: isUiBearingSurface() split into isDiscussionUiBearingPrototypingSurface() + requiresVisualBrowserEvidenceSurface()
- Surface inference: null default (was "non-ui"), explicit surface specification promoted
- fullHarness schema: reviewerSignoff boolean→object, scoringTrace boolean→array, terminationReason +plateau/manual-stop
- Validator taxonomy: fullHarness reserved range 281-283 → 281-294, TAXONOMY_RANGE_MAX 283 → 294
- "selected direction" → "selected anchor" wording normalization

### Removed

- Legacy validator infrastructure: legacy/ directory, legacyStatusDir.ts, migration/formatDetection.ts, uix/rollout.ts
- IssueCategory "compatibility" from union type
- Legacy top-level prototyping.yaml keys support (QFAI-PROT-231/232 warnings removed)
- Compatibility test files (ddpCompatibility, uixCompatibility)

### Fixed

- Strict classification validation: semantic contradictions in classification block detected as hard errors
- Execution hard gates: invalid classification/recommendation immediately rejected
- readValidatedClassification() enforced in execution path (readClassificationBlock non-strict prohibited)

## [1.7.13] - 2026-04-04

### Added

- CLI flags for prototyping production path: --target-url, --browser-provider, --render-provider, --reviewer
- Built-in Playwright render adapter and browser QA provider (optionalDependencies)
- uiFidelity validator error codes: QFAI-PROT-270 (absent), QFAI-PROT-271 (skeleton rejection), QFAI-PROT-272 (missing fields)
- prototyping.execution config section with reviewer field and priority cascade (CLI > config > env)
- Production path test suites: CLI flag parsing, obligation matrix, uiFidelity validator

### Changed

- uiFidelity.mode=skeleton rejected in standard/full-harness for UI-bearing surfaces (truthfulization)
- Calibration error codes relocated: QFAI-PROT-271/272 → QFAI-PROT-265/266
- Review assets (scoring/comparison/strategy-review) aligned to canonical vocabulary and responsibility split
- comparison-review split into Comparison Quality (30_option_comparison) + Selected Direction Quality (31_selected_anchor_screen)
- SKILL.md: "not a public CLI command" → "auxiliary generate-side command"

### Fixed

- SSOT contradictions across README, SKILL.md, steering, product note
- Stale filenames in ui-definition-protocol.md (30_comparison→30_option_comparison, etc.)
- Stale filenames in canonical test suite (integration/e2e/core/assets)
- exactOptionalPropertyTypes issues in prototyping execution pipeline
- 23_design_eval_aggregate.md total_score_formula formatting

## [1.7.12] - 2026-04-02

### Added

- 3-layer 評価テンプレート（invariant/trend-derived/product-specific/aggregate/dynamic-overrides）
- Design taste interview テンプレート（11_design_taste_interview.md）
- browserQa minimal truthful runner
- テスト並列実行: Vitest workspace による 5 スライス（core/validators/integration/e2e/cli）
- CI: Node 20 単一 + 5 スライス並列マトリクスに移行
- pr-fix skill にバージョン整合チェックを追加

### Changed

- 評価軸テンプレートを 3-layer 正規名にリネーム（20-23*eval_axis*\* → 20-23_design_eval\_\*）
- SKILL.md: HTML/CSS mock をオプション化
- US-0012-0008..0010 テストを prototyping SKILL.md に切り替え

### Removed

- 31_anchor.md, 60_critique_loop.md（レガシーテンプレート）

### Fixed

- delta/AC の migration warning → error 整合
- source_translation バリデーションをバレット行のみに制限
- threeLayer relPath 表記を実際のファイル範囲（2[0-3]\_design_eval\_\*）に修正
- prototypingWordingAlignment テストの silent return → throw Error
- renderEvidenceIntegration テストの truncated expected string 補完

## [1.7.11] - 2026-03-31

### Added

- npm publish dry-run CI チェック（`ci:build-verify` に統合、警告=エラー）
- E2E テスト 8 ファイル + Integration テスト 3 ファイル（計 263 テスト）
- `detectAspirationalClaims()`: SKILL.md の未実装機能主張を検出（spec-0006 TDD-0015）
- `checkRoutingConsistency()`: フルハーネスルーティング一貫性検証（spec-0006 TDD-0016）
- ATDD カバレッジ: 12 E2E US + 52 Integration TC（QFAI-ATDD-111/112 解消）
- TDDLIST バックフィル: 9 spec に 43 エントリ追加

### Fixed

- bin パス auto-correction 警告修正（`./dist` → `dist`）
- uixDetection phase1 ratchet テストの時刻依存バグ修正

## [1.7.10] - 2026-03-31

### Added

- Spec Auto-Discovery Protocol: spec引数なしで4ソース統合差分検出により作業対象specを自動特定
- Traceability Integrity Validator: QFAI-TRACE-001 (error) / QFAI-TRACE-002 (warning)
- `baseBranch` 設定: qfai.config.yaml で比較対象ブランチを指定可能
- discussion .gitignore: 生成されたdiscussion packをデフォルトでGit管理外に（init標準仕様）

### Changed

- SKILL.md (prototyping/implement): Spec Auto-Discovery Protocol セクション追加
- specDiffDetector/traceabilityIntegrity: execSync → execFileSync でコマンドインジェクション対策

## [1.7.9] - 2026-03-30

### Changed

- browserQa: phase status vocabulary unified to `captured | skipped | failed`
- detection: consolidated surface type detection to shared module with table format, Mermaid flow, screen contract support
- validators: wired `validateFullHarnessSkill` and `validatePrototypingSkillContent` into production validate path
- prototyping SKILL.md: removed banned runtime-heavy phrases, added mode sections (Low-cost/Standard/Full-harness), non-UI n/a documentation, static-first language
- prototyping mode model: full-harness is documented as an explicit mode within `/qfai-prototyping`, not as a separate skill entrypoint

## [1.7.8] - 2026-03-30

### Added

- validators/uix: taste interview validator (`UIX-VAL-TASTE-MISSING` / `INCOMPLETE`) — 9 section completeness check
- validators/uix: trend scan validator (`UIX-VAL-TREND-SCAN-MISSING` / `FRESHNESS-MISSING`) — freshness metadata enforcement
- validators/uix: 3-layer evaluation model validator (`UIX-VAL-3LAYER-LEGACY-FORMAT` / `MIXED-FORMAT`) — invariant/trend-derived/product-specific enforcement with 4-axis migration warning
- validators/uix: scoring-ready schema validator (`UIX-VAL-DYNAMIC-AXIS-INCOMPLETE`) — 16 mandatory fields per axis + aggregate scoring rules
- validators/uix: strategy strong schema validator (`UIX-VAL-STRATEGY-WEAK-LEGACY` / `SELECTION-CONSTRAINT`) — 8-field schema with selection_required cardinality check
- validators/uix: screen contract schema validator (`UIX-VAL-SCREEN-CONTRACT-SCHEMA-INCOMPLETE` / `DUPLICATE-ID` / `STATE-COVERAGE`) — 10-field multi-screen with mandatory state coverage
- detection: unified surface type detection module (`detectSurfaceType`) — single shared module replacing inline detection logic
- validators/skill: prototyping skill content validator — banned phrase scan, 3-mode headings, non-UI n/a path, static-first alignment
- validators/skill: full-harness skill validator — workflow loop detection, evidence/reviewer/calibration obligation checks
- uiux: render evidence capture module (`captureRenderEvidence`) — capture/skip/partial with alternative suggestions
- browserQa: smoke phase runner (`runSmokeQa`) — structured findings with selector/issue/severity/suggestion
- browserQa: visual phase runner (`runVisualQa`) — visual findings matching smoke structure
- review: UIX review template — 5 canonical review items (taste-reflection-quality, anti-preference-enforcement, trend-relevance-freshness, dynamic-axis-specificity, generic-fallback-persistence)
- validators/migration: format detection validator — version 1/2/3/unknown detection with structured upgrade guidance
- validators/docs: vocabulary scan validator — allowed/prohibited maturity term enforcement with contradiction detection
- validators/docs: convergence doc validator — required structure sections check
- validators/uix: taste reflection, anti-preference, non-UI over-fire regression, fixture coverage validators
- tests: 79 new tests across 21 test files covering 78 TDD items
- evidence: per-spec TDD implementation evidence

### Changed

- package: npm version を `1.7.8` に更新
- specs: 4 spec の TDD execution ledger を全項目 `done` に更新

### Notes

- v1.7.8 は v1.7.7 gap analysis に基づく Canonical Convergence correction release
- 20 gaps を 14 deliverables に統合し、4 capability groups (CAP-0034~0037) で実装
- Migration window: 4-axis → 3-layer および weak strategy → strong schema は v1.7.8 で warning、v1.8.0 で error
- Non-UI safety: 全 UI-bearing validator が non-ui surface type で zero fires を保証

## [1.7.7] - 2026-03-30

### Added

- specs: master design spec に基づく several specs の remediation alignment を追加
- evidence: v1.7.7 correction release 向けの SDD preflight / evidence 記録を追加

### Changed

- specs: spec の評価モデル記述を 3-layer canonical model に統一
- specs: spec の screen contract minimum を screen-level obligation に更新
- specs: spec の UI-bearing detection を `surface classification primary / content-signal fallback` に更新
- docs: root/package README の release context と tutorial/versioned headings を v1.7.7 に整合
- package: `packages/qfai` の npm version を `1.7.7` に更新
- steering: product steering / initiative policy の milestone と release posture を v1.7.7 に更新

### Fixed

- traceability: spec の AC-0026-0014 → TC 参照漏れを修正
- validate: review summary minimum schema (`QFAI-REVIEW-007`) と prototyping coverage matrix (`QFAI-PROT-111`) の即時 blocker を解消
- validate: spec decisions の `status:` 混入警告 (`QFAI-STATUS-001`) を解消

### Notes

- repo-wide `qfai validate --fail-on error` は既存の review/evidence/ATDD/TDD blocker により未通過
- v1.7.7 は v1.7.6 remediation/correction release として扱い、プロトタイピング前の仕様整合と version normalization を優先

## [1.7.6] - 2026-03-30

### Added

- critique: `CritiqueAdapter` with fail-open semantics, `GenericCommandProvider` (external process execution with AbortSignal), `EchoProvider`, `FileProvider`
- calibration: `CalibrationLoader` (YAML-based scoring alignment packs), `ScoringEngine` (accept/refine/pivot thresholds), `DisagreementHandler` (majority rule + tie-breaking), `PlateauDetector` (score delta + lookback window)
- harness: `HarnessLoop` (planner/generator/evaluator cycle, 5-15 iterations), `Planner`, `Generator`, `Evaluator` (weighted scoring + dimension floors + calibration baselines), evidence generation
- observability: `MetricsCollector` (JSON Lines per-iteration + aggregate), `MetricsWriter` (buffered sink with auto-flush), `ModeGuidance` (standard/premium recommendation), `DriftTracker`, `CapabilityProfiler`
- handoff: `HandoffWriter` (credential stripping + portable paths), `HandoffReader` (corruption detection + fresh-start fallback)
- detection: `DisplayDetector` (JSX-only heuristic), `StubDetector` (throw/TODO/empty patterns + partial stubs with lineRange)
- specs: SDD artifacts for through (5 capabilities × 10 files each)
- tests: 103 new tests across 22 test files covering 87 test cases

## [1.7.5] - 2026-03-29

### Added

- prototyping: `modeResolver` — obligation set resolver with exhaustiveness guard, exported via `core/prototyping` barrel ( Slice 1)
- evidence: `captureRenderEvidence` / `captureElement` / `captureViewportElement` — render evidence capture pipeline ( Slice 2, internal — not yet exported from package root)
- providers: `ProviderRegistry` with capability-method validation and duplicate-name guard; `BrowserProvider` type with optional stubs for interaction/visual/accessibility ( Slice 3, internal — not yet exported from package root)
- browserQa: `runBrowserQa` — phase-gated browser QA runner with tier-based phase selection and runtime tier validation ( Slice 4, internal — not yet exported from package root)
- tests: slice revert independence test proving Slice 2/3/4 have no import dependency on Slice 1

> **Note:** `modeResolver` is exported from the public API via `core/prototyping`. The evidence, providers, and browserQa modules are internal foundation code not yet exported from the `qfai` package root. Public re-export is planned for a future release once the APIs stabilise.

## [1.7.4] - 2026-03-29

### Added

- traceability: `..0027` の required `US-*` / `TC-*` を E2E・Integration traceability ledger に補完
- evidence: `/qfai-verify` 実行証跡 `verify-` を追加し、repo gate / validate / report の結果を記録

### Changed

- docs: `qfai-implement` / `qfai-verify` の README 説明を ledger-first / full-scan verify + evidence 運用に更新
- tdd: several specs の ledger 整合を更新
- specs: spec の BR/EX/TC 参照整合を補正

### Fixed

- prototyping: `failOpen` 有効時に Playwright 不在でも `renderEvidence` を `skipped` として記録
- validate: `QFAI-SKILLS-001`, `QFAI-REVIEW-004/005/007`, `QFAI-PROT-111`, `QFAI-ATDD-111/112`, `QFAI-DDP-014`, `QFAI-DDP-019` の blocker を解消
- steering: `product.md` の `v1.7.1` 状態表記を現況に更新

## [1.7.3] - 2026-03-29

### Added

- discussion: UIUX Authoring Foundation — structured `uiux/` sidecar artifact family for UI-bearing projects
- assets: 11 sidecar templates (strategy, eval axes, comparison, anchor, contracts, review bundle, critique loop)
- assets: SKILL.md UI-bearing detection with 5 surface categories and completion conditions
- assets: direct template replacements (03, 04, 14) with behavior-first focus and sidecar references
- assets: Batch A/B core template augmentation with UX-INTENT cross-references
- validators: `Screen Mock — Fallback (HTML+CSS)` heading support in htmlMockBlocks and discussionVisuals
- tests: 26 new tests for uiux sidecar templates, Fallback heading extraction, DDS state coverage

### Changed

- templates: 03_Story-Workshop.md primary focus shifted from HTML mock to Behavior Obligations
- templates: Screen Mock section demoted to secondary fallback (subordinate to Behavior Obligations)
- templates: DDS State Coverage references Behavior Obligations table as SSOT

### Fixed

- validators: redundant Unicode literal em dash in regex character classes (htmlMockBlocks, discussionVisuals)

## [1.7.2] - 2026-03-27

### Added

- validators: Design Audit validator (QFAI-AUD-001, QFAI-AUD-004, QFAI-AUD-020) — CTA hierarchy, token drift, duplicate-primary detection (CAP-0025)
- validators: Slop Guardrails validator (SLP-01..06) — declarative JSON-driven slop pattern detection (CAP-0025)
- config: `uiux.audit` section with `enabled`, `slopDetection`, `maxPrimaryCtas`, `maxRawTokenLiteralWarnings`, `maxDuplicateFindingsPerRule`
- config: 3-tier × 3-profile severity mapping (`mapSeverity`) and `deduplicateFindings` utility
- assets: `assets/validators/designSlopPatterns.json` for packaged build compatibility
- specs: SDD artifacts (Design Audit & Slop Guardrails, CAP-0025)
- discussion: v1.7.2 Design Audit & Slop Guardrails discussion pack (discussion-20260326072322818)
- tests: 34 new tests for design audit and slop guardrails validators

### Fixed

- build: slop patterns JSON now resolved via candidate-path fallback for packaged builds
- lint: formatted all markdown artifacts and fixed 10_delta.md table column mismatch

## [1.7.1] - 2026-03-26

### Added

- specs: SDD artifacts (Render Evidence Automation, CAP-0024)
- discussion: v1.7.1 Render Evidence Automation discussion pack (discussion-20260325144633348)

### Changed

- validators: layered ID / traceability validator の解釈改善
- specs: shared policy / steering の v1.7.1 状態表記更新

### Fixed

- validators: repo-wide validator blocker 解消（historical review/discussion, layered ID 誤検知, traceability 欠落）

## [1.7.0] - 2026-03-25

### Added

- validators: Discussion Design Hardening (QFAI-DDP-019..025) — DDS 存在・オプション比較・アンカースクリーン・競合リファレンス・CTA 階層・ステートカバレッジ・デザインアンチゴール検証（CAP-0023）
- validators: `isUiBearing()` artifact-based UI-bearing detection (DR-0042)
- templates: Design Direction Summary section in 03_Story-Workshop.md
- templates: Competitive Reference Registry in 04_Sources.md
- templates: Design Direction Decisions section in 14_Review-Request.md
- templates: Rejected Visual Directions section in 99_delta.md
- skills: UI-bearing Authoring Requirements section in qfai-discussion SKILL.md
- specs: SDD artifacts (Discussion Design Hardening, CAP-0023)
- discussion: v1.7.0 Discussion Design Hardening discussion pack (discussion-20260325120000000)
- tests: 34 new tests (25 unit + 9 integration) for DDH validators

## [1.6.5] - 2026-03-24

### Added

- validators: DDP validation (QFAI-DDP-001..018) — Design Direction Pack 必須フィールド・テーマ・CTA 階層・アンチゴール・テンプレート・コンフィグ検証（CAP-0019）
- validators: Navigation flow validation (QFAI-NAV-001..007) — Mermaid 遷移図構文・到達可能性・エラーリカバリー・実装整合（CAP-0020）
- validators: Render critique validation (QFAI-CRIT-001..010) — クリティークループプロセス・ビューポート批評・taskFidelity 検証（CAP-0021）
- validators: Design fidelity validation (QFAI-FID-001..011) — スコアカード 4/5 次元・閾値・warning→error 昇格（CAP-0022）
- specs:..0022 SDD artifacts (Design Direction, Navigation, Render Critique, Fidelity Scorecard)
- discussion: ChatGPT UI/UX analysis integrated discussion pack (discussion-20260324090005338)
- tests: 126 new tests (54 DDP + 21 NAV + 23 CRIT + 28 FID)
- policies: DR-0036..DR-0041, +7 glossary terms, +6 constraints
- config: `uiux` policy section (qualityProfile, requireResearchSummary, competitive_refs_min, warning_as_error_override)

### Changed

- codex: max_threads 1→20 for sub-agent parallelism
- templates: summary.json restored to placeholder enum with full 12-reviewer roster
- templates: 05_Contracts.md ER diagram reverted to neutral placeholders
- skills: inline HTML replaced with backtick-code in 6 SKILL.md files

## [1.6.4] - 2026-03-23

### Added

- codex: 39 `.codex/agents/*.toml` + `.codex/config.toml` — Codex サブエージェント TOML 実装（CAP-0018）
- specs: SDD artifacts (Codex sub-agent TOML support)
- discussion: discussion pack for Codex sub-agent implementation (v1.6.4)
- tests: 14 tests (12 TCs) for Codex agent TOML validation
- policies: DR-0027〜DR-0030 — Codex 向け設計決定記録（TOML 形式・39 スコープ・sandbox 分類・静的配置）

### Changed

- policies: CAP-0018 追加、用語・制約・意思決定記録の更新
- devDependencies: smol-toml 追加

## [1.6.3] - 2026-03-22

### Added

- init: `.github/instructions/` に Copilot レビューインストラクション（code-review, principles）を create-only で配布
- specs: SDD artifacts (Copilot review instructions distribution)
- discussion: discussion pack for

### Changed

- policies: CAP-0017 追加、用語・制約・意思決定記録の更新

## [1.6.2] - 2026-03-20

### Added

- skills: `qfai-implement` SKILL.md hardened — DR-ID/Evidence required columns, refactor verify command+result pair, exception error-level enforcement
- tests: phrase guardrail helper functions (`checkRequiredPhrases`/`checkForbiddenPhrases` in `phraseGuardrails.test.ts`)
- tests: negative tests for required/forbidden phrase detection with mutated content
- specs: SDD artifacts (discussion pack, spec pack, implementation plan, TDD ledger)

### Changed

- skills: `qfai-implement` Refactor phase now requires TDDSpecReviewer and TDDCodeQualityReviewer gates before `done`
- skills: TDD-ID example corrected from 3-digit to 4-digit format (TDD-0001)
- scripts: `verify-pack.mjs` Windows path normalization with `toPosix()` helper
- tests: CRLF-tolerant frontmatter regex in `wrapperParity.test.ts`
- tests: `skillRoster.test.ts` handoff regex tightened, test name accuracy improved
- tests: integration test type annotations changed from `string` to `string | undefined`
- specs: 10_Plan.md paths updated to full `packages/qfai/tests/` format
- specs: 05_Examples.md TDD-ID corrected to 4-digit format
- specs: 04_Business-Rules.md BR-0016-0002 updated with all 8 handoff transitions

## [1.6.1] - 2026-03-20

### Added

- validators: TDD list Phase 2 checks — TC coverage (TDDLIST_TC_NOT_COVERED), exception DR-ID (TDDLIST_EXCEPTION_MISSING_DR), test file existence (TDDLIST_TEST_FILE_MISSING), duplicate ID (TDDLIST_DUPLICATE_ID), invalid ID format (TDDLIST_INVALID_ID)
- report: TDD Coverage section per spec with unit/component coverage visualization
- report: Contract Coverage, SC Coverage, Hotspots promoted to top-level sections
- validators: discussion pack validation (QFAI-DPACK-001 through DPACK-005)
- helpers: shared `tddHelpers.ts` module with `isCoverageTargetLevel`, `splitTcRefs`, `resolveParentTcId`

### Changed

- validators: unknown Level values in 06_Test-Cases.md are conservatively included as coverage targets (avoids silent false negatives)
- validators: Level column fallback — when Level column is absent, all TCs are treated as coverage targets
- report: heading hierarchy flattened — SC Coverage, Hotspots, Duplicate SC IDs promoted from `###` to `##`
- validators: path traversal check uses `path.sep` for cross-platform correctness
- validators: `collectTestCaseIds` merges two separate I/O calls into one
- report: `collectTddCoverage` receives pre-scanned entries to avoid redundant directory scan
- specs: `_policies/07_Constraints.md` TC-22 updated from `fs.access` to `fs.promises.stat`

### Fixed

- parsers: `trimEdgePipes` now strips all consecutive edge pipes (`||`, `|||`) via regex
- helpers: `resolveParentTcId` no longer incorrectly strips parent-level TC IDs (e.g., `TC-0001` → `"TC"`)

## [1.6.0] - 2026-03-17

### Added

- skills: `/qfai-implement` — TDD micro-cycle (Red/Green/Refactor) を一括管理する統合実装スキルを追加
- validators: `tddList` — `test-list.md` の構造・ステータス・TC参照を検証する validator を追加
- specs: (CAP-0014) qfai-implement unification の SDD アーティファクトを追加
- assets: `spec-XXXX/tdd/test-list.md` テンプレートを init に追加

### Removed

- skills: `/qfai-tdd-red`, `/qfai-tdd-green`, `/qfai-tdd-refactor` を廃止（`/qfai-implement` に統合）

### Changed

- workflow: implementation stage の説明を `/qfai-implement` に統一
- integration: `.agents/.claude/.codex` の skill ラッパーを symlink に統一

## [1.5.7] - 2026-03-16

### Added

- specs: (CAP-0013) UI/UX 定義・レビュー基盤の validator 8系統を追加（QFAI-DT / QFAI-MOCK / QFAI-FLOW / QFAI-BPAP / QFAI-PLATFORM / QFAI-CONSISTENCY / QFAI-RESEARCH / QFAI-AGENT）
- cli: `--platform <web|windows|mobile-ios|mobile-android|cross-platform>` 引数を追加
- validators: Design Token 3層（primitive/semantic/component）検証を追加
- validators: HTML Mock の構造・参照・アクセシビリティ観点の検証を追加
- agents: UI/UX 専門エージェント定義と関連 steering ドキュメントを追加

### Changed

- validate: `qfai validate` の検証対象を UI/UX 領域へ拡張
- config: `qfai.config.yaml` に `uiux` 設定を追加

## [1.5.6] - 2026-03-15

### Added

- review: Devil's Advocate と Pattern Doubler をロースターに追加し、12-reviewer 運用を明確化

### Changed

- skills: 全レビュアーの FAIL 時に具体的代替案を必須化
- templates: discussion review テンプレートを 12-reviewer 前提に更新
- steering: review-agent enhancement を次期マイルストーンとして整理

## [1.5.5] - 2026-03-14

### Added

- specs: Spec Diff Protocol (SDP) の増分実行フローを定義し、差分実行の運用指針を明確化

### Changed

- skills: AskUserQuestion Protocol を MUST 運用として整理し、SSOT 手順を強化
- init/assets: skill integration の symlink 構成説明を最新アーキテクチャに整合
- docs: Minimal tutorial と examples の toolVersion を `1.5.5` に更新

## [1.5.4] - 2026-03-13

### Added

- skills: 全 9 SSOT スキルに `AskUserQuestion Protocol` セクションを追加
- tests: skill integration と `pr-merge` plan 生成まわりの回帰テストを追加・拡張

### Changed

- init: integration wrapper 配布をテキストコピーから symlink ベースへ移行
- ci: required build check context と matrix/needs の扱いを見直し、workflow の安定性を改善
- docs: release/skill/README の説明を symlink アーキテクチャと AskUserQuestion 運用に整合
- docs: Minimal tutorial と examples の toolVersion を `1.5.4` に更新

### Fixed

- assets/init: legacy wrapper cleanup と symlink error handling の挙動を修正
- skills: `pr-fix` / Copilot guidance の記述差分を吸収し、各 integration の整合を回復

## [1.5.3] - 2026-03-07

### Changed

- **BREAKING**: layered spec の shared policy directory を `.qfai/specs/_shared/` から `.qfai/specs/_policies/` へ変更
- assets: init scaffold / skill templates / specs README を `_policies` と Consumer View / Escalation Hook 方針へ更新
- validate: layered spec path checks と関連 error / guidance を `_policies` 前提へ更新
- tests: assets/core 回帰テストを `_policies` 期待値に更新
- docs/migrations: `docs/migrations/v1.5.3.md` を追加し、`_shared` → `_policies` の移行手順を明文化
- docs: Minimal tutorial と examples の toolVersion を `1.5.3` に更新

## [1.5.2] - 2026-03-04

### Added

- assets: `qfai-discussion` / `qfai-sdd` に skill-local な `references/rcp_footer.md` を追加

### Changed

- assets: `qfai-discussion` / `qfai-sdd` の RCP footer 参照先を `assistant/templates` から各 skill 配下へ移設
- tests: init assets テストを skill-local RCP footer 構成に更新
- docs: Minimal tutorial と examples の toolVersion を `1.5.2` に更新

### Removed

- assets: `.qfai/assistant/templates/rcp_footer.md` と空の `assistant/templates` ディレクトリを削除

## [1.5.1] - 2026-03-03

### Added

- validators: `validateDiscussionVisuals` を追加し、`QFAI-VIS-001` / `QFAI-VIS-002` を導入
- tests: discussion 統合に伴う validator/preflight の回帰テストを追加・更新

### Changed

- core/preflight: `11_OQ-Register.md` の `Disposition: open` を gate 非依存で blocking 判定するよう統一
- validators: review target kind を `discussion` / `spec` に統一し、legacy `require` 判定を廃止
- validators/discussMermaid: issue code を `QFAI-DPACK-009` / `QFAI-DPACK-010` に統一
- assets/docs: discussion 命名とテンプレート（Mermaid/HTML+CSS mock）を統一

### Removed

- core/validators: legacy `validateDiscussPack` / `validateRequirePackReadiness` を削除

## [1.5.0] - 2026-03-03

### Added

- core: `discussionPack.ts` — 15ファイル構成の統合 discussion pack インスペクタ
- core/packLocator: `"discussion"` PackKind（timestamp 命名 `discussion-YYYYMMDDhhmmssSSS`）
- validators: `validateDiscussionPackReadiness` — QFAI-DPACK-001..008 コード
- assets: `qfai-discussion` スキル（SKILL.md + 15 テンプレート + review テンプレート）
- assets: `.qfai/discussion/README.md`
- docs/migrations: `v1.5.0.md` 移行ガイド

### Changed

- **BREAKING**: config `requireDir` → `discussionDir`（QfaiPaths 型変更）
- core/sddPreflight: require-pack → discussion-pack ベースに切り替え
- core/doctor: `requireDir` → `discussionDir`
- core/runLog: `discuss_pack` / `require_pack` → `discussion_pack`
- validators/importLite: `requireDir` → `discussionDir`
- validators/requireIndex: `requireDir` → `discussionDir`
- validators/requirementsContext: 全参照を discussion ベースに移行
- validators/discussMermaid: `.qfai/discuss` → `.qfai/discussion`, `04_Business-flow.md` → `03_Story-Workshop.md`
- validators/mermaidEnforcement: `.qfai/discussion` を TARGETS に追加
- validators/repositoryHygiene: `discuss` / `require` → `discussion` legacy ルール追加
- validators/reviewArtifacts: `ALLOWED_TARGET_KINDS` に `"discussion"` 追加
- assets: `qfai.config.yaml` で `requireDir` → `discussionDir`

### Deprecated

- validators/requirePack: `validateRequirePackReadiness` は deprecated（`validateDiscussionPackReadiness` を使用）
- skills: `qfai-discuss` / `qfai-require` → `qfai-discussion` に統合

### Removed

- assets: `qfai-discuss` スキル
- assets: `qfai-require` スキル
- assets: `.qfai/discuss/` ディレクトリ
- assets: `.qfai/require/` ディレクトリ

## [1.4.38] - 2026-03-03

### Changed

- core/prototyping: `collectElements` を `ids` + `labels` 両方返却するよう拡張（`collectElementsDetailed` 相当）
- core/prototyping: `expectedMarkers` を `CONTRACT_ID:ELEMENT_ID` ベースに変更（旧: `CONTRACT_ID:ELEMENT_LABEL`）
- core/prototyping: `UiFidelityGeneratedScreen.expected` に `ids` フィールドを追加
- core/prototyping: `UiFidelityAutogenExpected` に `elementIds` フィールドを追加
- core/prototyping: `ContractScreenInput` に `elementIds` フィールドを追加
- validate/prototyping: `QFAI-PROT-242` を `expected.ids` 優先に変更し、旧形式（label ベース）も後方互換で許容
- validate/prototyping: `UiFidelityScreenEvidence.expected` に `ids?: string[]` を追加
- validate/prototyping: QFAI-PROT-242 の診断メッセージを `CONTRACT_ID:ELEMENT_ID` 形式に更新
- docs/migrations: `v1.4.37.md` のマーカー記述を `CONTRACT_ID:ELEMENT_ID` に修正
- docs/migrations: `v1.4.38.md` を追加
- docs: UI Contract README のマーカー推奨値を `CONTRACT_ID:ELEMENT_ID` に統一
- repo: パッケージバージョンを 1.4.38 に更新

## [1.4.37] - 2026-03-02

### Added

- validate/prototyping: `QFAI-PROT-241` (error) — `uiFidelity.screens[].missing.labels` が空でない場合のラベル欠落検出を追加（`expected.labels` 存在時のみ適用、後方互換）
- validate/prototyping: `QFAI-PROT-242` (error) — `uiFidelity.screens[].missing.markers` が空でない場合のマーカー欠落検出を追加（`expected.elements > 0` 時に適用）
- validate/prototyping: `QFAI-PROT-243` (warning) — placeholder/single-text ページ検知を追加（`expected.elements > 2` かつ `observed <= 1`）
- core/prototyping: `extractDomMarkers()` を追加し、`[data-qfai]` 属性からのマーカー抽出を実装
- docs/migrations: `docs/migrations/v1.4.37.md` を追加

### Changed

- cli/prototyping: `--autogen-only` かつ `--autogen-ui-fidelity` 未指定時に exit 2 を返すよう変更（no-op 事故防止）
- cli/prototyping: autogen 未有効時に `uiFidelityAutogen.status=skipped` を evidence に書き込むよう変更（検知可能性向上）
- cli/prototyping: 既存 evidence の `runtimeGate.ui[].route` および `specs[].missing.uiRoutes` から route hints を自動抽出するよう変更
- core/prototyping: `hasLabelMatch` を正規化完全一致に変更（部分一致によるチート防止）
- core/prototyping: body テキストトークン化をオプトイン化（`QFAI_AUTOGEN_BODY_TOKENS=1`、デフォルト無効）
- core/prototyping: crawl 結果に `markers` フィールドを追加し、`buildUiFidelityScreens` で `found.markers / missing.markers` を生成
- validate/prototyping: `UiFidelityScreenEvidence` 型に `expected.labels`, `found`, `missing`, `coverage` を任意フィールドとして追加（後方互換）
- repo: パッケージバージョンを 1.4.37 に更新

## [1.4.36] - 2026-02-28

### Added

- cli/prototyping: `qfai prototyping --autogen-ui-fidelity` コマンドを追加し、`contracts/ui/**` と DOM 巡回による `uiFidelity` 自動生成を実装
- core/prototyping: `uiFidelityAutogen` モジュールを追加（`collectExpectedFromContracts`, `crawlRoutesAndCollectFoundLabels`, `runMockPaths`, `emitUiFidelity`）
- dependencies: `jsdom` を追加（軽量 DOM 解析用）

### Changed

- cli: `--autogen-ui-fidelity`, `--autogen-only`, `--evidence-out`, `--base-url`（prototyping 用）オプションを args に追加
- env: `QFAI_PROTOTYPE_FIDELITY_AUTOGEN=1` / `QFAI_PROTOTYPE_BASE_URL` 環境変数をサポート
- docs: README に prototyping autogen の使用方法・CI 統合例・失敗時ハンドリングを追記
- repo: パッケージバージョンを 1.4.36 に更新

## [1.4.35] - 2026-02-28

### Added

- docs/migrations: `docs/migrations/v1.4.35.md` を追加し、v1.4.34 からの運用更新点（gate追加なし）を明文化
- docs/examples: UI Contract と `uiFidelity` の良い例を追加（`docs/examples/ui-contract.good.yaml`, `docs/examples/prototyping-ui-fidelity.good.json`）

### Changed

- validate/prototyping: `QFAI-PROT-232` の診断性を改善し、`refs` に `contract_id/route/contract_element_labels(_by_contract_route)/missing_labels(alias)/required_actions` を付与
- validate/prototyping: `QFAI-PROT-231/232/233` のメッセージを次アクション指向に更新（label描画・`data-qfai` マーカー・action配線）
- templates/contracts-ui: `contracts/ui/README.md` に `elements[].id` 命名/変更ポリシー、`elements[].label` 運用、L2 `actions[]` 最小セット、FAQ を追加
- templates/review: `assistant/templates/rcp_footer.md` と `review/README.md` に prototyping 失敗時の診断手順と「最初に見るファイル」順を追加
- tests/assets+core: 上記 docs/validator 変更に追従する回帰チェックを追加・更新
- repo: パッケージバージョンを 1.4.35 に更新

## [1.4.34] - 2026-02-27

### Added

- validate/prototyping: `uiFidelity` interactive hard gate を追加し、欠落を `QFAI-PROT-231`（error）として検出
- validate/prototyping: UI contract と `uiFidelity` の欠落整合検証を `QFAI-PROT-232`（error）として追加（contract参照/route/elements/actions）
- validate/prototyping: interactive 時の `mockPaths.status=pass` 欠落検知 `QFAI-PROT-233`（warning）を追加
- docs/migrations: `docs/migrations/v1.4.34.md` を追加し、v1.4.33 からの最小移行手順を明文化

### Changed

- tests/core: `prototypingEvidence` 回帰テストを拡張し、`QFAI-PROT-231/232/233` の最小セットを追加
- tests/core: `validate` fixture の `prototyping.json` を v1.4.34 hard gate 準拠に更新
- templates/evidence: `README.md` の `uiFidelity` 説明を optional から modeベース運用（interactive必須 / skeleton許容）へ更新
- docs/tests/validator: README・CIガイド・validator文言・回帰テスト期待値を v1.4.34 に更新
- repo: パッケージバージョンを 1.4.34 に更新

## [1.4.33] - 2026-02-27

### Added

- templates/contracts-ui: `contracts/ui/README.md` に mockable prototype（`prototype.mode/mockPaths/markers`）の規約と `elements/actions` フィールド詳細を追記し、copy-ready な sample/example を追加
- templates/evidence: `prototyping` 証跡テンプレートへ `uiFidelity`（optional, backward-compatible）を追記

### Changed

- templates/prototyping: `/qfai-prototyping` の DoD を L1/L2 二層で明文化し、既定 L2（interactive）+ `uiFidelity` 出力必須 + placeholder-only output を REVISE 規約に更新
- tests/assets+core: 上記テンプレート/skill追加に対する guardrail を追加し、v1.4.33 表記へ更新
- docs/tests/validator: README・CIガイド・validator文言・回帰テスト期待値を v1.4.33 に更新
- repo: パッケージバージョンを 1.4.33 に更新

## [1.4.32] - 2026-02-24

### Added

- wrappers: `.agents` / `.github/prompts` の `qfai-sdd` wrapper に no-arg all-specs batch reminder（Capabilities SSOT / parallel delegation / batch末尾validate+review）を追加

### Changed

- templates/docs: `.qfai/README.md` の deprecated wrappers 説明を「route」から「initでは非配布・`/qfai-sdd` を使用」へ修正
- tests/assets: `qfai-sdd` wrapper reminder の回帰guardrailを追加
- docs/tests/validator: v1.4.32 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.32 に更新

## [1.4.31] - 2026-02-24

### Added

- tests/assets: `/qfai-sdd` の引数なし実行で「全spec対象 + 並列委任必須」ルールが維持されることを検知する guardrail を追加

### Changed

- templates/sdd: `/qfai-sdd` の引数解釈を更新し、引数なし時は `_shared/03_Capabilities.md` の順序に従って `spec-0001..N` を全件対象にするルールを明文化
- templates/sdd: 引数なしバッチ時は Contracts-first/Outline を1回、Slice/Plan/Delta を spec毎に並列委任、validate/review をバッチ末尾1回で実施する必須ルールを追加
- templates/instructions: `workflow.md` に `/qfai-sdd` の target policy（引数あり単一spec・引数なし全spec）を追記
- docs/tests/validator: v1.4.31 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.31 に更新

## [1.4.30] - 2026-02-23

### Added

- validate/prototyping: `.qfai/evidence/prototyping.json` を検査する `validatePrototypingEvidence` を追加し、全spec網羅・declared/checked整合・API 404禁止（`QFAI-PROT-101/111/112/113/114`）を hard gate 化
- templates/agents: prototyping の coverage 欠落を検知して STOP する `prototyping-coverage-auditor` ロールカードを追加

### Changed

- templates/prototyping: `/qfai-prototyping` を `<spec-id>` 前提から **ALL specs** 前提へ更新し、Preflight/Execution/Runtime Gate v2 + `prototyping.md/json` 証跡を必須化
- templates/instructions: `workflow.md` / `constitution.md` の prototyping 完了条件を `evidence + qfai validate --fail-on error` に統一し、scope 縮小禁止を明文化
- tests/assets: prototyping guardrail（ALL specs/evidence必須/DONE禁止条件）の退行検知を追加
- docs/tests: v1.4.30 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.30 に更新

## [1.4.29] - 2026-02-22

### Added

- tests/assets: init assets 内の禁止文字列（Coverage Ledger hard gate 残骸）・legacy spec 参照（`spec.md` / `delta.md`）・`qfai-sdd/templates/spec-pack` 再導入を検知する guardrail を追加

### Changed

- templates/skills+agents: `assistant/**` の完了ゲートを `qfai validate --fail-on error` + `assistant/steering/test-layers.md` に統一し、Coverage Ledger / `scenario.feature` 必須導線を除去
- templates/specs: spec 参照を layered v1.4.21 命名（`01_Spec.md` / `09_delta.md` / `_shared/10_delta.md`）へ統一
- templates/sdd: `qfai-sdd/templates/spec-pack/**` を配布対象から除去し、`templates/specs/**` のみを配布
- templates/skills: `qfai-sdd-planning` / `qfai-sdd-refinement` を init 配布対象から除外し、`qfai-tdd-red|green|refactor` を deprecated wrapper 運用へ更新
- docs/tests: v1.4.29 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.29 に更新

## [1.4.28] - 2026-02-22

### Added

- tests/assets: 汎用 skills/agents に `Coverage Ledger 100%` ゲート残骸が再導入されないことを検査する guardrail を追加

### Changed

- templates/skills: `qfai-verify` / `qfai-sdd` / `qfai-configure` / `qfai-prototyping` から coverage ledger 完了ゲートを除去し、`qfai validate --fail-on error` + `assistant/steering/test-layers.md` を必須ゲートとして明記
- templates/skills: 上記4 skill で `scenario.feature` / coverage ledger を mandatory 入力から optional legacy 入力へ格下げ
- templates/agents: `orchestrator` / `test-engineer` / `qa-engineer` / `qa-reviewer` / `unit-test-scope-enforcer` / `backend-engineer` / `frontend-engineer` を SSOT（US/TC/CON-API + validate gate）に整合
- docs/tests: v1.4.28 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.28 に更新

## [1.4.27] - 2026-02-22

### Added

- templates/migration: ATDD運用の v1.4.27 hard gate 整合を明記する `v1.4.27-atdd-alignment.md` を追加

### Changed

- templates/assistant: `test-layers` / `workflow` / `agent-selection` / `drift-protocol` を US/TC/CON-API 中心の運用へ更新
- templates/skills+agents: `/qfai-atdd` と atdd implementers・reviewer・coverage planning 系を ledger 必須から validate error gate 中心へ更新
- docs/tests: v1.4.27 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.27 に更新

## [1.4.26] - 2026-02-21

### Added

- validate/atdd: spec→コード（ATDD注釈）の hard gate を追加し、Unknown参照（`QFAI-ATDD-101/102/103`）・Coverage欠落（`QFAI-ATDD-111/112/113`）・禁止参照（`QFAI-ATDD-121/122`）を error として検出
- report/atdd-traceability: `.qfai/report/atdd-traceability/summary.json` と `summary.md` の出力を追加（出力失敗は `QFAI-ATDD-901` warning）

### Changed

- templates/docs: test-layer運用とRCP観点を v1.4.26 の ATDD注釈運用に更新
- docs/tests: v1.4.26 表記に合わせて README・CIガイド・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.26 に更新

## [1.4.25] - 2026-02-21

### Added

- validate/layerCoverage: v1.4.21 layered specs 向けに構造完全性 hard gate（`QFAI-COV-204`/`QFAI-COV-205`/`QFAI-COV-206`）を追加し、空参照行を error として検出
- validate/layerCoverage: EX の複数 BR 参照を薄さシグナルとして警告する `QFAI-COV-207` を追加
- ci: `qfai validate --fail-on error --format github` 実行と report artifact upload を workflow に追加

### Changed

- templates/skills: `/qfai-sdd` に validate 実行（error=0）と evidence（`validate.log` / `specs-coverage`）必須の completion gate を追加
- templates/skills: `/qfai-discuss` に Example Mapping 観点（Happy/Negative/Edge/Permission/State/Idempotency）と Density Review 連携を追加
- templates/review+agents: RCP footer / review request / coverage-planner / test-case-owner / test-volume-estimator / qa-gatekeeper を v1.4.21 layered 入力と hard gate 運用に更新
- docs/tests: v1.4.25 運用に合わせて README・validator文言・回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.25 に更新

## [1.4.24] - 2026-02-20

### Added

- validate/contracts: `11_Contracts.md` と `_shared/05_Contracts.md` の契約参照IDを宣言済み契約へ照合する validator を追加（`QFAI-CONTRACT-030`、short ID 正規化対応）
- init/wrappers: `.agents/skills/**` と `.agents/README.md` の生成を追加し、`--force` 時の stale wrapper 削除に対応

### Changed

- templates/sdd: `/qfai-sdd` を contracts-first 必須フローへ更新し、`_shared/05_Contracts.md` の Contract Index（DB/API/UI short ID）規約を明記
- templates/specs: layered shared/spec の欠番対策として `_shared/08_Decisions.md` / `_shared/09_Open-questions.md` / `_shared/10_delta.md` を追加し、`07/08` 系の empty 時 `0 items` 明示を標準化
- templates/prototyping: `/qfai-prototyping` に「契約不足時STOP」「契約ファイル新規作成禁止」を追加
- docs/tests: `.agents` wrapper 追加・v1.4.24 運用に合わせて README と回帰テストを更新
- repo: パッケージバージョンを 1.4.24 に更新

## [1.4.23] - 2026-02-18

### Added

- validate/layered: v1.4.21 layered specs 向けに下位参照検知（`TRACE_DOWNSTREAM_REF`）と `_shared` 責務違反検知（`TRACE_SHARED_SCOPE_VIOLATION`）を追加
- validate/status: `.qfai/status` の legacy 検知 validator を追加（`LEGACY_STATUS_DIR` / `LEGACY_STATUS_DIR_NONEMPTY`）
- report/run-log: `qfai validate` 実行ごとに `.qfai/report/run-*/` を append-only 生成し、`run.json` / `validator.json` / `traceability.json` / `summary.md` を保存

### Changed

- validate/spec-pack: release gate の `release_candidate` 判定を specs Initiative レイヤーに統一し、`.qfai/status/*.json` 依存を廃止
- templates/docs: init scaffold と README 群の status 記述を run-log 運用（`.qfai/report/run-*`）へ更新
- tests: layered v1.4.21 traceability・legacy status warning・run-log 生成の回帰テストを追加/更新
- repo: パッケージバージョンを 1.4.23 に更新

## [1.4.22] - 2026-02-18

### Added

- core/pack-locator: discuss/require pack の命名判定・timestamp 解析・latest 選定を共通化し、生成系（preflight）と検証系（validator）で同一ルールを適用
- validate/hygiene: legacy directory（`discussions/`, `requirements/`, `spec/`, `specification/`）と legacy pack（`*-0001` 形式）検知を追加（v1.4.22 は warn 中心、危険命名は error）

### Changed

- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を実処理なしの deprecated wrapper へ置換し、`/qfai-sdd` へ一本化
- templates/init: report ディレクトリに `.gitignore` を追加し、ログ/成果物の追記型運用を明確化
- docs/tests: v1.4.22 の skill 導線・衛生ルール・テンプレ構成へ README と回帰テスト期待値を更新
- repo: パッケージバージョンを 1.4.22 に更新

## [1.4.21] - 2026-02-18

### Added

- validate/layerCoverage: v1.4.21 向けの `AC->TC` / `BR->EX` / `EX->TC` 必須カバレッジ検証（error）を追加
- validate/layerCoverage: `.qfai/report/specs-coverage/spec-XXXX.md` のカバレッジレポート出力と signal 行を追加
- validate/layerCoverage: `specs/plan.md` 禁止・`10_Plan.md` の How-only 禁止項目検査を追加

### Changed

- templates/specs: layered canonical 名を v1.4.21 へ更新（`03_Acceptance-Criteria.md` / `04_Business-Rules.md` / `05_Examples.md` / `06_Test-Cases.md` / `_shared/04_Business-Flow.md`）
- core/spec-layout: layered 既定 required file set を v1.4.21 名へ更新し、`LayeredStyle=v1421` 判定を追加
- validate/business-flow/mermaid/review-gate: Business Flow の canonical 名を `04_Business-Flow.md` に統一し、旧名は warning で検出
- templates/docs/tests: v1.4.21 命名・Plan方針に合わせて manifest / skill / README / test expectation を更新
- repo: パッケージバージョンを 1.4.21 に更新

## [1.4.20] - 2026-02-18

### Added

- templates/discuss: `/qfai-discuss` の固定成果物を `01_Context.md`..`09_delta.md` の9ファイル構成へ更新
- templates/review: `review-roster.yml` と共通RCPフッター（`assistant/templates/rcp_footer.md`）のSSOTを追加
- validate/discuss: 最新 discuss pack の OQ 検査（`Disposition: open` 禁止、`deferred` 必須メタ検査）を追加

### Changed

- templates/skills: `/qfai-discuss` を Open OQ=0 ループ（`deferred` 許容）へ更新し、`/qfai-discuss` `/qfai-require` `/qfai-sdd` で総動員レビュー導線を統一
- docs/tests: v1.4.20 表記と discuss 固定テンプレート構成に合わせて回帰テストを更新
- repo: パッケージバージョンを 1.4.20 に更新

## [1.4.19] - 2026-02-17

### Added

- validate/require: `require-<timestamp>/` の固定9ファイル存在・最小内容・Blocking OQ（`Disposition: open` + `Gate: discuss|require|sdd`）検査を追加
- validate/review: `.qfai/review/.gitignore` と `review-*` 最小成果物（`review_request.md` / `R*_*.md` / `summary.json`）検査を追加
- core/preflight: `/qfai-sdd` 用 preflight に require-pack 必須停止ガード（不足時の次コマンド誘導）を追加
- core/spec-layout: layered spec 必須ファイル集合のSSOTを追加し、欠落・番号飛び検知を強化

### Changed

- templates/init: `.qfai/review/.gitignore` を常設し、review 生成物の追記型運用を固定化
- templates/require: `/qfai-require` の成果物を固定9ファイル（`01_Sources.md`..`09_delta.md`）へ更新
- templates/skills: `/qfai-require` `/qfai-sdd` `/qfai-sdd-refinement` `/qfai-sdd-planning` を require-pack 必須導線へ更新
- docs/tests: v1.4.19 表記と require-pack / preflight / review / layered spec 回帰テストを更新
- repo: パッケージバージョンを 1.4.19 に更新

## [1.4.18] - 2026-02-16

### Added

- validate/mermaid: `.qfai/specs|require|discuss`（`evidence` 除外）を対象に Mermaid 記法の fenced block 強制 + Business Flow 必須図を検証する validator を追加
- validate/layered: v1.4.17 layered spec の `US -> AC -> BR -> EX -> TC` に対して「親が最低1つの子を持つ」coverage validator を追加

### Changed

- templates/specs: `_shared/04_Business-flow.md` と `_shared/05_Contracts.md` の Mermaid 必須表現を強化
- templates/specs: `spec/05_Examples.feature` の `# Parent:` 必須ルールをテンプレートに明記
- templates/skills: `/qfai-discuss` `/qfai-require` `/qfai-sdd-refinement` `/qfai-sdd-planning` の FINAL CHECKLIST を v1.4.18 要件へ更新
- docs/tests: v1.4.18 表記と Mermaid/Coverage validator の回帰テストを更新
- repo: パッケージバージョンを 1.4.18 に更新

## [1.4.17] - 2026-02-16

### Added

- validate/layered: CAP単位のspec分割を検証する `validateSpecSplitByCapability` を追加
- validate/layered: Parent参照の方向（下位→上位のみ）を検証する `validateLayeredTraceability` を追加
- validate/layered: US/AC/BR/EX/TC の孤児禁止を検証する `validateOrphanProhibition` を追加
- templates/specs: `_shared/03_Capabilities.md` と `spec/01..09` の v1.4.17 テンプレート群を追加

### Changed

- core/spec-layout: layered spec の標準構成を `01_Spec.md + 02..06` へ対応しつつ旧構成との互換を維持
- templates/skills: `/qfai-sdd` `/qfai-sdd-refinement` の分割規約を CAP単位ループ・Parent必須ルールへ更新
- templates/review: review request / reviewer / summary テンプレートの layer 名を v1.4.17 スキーマへ更新
- docs/tests: v1.4.17 表記と layered traceability / orphan 検証の回帰テストを更新
- repo: パッケージバージョンを 1.4.17 に更新

## [1.4.16] - 2026-02-16

### Added

- templates/sdd: import-lite 用 evidence テンプレート（`templates/evidence/import-lite.md`）を追加
- templates/sdd: preflight 報告テンプレート（`templates/report/preflight_summary.md`）を追加
- validate/require: `02_requirement-index.md` の最小 shape（`REQ-` 件数、`Source refs` 欠落率）を検査する warning validator を追加
- validate/import-lite: specs が存在するのに require index と import-lite evidence の両方が無い場合の warning validator を追加
- core/preflight: SDD preflight 入力選択と `preflight_summary.md` 生成ユーティリティを追加

### Changed

- templates/require: `02_requirement-index.md` を索引専用（`REQ-ID / Statement / Priority / Source refs / Notes`）へ更新し、specs との重複禁止を明確化
- templates/skills: `/qfai-sdd` `/qfai-sdd-refinement` の preflight 手順を `require-index` 優先 + import-lite fallback + report 出力に整合
- templates/init: `.qfai/report/README.md` を追加し、preflight_summary の格納先を明確化
- docs/tests: v1.4.16 表記と import-lite/preflight テンプレート参照を更新
- repo: パッケージバージョンを 1.4.16 に更新

### Changed

- なし

## [1.4.15] - 2026-02-16

### Added

- templates/init: `.qfai/status/README.md` を追加し、status（運用状態）の保管場所を明確化
- validate/status: specs 配下の status 混入（`release_candidate` / `Status` / `Progress` / `Risk(s)`）を検知する warning validator を追加
- validate/density: BR/Examples/Test-cases の最低存在チェック（`BR-` / `Scenario` / `TC-` と Coverage Matrix）を warning validator として追加

### Changed

- templates/specs: Business Rules / Examples / Test-cases テンプレートを v1.4.15 の密度要件（Catalog/Rule Definitions/Matrix 等）へ強化
- templates/skills: `/qfai-sdd-refinement` `/qfai-sdd-planning` の review 観点に BR→Examples→Test-cases の分解品質チェックを追加
- docs/tests: v1.4.15 表記と status 分離・density validator の回帰テストを更新
- repo: パッケージバージョンを 1.4.15 に更新

## [1.4.14] - 2026-02-16

### Added

- validate/mermaid: Mermaid 記法が `mermaid` 以外の fenced code block に書かれた場合を検出する validator（error）を追加
- validate/business-flow: `.qfai/specs/_shared/04_Business-flow.md` の mermaid 必須チェック（flowchart または sequenceDiagram）を追加
- validate/compat: `.qfai/specs/_shared/*Business-flow*.feature` を deprecated warning として検出

### Changed

- templates/skills: `/qfai-discuss` `/qfai-require` `/qfai-sdd-refinement` の Mermaid ルールと review checklist を更新
- templates/specs: Business Flow のテンプレート/README を `Markdown + Mermaid` 前提へ更新
- docs/tests: v1.4.14 表記と Mermaid 関連の回帰テストを更新
- repo: パッケージバージョンを 1.4.14 に更新

## [1.4.13] - 2026-02-16

### Added

- なし

### Changed

- templates/discuss+require: discuss / require 出力ディレクトリ命名を timestamp (`discuss-*` / `require-*`) へ統一し、README・skill 定義を更新
- validate/discovery: discuss 探索を `discuss-*` 優先に変更し、旧形式 (`DISCUSS-####`) は後方互換 + warning として扱う
- docs/tests: v1.4.13 表記と成果物パス表記を更新
- repo: パッケージバージョンを 1.4.13 に更新

## [1.4.12] - 2026-02-16

### Added

- templates/review: `/qfai-discuss` / `/qfai-require` / `/qfai-sdd-refinement` / `/qfai-sdd-planning` に review artifacts 用テンプレート（`review_request.md` / `Rxx_reviewer.md` / `summary.json`）を追加
- templates/steering: `review-gate.rules.yml` を追加し、required/optional gate と default reviewers を定義
- validate/review-gate: `.qfai/review/**/summary.json` を検証する review gate validator（schema / fixed 条件 / attempt 連番 / fingerprint / required gate）を追加

### Changed

- templates/skills: discuss/require/sdd-refinement/sdd-planning に RCP 手順（attempt 採番・差戻しループ・fixed 判定）を明記
- tests: review gate validation と review template 配布の回帰テストを追加
- tests/docs: v1.4.12 表記へ更新
- repo: パッケージバージョンを 1.4.12 に更新

## [1.4.11] - 2026-02-16

### Added

- templates/skills: `/qfai-sdd-refinement` / `/qfai-sdd-planning` を追加し、SDD preflight の分割運用を再導入
- templates/sdd: import-lite 証跡テンプレート（`qfai-sdd-refinement/templates/import-lite-evidence.md`）を追加

### Changed

- templates/require: `/qfai-require` の成果物を `01_sources.md` / `02_requirement-index.md` / `03_open-questions.md` へ刷新
- docs/workflow: require・specs・README 導線を import-lite/preflight 前提へ更新
- validate: require context validator を `qfai validate` の実行対象から外し、旧 require 構造依存を解消
- tests/verify-pack: require index 新構造と SDD split skill に追従
- tests/docs: v1.4.11 表記へ更新
- repo: パッケージバージョンを 1.4.11 に更新

## [1.4.10] - 2026-02-16

### Added

- validate/layered: `_shared + spec-XXXX` レイアウト向け検証（CAP↔spec整合、US→AC→BR→SC→CASE の必須エッジ、namespace整合）を追加

### Changed

- validate/ids: `CAP` / `US` を ID 抽出・重複検知対象に追加
- validate/layout: `*_delta.md` を許容し、Layered layout を優先検出
- docs/skills: `.qfai/specs/README.md` と skill の Mandatory Outputs を v1.4.10 契約へ更新
- tests/docs: v1.4.10 表記へ更新
- repo: パッケージバージョンを 1.4.10 に更新

## [1.4.9] - 2026-02-14

### Added

- なし

### Changed

- init/integrations: `qfai init` で `.claude/commands`・`.github/prompts`・`.codex/skills` と agent wrapper（`.claude/agents`・`.github/agents`）を再生成するよう修正（対象は現行 canonical skills のみ）
- init/force: `qfai init --force` で canonical skills と integration wrappers を再同期する挙動へ更新
- verify-pack/tests/docs: wrapper 配布前提に検証・ドキュメントを更新
- tests/docs: v1.4.9 表記へ更新
- repo: パッケージバージョンを 1.4.9 に更新

## [1.4.8] - 2026-02-14

### Added

- なし

### Changed

- templates/init-root: `qfai init` 実行時に `features/spec-0001.feature` を生成しないよう、root サンプル feature を削除
- tests/docs: v1.4.8 表記へ更新
- repo: パッケージバージョンを 1.4.8 に更新

## [1.4.7] - 2026-02-14

### Added

- なし

### Changed

- templates/skills: 廃止対象 skill（`qfai-implement` / `qfai-pr` / `qfai-scenario-test` / `qfai-spec` / `qfai-unit-test`）を削除
- templates/wrappers: `.claude` / `.codex` / `.github` 配下の配布資産を撤廃
- templates/contracts: contracts サンプルを `qfai-sdd/templates/contracts/` へ移設し、参照を更新
- docs/tests/init: 廃止導線の参照を削除し、`qfai-sdd` 中心フローへ統一
- repo/ci: このリポジトリ自身の品質ゲートとして `build`（`pnpm ci:local`）を GitHub Actions で維持
- repo: パッケージバージョンを 1.4.7 に更新

## [1.4.6] - 2026-02-14

### Added

- templates/skills: 全 canonical skill (`.qfai/assistant/skills/*/SKILL.md`) に `Completion Checklist (MUST)` と `Completion Message & Next Actions (MUST)` を追加
- templates/skills: `qfai-discuss` に固定の完了メッセージ（`/qfai-require` 誘導）を必須化

### Changed

- templates/skills: 完了時に「次のユーザー行動」を列挙する導線を全 skill で標準化
- repo: パッケージバージョンを 1.4.6 に更新

## [1.4.5] - 2026-02-14

### Added

- templates/skills: contracts サンプルを `.qfai/assistant/skills/qfai-spec/templates/contracts/` に追加

### Changed

- templates/init: `qfai init` 初期資産を空スキャフォールド化（specs/discuss/require/contracts は README/.gitignore のみ）
- templates/init: legacy `.qfai/discussions/` を削除し、参照を `.qfai/discuss/` に統一
- tests: init 直後に sample pack が無い前提へ検証セットアップを更新
- repo: パッケージバージョンを 1.4.5 に更新

## [1.4.4] - 2026-02-13

### Added

- validate: release_candidate 判定（`03_Initiative.md` の `release_candidate: true`）と release gate（OQ open blocking）を追加
- validate: `18_delta.md` の required sections / Rejected の `DO NOT`・`Temptation` 必須チェックを追加

### Changed

- validate: Spec Pack/Ledger 系エラーの修正指示を強化し、error_code ベースで原因と対処を明確化
- cleanup/docs: 旧資産導線を整理し、v1.4.4 hardening 方針へ統一
- repo: パッケージバージョンを 1.4.4 に更新

## [1.4.3] - 2026-02-13

### Added

- templates/skills: 統合SDD skill `qfai-sdd` を追加し、`templates/spec-pack/01..18` を単一skill配下に集約
- templates/wrappers: `.codex` / `.claude` / `.github` 向け `qfai-sdd` wrapper を追加

### Changed

- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を廃止し、`qfai-spec` は `qfai-sdd` への deprecated alias に更新
- templates/docs: README / `.qfai` ドキュメント導線を `qfai-sdd` 一本化へ更新
- repo: パッケージバージョンを 1.4.3 に更新

## [1.4.2] - 2026-02-13

### Added

- templates: `qfai-discuss` / `qfai-require` の v1.4.2 ヒアリングテンプレート（Core / Optional deep dive, `00..07`）を追加

### Changed

- templates/skills: `qfai-discuss` / `qfai-require` を「レイヤー型 Spec Pack 入力を揃える構造化ヒアリング」フローに刷新
- templates/docs: discuss / require 成果物フォーマットを v1.4.2 仕様へ更新
- repo: パッケージバージョンを 1.4.2 に更新

## [1.4.1] - 2026-02-12

### Added

- validate/report: 新Spec Pack（`01..18`）と Ledger SSOT を前提にした検証・レポート生成を追加

### Changed

- validate: 旧成果物（`spec.md` / `scenario.feature` / `case-catalogue.md` / `traceability-matrix.md`）前提の探索・検証を廃止
- repo: パッケージバージョンを 1.4.1 に更新

## [1.4.0] - 2026-02-12

### Added

- templates/spec-pack: `01_Spec.md` から `18_delta.md` までの新 Spec Pack テンプレートを `qfai-sdd-refinement` / `qfai-sdd-planning` の skills 配下に追加
- templates/specs/contracts: init 直後に参照できる `spec-0001` サンプルと `API-0001` / `DB-0001` / `UI-0001` サンプル契約を追加

### Changed

- templates/docs: `.qfai/specs/README.md` を Spec Pack 01..18 構成と参照方向ルール（下位→上位のみ）へ更新
- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` の作業フロー規約と Mandatory Outputs を新構成へ更新
- repo: パッケージバージョンを 1.4.0 に更新

## [1.3.19] - 2026-02-11

### Added

- validate: Drift Protocol / test-layer hardening 用の assistant assets validator を追加（`QFAI-ASSETS-001/002`, `QFAI-SKILLS-010/011/012`）
- validate: `.qfai/assistant/skills/**` と `.qfai/assistant/skills.local/**` の `SKILL.md` 必須 marker / Reviewer Gate 静的検証を追加

### Changed

- validate: `implementation-brief.md` 単独存在を warning から error へ変更（How SSOT を `plan.md` に完全統一）
- templates/docs: `implementation-brief.md` の互換期間説明を廃止し、`plan.md` 必須方針へ更新
- repo: パッケージバージョンを 1.3.19 に更新

## [1.3.18] - 2026-02-11

### Added

- templates: How SSOT の新テンプレート `.qfai/templates/spec/plan.md` を追加
- templates: Drift Protocol 規範 `.qfai/assistant/instructions/drift-protocol.md` とテストレイヤ規範 `.qfai/assistant/steering/test-layers.md` を追加
- validate: `plan.md` 検証と legacy `implementation-brief.md` 互換判定（`QFAI-HOW-001/002` 継続）を追加
- templates/agents: reviewer 系サブエージェントに Drift Protocol / test-layer policy 観点を追加

### Changed

- templates/specs/docs: How SSOT の標準ファイル名を `implementation-brief.md` から `plan.md` へ移行（legacy は互換期間で warning 扱い）
- templates/skills: Reviewer Gate と work order 制約を更新し、drift 承認制・test-layer 準拠を明文化
- templates/skills: ATDD のテストボリューム floors/倍率を「ゲート」ではなく「不足検知シグナル」として扱う方針に更新
- repo/docs: README・命名規約・関連説明を `plan.md` 前提へ整合
- repo: パッケージバージョンを 1.3.18 に更新

## [1.3.17] - 2026-02-10

### Added

- validate: case-catalogue の必須カラム表ヘッダ検証を追加（`QFAI-CASE-011`）
- validate: `.qfai/discussions/discuss-*.md` の Mermaid `sequenceDiagram` 検証を追加（`QFAI-DISCUSS-021`）

### Changed

- validate: CI 環境で `--phase refinement` 実行を禁止し、`QFAI-VALIDATE-017` で Fail 化
- validate: waiver を Warn/Info 用途に限定し、Error finding 対象 waiver を `QFAI-WAIVER-002` として Fail 化
- validate: waiver 期限切れの扱いを `QFAI-WAIVER-003` warning へ変更
- templates/docs: waiver 運用と refinement phase の注意事項（CI は full を使用）を更新
- repo: パッケージバージョンを 1.3.17 に更新

## [1.3.16] - 2026-02-10

### Added

- templates/skills: 全 Skill に `Sub-agent Delegation (MANDATORY)` セクションを追加し、Capability Probe / Simulation mode / Work Orders Summary / Reviewer Gate を明文化
- test/assets: skills 出荷アセットの委任要件整合を検査する静的チェックを追加

### Changed

- templates/skills: 主要工程（discuss/require/sdd/atdd/tdd/verify）の委任フローを Delegate → Integrate → Reviewer Gate に更新
- templates/wrappers: `.claude/.github/.codex` の wrapper skill へ同等の委任要件を反映
- repo: パッケージバージョンを 1.3.16 に更新

## [1.3.15] - 2026-02-10

### Added

- templates: `require/business-flows.md` と discussions の Business Flow 例で Mermaid `sequenceDiagram` を標準化
- validate: requirements context で `business-flows.md` の Mermaid 必須チェックを追加（`QFAI-REQCTX-020/021`）

### Changed

- templates: skills 構造を `SKILL.md` 単体完結（SSOT）へ移行し、`qfai-source` / `10_workflow.md` 依存を廃止
- templates: `assistant/instructions/workflow.md` と各工程 skill に steering 補完ルールを明記
- templates/docs: `specs/README.md` の `case-catalogue.md` テンプレを表形式へ更新
- repo: パッケージバージョンを 1.3.15 に更新

## [1.3.14] - 2026-02-09

### Added

- validate: `--phase refinement` を追加し、Refinement段階の専用検証プロファイルを導入
- validate: `implementation-brief.md` 検証を追加（`QFAI-HOW-001/002`）
- templates/skills: `qfai-sdd-refinement` / `qfai-sdd-planning` を追加し、How SSOT（`implementation-brief.md`）運用を導入
- templates: `.qfai/templates/spec/implementation-brief.md` を追加

### Changed

- validate: refinement phase では How必須チェックと SC→Test 強制（`QFAI-TRACE-010/013`）を緩和
- templates/docs: Spec Pack 必須ファイルに `implementation-brief.md` を追加し、SDDフローを refinement/planning に更新
- skills: `qfai-spec` を deprecated alias として `qfai-sdd-refinement` へ誘導
- repo: パッケージバージョンを 1.3.14 に更新

## [1.3.13] - 2026-02-08

### Added

- templates: skills-only 配布構成（`.claude/skills` / `.github/skills`）を追加
- validate/doctor: `skillsIntegrity` チェックを追加（`.qfai/assistant/skills/**` を検査）

### Changed

- templates: `prompts/commands` を廃止し、`.qfai/assistant/skills` を SSOT とする構成へ移行
- init: `--force` の上書き対象を `assistant/skills` と publish 先 skills（`.claude/.github/.codex`）へ変更
- config: `paths.skillsDir` を追加し、`paths.promptsDir` を deprecated 扱いへ変更
- tests/scripts/docs: assets テスト・verify-pack・README 群を skills-only 構成に更新
- repo: パッケージバージョンを 1.3.13 に更新

## [1.3.12] - 2026-02-08

### Added

- validate: delta.md の Verification Plan 検証を追加（VFY-001〜007）
- report: Verification findings（Error/Warn）の可視化を追加

### Changed

- templates: delta.md テンプレートに Verification セクションを追加
- templates: PR テンプレートに verification 確認項目を追加
- docs: verification 運用の最小ガイドを README と init docs に追記
- repo: パッケージバージョンを 1.3.12 に更新

## [1.3.11] - 2026-02-08

### Added

- validate: waiver 設定（`.qfai/waivers.yml`）と適用機構を追加（WAIVER-001〜006）
- report: Active Waivers / Suppressed Summary / Expired Waivers の表示を追加
- templates: `.qfai/waivers.yml` テンプレートを init 資産に追加

### Changed

- validate: findings に waiver マッチ用メタ（`dl_id` / `file`）を付与し、waiver 適用後の結果で fail 判定
- templates: PR テンプレートに Waivers 申告セクションを追加
- tests: waiver の unit/integration/assets 回帰テストを追加
- repo: パッケージバージョンを 1.3.11 に更新

## [1.3.10] - 2026-02-07

### Added

- validate: compat/scope 整合チェックを追加（COMPAT-001〜005, SCOPE-001/002）
- report: compat 観点と scope mismatch の表示を追加

### Changed

- templates: delta.md を v1.1（`#### Migration / Follow-ups`）へ更新し、PR テンプレートに compat セクションを追加
- tests: compat/scope ルールとテンプレート更新の回帰テストを追加
- repo: パッケージバージョンを 1.3.10 に更新

## [1.3.9] - 2026-02-07

### Added

- validate: delta.md フォーマット v1（Update History / Decision Log / Meta YAML / Rejected guardrails）検証を追加（DELTA-001/002/003）
- validate: Change Type の語彙検証と diff ベース矛盾検知を追加（CTYPE-001/002/003）
- report: Change Type（Primary/Tags/compat）集計と CTYPE-002 警告一覧を追加

### Changed

- templates: delta.md テンプレートを v1 構造に更新し、PR テンプレートに Change Type / Tags / delta 参照 / Review Focus を追加
- tests: delta/ctype 関連ユニットテストと assets ガードレールを更新
- repo: パッケージバージョンを 1.3.9 に更新

## [1.3.8] - 2026-02-06

### Changed

- templates: Claude Code slash commands（`.claude/commands/*.md`）が `.qfai/assistant/skills/<id>/SKILL.md` を参照するよう更新（skills -> prompts(SSOT)）
- docs: README の integration 説明を Claude commands の skills 優先に更新
- repo: パッケージバージョンを 1.3.8 に更新

## [1.3.7] - 2026-02-06

### Changed

- Codex skill wrappers now reference `.qfai/assistant/skills/<id>/SKILL.md` as the canonical entrypoint (instead of `.qfai/assistant/prompts/<id>.md`).
- Updated `.codex/README.md` to document the skills-first entrypoint for tool integrations.

## [1.3.6] - 2026-02-06

### Changed

- templates: GitHub Copilot prompt wrappers（`.github/prompts/*.prompt.md`）が `.qfai/assistant/skills/*/SKILL.md` を参照するよう更新（skills -> prompts(SSOT)）
- templates: `.github/copilot-instructions.md` のガイダンスを skills 優先に更新
- docs: README の integration 説明を skills 優先に更新
- repo: パッケージバージョンを 1.3.6 に更新

## [1.3.5] - 2026-02-06

### Added

- templates: `.qfai/assistant/skills/<skill-name>/SKILL.md` と `.qfai/assistant/skills.local/` を追加（experimental: prompt の thin wrapper）

### Changed

- init: `assistant/skills.local` を `qfai init --force` の上書き対象から保護
- verify-pack: `assistant/skills` / `assistant/skills.local` の生成を検証
- repo: パッケージバージョンを 1.3.5 に更新

## [1.3.4] - 2026-02-05

### Changed

- validate: requirements コンテキスト段階導入メッセージのバージョン表記を v1.3.4 に更新
- repo: パッケージバージョンを 1.3.4 に更新

## [1.3.3] - 2026-02-05

### Added

- templates: change classification（Primary/Tags）判断基準の SSOT を追加（`.qfai/assistant/instructions/change-classification.md`）

### Changed

- docs/templates: README と `.qfai/README.md` に change classification 参照を追加
- prompts: `qfai-spec` / `qfai-verify` に Primary/Tags の必須化を追加
- templates: `specs/README.md` に Primary/Tags メタデータとガイドを追加
- repo: PR テンプレに Primary/Tags のセクションを追加

## [1.3.2] - 2026-02-05

### Added

- validate: requirements コンテキスト（glossary/actors/business-flows）と Coverage Map の段階導入チェックを追加（QFAI-REQCTX-000/001/002/003/004/010）
- config: `paths.requireDir`（デフォルト `.qfai/require`）を追加
- tests: requirements コンテキスト検証のユニットテストを追加

### Changed

- templates: `qfai.config.yaml` に `paths.requireDir` を追記
- docs: README の config 例に `requireDir` を追記

## [1.3.1] - 2026-02-04

### Added

- prompts: legacy entrypoint 向け prompt（`qfai-scenario-test` / `qfai-unit-test` / `qfai-implement` / `qfai-pr`）を追加
- templates: legacy entrypoint 向け wrapper（`.github/prompts` / `.claude/commands` / `.codex/skills`）を追加
- templates: `.qfai/require/require.md` テンプレを追加
- templates: `.qfai/discussions/README.md` を追加
- templates: `require/glossary.md` / `require/actors.md` / `require/business-flows.md` を追加
- instructions: `assistant/instructions/requirements-decomposition.md` を追加

### Changed

- docs: README を npm EN v1.0.7 の内容に整合（root/package 同期）し、設定例を現行スキーマに整合
- templates: `.qfai/README.md` / `require/README.md` を要求分解と Coverage Map に整合
- prompts: `/qfai-discuss` / `/qfai-require` / `/qfai-spec` を ACT/BF/TERM と Coverage Map に整合

## [1.3.0] - 2026-02-04

### Added

- validate: delta.md の Change Type（primary/tags）と Decision Records の do_not/temptation 欠落警告を追加（QFAI-DELTA-201〜204）
- tests: Change Type 警告のユニットテストを追加

### Changed

- templates: delta.md の Change Log テンプレートに Change Type と rejected 補強（do_not/temptation）を追加
- prompts/instructions: 作業開始時に Change Type を宣言する運用を追加
- docs: PR テンプレに Change Type / Compatibility / delta.md 更新点を追加

## [1.2.14] - 2026-02-03

### Added

- prompts: /qfai-atdd の Coverage Ledger 必須化、sub-agent 必須、Stage Gates/DoD/差戻し条件を強化
- prompts: /qfai-prototyping・/qfai-tdd-green の Runtime Gate を必須化、/qfai-tdd-red の TDD Ledger を必須化
- prompts: /qfai-require・/qfai-spec の未定義/OQ 検知とユーザー質問を必須化、/qfai-discuss の事前調査を必須化
- agents: Orchestrator / ATDD Implementers / Reviewer / Runtime Gatekeeper / Doc Steward / Test Volume Estimator を追加
- templates: evidence の階層化パスと命名規則を追加、traceability matrix に status 列を追加
- validate: traceability-matrix の status 列検証を追加

### Changed

- docs: README の ATDD 説明と sub-agent 必須化を更新
- instructions: agent-selection の委譲マップを新ロールに整合

## [1.2.13] - 2026-02-01

### Added

- prompts: inputs の優先順位（instructions/steering/delta）と rejected ガード、DONE 宣言の必須情報を全プロンプトに追加
- agents: 全ロールに Preflight / rejected ガード / DR-ID 参照を追記
- validate: delta.md の最小構造検証（Change Log / Decision Records / 順序 / rejected）を追加
- tests: delta validator の新規検証に対応するユニットテストを追加

### Changed

- templates: `.qfai/specs/README.md` の delta.md 契約を Change Log + Decision Records + RE-OPEN へ更新
- prompts: qfai-spec の delta.md 要件を新契約に整合し、qfai-discuss/qfai-require に意思決定ログ前提を追記
- docs: README のワークフロー説明に delta 参照/RE-OPEN の前提を追記

## [1.2.12] - 2026-01-31

### Added

- prompts: 完了契約に OQ/placeholder スキャンと成果物の全量チェックを追加（全プロンプト共通）

### Changed

- なし

## [1.2.11] - 2026-01-31

### Added

- agents: OptionExplorer / OptionReviewer ロールを追加（delta の案出し/レビュー）
- agents: UI/UX Reviewer ロールを追加（UI レイアウト健全性のレビュー）
- templates: specs/README の delta.md テンプレートを拡張（Decision Summary / Considered Options / Selection Criteria / Chosen・Rejected / Contract Trace）

### Changed

- prompts: qfai-spec に OptionExplorer / OptionReviewer の作業順と必須セクションを追記
- prompts: qfai-prototyping に Runtime Interaction Gate と UI レイアウトガードレールを追加
- prompts: qfai-tdd-green の Runtime Interaction Gate と UI レイアウト健全性チェックを強化
- instructions: agent-selection の委譲マップを v1.2.11 の新ロールに整合

## [1.2.10] - 2026-01-31

### Added

- prompts: qfai-require/qfai-spec に OQ ハーベストと問診ループを追加
- agents: OQHarvester / OQReviewer ロールを追加
- templates: require に open-questions 台帳を追加

### Changed

- prompts: Open=0 をデフォルト完了条件にし、Deferred にはユーザー承認の証跡を必須化
- prompts: qfai-spec の未定義潰しを require 相当のヒアリングとして内包

## [1.2.9] - 2026-01-31

### Added

- prompts: qfai-discuss に事前知識収集フェーズ（Researcher 委任）を追加
- agents: Researcher ロールカードを追加

### Changed

- prompts: qfai-discuss の質問設計を「全量ドラフト→1問ずつ（総数/番号表示、3択+おまかせ）」に更新
- prompts: qfai-discuss の Evidence に収集メモ/質問設計根拠の記録を追加
- docs: qfai-discuss の説明と委任ルールを更新

## [1.2.8] - 2026-01-30

### Changed

- templates: `.qfai/**/README.md` の構成説明をツリー表記に統一

## [1.2.7] - 2026-01-30

### Added

- prompts: `/qfai-prototyping` を追加（契約からの最小実行可能スケルトン実装フェーズ）
- prompts: 全プロンプトに FORMAT SSOT (Mandatory) セクションを追加（README-as-SSOT for formatting）
- templates: `.qfai/**/README.md` に正規テンプレートとサンプルを追加
- templates: `specs/README.md` に spec.md/delta.md/scenario.feature/case-catalogue.md/traceability-matrix.md の完全テンプレートを追加

### Changed

- prompts: 全プロンプトで `.qfai/**/README.md` をフォーマットの単一の情報源として参照するよう更新
- templates: `.qfai/README.md` に推奨ワークフローシーケンス（prototyping フェーズ含む）を追加
- docs: README に `/qfai-prototyping` を推奨シーケンスに追加

## [1.2.6] - 2026-01-28

### Added

- prompts: 全プロンプトに Completion Contract（CRITICAL CONSTRAINTS/Evidence/FINAL CHECKLIST）を水平展開
- prompts: Evidence を `.qfai/evidence/` に統一し、Git 管理外（.gitignore 同梱）を明記
- agents: 全ロールカードに Mission/Inputs/Deliverables/Stop/Sign-off を追加
- init: `.qfai/evidence/.gitignore` を同梱し、Evidence を自動で追跡対象外に
- tests: assets guardrails で Evidence .gitignore を検査

## [1.2.5] - 2026-01-28

### Added

- prompts: 全プロンプトに Completion Contract（CRITICAL CONSTRAINTS/Evidence 要求）を追加
- prompts: qfai-tdd-green に契約→実装スコープ表、ステージゲート、Runtime Smoke を追加
- prompts: qfai-tdd-green に evidence テンプレートを追加
- init: `.qfai/evidence` をテンプレート構成に追加
- tests: prompts の必須セクションを assets guardrails でスモーク検証

### Changed

- prompts: qfai-tdd-green をオーケストレーター主導の完了分離フローに強化

## [1.2.4] - 2026-01-28

### Added

- traceability: .feature の @SC-XXXX-XXXX をテスト証跡として収集
- traceability: layer-aware enforcement と deferred info を追加
- config: traceability.testFileGlobs に `features/**/*.feature` を追加
- prompts: qfai-atdd / qfai-tdd-\* に Coverage Ledger と完了条件を追加
- prompts: qfai-spec の粒度ガイドを更新（1BR=1ルール＋分割）
- agents: Coverage Ledger 監査と差し戻し条件を追加

### Changed

- traceability: SC 未参照の出力を layer 付き + サンプル上限化
- docs: README / templates の説明を更新

## [1.2.3] - 2026-01-27

### Added

- config: testStrategy に requireLayerTags / requireSizeTags / maxE2eScenarioRatio / maxE2eScenarioCount を追加

### Changed

- validate: Spec が契約 ID を列挙しているのに Scenario が none の場合は warning を追加
- report: e2e 比率/上限のガードレール表示を追加

## [1.2.2] - 2026-01-27

### Added

- prompts: qfai-atdd / qfai-tdd-red / qfai-tdd-green / qfai-tdd-refactor を追加

### Changed

- prompts/docs: qfai-scenario-test / qfai-unit-test / qfai-implement を廃止し、新ワークフローへ更新

## [1.2.1] - 2026-01-27

### Added

- scenario: @layer-_/@size-_ タグの検証を追加（opt-in + 集約出力）
- report: layer/size 分布と未設定一覧を追加
- spec: case-catalogue / traceability-matrix の検証を追加
- traceability: Scenario の contract-ref subset 検証を追加

### Changed

- report: scenarios を scenario.feature のファイル数ではなく総シナリオ数で集計

## [1.2.0] - 2026-01-26

### Added

- ids: AC/CASE のフォーマット検証と Spec Pack 間の重複検知を追加
- traceability: scenario.feature 内の SC 重複検出（QFAI-TRACE-035）を追加

### Changed

- traceability: scenario.feature の複数 Scenario/Outline を許容し、Spec:SC=1:1 の制約を撤廃
- prompts/docs: Spec Pack ガイドと qfai-spec を複数シナリオ対応に更新
- report/tests: 新ルールに合わせてレポート/テストを更新

## [1.1.11] - 2026-01-26

### Changed

- prompts: qfai-unit-test をテスト実装専用に固定し、完了条件をテスト実行ベースへ更新
- prompts: qfai-implement を実装専用に固定し、runnable 証拠の明示とテスト責務分離を強化
- tests: assets guardrails に qfai-unit-test / qfai-implement の必須フレーズ検証を追加

## [1.1.10] - 2026-01-25

### Changed

- prompts: qfai-unit-test にテスト専用の範囲制約とブロック条件/DoD を追加
- prompts: qfai-implement に runtime evidence 必須化と禁止完了条件を追加
- agents: Unit Test Scope Enforcer / Runtime Gatekeeper のロールカードとラッパーを追加

## [1.1.9] - 2026-01-24

### Changed

- ids: Spec内ローカル連番に合わせて BR/SC ID フォーマットを更新
- traceability: SC/BR タグとテストアノテーションの検出を新形式へ対応
- prompts: qfai-discuss/qfai-spec/qfai-scenario-test を v1.1.9 方針に合わせて強化
- agents: 多層レビュー向けの役割カードを追加
- docs: 命名規約と例示の ID 形式を更新

## [1.1.8] - 2026-01-23

### Changed

- init: `.qfai` テンプレートから指定 README と require.md を削除し、report は実行時生成へ統一
- init: テンプレート Markdown を英語・汎用化（日本語/日付/版表記を除去）
- prompts: README 非編集ルールを全プロンプトへ拡張
- prompts: qfai-require の require.md 自動作成と安定テンプレ遵守を明記
- prompts: qfai-spec に要求/契約の事前準備を追加し、gate 実行条件を明確化
- tests: init 期待ファイル/プロンプト整合テストを更新し、英語-only ガードレールを追加

## [1.1.7] - 2026-01-23

### Changed

- init: `.qfai` 配下の全 README.md を全面刷新 — 意義/背景、配置可否、構造例、テンプレ、完成例、チェックリストを統一フォーマットで記載
- prompts: qfai-discuss / qfai-require / qfai-spec に README rule（README は編集せず参照のみ）を追加
- agents: 主要エージェントに README rule を追加

## [1.1.6] - 2026-01-22

### Changed

- prompts: qfai-spec に Contracts First の順序強制（contracts完成→FIX→specs作成）を追加
- prompts: qfai-spec の Hard Constraints を強化（1ファイル=1シナリオ、BR=1、許可カテゴリ api/db/ui のみ、samples生成禁止）
- prompts: qfai-discuss のコンセプト/NFR/方針必須化と discussions 保存を強化
- agents: contract-designer に UI/API/DB 必須成果物の強制と禁止事項（infra、YAML中のMarkdown混入）を追加
- tests: assets テストにプロンプト退行防止チェック（キーフレーズ存在検証）を追加

## [1.1.5] - 2026-01-21

### Changed

- prompts: qfai-spec に定量ガードレール（1 spec pack = 1シナリオ、ID形式、BR上限、contractRef必須）を追加
- prompts: qfai-spec の delta.md に Decision Log（候補→採用/不採用/保留）を必須化
- prompts: qfai-spec に discuss 記録参照を必須化し、最終ゲート（validate + repo gates）を作業完了条件に明記
- prompts: qfai-discuss にコンセプト/NFR/方針の必須化と `.qfai/discussions/discuss-XXXX.md` 保存を追加
- prompts: qfai-scenario-test に事前チェック（単一シナリオ確認）と SC 注釈ルール、最終ゲートを追加
- prompts: qfai-unit-test に SC 注釈ルールと最終ゲートを追加
- prompts: qfai-implement に最終ゲートを明記
- prompts: qfai-verify と qfai-require に最終ゲートを明記

## [1.1.4] - 2026-01-20

### Changed

- init: `.qfai/samples/**` の生成を撤廃し、Decision Guardrails の例を README 内のインライン例へ移行
- prompts: qfai-spec の delta.md テンプレートに Decision Table / Decision Guardrails を追加
- prompts: qfai-implement に delta の decision log 参照を必須化
- verify-pack: guardrails extract のスモークを合成 delta で実施
- docs: README の guardrails 説明を samples 依存から切り離し、ツリー記述も更新

## [1.1.3] - 2026-01-20

### Added

- init: `.github/agents` と `.claude/agents` にサブエージェント wrapper を追加（.qfai の role card 参照）

## [1.1.2] - 2026-01-20

### Changed

- prompts: qfai-spec に preflight（config/steering 収束保証）を追加
- prompts: qfai-configure に qfai-spec preflight の注記を追加
- docs: README に qfai-spec preflight の注記とフロー補足を追加

## [1.1.1] - 2026-01-19

### Changed

- docs: v1.0.14 実体に合わせ、v1.1.0 設計資料へ v1.1.1 addendum を追記
- init: `.qfai/README.md` の Template version を撤去し、テンプレ内 semver を排除
- init: `steering/manifest.md` と steering/specs の導線を v1.1.1 方針に整合
- prompts: qfai-configure に manifest 補完の evidence/assumptions を明記
- repo: PR テンプレに Manifest / Decision Guardrails の確認項目を追加

## [1.1.0] - 2026-01-19

### Added

- guardrails: Decision Guardrails の抽出/検査/整形 CLI を追加
- guardrails: delta.md の Decision Guardrails サンプルを同梱（opt-in）
- report: Decision Guardrails の集計章を追加
- doctor: Decision Guardrails の導入状況チェックを追加
- tests: guardrails のパース/CLI/verify-pack を追加

### Changed

- init: steering をフラット化し、manifest の参照を一意化
- prompts: qfai-configure に steering 自動補完ステップを追加
- verify-pack: guardrails extract のスモークを追加
- init: `.qfai/README.md` の Template version を明示（唯一の例外として許可）

## [1.0.14] - 2026-01-19

### Added

- tests: add guardrails to ensure init workflow does not rely on lockfile caching

### Changed

- init: remove cache settings from generated GitHub Actions workflow
- docs: clarify that the default workflow avoids dependency caching and show optional setup-node cache snippet

## [1.0.13] - 2026-01-18

### Changed

- init: remove npm ci from generated GitHub Actions workflow
- init: keep validate gate runnable without repository dependency install
- docs: align CI description with the generated workflow

## [1.0.12] - 2026-01-18

### Changed

- init: remove hard-coded version labels from init kit docs
- init: use meaning labels in contract docs

## [1.0.11] - 2026-01-18

### Changed

- prompts: remove orphan reference to /qfai-pr from qfai-verify
- tests: add guardrail to ensure prompt bodies do not reference missing /qfai-\* commands

## [1.0.10] - 2026-01-18

### Changed

- init: remove orphan prompt `qfai-pr` from `.qfai/assistant/prompts`
- tests: add guardrail test to ensure prompt bodies and agent wrappers are aligned

## [1.0.9] - 2026-01-18

### Changed

- spec: BR 抽出を固定セクション依存から全体走査に変更
- config: `validation.require.specSections` の既定値を空配列に変更
- docs: specSections の任意設定と /qfai-configure の推奨フローを追記

## [1.0.8] - 2026-01-18

### Changed

- docs: README の設定スキーマ例を実装に合わせて修正

## [1.0.7] - 2026-01-16

### Added

- init: `qfai-configure` プロンプトを追加
- init: Copilot / Claude Code / Codex 向けのラッパー資産を追加

### Changed

- docs: README を英語版に刷新し、npm README と同期
- verify-pack: init 資産の検証対象を拡張

## [1.0.6] - 2026-01-14

### Added

- assistant assets: instructions set expanded (thinking/communication/quality/agent-selection)

### Changed

- init: remove root tests sample
- contracts: DB is SQL
- docs: .qfai README clarity improvements

## [1.0.5] - 2026-01-12

### Added

- init: `.qfai/assistant/**` を同梱（instructions/steering/prompts/agents）

### Changed

- Breaking: `.qfai/out/` を廃止し、`.qfai/report/` に統一
- Breaking: `.qfai/prompts/` を `.qfai/assistant/prompts/` に移動
- Breaking: `qfai analyze` と analyze 資産を廃止
- init: `.qfai` テンプレ構成を v1.0.5 へ刷新（assistant 資産を SSOT 化）

## [1.0.4] - 2026-01-10

### Changed

- `qfai init` から `.qfai/rules/**` と `.qfai/samples/**` を削除（導入を簡素化）
- `delta.md` の「変更区分（Compatibility/Change）」チェック運用を撤廃（テスト/QA ゲートへ移行）
- `promptpack` / `prompts` / docs から分類ルールの参照を削除

### Fixed

- doctor の path checks から `rulesDir` を削除
- report のガイダンス文言を更新

## [1.0.3] - 2026-01-10

### Added

- thema 契約（`thema-*.yml`）を導入
- UI 契約に `themaRef` / `themeOverrides` / `assets` を追加
- validate に assets 参照整合チェックを追加（最小検証）

### Changed

- Breaking: Scenario は `scenario.feature` 固定（v1.0.2 で導入済みのため再掲）
- Breaking: `scenario.md` は v1.0.3 から error（自動救済なし）
- 移行: `scenario.md` を `scenario.feature` にリネームし、参照スクリプトも更新
- 補足: v1.0.2 が変更の初出、v1.0.3 で `scenario.md` の拒否挙動を追加

## [1.0.2] - 2026-01-09

### Added

- なし

### Changed

- Breaking: Spec Pack の Scenario ファイルを `scenario.feature` に変更（旧拡張子は非対応）
- docs: Spec Pack の例・命名規約・PRテンプレ等を `scenario.feature` に統一
- docs: 破壊的変更の例外運用（minor/patch での実施）を明記
- tests/pack: init テンプレと配布物検証を `scenario.feature` 前提に更新
- tests: fs glob のパス表記差を吸収するため比較を正規化

## [1.0.1] - 2026-01-09

### Added

- report: `--base-url` を追加し、report.md 内のファイルパスをリンク化可能に
- core: glob 走査の上限ガードレール（20000件で打ち切り + warning）
- ci: Node 20 の検証ジョブを追加

### Changed

- core: testFileGlobs 走査に truncated/limit を追加
- docs: Node.js の Supported/Tested/Recommended を明記
- docs: report.json / doctor.json の内部表現方針を明文化

## [1.0.0] - 2026-01-08

### Added

- verify:pack: analyze の `--list` / `--prompt spec_to_scenario` を配布物ゲートに追加
- ci: analyze の CLI スモークを追加
- tests: root README と npm README の一致チェックを追加

### Changed

- docs: v1.0.0 向けに README/RELEASE/CHANGELOG を整合

## [0.9.2] - 2026-01-07

### Added

- tests: npm README の初日導線/インストール/参照整合のガードレールを追加

### Changed

- docs: README の初日導線を init→doctor→validate→report に統一
- docs: npm README のインストール案内を dev dependency 前提に修正
- docs: npm README の docs/\*\* 参照を GitHub リンクへ置換

## [0.9.1] - 2026-01-07

### Added

- cli: `qfai analyze` を追加（`--list` / `--prompt <name>`）
- init: analyze 用の入力バンドル例を `.qfai/samples/analyze/input_bundle.md` に同梱（create-only）

### Changed

- init: analyze 用標準プロンプトの雛形/命名を改善

## [0.9.0] - 2026-01-07

### Added

- init: analyze 用の標準プロンプトを `.qfai/prompts/analyze/**` に同梱
- init: analyze 実施ログのテンプレートを `.qfai/samples/analyze/analysis.md` に同梱（create-only）

### Changed

- docs: analyze の目的/使い方/注意事項を追記

## [0.8.2] - 2026-01-07

### Fixed

- docs: init/--force の挙動説明を実装契約に一致させ、specs/contracts 破壊の誤誘導を解消
- cli: init 実行時に `--force` の適用範囲（prompts のみ）を明示

### Added

- tests: init の overwrite/create-only 契約を回帰テストで固定

## [0.8.1] - 2026-01-07

### Added

- validate: issue に category（compatibility/change）と suggested_action を追加
- doctor: `.qfai/prompts` の整合性チェック（標準 assets との差分検出）を追加

### Changed

- init: `.qfai/prompts` のみ `--force` で上書き（それ以外は create-only）
- validate: `.qfai/prompts` 直編集（標準資産改変）を error として検出
- report.md: Dashboard + カテゴリ別章 + issue カード形式に変更
- docs: validate.json schema/examples に category/suggested_action を反映

## [0.8.0] - 2026-01-07

### Added

- verify:pack: `.qfai/prompts.local/**` が `init --force` でも上書きされないことを回帰で検証
- validate: GitHubサマリに failOn/result を出力し、次アクション（report生成）を案内

### Changed

- report.md: Summary / Findings / Guidance に再構成し、Issue集計・安定ソート・fail-on根拠を明示
- docs: 初日導線（init→doctor→validate→report）の整合、prompts.local保護対象の明記
- validate: 代表的なエラーメッセージを具体化（例/次アクションを明示）

## [0.7.3] - 2026-01-06

### Added

- LICENSE を追加（repo root + packages/qfai、npm tarball に同梱）

### Changed

- packages/qfai: package.json のメタデータを補完（license/description/repository 等）
- verify:pack: packed artifact に LICENSE/README.md が含まれることを検査

## [0.7.2] - 2026-01-06

### Changed

- packages/qfai: パッケージメタデータ修正のため v0.7.2 として再リリース（version フィールド整合）

## [0.7.1] - 2026-01-06

### Added

- Prompts Overlay を採用（`.qfai/prompts.local/**` を優先参照する運用）

### Changed

- `init` は `.qfai/prompts.local/**` を上書きしない（利用者カスタム領域を保護）
- `doctor` に `.qfai/prompts.local` の存在を情報として出力

### Removed

- `qfai sync`（PromptPack 差分検知・export）を撤去（overlay 方針へ一本化）

## [0.7.0] - 2026-01-05

### Added

- `qfai sync` を追加（PromptPack の差分検知・同期候補書き出し）
- `--mode check`: 同梱アセットとの差分を検出（exit 0=差分なし、1=差分あり、2=エラー）
- `--mode export`: 同期候補を非破壊でエクスポート
- `--out <path>`: export の出力先
- `--format <text|json>`: 出力形式

### Changed

- なし

## [0.6.3] - 2026-01-05

### Changed

- docs: 回数ベースの完了基準を削除し、DoD/CI 基準に統一
- docs: README の JSON 例から version フィールドを削除
- docs: README にバッジ・目次・インストールセクション・ライセンスセクションを追加
- docs: npm パッケージ README をルート README と同期

## [0.6.2] - 2026-01-05

### Added

- doctor に `--fail-on` を追加（warning/error で exit 1）
- doctor に monorepo outDir 衝突検出（`--root` 指定時のみ）
- CI と verify:pack に doctor スモークを追加

### Changed

- report/doctor JSON から formatVersion を削除
- README/ドキュメントに非契約方針とレビュー完了基準を追記

## [0.6.1] - 2026-01-05

### Changed

- doctor のチェック出力順を config→paths→spec→output→traceability に整合
- README に doctor JSON / report.json の非契約方針と短い例を追記

## [0.6.0] - 2026-01-05

### Added

- `qfai doctor` を追加（設定/探索/パス/glob/validate.json の事前診断）

### Changed

- `report --format json` に `reportFormatVersion` を追加

## [0.5.2] - 2026-01-04

### Added

- `report --run-validate` / `report --in` を追加
- `qfai.config.yaml` の自動探索（cwd から親へ）
- `test:assets` と CI での assets/Docs スモーク検証

### Changed

- `validate --format github` のアノテーション上限・重複排除・サマリ出力
- report の Spec キーを specId 固定にし、出力パスは root 相対化
- PromptPack と docs/examples の運用ガイドを更新（非契約/experimental 明記）

## [0.5.1] - 2026-01-04

### Added

- Scenario の 1ファイル=1シナリオ検証（`QFAI-TRACE-030`）を追加
- report で Spec→契約の missing/none を区別し、全 Spec を出力

### Changed

- Scenario の契約参照を `# QFAI-CONTRACT-REF:` コメント宣言に統一（タグ抽出を廃止）
- issue code を `QFAI-TRACE-xxx` 形式へ正規化し、Spec の contract-ref エラーを `021/023/024` に分割
- orphan contract 設定を `allowOrphanContracts` から `orphanContractsPolicy` へ移行
- docs/examples・init テンプレートを新ルールに整合

## [0.5.0] - 2026-01-03

### Added

- report に Spec の contract-ref 未宣言一覧を追加
- トレーサビリティ/契約/変更区分の運用プロンプトを追加

### Changed

- report の契約→Spec / Spec→契約 表に (none)/(orphan) を明示
- PromptPack と README の導線・文言を v0.5.0 仕様に整合

## [0.4.9] - 2026-01-03

### Fixed

- README の `unknownContractIdSeverity` 説明を Scenario 側の契約参照に整合（Spec の未知契約は常に error）
- `prepack` を `npm run build` に変更し、pack の自己完結性を向上

## [0.4.8] - 2026-01-03

### Fixed

- npm pack/publish 時に dist が必ず生成されるようにし、壊れた成果物の生成を防止
- d.ts ビルドが monorepo 外でも成立しやすいように @types/node を追加

## [0.4.7] - 2026-01-03

### Fixed

- PromptPack/.instruction のトレーサビリティ文面を現行方針に整合（Spec→下流参照禁止は運用担保、Spec→Contract を SSOT）

## [0.4.6] - 2026-01-03

### Fixed

- init テンプレの contracts README を Spec/Contract ルールに整合（Spec の参照が SSOT、Scenario→Contracts は任意）

## [0.4.5] - 2026-01-03

### Added

- 契約ファイルの `QFAI-CONTRACT-ID` 宣言を必須化（1ファイル1ID）
- Spec の `QFAI-CONTRACT-REF` 宣言を必須化（`none` 可）
- 契約→Spec のカバレッジ検証（orphan contract）
- report に契約カバレッジと Spec/Contract マップを追加
- PromptPack と PR テンプレに Compatibility / Change の分類欄を追加

### Changed

- DATA ID を DB ID に統一（`DATA-xxxx` を無効化）
- 契約 ID の抽出を宣言行（SSOT）に統一（本文/operationId からの抽出を撤去）
- SC→契約の接続必須ルールを廃止
- init テンプレの Spec/Contract サンプルと README を新ルールに整合

## [0.4.2] - 2026-01-02

### Added

- テスト探索の glob 設定（`testFileGlobs` / `testFileExcludeGlobs`）を追加
- init テンプレートにテスト glob 生成プロンプトを追加
- validate/report にテスト探索のメタ情報（glob/除外/件数）を追加

### Changed

- SC→Test 判定を glob 設定に切替（未設定・一致0件は `QFAI-TRACE-013`）
- Scenario の SPEC/BR 欠落を `QFAI-TRACE-014/015` として検出
- Spec→Contract 参照の存在チェック（`QFAI-TRACE-009`）を廃止
- Spec:SC=1:1 で SC が 0 件の場合も error

## [0.4.1] - 2026-01-02

### Added

- SC→Test アノテーション方式（`QFAI:SC-xxxx`）と `tests/`・`src/` 探索を追加
- テスト側の未知 SC アノテーション検出（`QFAI-TRACE-011`）を追加
- Spec:SC=1:1 検証（`QFAI-TRACE-012`）を追加
- `validate.json` に SC→Test カバレッジを追加
- report に Spec:SC=1:1 違反一覧を追加

### Changed

- Scenario の複数記述を許容（参照 SC は同一）
- SCカバレッジの missing 表示に scenario ファイル情報を付与
- `QFAI-TRACE-002` を info に格下げ
- init テンプレートのテストサンプルをアノテーション方式に更新

## [0.4.0] - 2026-01-01

### Added

- SC→Test 参照のトレーサビリティ検証（`scMustHaveTest` / `scNoTestSeverity`）
- report に SC カバレッジと参照テスト一覧を追加
- init テンプレートに tests サンプルを追加

### Changed

- report の Markdown 出力に SC カバレッジセクションを追加

### Removed

- ロードマップ文書を削除

## [0.3.8] - 2026-01-01

### Changed

- validate/report の入出力から schemaVersion を廃止（後方互換破棄）
- docs/examples を現行例に一本化
- テスト/fixture を schemaVersion 廃止に追従

### Removed

- `docs/schema/validation-result.schema.json` から schemaVersion を削除

## [0.3.7] - 2026-01-01

### Changed

- （タグ整合のための追記）v0.3.7 は既にリリース済み

## [0.3.6] - 2026-01-01

### Changed

- `.instruction/02_project` を QFAI Toolkit 向けに更新し、誤誘導の元を除去
- `AGENTS.md` の参照ガイドとレビュー運用ルールを更新
- `docs/rules/naming.md` の版表記を削除
- README/RELEASE/テスト/パッケージのバージョン表記を更新

## [0.3.5] - 2025-12-31

### Added

- PromptPack を init テンプレートに追加（`.qfai/promptpack/`）
- `docs/promptpack.md` を追加

### Changed

- OQ表記の排除対象を「現行仕様として参照される場所」に限定する方針を明文化
- RELEASE/README の表記を更新（PromptPack 追記を含む）

## [0.3.4] - 2025-12-31

### Changed

- init で生成する require を `.qfai/require/` 配下へ移動（後方互換なし）

### Fixed

- PRテンプレのOQチェックリストを撤去し、決定事項チェックへ置換
- 命名規約の過去状態（OQ継続/版表記）を除去し、標準構成へ収束
- CHANGELOG の誤記（ADR検証表現）を修正

## [0.3.3] - 2025-12-31

### Added

- pnpm allowlist 運用ガイド（`.qfai/rules/pnpm.md`）をテンプレートに追加
- `.qfai/require/README.md` と require-to-spec プロンプト雛形をテンプレートに追加

### Changed

- README に「できること」セクションを追加
- init テストでテンプレート生成を検証
- 命名規約ドキュメントの版表記を更新

### Fixed

- init のテンプレート探索パスを明確化し、見つからない場合はエラーで通知

## [0.3.2] - 2025-12-31

### Added

- Gherkin 公式パーサ（@cucumber/gherkin）と Scenario モデルを追加
- Scenario 内の本文/DocString から契約 ID を抽出するトレーサビリティを追加
- Feature の SPEC タグ必須チェックと Scenario/Spec ファイルの存在チェックを追加

### Changed

- Spec Pack のディレクトリ名を `spec-0001`（4 桁）へ統一（`spec-001` など 3 桁は非対応）
- Spec Pack は `.qfai/specs` 直下のディレクトリのみサポート（ネスト構成を廃止）
- Scenario/ID/Traceability の解析を AST ベースへ刷新

## [0.3.1] - 2025-12-30

### Added

- Spec Pack（spec.md / delta.md / Scenario ファイル）のテンプレートと規約を追加
- delta.md の変更区分検証を追加
- Scenario 単位のタグ検証（SC 1件必須、Feature タグ継承）を追加

### Changed

- config スキーマを刷新（paths.\* / output.validateJsonPath）
- Scenario ファイルの配置を `specs/spec-xxx/` に統一
- validate は常に `validate.json` を出力し、report は固定パスを入力に使用
- init テンプレート/README/verify-pack を新構成に整合

### Removed

- decisions/ADR のバリデーションを除外

## [0.3.0] - 2025-12-30

### Added

- parse 層（Spec/Scenario/ADR）を導入し、構造解析を集約
- BR Priority（P0〜P3）の検証を追加
- Scenario の Feature/Scenario/タグ必須チェックを追加
- ADR パーサ（parseAdr）ユーティリティを追加

### Changed

- Spec 必須セクション判定を H2 見出しベースへ変更
- traceability の Spec→BR を BR 定義（業務ルール内）に限定
- init テンプレ/README を現行仕様へ整合

## [0.2.9] - 2025-12-29

### Added

- ContractIndex を導入し、契約 ID を共通収集（パース失敗時はテキスト抽出）
- 契約パース失敗時のノイズ低減テストを追加

### Changed

- traceability/duplicate 検証の契約 ID 収集を共通化
- init テンプレの固定表現を削除
- API サンプルから `x-qfai-refs` を撤去

## [0.2.8] - 2025-12-29

### Added

- Contract パース失敗/ID 未定義の検出（UI/API）
- Spec → Contract 参照の実在性チェック

### Changed

- report から rules 指標を削除
- `paths.rulesDir` を削除（互換不要）

## [0.2.7] - 2025-12-29

### Added

- Scenario 参照 ID の実在性チェック（SPEC/BR/Contract）
- BR が参照 SPEC に属するかの検証
- 定義 ID の重複検知（Spec/Scenario/Contracts）
- unknown Contract 参照の severity 設定（warning|error）

### Changed

- ID 形式を `PREFIX-0001` に厳格化
- 命名規約/テンプレートの説明を整合

## [0.2.6] - 2025-12-28

### Added

- .qfai 配下の README 群とガイドを追加（spec/contracts/prompts/out）
- Spec/Scenario/Contracts の最小例を刷新

### Changed

- init の生成先を `.qfai/` に統一
- 既定の探索/設定パスを `.qfai` 前提に更新
- Scenario の既定配置を `.qfai/spec/scenarios` に変更

### Removed

- legacy の `spec.md` 探索互換を削除

## [0.2.5] - 2025-12-28

### Added

- 命名規約ドキュメントを追加（docs/rules/naming.md）
- overview / Business Flow 生成用プロンプトをテンプレートに同梱

### Changed

- init テンプレートの Spec/Contracts サンプルを ID+slug 命名に変更
- validate/report/traceability の Spec 探索を `spec-0001-*.md` に対応

### Behavior

- legacy の `spec.md` は引き続き探索対象（後方互換維持）

## [0.2.4] - 2025-12-26

### Added

- CHANGELOG.md を追加
- RELEASE.md を追加

### Changed

- README の Quick Start を現行 CLI 挙動に整合
- validate/report の入出力と GitHub Actions テンプレート導線を明記

### Behavior

- No behavior change（validate/report/CLI の挙動は維持）

## [0.2.3] - 2025-12-25

### Changed

- report: validate.json 欠損時の案内と exit code 2
- init: 既存ファイル衝突時の --force 案内
- build: import.meta 警告の解消と警告ゲート追加
