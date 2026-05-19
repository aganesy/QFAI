# 06 Test Cases

## Retained Baseline Cases

## TC-0012-0285

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0001, AC-0012-0004
- Delegation Scope Table lists the required categories and valid roles.

## TC-0012-0286

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0001, AC-0012-0004
- Invalid delegation role is surfaced as a violation.

## TC-0012-0289

- EX-Ref: EX-0012-0086
- AC-Refs: AC-0012-0001
- Step 0 planning fields are documented before the first iteration.

## TC-0012-0290

- Status: superseded — replaced by TC-0012-0376 (per-spec iter-dir `.review.json`-only layout).
- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0002
- Canonical evidence paths are documented for screenshot and HTML capture.

## TC-0012-0291

- Status: superseded — replaced by TC-0012-0377 (no PNG/HTML written; Reviewer-driven Playwright replaces capture step).
- EX-Ref: EX-0012-0002, EX-0012-0003
- AC-Refs: AC-0012-0003
- `capture-screenshots.js` fails closed instead of generating fake PNG evidence.

## TC-0012-0292

- EX-Ref: EX-0012-0086
- AC-Refs: AC-0012-0001
- Skill documents the iteration cycle.

## TC-0012-0293

- EX-Ref: EX-0012-0098
- AC-Refs: AC-0012-0001, AC-0012-0004
- Invalid delegation map entries are surfaced as findings.

## TC-0012-0294

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0005
- Evaluator input protocol names the required input classes.

## TC-0012-0295

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0005
- Reviewer guidance detects missing evaluator inputs.

## TC-0012-0296

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0005
- Visual quality checklist enumerates structural categories.

## TC-0012-0310

- EX-Ref: EX-0012-0099
- AC-Refs: AC-0012-0006
- `qfai validate --fail-on error` is documented as the completion-time machine gate.

## TC-0012-0311

- EX-Ref: EX-0012-0100
- AC-Refs: AC-0012-0007
- `/qfai-verify` blocking `REVISE` posture is documented as part of completion.

## TC-0012-0312

- EX-Ref: EX-0012-0101
- AC-Refs: AC-0012-0009
- non-UI specs are excluded from prototyping execution and UI evidence overfire is avoided.

## TC-0012-0313

- EX-Ref: EX-0012-0102
- AC-Refs: AC-0012-0008, AC-0012-0010
- legacy identifier space is retained without reviving weighted-total narratives, and the legacy validation slice (executionPlan / Lighthouse / designSystemCompliance / calibration overrides) remains validator/reference behavior only.

## v2.0 / UX-Loop Active Cases

## TC-0012-0319

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0028
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([iter])` returns `"axes-exceptional"` when the latest iter has all 4 UX axes `exceptional`, `layoutAntiPatternsDetected.length === 0`, and `designMdViolations.length === 0`.

## TC-0012-0320

- EX-Ref: EX-0012-0111
- AC-Refs: AC-0012-0024
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([iter])` returns `null` when all 4 UX axes are `exceptional` but `layoutAntiPatternsDetected: ["lap-001-orphan-page"]` is non-empty.

## TC-0012-0321

- Status: superseded — replaced by TC-0012-0357 (`index === 9` terminator under 10-cycle budget).
- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0029
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([iter])` returns `"max-iterations"` when the latest iter has `index === 14`.

## TC-0012-0322

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0032
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate({cycle: 0, targetUrl: "http://localhost:5000"})` returns 0 and creates `iter-00/`.

## TC-0012-0323

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0032
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate({cycle: 0})` (without `--target-url`) exits 2 with input-validation error.

## TC-0012-0324

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0028, AC-0012-0032
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate` exits 64 when convergence (4 axes exceptional + lap=0 + designMdViolations=0) is detected.

## TC-0012-0325

- Status: superseded — replaced by TC-0012-0358 (exit 65 when latest iter index reaches 9 under 10-cycle budget).
- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0029, AC-0012-0032
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate` exits 65 when the latest iter index reaches 14.

## TC-0012-0326

- EX-Ref: EX-0012-0112
- AC-Refs: AC-0012-0034
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify cycle 0 records `prototyping.json#designMdSha256` matching `sha256(DESIGN.md)` and `.qfai/contracts/design/DESIGN.md.lock.yaml#sha256`.

