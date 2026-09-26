# US-0001-0143: Duplicate capture and missing-route findings

## User Story

As a reviewer, I want md5-based duplicate capture detection (`lap-009`) and missing-route detection (`lap-010`) surfaced as advisory-failing layout anti-patterns with mandatory justification, so that silent screen collisions and unreachable routes block convergence by default. (REQ-0012-0070)

## Legacy Source Scope

- In:
  - `/qfai-prototyping` skill orchestration that resolves **every UI-bearing spec in one invocation** via `resolveAllUiBearingSpecs()` (`core/prototyping/specResolution.ts`); zero UI-bearing specs is a deterministic no-op exit 0. On the story tree the unit is the UI contract: the invocation resolves every UI-bearing UI contract, one being UI-bearing when its file under `<paths.contractsDir>/ui/` declares a `CON-UI-NNNN` ID and at least one `screens[]` entry, and zero UI-bearing UI contracts is the same no-op (`.qfai/contracts/cli/qfai-prototyping.md#story-tree-layout`)
  - autonomous serial cycle execution `0..9` (max 10) with no per-cycle stdin prompt; `MAX_ITERATIONS = 10` / `MAX_ITERATION_INDEX = 9` is the sole SSOT in `core/prototyping/iteration.ts`
  - per spec × screen (per UI contract × screen on the story tree) evaluation by a Reviewer sub-agent that **itself launches Playwright** and performs human-like operation (click / type / navigate / scroll) on the live prototype
  - qualitative review payload at `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` (`iter-NN/CON-UI-NNNN/<screen>.review.json` on the story tree) carrying short-prose `operability` / `transitionFeel` / `crossScreenContinuity` / `userStoryFeel` / `acceptanceCriteriaFeel` / `menuReachabilityFeel` impressions plus the 4 UX ordinal axes (`informationArchitecture` / `navigationFlow` / `usability` / `functionality`) on the `{weak, acceptable, strong, exceptional}` scale
  - layout-anti-pattern catalog (the identifiers declared in `packages/qfai/assets/validators/layoutAntiPatterns.json`); a detection is a blocking finding
  - global convergence judged **per cycle by AND across all spec × screen pairs** (UI contract × screen pairs on the story tree): `blockingFindings` empty AND `layoutAntiPatternsDetected` empty AND `designMdViolations` empty; the four UX axes are reported and do not gate, and quantitative AC-pass% / transition-pass% thresholds are not used
  - root `DESIGN.md` as brand SSOT, sha256 frozen at the SDD Phase 0 step (at the `/qfai-sdd` 03-contract step on the story tree) in `<paths.contractsDir>/design/DESIGN.md.lock.yaml`
  - cycle 0 records `prototyping.json#designMdSha256` AND freezes (a) resolved `specsCovered[]` (one `uiContractsCovered[]` field on the story tree, which replaces both `specsCovered[]` and `frozenSpecsCovered[]`) and (b) stock-photo `frozenLicenseCatalog` (allowed sources + license tiers); cycle ≥1 fail-closed on hash drift (exit 2)
  - `findDesignMdViolations(html, designMd)` pure deterministic function for color / font / radius / shadow token compliance; non-empty list blocks convergence
  - `pivotDirective: continue | refine | pivot` rules unchanged (`pivot` ⇔ 3 consecutive low-IA + latest has `lap-*`; `continue` ⇔ ≥2 of 4 axes strictly improved by `ordinalIndex`; `refine` otherwise)
  - latest iter always accepted (`acceptedIterationIndex === iterations.length - 1`); no best-of-history
  - per-iter evidence layout is **per-spec namespaced**: `iter-NN/spec-NNNN/<screen>.review.json` only (no `.png`, no `.html`, no `.interaction.json`); path helpers `iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs` descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics. On the story tree the namespace is the UI contract: `iter-NN/CON-UI-NNNN/<screen>.review.json` only, and the path helpers descend into `CON-UI-NNNN` with the same cleanup semantics
  - stock-photo fill from allowlisted free sources (Unsplash, Pexels, CC0); every filled slot recorded in `prototype-handoff.yaml#imageSources[]` as `{url, license, attribution, source}`; license-verify failure (unknown license / non-allowlisted) hard-stops with exit 66
  - `qfai prototyping certify` aggregates review-payload presence **per spec** by walking the cycle-0 frozen `specsCovered[]` (`readFrozenSpecsCovered()`); any spec lacking any declared screen's `<screen>.review.json` at the accepted iter is rejected. On the story tree certify walks the frozen `uiContractsCovered[]` per UI contract, and any UI contract lacking a declared screen's review at the accepted iter is rejected
  - deterministic hard-stop classes (no interactive recovery): (a) DESIGN.md / license-catalog lock drift → exit 2, (b) Reviewer Playwright-session failure across all reviewers for a spec × screen → exit 64, (c) license-verify failure → exit 66, (d) mid-run spec-set change → exit 2 (`specsCovered` shallow-equal check reads the frozen set; new UI-bearing specs deferred to next invocation). On the story tree (b) is per UI contract × screen and (d) is a mid-run UI-contract-set change, and a `prototyping.json` that carries `specsCovered` or `frozenSpecsCovered`, or lacks `uiContractsCovered`, is exit 2 with an instruction to re-seed with `qfai prototyping iterate --cycle 0`
  - completion is deterministic via `qfai prototyping iterate --cycle <0..9>` exit code (0 / 2 / 64 / 65 / 66)
  - `qfai prototyping certify --check` (exit 0) is the sole DONE signal
  - `design-system.yaml` is generated post-loop as a deterministic byte-equivalent mirror of `DESIGN.md` token tables (NOT extracted from final iter HTML)
  - `prototype-handoff.yaml` carries `{finalIterIndex, finalArtifact, extractedDesignSystem, implementationNotes, imageSources[]}`
  - `qfai validate --fail-on error` is the machine gate before completion
  - `/qfai-verify` PASS / REVISE is the final review gate
  - The shipped skill and its references must keep the current contract, routing, and reviewer instructions complete and pass the repository's asset and documentation gates. The retired 130/410-line budget is not an acceptance limit.
  - generator (product-experience-architect) and evaluator (product-surface-reviewer) MUST be different sub-agents (self-preference bias prevention)
