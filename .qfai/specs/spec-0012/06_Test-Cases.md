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
- Verify per-iter / per-spec evidence path composition: `iterationReviewPathPerSpec(2, "spec-0007", "orders-dashboard")` equals `.qfai/evidence/prototyping/iter-02/spec-0007/orders-dashboard.review.json` (zero-padded index, `spec-NNNN` namespace).

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
- Verify `iterationDirPerSpec(2, "spec-0007")` returns `.qfai/evidence/prototyping/iter-02/spec-0007` and `iterationReviewPathPerSpec(2, "spec-0007", "orders-dashboard")` builds on top of it.

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
- Verify property: for every `(idx ∈ 0..99, spec ∈ specIdStrings, screen ∈ screenNames)`, `parseIterationReviewPath(iterationReviewPathPerSpec(idx, spec, screen)) === {idx, spec, screen}` (round-trip identity).

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

## TC-0012-0402

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the single-spec flat-iter info-skip: certify with `frozenSpecsCovered: ["0012"]` (single spec) and no per-spec subdirs at the accepted iter must exit 0 and surface an info note containing `per-spec`, `layout not detected`, `skipping`. Codifies the legacy backward-compatibility path while the per-spec layout migration (TDD-0384 / OQ-0012-0006) is pending.

## TC-0012-0403

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the multi-spec flat-iter hard error: certify with `frozenSpecsCovered: ["0012","0007"]` (multi-spec) and no per-spec subdirs at the accepted iter must exit non-zero with an error message naming the multi-spec/per-spec incompatibility (`multi-spec frozen set requires per-spec`) AND the deferred-migration hint (`flat-iter migration deferred`). Closes the TDD-0387 vulnerability re-opened by the unconditional flat-iter skip — pre-fix a frozen secondary spec could ship a sealed cert with zero review.json files.

## TC-0012-0404

- EX-Ref: EX-0012-0123, EX-0012-0140
- AC-Refs: AC-0012-0037, AC-0012-0049
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the cycle-0 frozen spec set is the UNION of (strict frontmatter scan) + (legacy title-marker scan) + (configured `prototyping.primarySpecId` on disk), independent of which sub-scan finds anything: seed spec-0003 with `surface_type: ui-bearing` (strict), pin `primarySpecId: "0002"` (no strict signal on spec-0002), run cycle 0 with `--target-url`, and assert `prototyping.json#frozenSpecsCovered === ["0002","0003"]`. Pre-fix the strict-non-empty branch returned strict-only `["0003"]` (the primarySpecId bypass branch was reached only when strict was empty), letting certify validate the wrong scope for the loop driver's primary spec.

## TC-0012-0405

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the POSITIVE side of the `readFrozenSpecsCoveredMultiSpec ?? readFrozenSpecsCovered` precedence at the certify call-site: when `prototyping.json` carries BOTH `specsCovered: ["0007"]` (legacy single-spec primary) AND `frozenSpecsCovered: ["0007","0012"]` (multi-spec frozen set) and every (spec, screen) pair has its review.json under the accepted iter, certify exits 0 AND the sealed `completion-certificate.json#specsCovered` records the multi-spec scope `["0007","0012"]` (the frozen field wins). Pre-existing TC-0012-0399 covers the NEGATIVE side (reject when secondary missing); this case pins the happy-path sealed-cert shape at the call-site.

## TC-0012-0406

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the POSITIVE side of the fallback arm: when `prototyping.json` carries ONLY legacy `specsCovered: ["0007"]` (no `frozenSpecsCovered` field, pre-Wave-3 evidence) and the single (spec, screen) pair has its review.json, certify exits 0 AND `completion-certificate.json#specsCovered` records `["0007"]`. Pre-existing TC-0012-0400 covers the NEGATIVE side (reject on missing review.json under the fallback scope); this case pins the happy-path sealed-cert shape so a future refactor that hard-removes the legacy read is caught by a green-path regression in addition to the red-path one.