## TC-0012-0327

- EX-Ref: EX-0012-0112
- AC-Refs: AC-0012-0035
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify cycle ≥1 exits 2 with stderr `"DESIGN.md hash mismatch"` when on-disk sha256 has drifted from the recorded value.

## TC-0012-0328

- EX-Ref: EX-0012-0113
- AC-Refs: AC-0012-0028
- Test file: `packages/qfai/tests/core/prototyping/designMdViolations.test.ts`
- Verify `findDesignMdViolations(html, designMd)` is pure (no I/O, no clock) and deterministic — same input yields same output across repeated invocations.

## TC-0012-0329

- EX-Ref: EX-0012-0113
- AC-Refs: AC-0012-0028
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify convergence is blocked when `designMdViolations.length > 0` even if all 4 axes are `exceptional` and `layoutAntiPatternsDetected: []`.

## TC-0012-0330

- Status: superseded — replaced by TC-0012-0364 / TC-0012-0365 (new payload: 6 `*Feel` fields + 4 ordinal axes).
- EX-Ref: EX-0012-0110, EX-0012-0117
- AC-Refs: AC-0012-0021
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify review.json schema enforces exactly the 4 UX axis keys (informationArchitecture / navigationFlow / usability / functionality) with ordinal values.

## TC-0012-0331

- EX-Ref: EX-0012-0111
- AC-Refs: AC-0012-0025
- Test file: `packages/qfai/tests/core/validators/layoutAntiPatterns.test.ts`
- Verify `layoutAntiPatternsDetected[]` schema enforces the `lap-001..008` whitelist; unknown tokens raise `QFAI-PROT-025`.

## TC-0012-0332

- EX-Ref: EX-0012-0111
- AC-Refs: AC-0012-0026
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `computePivotDirective(history)` returns `"pivot"` when the latest 3 iters have low IA AND the latest iter has non-empty `layoutAntiPatternsDetected`.

## TC-0012-0333

- EX-Ref: EX-0012-0111, EX-0012-0119
- AC-Refs: AC-0012-0027
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `computePivotDirective(history)` returns `"continue"` when ≥ 2 of the 4 UX axes strictly improve by `ordinalIndex` (weak=0, acceptable=1, strong=2, exceptional=3) versus the prior iter; otherwise returns `"refine"` (when not `pivot`).

## TC-0012-0334

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0033
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify completion certificate v2.0 round-trip: parse → serialize yields byte-equivalent output for the v2.0 schema.

## TC-0012-0335

- EX-Ref: EX-0012-0114
- AC-Refs: AC-0012-0036
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify `design-system.yaml` post-handoff content is byte-equivalent to root `DESIGN.md` token tables (color / typography / radius / shadow).

## TC-0012-0336

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0021
- Test file: `packages/qfai/tests/skill/prototypingSkill.test.ts`
- Verify the reviewer prompt frames root `DESIGN.md` as the brand SSOT and references the lap-\* catalog.

## TC-0012-0337

- EX-Ref: EX-0012-0098, EX-0012-0121
- AC-Refs: AC-0012-0031
- Test file: `packages/qfai/tests/skill/prototypingSkill.test.ts`
- Verify SKILL.md ≤ 130 lines and the 5 reference files combined ≤ 410 lines.

## TC-0012-0338

- Status: superseded — replaced by TC-0012-0359 (`MAX_ITERATIONS === 10` / `MAX_ITERATION_INDEX === 9` SSOT).
- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0020
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `MAX_ITERATIONS === 15` and `MAX_ITERATION_INDEX === 14` are exported code constants.

## TC-0012-0339

- EX-Ref: EX-0012-0110, EX-0012-0116
- AC-Refs: AC-0012-0020
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `acceptedIterationIndex === iterations.length - 1` always holds (no best-of-history selection).

## TC-0012-0340

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0021
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `isOrdinalScore` accepts only `{weak, acceptable, strong, exceptional}` and rejects other values.

## TC-0012-0341

- EX-Ref: EX-0012-0111
- AC-Refs: AC-0012-0023
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `isPivotDirective` accepts only `{continue, refine, pivot}` and rejects other values.

## TC-0012-0342

