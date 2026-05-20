# 03 Acceptance Criteria

## AC-0012-0001

- `/qfai-prototyping` documents Step 0 execution planning before the first capture/evaluation cycle.
- Step 0 names `targetIterations`, `evaluationAxesSource`, `delegationMap`, and `plannedAt`.
- Delegation scope and invalid role handling are documented in the same execution-planning posture.

## AC-0012-0002

- Declared screen evidence uses the canonical screenshot and HTML snapshot paths.
- Documentation names the canonical paths explicitly.

## AC-0012-0003

- Missing screenshot or HTML evidence is fail-closed.
- Capture guidance does not allow fake evidence generation.

## AC-0012-0004

- Evaluator/reviewer role ownership is documented.
- The skill spells out which roles own implementation, screenshot capture, evaluation scoring, and build.

## AC-0012-0005

- Evaluator input guidance names screenshots, HTML snapshots, rubric/calibration inputs, prior reviewer-score context, and design-system input.
- Review guidance also names the visual checklist categories used during scoring.

## AC-0012-0006

- `qfai validate --fail-on error` is documented as the machine gate before completion.

## AC-0012-0007

- `/qfai-verify` is documented as the final review gate.
- Completion remains blocked on `REVISE`.

## AC-0012-0008

- Legacy validation slices may still require `executionPlan`, Lighthouse evidence, design-system compliance, and calibration overrides.
- These requirements are documented as validator/reference behavior, not as a public mode contract.

## AC-0012-0009

- `ui_bearing: false` specs are excluded from prototyping execution.
- Missing screen contracts do not over-fire UI-only requirements for non-UI specs.

## AC-0012-0010

- Legacy traceability identifier space remains reserved.
- Active wording does not reintroduce superseded weighted-total narratives.

## AC-0012-0020: Single-Thread Serial Iteration

- Status: superseded by AC-0012-0038 (10-cycle, multi-spec per-spec lineage). See `09_delta.md` CHG-002 OP-PURGE-070.
- Given `/qfai-prototyping` is invoked with a frozen root `DESIGN.md`,
- When the iteration loop runs,
- Then exactly one prototype lineage is evolved across cycles 0..14 (max 15 iterations) with no parallel candidate funnel.

## AC-0012-0021: 4 UX Axes Ordinal Schema

- Status: superseded by AC-0012-0041 (per spec × screen review.json with 4 ordinal axes + six `*Feel` prose fields). See `09_delta.md` CHG-002 OP-PURGE-071.
- Given any `iter-NN/review.json`,
- When validated,
- Then `scores` contains exactly the keys `informationArchitecture`, `navigationFlow`, `usability`, `functionality`, each ordinal in `{weak, acceptable, strong, exceptional}`. Missing or extra keys raise `QFAI-PROT-020`.

## AC-0012-0022: Prose Critique Length

- Status: superseded by AC-0012-0041 (qualitative review payload supersedes single-`critique` 200..500-word rule; each `*Feel` field is bounded ≤ 200 words). See `09_delta.md` CHG-002 OP-PURGE-072.
- Given any `iter-NN/review.json`,
- When validated,
- Then `critique` is a single string between 200 and 500 words inclusive. Out-of-range raises `QFAI-PROT-022`.

## AC-0012-0023: pivotDirective Enum

- Given any `iter-NN/review.json`,
- When validated,
- Then `pivotDirective` is exactly one of `"continue" | "refine" | "pivot"`. Other values raise `QFAI-PROT-023`.

## AC-0012-0024: Layout-Anti-Pattern IA Cap

- Given any `iter-NN/review.json` where `layoutAntiPatternsDetected.length > 0`,
- When validated,
- Then `scores.informationArchitecture` is in `{weak, acceptable}`. `strong` or `exceptional` raises `QFAI-PROT-021`.

## AC-0012-0025: lap-\* Whitelist

- Given any `iter-NN/review.json`,
- When validated,
- Then every entry in `layoutAntiPatternsDetected[]` is one of `lap-001-orphan-page`, `lap-002-deadend-flow`, `lap-003-hidden-state`, `lap-004-broken-back`, `lap-005-mystery-meat-nav`, `lap-006-no-empty-state`, `lap-007-no-error-state`, `lap-008-no-back-affordance`. Unknown tokens raise `QFAI-PROT-025`.

