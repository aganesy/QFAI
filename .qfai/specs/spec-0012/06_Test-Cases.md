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

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0002
- Canonical evidence paths are documented for screenshot and HTML capture.

## TC-0012-0291

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

- EX-Ref: EX-0012-0001
- AC-Refs: AC-0012-0030
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify per-iter evidence path composition: `iter-NN/<screen>.png` / `iter-NN/<screen>.html` / `iter-NN/review.json` (zero-padded index).

## TC-0012-0343

- EX-Ref: EX-0012-0089
- AC-Refs: AC-0012-0022
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify review.json `critique` field is rejected when length is < 200 words or > 500 words.

## TC-0012-0344

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

## Legacy Coverage Continuity

- The legacy baseline test-case identifier space remains reserved for existing implementation/test slices.
- The legacy v1.x test cases (executionPlan / Lighthouse / designSystemCompliance / calibration overrides / fullHarness / scoringTrace / iterationBudget / perfect-100 / hard-floor) were purged 2026-05-06 in the v2.0 / UX-loop adoption (see `09_delta.md` CHG-001 OP-PURGE-040..042); their pre-v2.0 narratives are no longer part of the active spec surface.
- Pre-v1.8.1 weighted-total narratives are superseded by the current v2.0 / UX-loop execution model.
