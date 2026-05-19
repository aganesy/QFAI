# 10 Plan

## Goal

- Keep prototyping SSOT aligned to the multi-spec, autonomous, reviewer-driven Playwright loop with qualitative-only convergence per CHG-002 (discussion-20260516144141078).

## Current State

- `/qfai-prototyping` resolves every UI-bearing spec in one invocation via `resolveAllUiBearingSpecs()` in `core/prototyping/specResolution.ts`; per-invocation primary-spec selection is removed.
- Iteration budget is 10 cycles (cycle 0 + cycles 1..9). `MAX_ITERATIONS = 10` and `MAX_ITERATION_INDEX = 9` are the sole SSOT in `core/prototyping/iteration.ts`.
- Reviewer sub-agent itself drives Playwright per `(spec, screen)` pair; no scripted interaction transcript, no AC selector/assertion, no PNG capture, no HTML snapshot.
- Per `(spec, screen, cycle)` evidence is a single qualitative payload at `.qfai/evidence/prototyping/iter-NN/spec-NNNN/<screen>.review.json` containing the 4 ordinal UX axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`) AND six qualitative `*Feel` prose fields (`operability`, `transitionFeel`, `crossScreenContinuity`, `userStoryFeel`, `acceptanceCriteriaFeel`, `menuReachabilityFeel`, each ≤ 200 words) AND `layoutAntiPatternsDetected[]` AND `designMdViolations[]`. (Target layout — TDD-0384 per-spec iter-dir migration deferred; current implementation is mixed: `prototypingCertify.ts` reads `iter-NN/spec-NNNN/` when present, `prototypingIterate.ts` still writes flat `iter-NN/` only.)
- Convergence is the AND across every `(spec, screen)` pair of `(all 4 axes == exceptional) AND lap[] empty AND designMdViolations[] empty`. No quantitative AC-pass / transition-pass thresholds are consulted.
- Autonomous from cycle 0..9 with no per-cycle prompts. Hard-stop classes: (a) lock drift exit 2, (b) Reviewer Playwright-session failure (exit 64 reused with `sessionStatus` discriminator on the review payload), (c) license-verify failure exit 66, (d) mid-run spec-set change exit 2 (same class as lock drift).
- Stock-photo fill is drawn from the cycle-0 frozen license-class catalog (allowlist: Unsplash, Pexels per OQ-0002). Every fill is recorded as `{url, license, attribution, source}` in `prototype-handoff.yaml#imageSources[]`. Unknown license / non-allowlisted source hard-stops with exit 66.
- Cycle 0 freezes (a) the resolved spec set and (b) the stock-photo license-class catalog into cycle-0 evidence; all subsequent cycles read both as SSOT.
- `qfai prototyping certify` aggregates per-spec presence via `readFrozenSpecsCovered()` and rejects when any covered spec lacks any declared screen's `<screen>.review.json` at the accepted iter.
- DESIGN.md (root) remains the brand SSOT, frozen by SDD Phase 0 into `.qfai/contracts/design/DESIGN.md.lock.yaml#designMdSha256`. Cycle ≥1 hash drift exits 2.
- Validate/verify hold the machine gates. CHG-001 purge of legacy v1.x surfaces (round/candidate/absorption funnel, `fullHarness.iterations[]`, `scoringTrace[]`, `allReviewerAxesPerfect100`, mode budgets, hard-floor evaluation rubric) remains in force.
- CHG-002 purge of v2.0 / UX-loop surfaces (15-cycle, single-spec lineage, PNG+HTML capture, scripted interaction transcript, AC-pass% / transition-pass% quantitative thresholds, flat iter-dir layout, primary-spec selection prompt, `critique` 200..500-word single-string field) is in force; superseded rows retained as `Status: superseded` with replacement-ID pointers.

## Next Maintenance Steps