## AC-0012-0026: pivotDirective Rule — pivot

- Given the latest 3 iters each have `informationArchitecture ∈ {weak, acceptable}` and the latest iter has `layoutAntiPatternsDetected.length > 0`,
- When `computePivotDirective(history)` runs,
- Then it returns `"pivot"`.

## AC-0012-0027: pivotDirective Rule — continue

- Given the latest iter has `≥ 2` of the 4 UX axes strictly improved by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3) versus the prior iter,
- When `computePivotDirective(history)` runs,
- Then it returns `"continue"`. Otherwise (and not `pivot`) it returns `"refine"`.

## AC-0012-0028: Deterministic Stop on Convergence

- Status: superseded by AC-0012-0042 (AND-aggregator across all spec × screen pairs of 4-axes-exceptional + lap empty + dmv empty; no quantitative AC-pass thresholds). See `09_delta.md` CHG-002 OP-PURGE-073.
- Given the latest iter has all 4 UX axes (informationArchitecture / navigationFlow / usability / functionality) `exceptional` AND `layoutAntiPatternsDetected.length === 0` AND `designMdViolations.length === 0`,
- When `qfai prototyping iterate --cycle <n+1>` runs,
- Then it exits with code `64` and prints "convergence reached".

## AC-0012-0029: Deterministic Stop on Max Iterations

- Status: superseded by AC-0012-0038 / AC-0012-0039 (10-cycle terminator at `index === 9`; max-iterations exit named in REQ-0002). See `09_delta.md` CHG-002 OP-PURGE-074.
- Given the latest iter has `index === 14`,
- When `qfai prototyping iterate --cycle 15` runs,
- Then it exits with code `65` and prints "max iterations reached".

## AC-0012-0030: Per-Iter Evidence Layout

- Status: superseded by AC-0012-0046 (`iter-NN/spec-NNNN/<screen>.review.json` only; no PNG / HTML / interaction.json). See `09_delta.md` CHG-002 OP-PURGE-075.
- Given `.qfai/evidence/prototyping/iter-NN/`,
- When listed,
- Then it contains exactly the files matching `<screen>.png`, `<screen>.html`, `review.json`. Extra files (e.g., `screenshots/`, `html/` subdirs, `breakthrough.json`, `concept.json`) raise `QFAI-PROT-030`.

## AC-0012-0031: SKILL.md Size Budget

- Given `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`,
- When line-counted,
- Then total lines ≤ 130. The 5 references files combined ≤ 410.

## AC-0012-0032: CLI iterate exit codes

- Given `qfai prototyping iterate --cycle <n>` runs,
- When the cycle completes,
- Then exit code is one of `0` (continue, read pivotDirective), `64` (axes-exceptional convergence), `65` (max-iterations reached), `2` (input error or DESIGN.md hash mismatch). No other exit codes are emitted.

## AC-0012-0033: CLI certify exit codes

- Status: superseded by AC-0012-0047 (per-spec aggregation across cycle-0 frozen spec set; per-spec missing-screen rejection). See `09_delta.md` CHG-002 OP-PURGE-076.
- Given `qfai prototyping certify --check`,
- When run after the loop terminates,
- Then exit code `0` indicates DONE; non-zero indicates failure with diagnostic output naming the missing artifact.

## AC-0012-0034: Cycle 0 Records designMdSha256

- Given `qfai prototyping iterate --cycle 0`,
- When it completes,
- Then `prototyping.json#designMdSha256` is set to `sha256(DESIGN.md bytes)` and matches `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256` exactly.

## AC-0012-0035: Cycle ≥1 hash gate

- Given `prototyping.json#designMdSha256 === H_recorded`,
- When `qfai prototyping iterate --cycle <n>` (n ≥ 1) runs and on-disk `sha256(DESIGN.md) !== H_recorded`,
- Then it exits with code `2` and stderr contains `"DESIGN.md hash mismatch"`. The user must restore `DESIGN.md` or re-run the SDD freeze and restart from cycle 0.

## AC-0012-0036: design-system as DESIGN.md Mirror