- Status: superseded — replaced by TC-0012-0376 / TC-0012-0377 (`iter-NN/spec-NNNN/<screen>.review.json` per-spec layout; no PNG/HTML).
- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0030
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify per-iter evidence path composition: `iter-NN/<screen>.png` / `iter-NN/<screen>.html` / `iter-NN/review.json` (zero-padded index).

## TC-0012-0343

- Status: superseded — replaced by TC-0012-0366 (`*Feel` fields ≤ 200 words each; legacy 200–500-word `critique` retired).
- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0022
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify review.json `critique` field is rejected when length is < 200 words or > 500 words.

## TC-0012-0344

- Status: superseded — replaced by TC-0012-0360 (at most 10 entries, monotonic 0..9, single lineage).
- EX-Ref: EX-0012-0098, EX-0012-0115
- AC-Refs: AC-0012-0020
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify single-thread serial iteration: `prototyping.json#iterations[]` has at most 15 entries with monotonic `index` values 0..14, and only one lineage exists (no parallel `candidates/` directory).

## TC-0012-0345

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0033
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify `qfai prototyping certify --check` exit code 0 when convergence artifact exists; non-zero otherwise.

## TC-0012-0346

- EX-Ref: EX-0012-0114
- AC-Refs: AC-0012-0036
- Test file: `packages/qfai/tests/core/validators/designContractReadiness.test.ts`
- Verify DESIGN.md token mirror integrity: drift between `design-system.yaml` and root `DESIGN.md` raises a design-contract validator finding.

## TC-0012-0347

- EX-Ref: EX-0012-0112
- AC-Refs: AC-0012-0034
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify cycle 0 fails with exit 2 when `.qfai/contracts/design/DESIGN.md.lock.yaml` is absent.

## TC-0012-0348

- EX-Ref: EX-0012-0112
- AC-Refs: AC-0012-0034
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify cycle 0 fails with exit 2 when `sha256(DESIGN.md)` does not match the lock file value.

## TC-0012-0349

- EX-Ref: EX-0012-0111, EX-0012-0118
- AC-Refs: AC-0012-0024
- Test file: `packages/qfai/tests/core/validators/layoutAntiPatterns.test.ts`
- Verify validator emits `QFAI-PROT-021` when `layoutAntiPatternsDetected` is non-empty AND `informationArchitecture` is `strong` or `exceptional`.

## TC-0012-0350

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0028
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `allFourAxesExceptional` returns `true` only for the canonical new-shape converged iteration and `false` for old-shape iteration objects.

## TC-0012-0351

- EX-Ref: EX-0012-0098, EX-0012-0120
- AC-Refs: AC-0012-0020
- Test file: `packages/qfai/tests/skill/prototypingSkill.test.ts`
- Verify the qfai-prototyping skill asset declares product-experience-architect (generator) and product-surface-reviewer (evaluator) as separate sub-agent identities.

## TC-0012-0352

- EX-Ref: EX-0012-0110
- AC-Refs: AC-0012-0032
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate` exit code 0 (continue) is emitted when neither convergence nor max-iterations is reached and no input error occurred.

## TC-0012-0353

- EX-Ref: EX-0012-0114
- AC-Refs: AC-0012-0036
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify `prototype-handoff.yaml` post-loop schema contains exactly `{finalIterIndex, finalArtifact, extractedDesignSystem, implementationNotes}` keys; legacy `mustPreserve` / `mayAdapt` / `mustNotCopy` fields are absent.

## v2.1 / Multi-Spec Reviewer-Driven Loop Cases

> AC-Refs in this block target `AC-0012-0037..AC-0012-0051` (the v2.1
> redefinition block authored in this delta). Stitched 2026-05-18 per
> CHG-002 integration.

## TC-0012-0354

- EX-Ref: EX-0012-0122
- AC-Refs: AC-0012-0037
- Type: integration
- Test file: `packages/qfai/tests/core/prototyping/specResolution.test.ts`
- Verify `resolveAllUiBearingSpecs()` returns every UI-bearing spec in the consumer project in one call (3 UI-bearing + 2 non-UI fixture → 3 specs).

## TC-0012-0355

- EX-Ref: EX-0012-0123
- AC-Refs: AC-0012-0037
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify zero UI-bearing specs → `runPrototypingIterate` exit code 0 (deterministic no-op), no `iter-NN/` directory is created, and stderr/log states "no UI-bearing specs resolved".

## TC-0012-0356

- EX-Ref: EX-0012-0122
- AC-Refs: AC-0012-0037
- Type: integration
- Test file: `packages/qfai/tests/skill/prototypingSkill.test.ts`
- Verify the SKILL.md / iteration-loop reference no longer contains a per-invocation primary-spec selection prompt (literal absence assertion + presence of `resolveAllUiBearingSpecs` wiring).

## TC-0012-0357

- EX-Ref: EX-0012-0124
- AC-Refs: AC-0012-0038
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([…, {index: 9}])` returns `"max-iterations"`; `shouldStop([…, {index: 8}])` returns `null` (boundary at index === 9).