1. Land code changes alongside `spec-0012`:
   - `core/prototyping/specResolution.ts` — replace `resolvePrimaryPrototypingSpec` with `resolveAllUiBearingSpecs`.
   - `core/prototyping/iteration.ts` — change `MAX_ITERATIONS` from 15 to 10 (single edit, SSOT); update `MAX_ITERATION_INDEX` to 9; remove any 15-magic from validators and fixtures atomically.
   - `core/prototyping/iterationPaths.ts` (or wherever the helpers live) — `iterationDirPerSpec`, `iterationReviewPathPerSpec`, `findIterationReviewFiles`, `findStaleIterDirs`, `deleteStaleIterDirs` descend into `spec-NNNN` while preserving `/^iter-\d{2,}$/` cleanup semantics.
   - `core/prototyping/licenseVerify.ts` — new module; `licenseVerify(imageSources, frozenCatalog)` returns success when every entry's `source` is in the allowlist and `license` is in the catalog tiers; non-allowlisted entries map to caller-side exit 66.
   - `core/prototyping/certificate.ts` — `readFrozenSpecsCovered()` reads cycle-0 frozen set; `prototypingCertify` aggregates per-spec.
   - `core/prototyping/reviewerDispatch.ts` — Reviewer sub-agent launches Playwright in-process; remove orchestrator-side capture step.
   - `core/prototyping/evaluatorReview.ts` — review payload schema gains the six `*Feel` prose fields with ≤ 200-word bound; drops `critique` (legacy single-string field).
   - `core/validators/prototypingEvidence.ts` — `QFAI-PROT-005` / `QFAI-PROT-006` reflect 10-cycle and `index === 9` terminator; no 15-magic remains in any validator.
   - `cli/commands/prototypingIterate.ts` — multi-spec loop, autonomous (no per-cycle stdin), hard-stop class dispatch with the agreed exit codes.
   - `cli/commands/prototypingCertify.ts` — per-spec aggregation against frozen spec set.
2. Wire `.qfai/contracts/cli/qfai-prototyping.md` (Phase 0 contract authored under CHG-002) into the implementation review checklist.
3. Keep `16_Traceability-ledger.md` and `tdd/test-list.md` aligned with real remaining tests. The new TDD-0371..0412 rows added in `16_Traceability-ledger.md` need their 8-column form mirrored into `tdd/test-list.md` once the actual test files (`tests/core/prototyping/*.test.ts`, `tests/cli/commands/prototyping*.test.ts`, `tests/e2e/prototypingFullLoop.test.ts`) land.
4. When the iterate / certify schema changes, update `prototypingIterate.ts`, `prototypingCertify.ts`, `iteration.ts`, `evaluatorReview.ts`, `licenseVerify.ts`, and this spec together.
5. Resolve `08_Open-questions.md` OQ-0012-0002..0005 (prototyping.json shape under per-spec namespace; pivotDirective retention vs supersede; critique-vs-`*Feel` schema cleanup; capture role removal in steering / agent-routing). v1.8.10 shipped with implementation that pre-empts the recommended dispositions — OQ-0012-0002 adopts (A) flat + spec discriminator as an interim until per-spec migration (TDD-0384), OQ-0012-0003 retains `pivotDirective` per recommendation (A), OQ-0012-0004 drops `critique` per recommendation (A) and the `*Feel` schema is in `evaluatorReview.ts`. Final OQ closure is the follow-up gate; the "before implementation lands" wording is superseded by "before next major release".
6. Do not recreate standalone prototyping spec packs unless the product surface genuinely splits again; extend `spec-0012` instead.

## Deferred follow-ups

Items deferred from this PR (CHG-002 / v1.8.10) — each pairs a planned TDD
with the status / target / owner in `tdd/test-list.md`. Reviewers and
completion gates SHOULD treat the absence of a row here as "closed".

| TDD-ID   | TC-Ref       | Status | Owner           | Notes                                                                                         |
| -------- | ------------ | ------ | --------------- | --------------------------------------------------------------------------------------------- |
| TDD-0384 | TC-0012-0377 | todo   | prototyping-cli | Per-spec iter-dir layout migration (iterate-side; certify-side already gates on per-spec).    |
| TDD-0401 | TC-0012-0374 | todo   | prototyping-cli | Reviewer Playwright session failure hard-stop end-to-end (requires live Playwright wiring).   |
| TDD-0402 | TC-0012-0383 | todo   | prototyping-cli | Reviewer-driven menu-entry navigation count (requires live Playwright wiring).                |
| TDD-0436 | TC-0012-0416 | todo   | prototyping-cli | Cycle 9 idempotency: when `--cycle 9` is called on a non-converged loop whose `iterations.length === 10`, the CLI returns exit 65 only via the cycle-mismatch path (expectedNextCycle becomes 10, capped at 9). Operator-facing surface should emit exit 65 directly from a single `--cycle 9` invocation regardless of stateful continuation (10th-wave Fix J follow-up; SKILL.md was updated to drop the stateful re-run workaround). |

Coupled production wire-ins (no production caller yet; tests-only):

- `iterationPaths.ts` per-spec helpers — wire in alongside TDD-0384.
- `reviewerDispatch.ts` — wire in alongside TDD-0401 (production runner injection).
- `evaluatorReview.ts#parseEvaluatorReview` — wire in the same wave as TDD-0384 so per-`(spec, screen)` review.json schema fails fast at iterate/certify.
- `handoff.ts#validateImageSources` — wire in once the prototype-handoff.yaml population path lands; until then `licenseVerify` consumes `prototyping.json#imageSources` directly.