- Given `.qfai/contracts/design/design-system.yaml` is generated post-loop,
- When its token tables are compared to root `DESIGN.md`,
- Then color / typography / radius / shadow are byte-equivalent. Drift raises `QFAI-DCON-032`.

## AC-0012-0037: Multi-spec resolver covers every UI-bearing spec per invocation

- US-Refs: US-0012-0109
- Given a consumer project with N UI-bearing specs (N ≥ 1; each spec EITHER (a) carries `surface_type: ui-bearing` in its `01_Spec.md` frontmatter OR (b) ships a matching `.qfai/contracts/ui/<spec-id>.yaml` contract (also accepted: any of the documented 5 candidate layouts in `.qfai/contracts/ui/README.md` — including the per-spec subdirectory layout `<contractsDir>/ui/spec-<id>/<sub>.yaml`, candidate #5, treated as UI-bearing when the subdir contains at least one `*.yaml` file; `*.yml` single-l is excluded for parity with the top-level convention — 25th-wave clarification per codex r3270527912 MAJOR + r3270529771 MINOR) — the two signals are OR-ed; legacy `01_Context.md ui_bearing: true` is superseded by these per CHG-002),
- When `/qfai-prototyping` is invoked exactly once,
- Then `resolveAllUiBearingSpecs()` returns every UI-bearing spec ID, the previous primary-spec selection prompt is not emitted, and cycle-0 evidence records the resolved spec set verbatim.
- Given a consumer project with zero UI-bearing specs **at cycle 0** (no in-progress `prototyping.json#frozenSurfaceUnion` recorded yet),
- When `/qfai-prototyping` is invoked at cycle 0,
- Then the run exits 0 deterministically as a no-op (not an error).
- And the legacy `01_Context.md ui_bearing: false` exclusion guidance (AC-0012-0009) is retained as a non-detection-source convenience marker; the new detection signal set above is the SSOT.
- And at cycle ≥ 1 the zero-UI-bearing live result is a hard-stop drift class (see AC-0012-0045 class (d) for the "UI markers removed mid-loop" path and class (e) for the "missing cycle-0 seed" path), NOT a no-op. The no-op semantic is intentionally scoped to cycle 0 only (19th-wave clarification per codex r3270053231 / r3270091255 MINOR).

## AC-0012-0038: 10-cycle iteration budget — terminator index === 9

- US-Refs: US-0012-0118
- Given `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` in `core/prototyping/iteration.ts`,
- When the iteration loop runs,
- Then the run executes cycle 0 plus cycles 1..9 (max 10 iterations) on a single per-spec lineage and writes the terminator at `index === 9` when convergence is not reached earlier.
- AND a single `--cycle 9` invocation on a non-converged loop whose `iterations.length === 10` MUST surface exit 65 directly (max-iterations terminator) without routing through the `expectedNextCycle === 10` cycle-mismatch path (19th-wave clarification per codex r3270052195 MINOR — moved here from AC-0012-0044 because cycle-9 idempotency is a terminator-routing concern, not an autonomous-run / no-prompts concern).

## AC-0012-0039: Validators reject out-of-range cycle index

- US-Refs: US-0012-0118
- Given any evidence pack written by `/qfai-prototyping`,
- When `QFAI-PROT-005` / `QFAI-PROT-006` runs,
- Then any cycle index > 9 or any cycle count ≠ recorded `MAX_ITERATIONS` raises a non-zero validator finding.

## AC-0012-0040: Reviewer-driven Playwright session per spec × screen

- US-Refs: US-0012-0110
- Given a per-cycle per-spec × screen evaluation,
- When the Reviewer sub-agent is invoked,
- Then the Reviewer itself launches Playwright (or equivalent harness), performs human-like operation (click / type / navigate / scroll) on the live prototype, and writes a single `<screen>.review.json`; no scripted interaction transcript file is produced and no AC selector / assertion is required.

## AC-0012-0041: Qualitative review payload schema per spec × screen

- US-Refs: US-0012-0111
- Given `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json`,
- When validated,
- Then it contains exactly the 4 ordinal UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`, each in `{weak, acceptable, strong, exceptional}`) AND the six qualitative `*Feel` prose fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`), each bounded ≤ 200 words, AND `layoutAntiPatternsDetected[]` AND `designMdViolations[]`.

## AC-0012-0042: Convergence AND across spec × screen pairs (no quantitative thresholds)

- US-Refs: US-0012-0111
- Given the cycle-0 frozen spec set S and the union of declared screens per spec,
- When the aggregator evaluates convergence at the end of any cycle,
- Then the run converges ONLY when, for every `(spec, screen)` pair: all 4 ordinal UX axes are `exceptional` AND `layoutAntiPatternsDetected[]` is empty AND `designMdViolations[]` is empty.
- And no quantitative AC-pass% / transition-pass% threshold is consulted.
- And on hard-fail at cycle 9, the aggregated convergence record names every lagging spec ID.

## AC-0012-0043: License-permitted stock-photo fill recorded per image

- US-Refs: US-0012-0112
- Given every image slot referenced by the prototype set,
- When the slot is filled at any cycle,
- Then the image source is drawn from the cycle-0 frozen license catalog (allowlist: Unsplash, Pexels per OQ-0002 / SRC-0005 / SRC-0006), AND a row `{url, license, attribution, source}` is written to `prototype-handoff.yaml#imageSources[]` for every fill, AND license-verify failure (unknown license / non-allowlisted source / non-https url / missing attribution) hard-stops the run with exit 66, AND a malformed `imageSources[]` entry (missing or non-string `url`/`source`/`license`) hard-stops the run with exit 2 (input-shape class) at the iterate boundary before the license-verify gate runs.

## AC-0012-0044: Autonomous run from cycle 0 to cycle 9 — no per-cycle prompts

- US-Refs: US-0012-0113
- Given `/qfai-prototyping` is invoked,
- When the run executes cycle 0 through cycle 9,
- Then no per-cycle stdin read or interactive prompt occurs between cycle 0 start and exit, AND the CI fixture asserting `stdin closed → exit 0/non-zero` succeeds without `ENOENT` / `EBADF` / `EINTR` on stdin. (The cycle-9 idempotency clause that briefly lived here in the 14th-wave amendment has been moved to AC-0012-0038 per codex r3270052195 MINOR — terminator routing is an iteration-budget concern, not an autonomous-run concern.)

## AC-0012-0045: Deterministic hard-stop classes

- US-Refs: US-0012-0113
- Given the hard-stop catalog is fixed at (a) lock drift, (b) Reviewer Playwright-session failure across all reviewers for a spec × screen, (c) license-verify failure, (d) mid-run spec-set change detection (any added / removed UI-bearing spec, including the special case of every UI marker / contract being removed mid-loop so the live UI-bearing union shrinks to `[]`), (e) cycle ≥ 1 invocation without a recorded cycle-0 `frozenSurfaceUnion` seed, (f) cycle ≥ 1 detection of `prototyping.json#frozenLicenseCatalog` drift (set-equality semantic via `licenseCatalogsEqual`), (g) certify-side detection of non-canonical `prototyping.json#frozenSpecsCovered[]` entries (any value that is not bare 4-digit `NNNN` or fully-qualified `spec-NNNN`), (h) certify-side present-but-malformed `prototyping.json#frozenSpecsCovered` field (key on the record but value is non-array / empty / non-string / empty-string entry / explicit `null` / `undefined` — rejected by the SSOT classifier instead of silently falling back to legacy `specsCovered`),
- When any class triggers,
- Then the run exits non-zero deterministically with the documented exit code per class:
  - (a) lock drift → exit `2` (per AC-0012-0035; same class as DESIGN.md hash mismatch and any cache-vs-lock drift),
  - (b) Reviewer Playwright-session failure → exit `64` with `sessionStatus ∈ {retryExhausted, launchFailed}` recorded on the per-`(spec, screen)` review payload so the orchestrator can disambiguate from converged-exit-64,
  - (c) license-verify failure → exit `66`,
  - (d) mid-run spec-set change detection → exit `2` (same class as lock drift; new / removed spec deferred to next invocation per the business-rule layer),
  - (e) cycle ≥ 1 without a cycle-0 seed → exit `2` with the operator instructed to run `--cycle 0 --target-url <url>` first (19th-wave addition per codex r3270094588 MINOR + codex r3270091255 MINOR — formalises the 15th + 17th-wave behavioural change for the "Seed the loop first" branch of the zero-UI precheck; also covers the legacy-shape variant where `prototyping.json` exists but the `frozenSurfaceUnion` field is missing, per 20th-wave codex r3270143584 MINOR),
  - (f) `frozenLicenseCatalog` drift → exit `2` with a re-seed instruction (20th-wave addition per codex r3270141326 MAJOR — set-equality semantic: order-permuted catalogs MUST NOT trip the gate, semantic differences MUST; SSOT is the in-memory `DEFAULT_LICENSE_CATALOG` constant, which cycle 0 mirrors into `prototyping.json#frozenLicenseCatalog`),
  - (g) certify-side non-canonical `frozenSpecsCovered[]` entry → exit `2` with the malformed id echoed verbatim and the canonical shape (`spec-NNNN` / 4-digit `NNNN`) named in stderr; operator is directed to re-run `qfai prototyping iterate --cycle 0` to regenerate the record (32nd-wave addition per codex r3270776268 P2 — chatgpt-codex-connector. The certify per-(spec × screen) gate previously fed unvalidated strings into `path.join(root, "iter-NN", id, "<screen>.review.json")` allowing path-traversal probes outside the intended subtree; the gate now refuses to build paths from unvalidated input),
  - (h) certify-side present-but-malformed `prototyping.json#frozenSpecsCovered` field (key IS on the record, but value fails the string-array validation contract — non-array, empty array, non-string entry, empty-string entry, OR an explicit `null` / `undefined` on a present key) → exit `2` with a "present but malformed" diagnostic naming the rejection reason. The SSOT classifier `classifyFrozenSpecsCoveredMultiSpec()` returns `{kind: "absent" | "malformed" | "ok"}`: `absent` still legitimately falls back to legacy `specsCovered` for pre-Wave-3 evidence compatibility, but `malformed` (including explicit `null` / `undefined`) fails closed so a partially-corrupt multi-spec record cannot silently downgrade certification scope and let missing secondary-spec review evidence ship a sealed certificate (33rd-wave addition per codex r3270861808 P1; 36th-wave extension per codex r3270923641 P1 — both chatgpt-codex-connector),
    AND no user prompt is emitted.

- **Ordering invariant** (34th-wave addition per codex r3270889168 MINOR — requirements-reviewer; restructured per codex r3271006396 MINOR — requirements-reviewer to be a sibling of the When / Then clauses rather than a class-(h) Then continuation). Hard-stop classes (a)-(h) MUST be evaluated BEFORE convergence / budget-exhaustion signals (i.e. before `shouldStop()` in iterate's cycle ≥ 1 path, and before any per-(spec × screen) coverage-rejection class on the certify side). When a hard-stop class AND a convergence / coverage signal both fire in the same invocation, the hard-stop class wins and the convergence / coverage signal MUST be suppressed. Rationale: a partial / corrupt lock or a mid-loop drift cannot be "resolved" by satisfying convergence axes or exhausting the iteration budget; honouring `shouldStop`-first would let a mid-loop UI marker removal ship as a successful exit-64 / exit-65 outcome and bypass the lock-drift remediation path entirely. This clause applies cross-class to the full hard-stop catalog (a)-(h); it is not a postcondition of any single class.

## AC-0012-0046: Per-spec iter-dir namespacing — review.json only

- US-Refs: US-0012-0114
- Given `.qfai/evidence/prototyping/iter-NN/spec-NNNN/`,
- When listed,
- Then it contains exactly files matching `<screen>.review.json` (one per declared screen). No `.png`, no `.html`, no `.interaction.json`, no other sidecar.
- And path helpers (`iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs`) descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics.

## AC-0012-0047: Certify aggregates per-spec presence

- US-Refs: US-0012-0115
- Given `qfai prototyping certify --check`,
- When run after the loop terminates,
- Then certify iterates the cycle-0 frozen spec set via `readFrozenSpecsCovered()`, asserts that every declared screen of every covered spec has a `<screen>.review.json` at the accepted iter, and exits 0 on full coverage / non-zero with a diagnostic naming the missing `(spec, screen)` pair on any miss.

## AC-0012-0048: Menu reachability exercised at least once per Reviewer session

- US-Refs: US-0012-0111
- Given a spec × screen with declared primary menu entry points (sidebar / topbar / bottombar as system-appropriate),
- When the Reviewer's Playwright session runs,
- Then the Reviewer SHOULD exercise every primary menu entry point at least once and reflect findings in the `menuReachabilityFeel` prose field; unreachable entries surface as qualitative critique and do NOT hard-fail the cycle.

## AC-0012-0049: Spec set frozen at cycle 0; mid-run additions deferred

- US-Refs: US-0012-0116
- Given the cycle-0 frozen spec set is persisted in cycle-0 evidence,
- When a new UI-bearing spec is added to disk after cycle 0 starts,
- Then `/qfai-prototyping` MUST detect the change, MUST NOT restart cycle 0, MUST defer the new spec to the next invocation, AND the cycle ≥ 1 drift gate reads the cycle-0 frozen UI-bearing UNION snapshot — `prototyping.json#frozenSurfaceUnion` — as its baseline and compares it set-equal against the live `resolveSurfaceUnion(root, config)` result (not live FS). The legacy single-spec `specsCovered` / `frozenSpecsCovered` fields are NOT the drift baseline; they remain as the primary-spec scope under review and shallow-equal compared to the currently-resolved primary, but are unrelated to multi-spec drift detection. A missing or malformed `frozenSurfaceUnion` snapshot on cycle ≥ 1 is itself a hard-stop and instructs the operator to re-seed via `--cycle 0`.

## AC-0012-0050: Per-spec time-budget soft warning

- US-Refs: (REQ-0012)
- Given the per-spec time-budget cap is 5 min/spec per cycle (OQ-0004),
- When a spec × cycle exceeds the cap,
- Then the Reviewer payload records a `softWarnings.timeBudget` entry; the aggregator does NOT gate on it; only the global 10-cycle budget can hard-fail the run.

## AC-0012-0051: Cycle-0 freezes spec set AND license catalog

- US-Refs: US-0012-0116, US-0012-0117
- Given cycle 0 runs,
- When it completes,
- Then cycle-0 evidence persists (a) the resolved spec set (frozen ID list) AND (b) the stock-photo license-class catalog (allowed sources + license tiers + attribution format) drawn from `OQ-0002` Option A.
- And every subsequent cycle reads both as SSOT for resolver / aggregator / license-verify.

## AC-0012-0052: `show-spec` JSON payload contract (operator drift-analysis surface)

- US-Refs: US-0012-0116
- Given any seeded `prototyping.json` record,
- When `qfai prototyping show-spec` runs,
- Then it emits a JSON payload that carries (a) `frozenSpecsCovered: string[]` (cycle-0 frozen primary spec ids), (b) `frozenSpecsCoveredSource: "frozenSpecsCovered" | "specsCovered"` discriminant so operators can detect pre-Wave-3 legacy seed records without re-reading the file, (c) `frozenSurfaceUnion: string[] | null` (cycle-0 multi-spec UI-bearing UNION snapshot or `null` on legacy records), (d) `liveUiBearing: string[]` of bare spec IDs resolved by the same `resolveSurfaceUnion()` the cycle ≥ 1 drift gate consumes so the live scope is apples-to-apples with iterate's enforcement, and (e) an optional `primary?: {specId, specMdPath, source}` block present iff a primary spec resolves.
- And operator tooling that grepped the pre-Wave-15 top-level keys (`.specId` / `.specMdPath` / `.source`) MUST migrate to the `primary` block (or to `liveUiBearing[]` for the bare ID list); the BREAKING migration is documented in the v1.8.10 CHANGELOG.

## Completion Gate

- `/qfai-prototyping` completion requires `qfai validate --fail-on error` pass.
- Declared screen evidence must include both screenshot and HTML snapshot.
- `/qfai-verify` must leave a review artifact with `PASS` or `REVISE`.

## Superseded Contract Notes

- Active docs must not present `qfai prototyping` as a valid public orchestration command (only `iterate` / `certify` / `show-spec` are public).
- Active docs must not present weighted-total scoring or `allReviewerAxesPerfect100` as the current evidence contract.
- Internal mode helpers / fullHarness / scoringTrace / iterationBudget references have been purged from the active spec surface (see `09_delta.md` CHG-001).
