# 04 Business Rules

## BR-0012-0001: Skill-First Interface

- AC-Refs: AC-0012-0001
- `/qfai-prototyping` is the active interface.
- `qfai prototyping` is not an active public orchestration command (only `iterate` / `certify` / `show-spec` sub-commands are public).

## BR-0012-0002: Mandatory UI Evidence

- Status: superseded by BR-0012-0030 (reviewer-driven Playwright; no capture artifacts) and BR-0012-0035 (per-spec iter-dir namespacing; review.json only). See `09_delta.md` CHG-002 OP-PURGE-077.
- AC-Refs: AC-0012-0002
- Every declared screen in `.qfai/contracts/ui/*.yaml` must have, per iter:
  - `.qfai/evidence/prototyping/iter-NN/<screen>.png`
  - `.qfai/evidence/prototyping/iter-NN/<screen>.html`

## BR-0012-0003: Missing Evidence Is Fail-Closed

- AC-Refs: AC-0012-0003
- If either the screenshot or HTML snapshot is missing, the screen is treated as incomplete.
- The iteration cannot be accepted until evidence is re-captured.

## BR-0012-0004: Evaluator Roles

- AC-Refs: AC-0012-0004
- Generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be different sub-agents (self-preference bias prevention).
- Capture (devops-ci-engineer) is a third role.

## BR-0012-0005: Evaluator Inputs

- AC-Refs: AC-0012-0005
- Reviewer evaluation uses screenshots, HTML snapshots, root `DESIGN.md`, prior reviewer review.json context, and the lap-\* catalog.
- Reviewer findings must explicitly name missing mandatory inputs.

## BR-0012-0006: Validate Gate

- AC-Refs: AC-0012-0006
- `qfai validate --fail-on error` is the machine gate for schema/evidence integrity.
- Validate does not replace human/sub-agent evaluation.

## BR-0012-0007: Verify Gate

- AC-Refs: AC-0012-0007
- `/qfai-verify` confirms validate pass, review artifact presence, and unresolved blocking findings.
- Completion is blocked on `REVISE`.

## BR-0012-0008: Legacy Validation Slice

- AC-Refs: AC-0012-0008
- The following artifacts may still be validated when present (history-only, no active runtime contract):
  - `executionPlan`
  - Lighthouse evidence for legacy web validation
  - `designSystemCompliance`
  - calibration overrides
- These checks are validator/reference behavior only and must not be interpreted as a public runtime contract.

## BR-0012-0009: Non-UI Exclusion

- AC-Refs: AC-0012-0009
- `ui_bearing: false` specs are excluded from prototyping execution.
- Validate must not over-fire UI evidence rules when there is no screen contract.

## BR-0012-0010: Legacy Traceability IDs

- AC-Refs: AC-0012-0010
- Existing user-story IDs and legacy test-case identifier space remain reserved.
- New wording may supersede old runtime narratives without renumbering historical coverage IDs.

## BR-0012-0017: Single Lineage

- Status: superseded by BR-0012-0029 (cycles 0..9, per-spec single lineage under multi-spec). See `09_delta.md` CHG-002 OP-PURGE-078.
- AC-Refs: AC-0012-0020
- Exactly one prototype lineage per `/qfai-prototyping` invocation. No parallel candidate funnel.
- Cycles 0..14 (max 15) form a single serial chain `iter-00 → iter-01 → ... → iter-14` in `prototyping.json#iterations[]`.

## BR-0012-0018: Latest-Accepted Policy

- AC-Refs: AC-0012-0020
- `acceptedIterationIndex === iterations.length - 1` always.
- No best-of-history selection. One-step regression is permitted (canonical creative-leap path).

## BR-0012-0019: 4 UX Axes Ordinal Schema

- Status: superseded by BR-0012-0031 (per spec × screen `<screen>.review.json` with 4 ordinal axes + six `*Feel` prose fields, ≤ 200 words each; no global `critique` length rule). See `09_delta.md` CHG-002 OP-PURGE-079.
- AC-Refs: AC-0012-0021, AC-0012-0022, AC-0012-0023
- Each `iter-NN/review.json` MUST contain `scores: {informationArchitecture, navigationFlow, usability, functionality}` with ordinal values in `{weak, acceptable, strong, exceptional}`.
- `critique` is a single 200..500 word string. `pivotDirective` is one of `"continue" | "refine" | "pivot"`.
- Schema violations raise `QFAI-PROT-020` / `QFAI-PROT-022` / `QFAI-PROT-023` per AC.