## TC-0012-0358

- EX-Ref: EX-0012-0124
- AC-Refs: AC-0012-0038
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate` exits 65 when the latest iter index reaches 9 under the 10-cycle budget; exits 0 when index ≤ 8 without convergence.

## TC-0012-0359

- EX-Ref: EX-0012-0125
- AC-Refs: AC-0012-0038
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `MAX_ITERATIONS === 10` and `MAX_ITERATION_INDEX === 9` are exported from `core/prototyping/iteration.ts`.

## TC-0012-0360

- EX-Ref: EX-0012-0125
- AC-Refs: AC-0012-0038
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify single-thread serial iteration with 10-cycle budget: `prototyping.json#iterations[]` has at most 10 entries with monotonic `index` values 0..9; no parallel `candidates/` directory exists.

## TC-0012-0361

- EX-Ref: EX-0012-0125
- AC-Refs: AC-0012-0039
- Type: unit
- Test file: `packages/qfai/tests/core/validators/prototypingEvidence.test.ts`
- Verify validators `QFAI-PROT-005` and `QFAI-PROT-006` reference `index === 9` (10-cycle terminator) — repo-wide grep + validator behavior on fixture with index 9 vs index 10.

## TC-0012-0362

- EX-Ref: EX-0012-0126
- AC-Refs: AC-0012-0040
- Type: integration
- Test file: `packages/qfai/tests/core/prototyping/reviewerDispatch.test.ts`
- Verify the Reviewer sub-agent IS the one calling Playwright (not a separate orchestrator-driven capture step): orchestrator dispatch trace shows Playwright invocation occurs inside Reviewer sub-agent boundary; no orchestrator-side `captureScreenshots()` call exists in the dispatch path.

## TC-0012-0363

- EX-Ref: EX-0012-0127
- AC-Refs: AC-0012-0040
- Type: integration
- Test file: `packages/qfai/tests/core/prototyping/reviewerDispatch.test.ts`
- Verify after a Reviewer-driven cycle completes, the iter-dir contains zero `.png`, zero `.html`, and zero `interaction.json` files for any spec × screen.

## TC-0012-0364

- EX-Ref: EX-0012-0128
- AC-Refs: AC-0012-0041
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify review payload schema accepts a payload with all 6 `*Feel` fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`) AND all 4 ordinal axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) AND `layoutAntiPatternsDetected[]` AND `designMdViolations[]`.

## TC-0012-0365

- EX-Ref: EX-0012-0128
- AC-Refs: AC-0012-0041
- Type: contract
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify review payload schema rejects (with named field path in error) when any of the 6 `*Feel` fields is missing, when an ordinal axis is missing, or when an extra unknown top-level key is present.

## TC-0012-0366

- EX-Ref: EX-0012-0129
- AC-Refs: AC-0012-0041
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify each `*Feel` field is rejected when its word count exceeds 200; accepted at exactly 200 words; accepted at 1 word.

## TC-0012-0367

- EX-Ref: EX-0012-0130
- AC-Refs: AC-0012-0042
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify global convergence requires AND across every spec × screen pair: when 2 of 3 pairs are `exceptional` on all 4 axes and the 3rd is `strong` on one axis, `shouldStop` returns `null`; when all 3 pairs are `exceptional` (axes + lap=0 + designMdViolations=0), `shouldStop` returns `"axes-exceptional"`.

## TC-0012-0368

- EX-Ref: EX-0012-0131
- AC-Refs: AC-0012-0042
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify aggregated cycle record names every lagging spec (spec where any pair is below `exceptional`) under a `laggingSpecs[]` field when convergence is not achieved.

## TC-0012-0369

- EX-Ref: EX-0012-0131
- AC-Refs: AC-0012-0042
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify no quantitative AC-pass% / transition-pass% threshold gate exists in convergence logic — `shouldStop` decision depends only on ordinal axes + lap empty + designMdViolations empty (no numeric pass-rate field consulted).

## TC-0012-0370

- EX-Ref: EX-0012-0132
- AC-Refs: AC-0012-0043
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/licenseVerify.test.ts`
- Verify `licenseVerify(imageSources)` returns success when every `imageSources[]` entry has `source` in `["unsplash", "pexels"]` with a known license string in the cycle-0 frozen catalog.