## TC-0012-0407

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify per-spec UI contract scoping at the per-(spec × screen) presence gate: seed a multi-spec frozen set `["0001","0002"]` with per-spec contracts (`.qfai/contracts/ui/spec-0001.yaml` declares ONLY `home`; `.qfai/contracts/ui/spec-0002.yaml` declares ONLY `settings`); seed only the per-spec-scoped review.json files (`spec-0001/home.review.json` + `spec-0002/settings.review.json`); assert certify exits 0 — the legacy cross-product would have demanded `spec-0001/settings.review.json` + `spec-0002/home.review.json` that should never exist per the per-spec contract. Companion negative `it` confirms presence is still enforced WITHIN each spec's declared set (spec-0001 declares two screens; missing one still fails). Pre-fix `prototypingCertify.ts` always iterated the project-wide `screenContracts` for every frozen spec, producing spurious cross-product rejections for projects with non-uniform per-spec screen sets.

## TC-0012-0408

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0037
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `resolvePrimaryPrototypingSpec` returns the UI-contract-only spec when neither the strict `surface_type: ui-bearing` marker, the legacy `# … Prototyping …` title heading, nor `qfai.config.yaml#prototyping.primarySpecId` is set — the spec is located by a matching `.qfai/contracts/ui/<spec-id>*.yaml`. Pre-fix the primary resolver returned `undefined` for contract-only projects, so iterate exited 2 with "no primary UI-bearing prototyping spec found" right after the multi-spec precheck cleared. 8th-wave Fix 1 added the contract fallback; this TC pins the spec → test traceability for the previously-unannotated describe block (10th-wave Fix E + Fix I labels the source to `"contract-fallback"`).

## TC-0012-0409

- EX-Ref: EX-0012-0123, EX-0012-0140
- AC-Refs: AC-0012-0037
- Type: unit
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the `resolveSurfaceUnion` helper (extracted from `evaluateZeroUiBearingPrecheck` in 8th-wave Fix 7) composes the deterministic UNION of every UI-bearing surface signal (strict `surface_type: ui-bearing` frontmatter / UI-contract-only fallback / legacy title-marker / configured-`primarySpecId`-on-disk) and returns it sorted lexicographically + deduplicated. Five `it` blocks cover: (a) empty result when no signal exists; (b) UNION composition across strict + title-marker + primarySpecId-on-disk; (c) UI-contract-only surface recognised via `resolveAllUiBearingSpecs`; (d) deduplication when the same spec id appears via multiple signals; (e) primarySpecId pin ignored when the spec dir is absent. This TC pins the spec → test traceability for the previously-unannotated describe block (10th-wave Fix E).

## TC-0012-0410