## BR-0012-0020: Layout-Anti-Pattern Catalog and IA Cap

- AC-Refs: AC-0012-0024, AC-0012-0025
- `layoutAntiPatternsDetected[]` entries MUST come from `lap-001..008` whitelist.
- Detection caps `informationArchitecture` at `acceptable`. Higher score raises `QFAI-PROT-021`.

## BR-0012-0021: pivotDirective Rules

- AC-Refs: AC-0012-0026, AC-0012-0027
- `pivot` ⇔ latest 3 iters each have low `informationArchitecture` (`weak | acceptable`) AND latest iter has `layoutAntiPatternsDetected.length > 0`.
- `continue` ⇔ ≥ 2 of the 4 axes strictly improved by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3) versus the prior iter.
- Otherwise: `refine`.
- Implementation lives in `computePivotDirective` (`packages/qfai/src/core/prototyping/evaluatorReview.ts`).

## BR-0012-0022: ordinalIndex Mapping

- AC-Refs: AC-0012-0027
- `ordinalIndex(weak)=0`, `ordinalIndex(acceptable)=1`, `ordinalIndex(strong)=2`, `ordinalIndex(exceptional)=3`. Code constant in `iteration.ts`.

## BR-0012-0023: Generator/Evaluator Separation

- AC-Refs: AC-0012-0020
- Generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be distinct sub-agent identities. Same-Claude generator/reviewer is forbidden (self-preference bias).

## BR-0012-0024: Stop Condition

- Status: superseded by BR-0012-0032 (qualitative AND-aggregator across all spec × screen pairs) + BR-0012-0029 (10-cycle terminator at `index === 9`) + BR-0012-0034 (hard-stop class catalog). DESIGN.md sha256 mismatch on cycle ≥ 1 (exit 2) remains active via BR-0012-0026. See `09_delta.md` CHG-002 OP-PURGE-080.
- AC-Refs: AC-0012-0028, AC-0012-0029, AC-0012-0035

`/qfai-prototyping` stops when one of:

- All 4 UX axes (informationArchitecture / navigationFlow / usability / functionality) of the latest iter are `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0` (`stopReason: "axes-exceptional"`, exit 64)
- Latest iter `index === 14` (`stopReason: "max-iterations"`, exit 65)
- DESIGN.md sha256 mismatch on cycle ≥ 1 (`stopReason: "design-md-hash-mismatch"`, exit 2; forces re-run from cycle 0)

No other path triggers stop. LLM subjective DONE is forbidden.

## BR-0012-0025: SKILL.md Size Budget

- AC-Refs: AC-0012-0031
- `qfai-prototyping/SKILL.md ≤ 130` lines.
- `references/iteration-loop.md ≤ 80`, `generator-prompt.md ≤ 60`, `reviewer-prompt.md ≤ 100`, `handoff.md ≤ 50`, `design-md-spec.md ≤ 120`. Combined ≤ 410.

## BR-0012-0026: DESIGN.md Hash Gate