## TC-0012-0371

- EX-Ref: EX-0012-0133
- AC-Refs: AC-0012-0043
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate` hard-stops with exit code 66 when any `imageSources[]` entry has `source: "pinterest"` or `license: "unknown"`; stderr names the offending image URL.

## TC-0012-0372

- EX-Ref: EX-0012-0132
- AC-Refs: AC-0012-0043
- Type: contract
- Test file: `packages/qfai/tests/core/prototyping/handoff.test.ts`
- Verify `prototype-handoff.yaml#imageSources[]` schema requires exactly `{url, license, attribution, source}` per entry; missing any field is rejected with named-field validation error.

## TC-0012-0373

- EX-Ref: EX-0012-0134
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify lock drift at cycle ≥1: `runPrototypingIterate` exits 2 with stderr matching `/DESIGN\.md hash mismatch.*re-run from cycle 0/` when on-disk DESIGN.md sha256 differs from cycle-0-recorded `designMdSha256`; no review payloads are written for the failed cycle.

## TC-0012-0374

- EX-Ref: EX-0012-0135
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/core/prototyping/reviewerDispatch.test.ts`
- Verify Reviewer Playwright-session failure hard-stop: when all Reviewer attempts for a `(spec, screen)` pair fail, the run exits non-zero, names the pair in stderr, and does NOT declare convergence.

## TC-0012-0375

- EX-Ref: EX-0012-0123, EX-0012-0134, EX-0012-0135, EX-0012-0140
- AC-Refs: AC-0012-0044
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify autonomous run cycle 0..9 produces zero per-cycle interactive prompts: stdin is closed and the run completes through all hard-stop classes deterministically.

## TC-0012-0376

- EX-Ref: EX-0012-0136
- AC-Refs: AC-0012-0046
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify per-iter / per-spec evidence path composition: `iterationReviewPath(2, "spec-0007", "orders-dashboard")` equals `.qfai/evidence/prototyping/iter-02/spec-0007/orders-dashboard.review.json` (zero-padded index, `spec-NNNN` namespace).

## TC-0012-0377

- EX-Ref: EX-0012-0137
- AC-Refs: AC-0012-0046
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify after any completed cycle, the iter-dir tree contains only `<spec-NNNN>/<screen>.review.json` files — no `.png`, `.html`, or `interaction.json` anywhere under `iter-NN/`.

## TC-0012-0378

- EX-Ref: EX-0012-0137
- AC-Refs: AC-0012-0046
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iterationPaths.test.ts`
- Verify `iterationDir(2, "spec-0007")` returns `.qfai/evidence/prototyping/iter-02/spec-0007` and `iterationReviewPath(2, "spec-0007", "orders-dashboard")` builds on top of it.

## TC-0012-0379

- EX-Ref: EX-0012-0137
- AC-Refs: AC-0012-0046
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iterationPaths.test.ts`
- Verify `findIterationReviewFiles(2)` globs across `iter-02/spec-*/<screen>.review.json` and returns sorted absolute paths; ignores `.png` / `.html` even if mistakenly present.

## TC-0012-0380

- EX-Ref: EX-0012-0137
- AC-Refs: AC-0012-0046
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/iterationPaths.test.ts`
- Verify `findStaleIterDirs` matches only `/^iter-\d{2,}$/` directory names (not `iter-bad` / `iter-1`); `deleteStaleIterDirs` removes only matched dirs and preserves unrelated siblings.