- Out:
  - `mode` concept (`low-cost` / `standard` / `full-harness`) — purged
  - `maxCycles` / `maxIterationsByMode` configuration — purged
  - 15-cycle budget (`MAX_ITERATIONS = 15`) — purged; replaced by 10-cycle (`MAX_ITERATIONS = 10`)
  - single-prototype / primary-spec selection (`resolvePrimaryPrototypingSpec()` and the per-invocation primary-spec prompt) — purged; replaced by `resolveAllUiBearingSpecs()` over all UI-bearing specs (UI contracts on the story tree) in one invocation
  - scripted interaction generator and per-action interaction transcript (`<screen>.interaction.json`) — purged; Reviewer drives Playwright itself
  - acceptance-criteria selector/assertion synthesis from screen contracts — purged; AC-fulfilment is judged qualitatively in `acceptanceCriteriaFeel`
  - PNG screenshot evidence (`<screen>.png`) — purged
  - HTML snapshot evidence (`<screen>.html`) — purged
  - capture pipeline (separate capture role / capture sub-agent) — purged
  - quantitative AC-pass% and transition-pass% thresholds as convergence gates — purged
  - per-cycle stdin prompts / interactive recovery — purged (run is fully autonomous from cycle 0 through cycle 9)
  - mid-run cycle-0 restart on new UI-bearing spec detection (UI contract on the story tree) — purged (additions are deferred to the next `/qfai-prototyping` invocation)
  - round-based candidate funnel (`r5 → r3 → r2 → r1`) — purged
  - polish/branch cycles, concept-anchor pre-declaration, plateau detector — purged
  - best-of-history winner retention — purged
  - `allReviewerAxesPerfect100` / weighted-total scoring — purged
  - hard-floor evaluation-rubric enforcement (`evaluation-rubric.yaml hard_floors[]`) — purged
  - active surface for `evaluation-rubric.yaml` / `evaluator-calibration.yaml` / `absorption-policy.yaml` / `selected-direction.yaml` / `brand-design.yaml` / `exploration-brief.yaml` / `reference-pool.yaml` — purged (history-only)
  - `qfai prototyping` as a public orchestration command surface — only `iterate` / `certify` / `show-spec` are public sub-commands (`show-ui-contract` replaces `show-spec` on the story tree)
  - visual-aesthetic anti-slop tokens (`slop-001-shadcn-zinc`, `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`, `slop-010-rounded-2xl-shadow-lg`) as active anti-pattern set — purged

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0012/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0012/02_User-stories.md#us-0012-0134`