- AC-Refs: AC-0012-0034, AC-0012-0035
- Cycle 0 records `prototyping.json#designMdSha256 = sha256(DESIGN.md)` and asserts equality with `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.
- Cycle ≥ 1 fails closed with exit 2 and stderr `"DESIGN.md hash mismatch"` if the on-disk sha256 has drifted.

## BR-0012-0027: design-system Mirror

- AC-Refs: AC-0012-0036
- `.qfai/contracts/design/design-system.yaml` is generated post-loop as a deterministic byte-equivalent mirror of root `DESIGN.md` token tables (color / typography / radius / shadow). It is NOT extracted from the final iter HTML.
- Drift between mirror and DESIGN.md raises `QFAI-DCON-032` (validator owned by the qfai-validate spec).

## BR-0012-0028: Multi-spec resolver per invocation

- AC-Refs: AC-0012-0037
- One `/qfai-prototyping` invocation MUST resolve every UI-bearing spec in the consumer project via `resolveAllUiBearingSpecs()` in `core/prototyping/specResolution.ts`.
- A spec is UI-bearing iff (a) its `01_Spec.md` carries `surface_type: ui-bearing` frontmatter OR (b) a matching `.qfai/contracts/ui/<spec-id>.yaml` contract exists. The legacy `01_Context.md ui_bearing: true` signal is superseded by these per CHG-002.
- The previous per-invocation primary-spec selection prompt (`resolvePrimaryPrototypingSpec`) MUST be removed; zero UI-bearing specs is a deterministic no-op exit 0.

## BR-0012-0029: 10-cycle SSOT and terminator

- AC-Refs: AC-0012-0038, AC-0012-0039
- `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` MUST be the sole SSOT in `core/prototyping/iteration.ts`. No literal `10` or `15` cycle constants outside the SSOT module (NFR-0004).
- Validators `QFAI-PROT-005` / `QFAI-PROT-006` MUST raise on cycle index > 9 or cycle count ≠ recorded `MAX_ITERATIONS`.
- Per-spec lineage rule from BR-0012-0017 is preserved at `cycles 0..9` granularity under multi-spec.

## BR-0012-0030: Reviewer-driven Playwright session

- AC-Refs: AC-0012-0040
- The Reviewer sub-agent MUST itself launch Playwright (or equivalent harness) per spec × screen per cycle and perform human-like operation (click / type / navigate / scroll) on the live prototype.
- No scripted interaction transcript file is produced; no AC selector / assertion is required.
- The capture-pipeline (per-iter PNG + HTML capture by a separate `devops-ci-engineer` role) is forbidden under the new model.

## BR-0012-0031: Qualitative review payload schema

- AC-Refs: AC-0012-0041
- Each `<screen>.review.json` MUST contain the 4 ordinal UX axes (informationArchitecture / navigationFlow / usability / functionality, each in `{weak, acceptable, strong, exceptional}`) AND six `*Feel` short-prose fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`), each ≤ 200 words.
- `layoutAntiPatternsDetected[]` (lap-001..008) and `designMdViolations[]` remain present and govern convergence; quantitative AC-pass / transition-pass thresholds are NOT recorded.

## BR-0012-0032: Convergence is AND across spec × screen

- AC-Refs: AC-0012-0042
- Global convergence is the AND, across every `(spec, screen)` pair in the cycle-0 frozen spec set, of: `all 4 axes === exceptional AND layoutAntiPatternsDetected[] empty AND designMdViolations[] empty`.
- Quantitative AC-pass% / transition-pass% thresholds are explicitly NOT consulted (user direction 2026-05-18: design and operability are qualitative-only).
- On hard-fail at cycle 9, the aggregator record MUST name every lagging spec ID.

## BR-0012-0033: Stock-photo license catalog and per-image recording

- AC-Refs: AC-0012-0043
- Every image slot MUST be filled from the cycle-0 frozen license catalog (allowlist: Unsplash, Pexels per OQ-0002 / SRC-0005 / SRC-0006).
- Every fill MUST record `{url, license, attribution, source}` in `prototype-handoff.yaml#imageSources[]`.
- License-verify failure (unknown license / non-allowlisted source / missing field) MUST hard-stop the run with exit 66 (OQ-0008).
- The runtime cycle ≥ 1 license-verify gate MUST reject any `imageSources[]` entry whose `attribution` is undefined, empty string, or whitespace-only with error code `license-missing-attribution` → exit 66. This is the runtime-side counterpart of the write-side recording rule above; the gate does not silently tolerate "field present but blank" (14th-wave Fix, codex r3269193861 MAJOR + codex r3269193005 MINOR).

## BR-0012-0034: Autonomy and deterministic hard-stop catalog

- AC-Refs: AC-0012-0044, AC-0012-0045, AC-0012-0052
- The run MUST be fully autonomous from cycle 0 through cycle 9 with no per-cycle user prompts (NFR-0005).
- Hard-stop classes (deterministic non-zero exits, no prompts):
  - (a) lock drift (exit 2; BR-0012-0026 governs `DESIGN.md` hash mismatch case)
  - (b) Reviewer Playwright-session failure across all reviewers for a spec × screen (exit 64 with `sessionStatus ∈ {retryExhausted, launchFailed}` recorded on the per-`(spec, screen)` review payload so the orchestrator can disambiguate from converged-exit-64; diagnostic names the `(spec, screen)`)
  - (c) license-verify failure (exit 66)
  - (d) mid-run spec-set change detection (exit 2; same class as lock drift — diagnostic names the new spec; deferred to next invocation per BR-0012-0038)