## TC-0012-0381

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify `qfai prototyping certify` rejects (non-zero exit) when any spec in the cycle-0 frozen set lacks any declared screen's `<screen>.review.json` at the accepted iter; stderr names the missing `(spec, screen)` pair.

## TC-0012-0382

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify `readFrozenSpecsCovered()` reads the cycle-0 frozen spec set from cycle-0 evidence and drives the per-spec aggregation loop in certify (mock fixture confirms iteration order matches frozen-set order).

## TC-0012-0383

- EX-Ref: EX-0012-0139
- AC-Refs: AC-0012-0048
- Type: integration
- Test file: `packages/qfai/tests/core/prototyping/reviewerDispatch.test.ts`
- Verify the Reviewer's Playwright session attempts navigation to every primary menu entry (sidebar / topbar / bottombar) declared in the prototype harness fixture; navigation attempt count equals total menu entry count.

## TC-0012-0384

- EX-Ref: EX-0012-0139
- AC-Refs: AC-0012-0048
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify when `menuReachabilityFeel` describes unreachable entries, the cycle exit status remains success (no hard-fail); unreachable findings surface as qualitative critique only.

## TC-0012-0385

- EX-Ref: EX-0012-0140
- AC-Refs: AC-0012-0049
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify mid-run spec-set change detection: when a new UI-bearing spec appears on disk at cycle ≥1, `runPrototypingIterate` exits non-zero, names the new spec in stderr, and the run does NOT restart at cycle 0; the new spec is deferred for the next invocation.

## TC-0012-0386

- EX-Ref: EX-0012-0141
- AC-Refs: AC-0012-0049
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/specResolution.test.ts`
- Verify `specsCovered` drift check reads the cycle-0 frozen set (not live filesystem) as its baseline — fixture mutates filesystem mid-test and asserts the comparison uses the frozen value.

## TC-0012-0387

- EX-Ref: EX-0012-0142
- AC-Refs: AC-0012-0050
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify per-spec time-budget overrun appends a soft-warning field (e.g. `timeBudgetSoftWarning`) to the per-spec review payload; the run continues normally; only the global 10-cycle budget hard-fails.

## TC-0012-0388

- EX-Ref: EX-0012-0143
- AC-Refs: AC-0012-0051
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify cycle 0 writes the frozen spec set into cycle-0 evidence (`frozenSpecsCovered: ["spec-0007", "spec-0011"]` for the 2-spec fixture).

## TC-0012-0389

- EX-Ref: EX-0012-0144
- AC-Refs: AC-0012-0051
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify cycle 0 writes the stock-photo license-class catalog into cycle-0 evidence (`frozenLicenseCatalog: { sources: ["unsplash", "pexels"], licenseTiers: {…} }`).

## TC-0012-0390

- EX-Ref: EX-0012-0143, EX-0012-0144
- AC-Refs: AC-0012-0051
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify cycle-0 frozen set + license catalog are the SSOT consumed by subsequent cycles — mutating in-memory live values does not affect cycle ≥1 behavior, only the cycle-0 recorded values are read.

## TC-0012-0391

- EX-Ref: EX-0012-0122
- AC-Refs: AC-0012-0037
- Type: property
- Test file: `packages/qfai/tests/core/prototyping/specResolution.test.ts`
- Verify property: for every consumer project fixture, `resolveAllUiBearingSpecs(project)` ≡ `project.specs.filter(s => s.ui_bearing === true)` (set equality, order-insensitive).

## TC-0012-0392

- EX-Ref: EX-0012-0136
- AC-Refs: AC-0012-0046
- Type: property
- Test file: `packages/qfai/tests/core/prototyping/iterationPaths.test.ts`
- Verify property: for every `(idx ∈ 0..99, spec ∈ specIdStrings, screen ∈ screenNames)`, `parseIterationReviewPath(iterationReviewPath(idx, spec, screen)) === {idx, spec, screen}` (round-trip identity).

## TC-0012-0393

- EX-Ref: EX-0012-0124
- AC-Refs: AC-0012-0038, AC-0012-0039
- Type: e2e
- Test file: `packages/qfai/tests/e2e/prototypingFullLoop.test.ts`
- Verify a full 10-cycle e2e run that never converges hard-stops at the end of cycle 9 with exit 65 and `prototyping.json#stopReason === "max-iterations"`; exactly 10 iter-dirs `iter-00..iter-09` exist.