- EX-Ref: EX-0012-0123, EX-0012-0140
- AC-Refs: AC-0012-0049
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the cycle ≥1 mid-loop spec-set drift detector observes the live multi-spec UNION (via `resolveSurfaceUnion`) and not just the resolved primary, so a new strict-marker spec planted mid-loop with a LARGER id than the frozen primary (which keeps the primary resolver's pick stable) is still caught as drift with `new=[<new-id>]`. Pre-fix (10th-wave dead-branch flagged by architecture-reviewer r3265257258 / r3265251225 / r3265260466) the drift detector compared frozen=[primary] vs live=[primary] (same single-spec input passed twice) and missed the addition silently. Frozen set is preserved (no rewrite); drift is deferred to the next `--cycle 0` invocation.

## TC-0012-0411

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0043
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/licenseVerify.test.ts`
- Verify per-source URL host binding: when the catalog declares `sourceHosts[source]`, an `imageSources[]` entry whose URL host (`new URL(url).hostname`) is not in the per-source allowlist is rejected with `{code: "license-host-mismatch", source, expectedHosts, url}`. Three `it` blocks cover: (a) rejection of an unapproved host even when the source label is allowlisted (e.g. `source: "unsplash"` + `url: "https://unapproved.example/img.jpg"`); (b) acceptance of a URL whose host is in the per-source allowlist; (c) case-insensitive host comparison. Closes the source-label-only-bypass flagged by codex r3265260657 (P1).

## TC-0012-0412

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0043
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/licenseVerify.test.ts`
- Verify backward compatibility of the host-binding feature: catalogs that do not declare `sourceHosts` (pre-host-pinning shape) continue to validate every `imageSources[]` entry on the existing source-allowlist + tier-membership rules alone, regardless of host. Pins the migration contract so an older `frozenLicenseCatalog` round-trips cleanly through cycle ≥1 license verify.

## TC-0012-0413

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0043
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the iterate command hard-stops with exit 2 when `prototyping.json#imageSources[]` contains a malformed entry (missing or non-string `url` / `source` / `license`). Pre-fix the malformed entries were silently dropped by `collectImageSources`, and when every entry was malformed the array reduced to `[]`, skipping the exit-66 license gate entirely. Two `it` blocks cover: (a) entry missing `license`; (b) entry whose `url` is a number. Each must surface stderr naming the offending index (`imageSources[0]`) and the offending field. Closes codex r3265260665 (P2). AC-0012-0043 was extended in the 11th late-review wave to enumerate the malformed-imageSources exit-2 class alongside the license-verify exit-66 class so the AC surface matches the implemented + tested behavior (codex r3265479524).

## TC-0012-0414

- EX-Ref: EX-0012-0138
- AC-Refs: AC-0012-0043
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/licenseVerify.test.ts`
- Verify attribution is required at the runtime license gate. `licenseVerify` emits `{code: "license-missing-attribution", source, url}` when an `imageSources[]` entry's `attribution` field is undefined or an empty string. The new error code maps to exit 66 alongside the existing license-class rejections. `ImageSource.attribution?: string` is optional at the type level so older fixtures continue to compile; the runtime gate enforces non-empty. Two `it` blocks cover: (a) undefined attribution; (b) empty-string attribution. Closes codex r3265482144 (P2).

## TC-0012-0415

- EX-Ref: EX-0012-0145
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the cycle ≥ 1 spec-set drift gate compares the live UI-bearing UNION against the cycle-0 frozen UNION (`frozenSurfaceUnion`) — apples-to-apples — instead of the single-spec `frozenSpecsCovered`. A baseline with two strict-marker UI-bearing specs (spec-0001 + spec-0002) seeded with `frozenSpecsCovered=["0001"]` + `frozenSurfaceUnion=["0001","0002"]` must NOT trip the drift gate at cycle 1; the run proceeds with exit 0 and `frozenSurfaceUnion` is preserved unchanged. Pre-fix (10th-wave) the gate compared `frozenSet=["0001"]` against `live=["0001","0002"]` and false-positive-fired `added=[0002]` → exit 2, making convergence unreachable for any multi-UI-bearing baseline. Closes codex r3265480688 (MAJOR/P1).

## TC-0012-0416

- EX-Ref: EX-0012-0145
- AC-Refs: AC-0012-0038
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify that a single `--cycle 9` invocation on a non-converged loop whose `iterations.length === 10` emits exit 65 directly rather than via the cycle-mismatch path (where `expectedNextCycle` becomes 10 and is capped at 9). Implementation correctness relies on `shouldStop` (last.index >= MAX_ITERATION_INDEX → "max-iterations") running BEFORE the expectedNextCycle gate; this regression pins both the exit code AND the stderr discriminator (`/max iterations \(10\) reached/` present in info channel; `/expected --cycle 10/` absent from error channel). Pre-fix the expectedNextCycle gate would have fired first → exit 2 cycle-mismatch. SKILL.md already drops the stateful re-run workaround. AC-Refs binding history: AC-0012-0045 → AC-0012-0044 (14th-wave per codex r3269195807) → AC-0012-0038 (19th-wave per codex r3270052195: cycle-9 idempotency is a 10-cycle terminator-routing concern, not an autonomous-run / no-prompts concern). Closes codex r3265481161 (LOW), codex r3269195807 (MAJOR), and codex r3270214641 (MAJOR 21st-wave consistency fix). Body landed in v1.9.0 (TDD-0436 done).

## TC-0012-0417

- EX-Ref: EX-0012-0146
- AC-Refs: AC-0012-0041
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify the wave-11 `parseEvaluatorReview — new required fields (cycle / retryCount / wallTimeSec)` describe block. Closed-schema validation covers the 4 missing-field rejections (`cycle` / `retryCount` / `wallTimeSec` / `softWarnings`), the integer / range / non-finite / string-type rejections, the wave-13 boundary regression (`rejects when cycle exceeds MAX_ITERATION_INDEX` — exercises `cycle: 10 / 99 / 100`, closing the closed-schema upper-bound gap that pre-fix let `cycle: 99` pass), and the SSOT-compliant positive case (`accepts a full SSOT-compliant payload with all 11 required fields`). Closes codex r3265811711 (wave-11 traceability stitch, MAJOR) and codex r3265809796 / r3265811203 / r3265814987 (cycle upper-bound MAJOR / MINOR / NIT, wave-13).

## TC-0012-0418

- EX-Ref: EX-0012-0147
- AC-Refs: AC-0012-0046
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the wave-11 four-`it` cluster on the per-spec UI contract resolver `readPerSpecScreens`: `respects the bare-numeric canonical layout (candidate #2: <bare>.yaml)`, `respects the ui-prefixed canonical layout (candidate #3: ui-<bare>.yaml)`, `respects the recursive subdir layout (candidate #5: <spec-id>/<sub>.yaml)`, and `uses candidate #1 only when both #1 and #3 exist on disk (true first-hit-wins)`. Pairs with the wave-13 `indexPerSpecScreens` per-spec re-parse fix (`parseUiScreenFile` per-spec winning file) and the multi-file aggregation extension (`chooseWinningFiles`) — those wave-13 fixes preserve the TC-0012-0418 assertions while closing the cross-spec dedup false-negative (codex r3265806993) and the multi-file null-return waste (codex r3265809880). Closes codex r3265811711 (wave-11 traceability stitch, MAJOR).

## TC-0012-0419

- EX-Ref: EX-0012-0148
- AC-Refs: AC-0012-0037, AC-0012-0045, AC-0012-0049
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the zero-UI precheck short-circuit branches added by the 15th + 17th late-review waves. Four `it` blocks: (1) `cycle 0 + zero UI-bearing live + no frozen union still exits 0 (no-op semantic preserved)` — pins the AC-0012-0037 19th-wave clarification that the no-op is cycle-0 only; (2) `cycle ≥ 1 + zero UI-bearing live + non-empty frozenSurfaceUnion exits 2 with 'no longer reachable'` (genuine UI-removed-mid-loop hard-stop — AC-0012-0045 class (d) and AC-0012-0049 mid-run spec-set freeze); (3) `cycle ≥ 1 + zero UI-bearing live + missing prototyping.json exits 2 with 'Seed the loop first'` (fresh-project diagnostic — AC-0012-0045 class (e) 19th-wave addition); (4) `cycle ≥ 1 + zero UI-bearing live + prototyping.json missing frozenSurfaceUnion exits 2 with 'Seed the loop first'` (pre-12th-wave legacy record path — AC-0012-0045 class (e)). AC-Refs binding corrected from `AC-0012-0044` (autonomous-run / no-prompts — wrong axis) to `AC-0012-0037` + `AC-0012-0045` + `AC-0012-0049` per codex r3270093532 MINOR. Closes codex MAJOR r3270050284 (regression coverage) and codex MINOR r3270050451 (diagnostic discrimination).

## TC-0012-0420

- EX-Ref: EX-0012-0149
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the 13th-wave legacy-record hard-fail (codex r3265953324 MAJOR/P1) — AC-0012-0045 hard-stop class (e). Fixture: `prototyping.json` with `frozenSpecsCovered: ["0001"]` but NO `frozenSurfaceUnion` field. Expectation: `runPrototypingIterate({cycle: 1})` returns 2; stderr names the missing `frozenSurfaceUnion` field and gives a `--cycle 0` re-seed instruction. CRITICAL: the stderr MUST NOT mention `spec-set drift detected` (the silent fallback to `frozenSpecsCovered` was the very bug closed in the 13th-wave fix). Closes codex MAJOR r3270058882; AC-Ref binding extended to AC-0012-0045 class (e) per codex r3270143584 MINOR (20th-wave AC catalog amendment).

## TC-0012-0421

- EX-Ref: EX-0012-0150
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the 13th-wave `frozenLicenseCatalog` drift gate (codex r3265947252 P2) — AC-0012-0045 hard-stop class (f). Three `it` blocks: (a) tampered `allowedSources` (`pinterest` added) → exit 2 + stderr `drifted from the cycle-0 frozen license catalog`; (b) `sourceHosts` removed entirely (malformed shape) → exit 2; (c) order-permuted catalog → set-equality semantic via `licenseCatalogsEqual` / `recordOfStringArraysEqual` / `stringArraysSetEqual` MUST NOT trip the gate (assertion is the negative — `stderr` does NOT match the drift diagnostic). Pins the in-memory `DEFAULT_LICENSE_CATALOG` SSOT contract: byte-different but semantically equal catalogs MUST NOT trip the gate; any semantic difference MUST. AC-Ref binding corrected from AC-0012-0043 (exit-66 license-verify, wrong axis) to AC-0012-0045 class (f) per codex r3270141326 MAJOR (20th-wave). Closes codex MAJOR r3270057892.

## TC-0012-0422

- EX-Ref: EX-0012-0151
- AC-Refs: AC-0012-0052
- Type: integration
- Test file: `packages/qfai/tests/cli/prototypingCertify.test.ts`
- Verify the wave-14 + wave-15 + wave-16 cumulative semantic changes on the `show-spec` JSON payload — AC-0012-0052 `show-spec` JSON contract. Three `it` blocks: (a) legacy record without `frozenSpecsCovered` (only `specsCovered`) emits `frozenSpecsCoveredSource: "specsCovered"`; (b) record with `frozenSpecsCovered` emits `frozenSpecsCoveredSource: "frozenSpecsCovered"`; (c) `liveUiBearing` is a `string[]` (wave-16 contract alignment after the wave-15 resolver swap to `resolveSurfaceUnion`). AC-Ref binding corrected from AC-0012-0044 (autonomous-run, wrong axis) to the new AC-0012-0052 (`show-spec` JSON contract) per codex r3270138113 MAJOR (20th-wave). Closes codex MINOR r3270061025.

## TC-0012-0423

- EX-Ref: EX-0012-0152
- AC-Refs: AC-0012-0037, AC-0012-0049
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/specResolution.test.ts`
- Verify the 23rd-wave `hasMatchingUiContract` per-spec subdirectory fallback (codex r3270307469 P1). Five `it` blocks: (a) `accepts the per-spec subdirectory contract fallback (spec-<id>/<sub>.yaml)` — pre-fix would have returned empty / no-op; (b) `recursively accepts a per-spec subdirectory contract nested in a child folder (1 level deep)`; (c) `recursively accepts a per-spec subdirectory contract nested two levels deep` — pins the unbounded-DFS contract so a future single-level scan cannot regress green (27th-wave per codex r3270624828 MINOR); (d) `does NOT match a per-spec subdirectory that contains no .yaml files`; (e) `does NOT match a per-spec subdirectory whose only file is *.yml (single-l)` — confirms the policy that the subdir branch accepts arbitrary `*.yaml` basenames but `.yml` (single-l) is excluded for parity with the top-level anchored regex. Closes codex P1 r3270307469 (subdir fallback bug), codex MAJOR r3270527912 (traceability stitch), codex MINOR r3270529771 (coverage edge cases), and codex MINOR r3270624828 (unbounded-DFS contract pin).

## TC-0012-0424

- EX-Ref: EX-0012-0153
- AC-Refs: AC-0012-0045, AC-0012-0049
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the 30th-wave drift-gate ordering fix (codex r3270687650 P1). Fixture: multi-UI project where `frozenSurfaceUnion = ["0001", "0002"]` records the cycle-0 set but spec-0002's UI marker was removed mid-loop. The recorded iter is fully converged (4 axes exceptional + empty lap + empty dmv) so the pre-30th ordering would have returned exit 64 from `shouldStop` BEFORE the drift gate ran. Post-30th the drift gate fires first → exit 2 with `spec-set drift detected mid-loop` + `removed=[0002]`. Pins the ordering contract: lock-drift classes (designMd hash, frozen union presence + spec-set drift) MUST win over convergence / budget signals. **35th-wave extension (codex r3270897052 MINOR — qa-gatekeeper):** companion `it` block covers hard-stop class (e) — converged loop with `frozenSurfaceUnion` field OMITTED must also exit 2 (`frozenSurfaceUnion is missing or malformed` diagnostic) instead of returning convergence exit 64. Closes the branch-coverage gap where only the `drift.drifted` reorder was pinned. Closes codex P1 r3270687650 + codex MINOR r3270897052.

## TC-0012-0425

- EX-Ref: EX-0012-0154
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the 32nd-wave certify-side canonical-id validation gate (codex r3270776268 P2 — chatgpt-codex-connector). Fixture: `prototyping.json#frozenSpecsCovered[]` carries a non-canonical id (path-traversal `../../../etc/passwd`, slash-injected `spec-0001/../../escape`, trailing-whitespace (`"0001 "`), leading-whitespace (`" 0001"`, **35th-wave extension** per codex r3270897573 NIT), tab-whitespace (`"\t0001"`, 35th-wave extension), non-numeric `spec-abcd`, or wrong-digit-count `spec-001`); pre-fix `normalizeSpecDirName` only prepended `spec-` and the raw string flowed into `path.join(root, "iter-NN", id, "<screen>.review.json")`, allowing the per-(spec × screen) gate to probe outside the intended `iter-NN/spec-NNNN/` subtree. Post-fix certify exits 2 with the malformed id echoed verbatim and the canonical shape (`spec-NNNN` / 4-digit) named in stderr — refusing to construct any review path from unvalidated input. Companion happy-path it block verifies that canonical bare `0012` and fully-qualified `spec-0007` ids coexist in the same frozen set without false rejection. Closes codex P2 r3270776268 + codex NIT r3270897573.

## TC-0012-0426

- EX-Ref: EX-0012-0155
- AC-Refs: AC-0012-0045
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the 33rd-wave certify-side absent-vs-malformed `frozenSpecsCovered` discrimination (codex r3270861808 P1). Pre-fix the certify call sites collapsed "missing" and "present-but-malformed" into a single null branch via `readFrozenSpecsCoveredMultiSpec(...) ?? readFrozenSpecsCovered(...)`, which on a partially-corrupt record would silently fall back to legacy `specsCovered` — downgrading the per-(spec × screen) gate AND cert-sealing scope to the primary spec only. Post-fix a new SSOT classifier `classifyFrozenSpecsCoveredMultiSpec()` returns `{kind: "absent" / "malformed" / "ok"}`; certify exits 2 on `malformed`. **36th-wave extension (codex r3270923641 P1):** explicit `null` / `undefined` on a present key are now classified as `malformed`, not `absent` — falling back here would re-open the same evidence-gap. Six parametrized `it` blocks (non-array object / non-array string / empty array / non-string entry / empty-string entry / explicit null) + absent-fallback companion. Companion unit suite covers the classifier with 9 `it` blocks. Closes codex P1 r3270861808 + codex P1 r3270923641.

## TC-0012-0427

- EX-Ref: EX-0012-0156
- AC-Refs: AC-0012-0047
- Type: integration
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the 35th-wave per-spec screens partial-set bug fix (codex r3270911400 P1) and 38th-wave traceability stitch (codex r3271008259 MINOR + r3271011545 MAJOR). 40th-wave AC-Ref rebind from AC-0012-0046 (per-spec iter-dir namespacing) to AC-0012-0047 (certify per-spec presence aggregation) per codex r3271092532 MINOR — the regression pins `readPerSpecScreens()` enumeration semantics on the certify side, not the iter-dir layout regulation that AC-0012-0046 owns. Fixture: multi-file subdir layout where two specs declare the SAME `screenId` (each subdir's own `home.yaml` declaring `home`) plus a unique screen on the second spec (its own `settings.yaml` declaring `settings`). Pre-fix `indexPerSpecScreens()` pre-built a per-spec map from project-wide `screenContracts.sourceRef`; cross-spec dedup kept only ONE sourceRef path for the shared `home`, so the indexed re-parse missed the other spec's `home.yaml` — the gate happily passed without requiring that spec's `home.review.json`. Post-fix certify calls `readPerSpecScreens()` unconditionally; the helper's authoritative `fg()` discovery returns both files for the second spec, so omitting the shared-screenId review.json is correctly rejected.

## TC-0012-0428

- EX-Ref: EX-0012-0157
- AC-Refs: AC-0012-0052
- Type: integration
- Test file: `packages/qfai/tests/cli/prototypingCertify.test.ts`
- Verify the 38th-wave show-spec absent-vs-malformed fix (codex r3271018000 P2). 40th-wave AC-Ref rebind from AC-0012-0045 to AC-0012-0052 (show-spec JSON contract) per codex r3271093350 MINOR — AC-0012-0052 now carries a sub-clause mirroring AC-0012-0045 class (h) onto the show-spec surface so the absent-vs-malformed contract holds across all three CLI surfaces. Pre-fix `runPrototypingShowSpec` used `readStringArrayField(...) ?? readStringArrayField(specsCovered)`, collapsing "absent" and "present-but-invalid" into one null fallback that let a hand-edited multi-spec record silently downgrade to legacy `specsCovered`. Post-fix show-spec consumes the SSOT classifier and exits 2 with a "present but malformed" diagnostic. Fixture: `specsCovered: ["0012"]` + `frozenSpecsCovered: null`. Assertion: show-spec exits 2 and does NOT fall back.

## TC-0012-0429

- EX-Ref: EX-0012-0158
- AC-Refs: AC-0012-0037
- Type: unit
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify the 45th-wave `specDirExists` absolute-path fix (codex r3271656121 P1 — chatgpt-codex-connector). Pre-fix `specDirExists()` built the probe path with `path.join(root, specsDir, dirName)`, which silently concatenates an absolute `specsDir` onto root rather than resolving to the absolute path directly. For consumer projects whose `qfai.config.yaml` carries an absolute `paths.specsDir` override and a `prototyping.primarySpecId` pin, the probe missed the on-disk spec dir entirely — `resolveSurfaceUnion()` then dropped the pin and `prototyping iterate --cycle 0` hit the zero-UI short-circuit (exit 0) instead of running the loop. Post-fix `path.resolve()` correctly resets to the latter absolute segment when one is supplied, so the probe finds the spec dir regardless of whether `specsDir` is relative or absolute. Fixture uses `mkdtemp(os.tmpdir())` for the absolute `specsDir`, so the CI matrix exercises POSIX (`/abs/...`) on Linux / macOS lanes and Windows drive-letter (`C:\...`) on the Windows lane — `path.resolve` is platform-aware and treats either as absolute. AC anchor: AC-0012-0037 (cycle-0 zero-UI precheck input candidates).

## TC-0012-0430

- EX-Ref: EX-0012-0159
- AC-Refs: AC-0012-0047
- Type: unit
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the 47th-wave `readPerSpecScreens` absolute-path fix (codex r3271715563 P1 — chatgpt-codex-connector). Pre-fix `readPerSpecScreens()` built the per-spec UI contract probe path with `path.join(root, contractsDirRelative, "ui")`. When `qfai.config.yaml` carries an absolute `paths.contractsDir` override, `path.join` concatenated root + absolute rather than resetting, so per-spec contract files at `<absoluteContractsDir>/ui/spec-NNNN.yaml` were never discovered. The helper returned `null` and certify's per-(spec × screen) gate silently fell back to the project-wide screen list, enforcing the wrong `(spec, screen)` coverage. Post-fix `path.resolve()` resets to the absolute segment when one is supplied, mirroring the wave-45 `specDirExists` fix. Fixture: writes the per-spec contract at an absolute `contractsDir` pointing OUTSIDE `root`; assertion is that `readPerSpecScreens()` returns the declared `home` screen rather than `null`. Cross-platform coverage same as TC-0012-0429 (POSIX / drive-letter via OS-native tmp dir). AC anchor: AC-0012-0047 (certify per-spec presence aggregation).

## TC-0012-0431

- EX-Ref: EX-0012-0160
- AC-Refs: AC-0012-0047
- Type: unit
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify the 49th-wave partner-helper symmetry regression for `readUiContractScreenContracts` (codex r3271867391 P1 — implementation-reviewer + codex r3271867923 MAJOR — qa-gatekeeper). Wave-48 fixed the `path.join` → `path.resolve` switch in `readUiContractScreenContracts` for partner-helper consistency with the wave-47 `readPerSpecScreens` fix, but without a regression test the two helpers' absolute-path symmetry was structurally unpinned — a future `path.join` regression in the project-wide reader would silently break certify on explicit-contracts-dir workflows (project-wide pass returns empty while per-spec pass returns full set → asymmetric screen discovery between the two passes). Fixture: project-wide UI contract file `screens.yaml` written at an absolute `contractsDir` pointing OUTSIDE `root`, with two screens (`home`, `settings`). Assertion: `readUiContractScreenContracts(root, externalContractsDir)` returns both screens (sorted-equal). AC anchor: AC-0012-0047 (certify per-spec presence aggregation — same anchor as TC-0012-0430 to pin the partner-helper symmetry).

## TC-0012-0432

- EX-Ref: EX-0012-0161
- AC-Refs: AC-0012-0037
- Type: unit
- Test file: `packages/qfai/tests/core/prototyping/specResolution.test.ts`
- Verify the 50th-wave `hasMatchingUiContract` file-vs-directory discrimination fix (codex r3271969283 P2 — chatgpt-codex-connector). Pre-fix the direct-match arm used `access(<uiDir>/<specId>.yaml)` to confirm existence, but `access` does NOT distinguish file from directory. A misauthored project that created `<contractsDir>/ui/0007.yaml/` (a DIRECTORY) would have falsely classified spec-0007 as UI-bearing, driving `resolveSurfaceUnion()` / `resolvePrimaryPrototypingSpec()` to report a phantom UI surface and the iterate / drift gates to run against it instead of taking the documented no-op path. Post-fix the direct-match arm uses `stat().isFile()`, consistent with the entries-walk branch's `entry.isFile()` filter for the spec-prefixed / ui-prefixed candidates. Fixture: UI-only spec (no surface marker, no title marker, no primarySpecId pin) + a directory named `0007.yaml` at the canonical UI-contract path. Assertion: `resolveAllUiBearingSpecs()` returns `[]`. AC anchor: AC-0012-0037 (cycle-0 zero-UI precheck input candidates).

## Legacy Coverage Continuity

- The legacy baseline test-case identifier space remains reserved for existing implementation/test slices.
- The legacy v1.x test cases (executionPlan / Lighthouse / designSystemCompliance / calibration overrides / fullHarness / scoringTrace / iterationBudget / perfect-100 / hard-floor) were purged 2026-05-06 in the v2.0 / UX-loop adoption (see `09_delta.md` CHG-001 OP-PURGE-040..042); their pre-v2.0 narratives are no longer part of the active spec surface.
- Pre-v1.8.1 weighted-total narratives are superseded by the current v2.0 / UX-loop execution model.