## BR-0012-0035: Per-spec iter-dir namespacing — review.json only

- AC-Refs: AC-0012-0046
- Iter-dir layout MUST be `iter-NN/spec-NNNN/<screen>.review.json` only. No `.png`, no `.html`, no `.interaction.json`, no other sidecar.
- Path helpers (`iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs`) MUST descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics.

## BR-0012-0036: Certify aggregates per-spec coverage

- AC-Refs: AC-0012-0047
- `qfai prototyping certify` MUST read the cycle-0 frozen spec set via `readFrozenSpecsCovered()`, iterate per spec, and reject if any spec lacks any declared screen's `<screen>.review.json` at the accepted iter.
- The diagnostic MUST name the missing `(spec, screen)` pair.

## BR-0012-0037: Menu reachability is qualitative (not hard-fail)

- AC-Refs: AC-0012-0048
- The Reviewer SHOULD exercise every primary menu entry point declared by the spec at least once during its Playwright session.
- Findings surface in `menuReachabilityFeel`; unreachable entries are qualitative critique only and do NOT hard-fail the cycle. Menu reachability is a sub-criterion of `navigationFlow` (OQ-0007 Option A), not a 5th axis.

## BR-0012-0038: Spec set frozen at cycle 0; mid-run additions deferred

- AC-Refs: AC-0012-0049
- The resolved spec set MUST be frozen at cycle 0 and persisted in cycle-0 evidence.
- The cycle ≥ 1 mid-run spec-set drift gate MUST compare the live `resolveSurfaceUnion(root, config)` result set-equal against the cycle-0 frozen `prototyping.json#frozenSurfaceUnion` snapshot (not against the legacy single-spec `frozenSpecsCovered` / `specsCovered` fields, which carry only the primary-spec scope under review and are NOT the multi-spec drift baseline). A missing or malformed `frozenSurfaceUnion` snapshot on cycle ≥ 1 is a hard-stop and instructs the operator to re-seed via `--cycle 0`.
- Mid-run additions of new UI-bearing specs MUST NOT trigger cycle-0 restart; they are deferred to the next `/qfai-prototyping` invocation (OQ-0009 Option A).

## BR-0012-0039: Per-spec time-budget soft warning

- AC-Refs: AC-0012-0050
- Per-spec time-budget cap is 5 min/spec per cycle (OQ-0004 / NFR-0001). Overruns SHOULD be recorded in `softWarnings.timeBudget` inside the per-spec review payload.
- The convergence aggregator MUST NOT gate on per-spec budget overrun; only the global 10-cycle budget hard-fails the run.

## BR-0012-0040: Cycle-0 freezes spec set AND license catalog

- AC-Refs: AC-0012-0051
- Cycle 0 MUST freeze and persist (a) the resolved UI-bearing spec set AND (b) the stock-photo license-class catalog (allowed sources + license tiers + attribution format) in cycle-0 evidence.
- Both serve as the SSOT for every subsequent cycle's resolver, aggregator, and license-verify pass.

## v1.9.1 Defect Remediation Business Rules (CHG-005)

## BR-0012-0041: Tailwind allowlist + body-scope (SSOT-sync invariant)

- AC-Refs: AC-0012-0053
- `findDesignMdViolations` MUST apply the OQ-0103 compound remedy = β (preflight literal allowlist) + γ (gate scope narrowed to `<body>` only).
- The shipped `generator-prompt.md` Tailwind contract clause and the scanner's allowlist constants form a single SSOT pair; every change to one MUST ship with a matching change to the other (Reviewer-Gate finding `R-PROMPT-SCANNER-DRIFT` severity: error on violation).
- NFR-0102 (3-cycle convergence p95 on canonical fixture pack) is enforced by the integration test in `tests/integration/prototyping/tailwindContractConvergence.test.ts`.

## BR-0012-0042: `var()` unwrap parity across scanners

- AC-Refs: AC-0012-0054
- `scanFonts`, `scanRadius`, `scanShadow` MUST call `unwrapVarReference(declarationValue, rootDeclarations)` with the identical signature `scanColors` uses.
- Unit tests MUST exercise the canonical `:root` fixture in `tests/unit/core/prototyping/scanners/unwrapVar.test.ts` for all three scanners.
- NFR-0110 floor: scanner unit-testability ≥ 30 unit tests; ≥ 90% statement coverage on the scanner module.