## TC-0012-0394

- EX-Ref: EX-0012-0126
- AC-Refs: AC-0012-0040
- Type: e2e
- Test file: `packages/qfai/tests/e2e/prototypingFullLoop.test.ts`
- Verify an e2e cycle where the Reviewer sub-agent launches Playwright against a localhost prototype harness and writes `iter-NN/spec-NNNN/<screen>.review.json` containing all 6 `*Feel` fields + 4 ordinal axes.

## TC-0012-0395

- EX-Ref: EX-0012-0133
- AC-Refs: AC-0012-0043
- Type: contract
- Test file: `packages/qfai/tests/core/prototyping/licenseVerify.test.ts`
- Verify `licenseVerify` contract rejects every source NOT in the cycle-0 frozen allowlist with a structured error `{code: "license-not-allowlisted", source, url}`; exit code mapping to 66 is the caller's responsibility.

## CHG-002 Cascade — Cycle-0 Bypass Regression + Traceability Stitch

> Authored 2026-05-19 to register the late-review fixes on PR #208
> (codex r3264500818 / r3264507311 / r3264508578 + architecture-reviewer
> r3264511589 + completion-reviewer r3264512364). See `09_delta.md`
> CHG-002 cascade for the delta note.

## TC-0012-0396

- EX-Ref: EX-0012-0123
- AC-Refs: AC-0012-0037
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the cycle-0 no-op gate is bypassed when `qfai.config.yaml#prototyping.primarySpecId` is configured AND the spec dir exists on disk, even if the spec carries no `surface_type: ui-bearing` marker and no UI contract.

## TC-0012-0397

- EX-Ref: EX-0012-0140, EX-0012-0143
- AC-Refs: AC-0012-0049, AC-0012-0051
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify primarySpecId-only config — cycle 1 does NOT trip the spec-set drift check (cycle 0 must seed `frozenSpecsCovered: [primary]` rather than `[]`, so cycle ≥1 live comparison does not surface a `removed: [primary]` drift).

## TC-0012-0398

- EX-Ref: EX-0012-0123
- AC-Refs: AC-0012-0037
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the cycle-0 no-op gate is bypassed when `01_Spec.md` carries the legacy `# … Prototyping …` title marker, even with no `surface_type: ui-bearing` frontmatter, no UI contract, and no primarySpecId pin.

## TC-0012-0399

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify certify iterates the cycle-0-frozen `frozenSpecsCovered` set (multi-spec) when both `frozenSpecsCovered` and the legacy single-spec `specsCovered` are present on prototyping.json; the per-(spec × screen) presence gate must catch a frozen-set secondary spec with no review.json files.

## TC-0012-0400

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify certify falls back to legacy `specsCovered` for pre-Wave-3 evidence that lacks `frozenSpecsCovered`; the per-(spec × screen) presence gate must still flag every missing pair.

## TC-0012-0401

- EX-Ref: EX-0012-0123
- AC-Refs: AC-0012-0037, AC-0012-0049
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the title-marker bypass (TC-0012-0398) is symmetric with the primarySpecId bypass at cycle ≥1: seed a spec whose only UI-bearing signal is the legacy `# … Prototyping …` title marker, run cycle 0 (which must seed `frozenSpecsCovered` with the title-marker spec id, not `[]`), then run cycle 1 and assert stderr does NOT contain `spec-set drift detected` / `removed=[NNNN]`. Pre-fix the title-marker bypass would have suffered the same cycle-1 drift trip as the primarySpecId bypass did before TC-0012-0397; this case pins the symmetric coverage.

## Legacy Coverage Continuity

- The legacy baseline test-case identifier space remains reserved for existing implementation/test slices.
- The legacy v1.x test cases (executionPlan / Lighthouse / designSystemCompliance / calibration overrides / fullHarness / scoringTrace / iterationBudget / perfect-100 / hard-floor) were purged 2026-05-06 in the v2.0 / UX-loop adoption (see `09_delta.md` CHG-001 OP-PURGE-040..042); their pre-v2.0 narratives are no longer part of the active spec surface.
- Pre-v1.8.1 weighted-total narratives are superseded by the current v2.0 / UX-loop execution model.