## BR-0012-0043: SAFE_LITERALS includes CSS-wide keywords

- AC-Refs: AC-0012-0055
- `SAFE_LITERALS` (consumed by all four scanners) MUST include `inherit`, `initial`, `unset`, `revert`, `currentColor`.
- The 5×4 keyword × scanner pass matrix MUST be exercised in unit tests; failures MUST emit explicit assertion text naming the cell.

## BR-0012-0044: `--*-shadow*:` declaration strip (OQ-0104 Option B)

- AC-Refs: AC-0012-0056
- `SHADOW_DECL_STRIP_RE` MUST match the broader `--*-shadow*:` pattern (any custom property whose name contains `shadow`) when the value contains `rgba()` / `rgb()` literals.
- The strip MUST execute BEFORE `scanColors` evaluates the input.

## BR-0012-0045: CJK proseCritique (Intl.Segmenter primary + OR-fallback)

- AC-Refs: AC-0012-0057
- `countWords` MUST use `Intl.Segmenter('ja', { granularity: 'word' })` for primary word counting on CJK-detected text AND MUST apply the OR-condition `200..500 words OR 600..2500 characters` band for QFAI-PROT-002.
- Error text on out-of-band input MUST name (a) measured count form (words vs characters), (b) band used, (c) actual count.
- No regression on English fixtures (200–500 words band) is required.

## BR-0012-0046: `browserTool` config compatibility window

- AC-Refs: AC-0012-0058
- `prototyping.execution.browserTool` MUST accept `"playwright"` (primary) AND `"playwright-cli"` (deprecation window).
- Documented default in shipped `assets/init/qfai.config.example.yaml` MUST be `"playwright"`.
- `"playwright-cli"` MUST emit `D-DEPRECATED-PROBE` (severity: warning during window, error at sunset; sunset version named in the migration memo per REQ-0127).

## BR-0012-0047: `iterate --capture` opt-in (default OFF, DR-0012-0029 preserved)

- AC-Refs: AC-0012-0059
- `qfai prototyping iterate` MUST accept `--capture` as opt-in; default OFF preserves the existing `DR-0012-0029` no-PNG / no-HTML / no-interaction.json posture.
- When `--capture` is passed, iterate drives Playwright per the Capture contract; when `htmlSourceCopy: true`, iterate MUST copy from `.qfai/prototypes/iter-NN/<screen-id>.html` (not `page.content()`).
- The `DR-0012-0029` amendment is pinned by `DR-0012-0031` (parallel agent assignment; orchestrator reconciles after merge).
- NFR-0107 floor: per-screen capture budget 30s; overrun emits soft warning, not hard-fail.
- Async capture errors MUST be caught and reported with per-screen context (no silent skip).

## BR-0012-0048: `iterate --auto-serve` opt-in with foreign-process protection

- AC-Refs: AC-0012-0060
- `qfai prototyping iterate` MUST accept `--auto-serve` as opt-in; default OFF preserves the existing posture.
- When passed, the spawned HTTP server MUST be torn down via `tree-kill` (Linux/macOS) or `taskkill /F /T` (Windows) on exit and SIGINT.
- Stale port-bound prior-iterate processes MAY be force-killed; foreign (non-iterate) processes MUST NOT be killed — iterate MUST report PID + owning command and exit with input-error status.
- NFR-0106 protection: the foreign-process refusal path is integration-tested.
- The `DR-0012-0029` amendment is pinned by `DR-0012-0031`.

## BR-0012-0049: `prototyping.json` validate-conformant emit

- AC-Refs: AC-0012-0061
- Every `iterations[i]` written by `iterate` MUST be `qfai validate --profile prototyping --fail-on error` conformant out of the box: non-null `commitSha` (sentinel `"uncommitted"` accepted), non-empty `proseCritique`, `scores`, `layoutAntiPatternsDetected`, `designMdViolations`, `pivotDirective`, `reviewerId`, and `evidenceRefs[]` (one entry per `screens[].id`).
- On convergence, `acceptedIterationIndex` AND `stopReason ∈ {"axes-exceptional", "max-iterations", "license-verify-fail", "input-error"}` MUST be written at the top level.

## BR-0012-0050: Self-completable certify via `verify.json#scope` (OQ-0107 Option B)

- AC-Refs: AC-0012-0062
- `verify.json` MUST carry a `scope: "prototyping" | "atdd" | "full"` field.
- `qfai prototyping certify --check` MUST accept `scope: "prototyping"` as satisfying the prototyping-phase gate WITHOUT requiring `/qfai-atdd` or `/qfai-implement` artifacts.
- `completion-certificate.json` MUST explicitly record `scope: "prototyping"` and MUST NOT claim full DONE.
- Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` (severity: error) fires when a future PR reintroduces the cycle "certify requires full verify PASS AND full verify requires ATDD/implement artifacts".

## BR-0012-0051: Single-spec public skill surface (OQ-0108 Option A)

- AC-Refs: AC-0012-0063
- `resolveSurfaceUnion()` MUST NOT appear on the public skill surface; it remains internal-only for the cycle ≥ 1 drift gate.
- `SKILL.md` MUST use single-spec language.
- Documentation lint MUST verify zero remaining multi-spec public-surface mentions at HEAD.

## BR-0012-0052: Aggregate-dir mirror + underscore casing (OQ-0110 Option A)

- AC-Refs: AC-0012-0064
- On convergence (exit 64), iterate MUST mirror the accepted-iter content into `.qfai/evidence/prototyping/screenshots/<screen-id>.png` AND `.qfai/evidence/prototyping/html/<screen-id>.html` for every `screens[]` entry.
- Screen-id casing MUST be underscore form end-to-end; the validator rejects hyphen-form.

## BR-0012-0053: `--cycle 0 --force` backup safety (NFR-0114)

- AC-Refs: AC-0012-0065
- `qfai prototyping iterate --cycle 0` MUST refuse when `iter-00/` is non-empty unless `--force` is passed.
- When `--force` is passed, iterate MUST move `iter-00/` → `iter-00.backup-<ISO>/` BEFORE invoking `clearEvidenceIterDirs`.
- Backup integrity is byte-equivalence-verified by integration test (NFR-0114 enforcement).

## BR-0012-0054: Exit-64 blocking-cause summary (NFR-0103)

- AC-Refs: AC-0012-0066
- On every non-converged cycle, `iterate` MUST emit a one-screen `[BLOCKED]` summary naming the top-3 categories with concrete offenders.
- Category identifiers are stable names — additive only across versions (NFR-0103).

## BR-0012-0055: `primarySpecId` error + (SHOULD) normalisation (OQ-0112)

- AC-Refs: AC-0012-0067
- On rejection, the error text MUST read literally `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received <input>`.
- SHOULD: accept `1` / `"1"` / `"01"` / `"0001"` and normalise to `spec-0001`. When normalisation is shipped, the error fires only for inputs wholly unparseable as a positive integer ≤ 9999.

## BR-0012-0056: md5 duplicate-capture + missing-route detection (NFR-0113, OQ-0109)

- AC-Refs: AC-0012-0068
- `iterate` MUST compute md5 of each PNG; ≥ 2 identical md5s among distinct declared `screens[].id` entries surface `lap-009: duplicate-capture`.
- For every `screens[].id`, iterate MUST verify a reachable hashchange or path-based route; missing routes surface `lap-010: missing-route`.
- Both findings are advisory-failing (severity error; mandatory Reviewer `justification:` for override).
- NFR-0113 determinism: same screen set → same `lap-009` finding set across re-runs.

## BR-0012-0057: `--license-patch` add-only (SHOULD)

- AC-Refs: AC-0012-0069
- `--license-patch <file>` SHOULD accept add-only diffs; writes new catalog + appends `licensePatchAudit[]` row `{appliedAt, patchSha256, addedSources[]}`.
- Deletions and modifications MUST be rejected with cycle-0-restart hint.

## BR-0012-0058: Subagent iter-context hint (SHOULD)

- AC-Refs: AC-0012-0070
- `iter-NN/iterate-context.json` SHOULD be written with `{ priorCycle, priorScores, openBlockers, priorTailwindContract }`.
- Absence MUST NOT fail certify; the file is purely advisory and orthogonal to `prototyping.json` (REQ-0012-0063).

## BR-0012-0059: `--cycle N` out-of-range error clarity (SHOULD)

- AC-Refs: AC-0012-0071
- Error text MUST read literally `--cycle accepts 0..9 (=10 cycles total). --cycle 10 would be the 11th cycle and is not supported.` and SHOULD recommend the peek-mode equivalent.
