# 16 Traceability Ledger

| Layer                          | Current SSOT                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Skill                          | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/SKILL.md`     |
| References                     | `packages/qfai/assets/init/.qfai/assistant/skills/qfai-prototyping/references/*` |
| DESIGN.md schema               | `packages/qfai/src/core/design/designMd.ts`                                      |
| DESIGN.md lock SSOT            | `packages/qfai/src/core/design/designMdLock.ts`                                  |
| Iterate driver                 | `packages/qfai/src/cli/commands/prototypingIterate.ts`                           |
| Certify driver                 | `packages/qfai/src/cli/commands/prototypingCertify.ts`                           |
| Iteration model                | `packages/qfai/src/core/prototyping/iteration.ts`                                |
| Evaluator review schema        | `packages/qfai/src/core/prototyping/evaluatorReview.ts`                          |
| DESIGN.md violations scanner   | `packages/qfai/src/core/prototyping/designMdViolations.ts`                       |
| Layout anti-pattern registry   | `packages/qfai/src/core/validators/layoutAntiPatterns.ts` (+ JSON sibling)       |
| Completion certificate         | `packages/qfai/src/core/prototyping/certificate.ts`                              |
| Spec resolution                | `packages/qfai/src/core/prototyping/specResolution.ts`                           |
| Prototyping evidence validator | `packages/qfai/src/core/validators/prototypingEvidence.ts`                       |
| Design contract readiness      | `packages/qfai/src/core/validators/designContractReadiness.ts`                   |
| Test todo validator            | `packages/qfai/src/core/validators/testTodoStubs.ts`                             |
| UI evidence validator          | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts`                       |
| Validate gate                  | `packages/qfai/src/core/validate.ts`                                             |

## Requirement Mapping (primary SUT only)

This table records the **primary** code SUT for each REQ. Secondary
SUTs and per-iter checks are reachable via the AC/BR-Refs in
`03_Acceptance-Criteria.md` and `04_Business-Rules.md`. Empty rows
mean no machine SUT exists; the row notes how the requirement is
otherwise enforced.

| Requirement   | Primary SUT (Implementation)                                                                                                                           | Primary SUT (Test)                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0012-0030 | `assets/init/.qfai/assistant/skills/qfai-prototyping/references/generator-prompt.md` (skill prompt is SUT for generator pivot-directive contract)      | `tests/skill/prototypingSkill.test.ts` (skill asset / prompt assertions)                                                            |
| REQ-0012-0031 | `packages/qfai/src/core/prototyping/evaluatorReview.ts` (4-axis schema + 200–500 word prose enforcement)                                               | `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`                                                                      |
| REQ-0012-0032 | `packages/qfai/src/core/prototyping/iteration.ts` (`shouldStop()` decision logic)                                                                      | `packages/qfai/tests/core/prototyping/iteration.test.ts`                                                                            |
| REQ-0012-0033 | `packages/qfai/src/core/validators/prototypingEvidence.ts` (`acceptedIterationIndex === iterations.length - 1` enforcement; QFAI-PROT-007)             | `packages/qfai/tests/validators/prototypingEvidence.test.ts`                                                                        |
| REQ-0012-0034 | `packages/qfai/src/core/prototyping/evaluatorReview.ts` (`validateAntiPatternCap` enforces IA cap on lap detection)                                    | `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`                                                                      |
| REQ-0012-0035 | `packages/qfai/src/core/validators/uiEvidenceArtifacts.ts` (per-iter file shape) + `prototypingEvidence.ts`                                            | `packages/qfai/tests/validators/prototypingEvidence.test.ts`                                                                        |
| REQ-0012-0036 | (no machine gate over the full codebase; manual audit at release plus the existing distributed-surface guard for the shipped surface only)             | `(no machine gate; manual audit at release)` — tracked as a follow-up to add a dedicated grep gate over `packages/qfai/src/**` etc. |
| REQ-0012-0037 | (no machine SUT in this PR; the SKILL.md / references size budget is documented in `_policies/11_Slice-Policy.md` §size-budget and audited by humans)  | `(no machine gate; manual audit)` — follow-up to add `tests/scripts/skillSizeBudget.test.ts`                                        |
| REQ-0012-0038 | `packages/qfai/src/cli/commands/prototypingIterate.ts` (lock-vs-live + cache-vs-live SHA gate; `designMdLock.ts` is the lock-sha extractor SSOT)       | `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`                                                                       |
| REQ-0012-0039 | `packages/qfai/src/core/prototyping/evaluatorReview.ts` (`ORDINAL_AXES` is the SSOT constant)                                                          | `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`                                                                      |
| REQ-0012-0040 | `packages/qfai/src/core/prototyping/designMdViolations.ts` (`findDesignMdViolations` pure scanner)                                                     | `packages/qfai/tests/core/prototyping/designMdViolations.test.ts`                                                                   |
| REQ-0012-0041 | (no machine SUT in this PR; `design-system.yaml` is produced by `/qfai-prototyping` post-loop, schema mirror is documented in `references/handoff.md`) | `(no machine gate; manual audit)` — follow-up to add a deterministic mirror unit test                                               |

## Notes

- `REQ-0012-0001..0010` are reserved historical identifier space (no
  active text — body was retired before this PR per `_policies/11_Slice-Policy.md`
  §ID 安定性ルール 5).
- `US-0012-0001..0097` and `TC-0012-0001..0309` remain valid
  traceability namespaces; some are marked `exception` in
  `tdd/test-list.md` where the originating tests were removed.
- Active posture is skill-first: the prototyping CLI commands (`iterate`,
  `certify`, `show-spec`) are the public runtime surfaces; internal
  helpers under `src/core/prototyping/` and `src/core/design/` are
  reusable building blocks.
- Former `spec-0017` (CAP-0017 v2.0 single-thread evolution loop /
  UX-loop redesign) and `spec-0018` are absorbed into `spec-0012`; the
  standalone directories no longer exist.

## v2.1 / Multi-Spec Reviewer-Driven Loop TDD Ledger (REQ-0001..0013)

> Owner column is the implementing team / role identifier. Status
> begins as `planned` until the corresponding test is authored and
> linked in `tdd/test-list.md`. New rows above the `TDD-0370` ceiling.
>
> **SSOT note (codex r3264473897)** — the `TC-Ref` column below records
> the originally-planned 1:1 mapping at spec authoring time. The actual
> landed TC IDs may differ — `tdd/test-list.md` is the authoritative
> source for the production TDD → TC binding (e.g. TDD-0376 lands at
> TC-0012-0359, not TC-0012-0357 as planned here). Reviewers and
> traceability gates MUST defer to `tdd/test-list.md` when the two
> diverge.

| TDD-ID   | TC-Ref       | Status  | Owner                 | Notes                                                                                       |
| -------- | ------------ | ------- | --------------------- | ------------------------------------------------------------------------------------------- |
| TDD-0371 | TC-0012-0354 | planned | prototyping-core      | resolveAllUiBearingSpecs returns multi-spec set in one call (REQ-0001)                      |
| TDD-0372 | TC-0012-0355 | planned | prototyping-cli       | zero UI-bearing specs → exit 0 deterministic no-op (REQ-0001)                               |
| TDD-0373 | TC-0012-0356 | planned | skill-asset           | per-invocation primary-spec selection prompt removed from SKILL.md (REQ-0001)               |
| TDD-0374 | TC-0012-0357 | planned | prototyping-core      | shouldStop returns "max-iterations" at index === 9 (REQ-0002)                               |
| TDD-0375 | TC-0012-0358 | planned | prototyping-cli       | runPrototypingIterate exit 65 at index 9 under 10-cycle budget (REQ-0002)                   |
| TDD-0376 | TC-0012-0359 | planned | prototyping-core      | MAX_ITERATIONS === 10 / MAX_ITERATION_INDEX === 9 SSOT (REQ-0002)                           |
| TDD-0377 | TC-0012-0360 | planned | prototyping-cli       | iterations[] ≤ 10 entries, monotonic 0..9, single lineage (REQ-0002)                        |
| TDD-0378 | TC-0012-0361 | planned | validators            | QFAI-PROT-005 / QFAI-PROT-006 reference index === 9 (REQ-0002)                              |
| TDD-0379 | TC-0012-0362 | planned | reviewer-dispatch     | Reviewer sub-agent IS the Playwright caller (no orchestrator capture step) (REQ-0003)       |
| TDD-0380 | TC-0012-0363 | planned | reviewer-dispatch     | no .png / .html / interaction.json written by new loop (REQ-0003)                           |
| TDD-0381 | TC-0012-0364 | planned | prototyping-core      | review.json schema validates 6 *Feel fields + 4 ordinal axes (REQ-0004)                     |
| TDD-0382 | TC-0012-0365 | planned | prototyping-core      | review.json schema rejects missing *Feel / extra-key (REQ-0004)                             |
| TDD-0383 | TC-0012-0366 | planned | prototyping-core      | each *Feel field ≤ 200 words enforced (REQ-0004)                                            |
| TDD-0384 | TC-0012-0367 | planned | prototyping-core      | convergence AND across every spec × screen pair (REQ-0005)                                  |
| TDD-0385 | TC-0012-0368 | planned | prototyping-core      | laggingSpecs[] populated in aggregated cycle record (REQ-0005)                              |
| TDD-0386 | TC-0012-0369 | planned | prototyping-core      | quantitative AC-pass% / transition-pass% thresholds removed (REQ-0005)                      |
| TDD-0387 | TC-0012-0370 | planned | prototyping-core      | licenseVerify accepts unsplash + pexels allowlisted entries (REQ-0006)                      |
| TDD-0388 | TC-0012-0371 | planned | prototyping-cli       | licenseVerify failure hard-stops with exit 66 (REQ-0006)                                    |
| TDD-0389 | TC-0012-0372 | planned | prototyping-core      | imageSources[] schema {url, license, attribution, source} (REQ-0006)                        |
| TDD-0390 | TC-0012-0373 | planned | prototyping-cli       | lock drift mid-loop → exit 2 with DESIGN.md hash mismatch (REQ-0007)                        |
| TDD-0391 | TC-0012-0374 | planned | reviewer-dispatch     | Reviewer Playwright session failure hard-stop names (spec, screen) (REQ-0007)               |
| TDD-0392 | TC-0012-0375 | planned | prototyping-cli       | autonomous run produces zero per-cycle interactive prompts (REQ-0007)                       |
| TDD-0393 | TC-0012-0376 | planned | prototyping-core      | iterationReviewPathPerSpec returns iter-NN/spec-NNNN/<screen>.review.json (REQ-0008)        |
| TDD-0394 | TC-0012-0377 | planned | prototyping-cli       | iter-dir tree contains only spec-NNNN/<screen>.review.json (REQ-0008)                       |
| TDD-0395 | TC-0012-0378 | planned | prototyping-core      | iterationDirPerSpec descends into spec-NNNN; path helpers compose (REQ-0008)                |
| TDD-0396 | TC-0012-0379 | planned | prototyping-core      | findIterationReviewFiles globs spec-NNNN subdirs (REQ-0008)                                 |
| TDD-0397 | TC-0012-0380 | planned | prototyping-core      | findStaleIterDirs / deleteStaleIterDirs preserve /^iter-\d{2,}$/ (REQ-0008)                 |
| TDD-0398 | TC-0012-0381 | planned | prototyping-cli       | certify rejects when any frozen-set spec lacks <screen>.review.json (REQ-0009)              |
| TDD-0399 | TC-0012-0382 | planned | prototyping-core      | readFrozenSpecsCovered drives certify per-spec loop (REQ-0009)                              |
| TDD-0400 | TC-0012-0383 | planned | reviewer-dispatch     | Reviewer exercises every primary menu entry in Playwright session (REQ-0010)                |
| TDD-0401 | TC-0012-0384 | planned | prototyping-core      | menuReachabilityFeel unreachable findings are qualitative, not hard-fail (REQ-0010)         |
| TDD-0402 | TC-0012-0385 | planned | prototyping-cli       | mid-run spec-set change → exit non-zero, defer to next invocation (REQ-0011)                |
| TDD-0403 | TC-0012-0386 | planned | prototyping-core      | specsCovered drift check reads cycle-0 frozen set, not live filesystem (REQ-0011)           |
| TDD-0404 | TC-0012-0387 | planned | prototyping-core      | per-spec 5-min cap appends soft warning; no hard-fail (REQ-0012)                            |
| TDD-0405 | TC-0012-0388 | planned | prototyping-cli       | cycle 0 records frozenSpecsCovered in cycle-0 evidence (REQ-0013)                           |
| TDD-0406 | TC-0012-0389 | planned | prototyping-cli       | cycle 0 records frozenLicenseCatalog in cycle-0 evidence (REQ-0013)                         |
| TDD-0407 | TC-0012-0390 | planned | prototyping-core      | cycle-0 frozen set + license catalog are SSOT for subsequent cycles (REQ-0013)              |
| TDD-0408 | TC-0012-0391 | planned | prototyping-core      | property: resolveAllUiBearingSpecs ≡ filter(ui_bearing===true) (REQ-0001)                   |
| TDD-0409 | TC-0012-0392 | planned | prototyping-core      | property: iterationReviewPathPerSpec round-trips with parseIterationReviewPath (REQ-0008)   |
| TDD-0410 | TC-0012-0393 | planned | prototyping-e2e       | e2e: full 10-cycle no-convergence run hard-stops at end of cycle 9 (REQ-0002)               |
| TDD-0411 | TC-0012-0394 | planned | prototyping-e2e       | e2e: Reviewer-driven Playwright session writes per-spec review.json (REQ-0003)              |
| TDD-0412 | TC-0012-0395 | planned | prototyping-core      | contract: licenseVerify rejects non-allowlisted source with structured error (REQ-0006)     |

## CHG-002 Cascade — Cycle-0 Bypass Regression + Traceability Stitch (2026-05-19)

> Late-review fixes on PR #208 (codex r3264500818 / r3264507311 /
> r3264508578 + architecture-reviewer r3264511589 + completion-reviewer
> r3264512364). New TDD IDs registered above the `TDD-0414` ceiling
> (TDD-0409..0414 are reserved in the v2.1 planned block above; the
> cascade IDs were renumbered to TDD-0415..0420 during the 4th late-
> review wave to remove the collision). Mirrored in `tdd/test-list.md`.

| TDD-ID   | TC-Ref       | Status | Owner            | Notes                                                                                                                                                                          |
| -------- | ------------ | ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TDD-0415 | TC-0012-0396 | done   | prototyping-cli  | primarySpecId-bypass: section 0 does not no-op when primary spec dir exists (TC annotation restore for pre-existing test)                                                      |
| TDD-0416 | TC-0012-0397 | done   | prototyping-cli  | MAJOR fix: primarySpecId-only config — cycle 1 does not trip spec-set drift (cycle 0 bypass now seeds `frozenSpecsCovered: [primary]` instead of `[]`)                         |
| TDD-0417 | TC-0012-0398 | done   | prototyping-cli  | title-marker fallback: section 0 honours the legacy `# … Prototyping …` heading the same way `resolvePrimaryPrototypingSpec` does                                              |
| TDD-0418 | TC-0012-0399 | done   | prototyping-cli  | certify reads `frozenSpecsCovered` first when both fields present (moved into its own describe to disentangle from TC-0012-0381)                                               |
| TDD-0419 | TC-0012-0400 | done   | prototyping-cli  | certify legacy `specsCovered` fallback when `frozenSpecsCovered` absent (moved into its own describe to disentangle from TC-0012-0381)                                         |
| TDD-0420 | n/a (source) | done   | prototyping-cli  | MINOR: `specDirExists` bare-catch hardened to ENOENT-discriminated catch + re-throw so EACCES / EIO / ENOTDIR propagate instead of being silently classified as "doesn't exist" |
| TDD-0421 | TC-0012-0401 | done   | prototyping-cli  | title-marker bypass: cycle 1 does not trip spec-set drift (symmetric to TDD-0416 for the title-marker code path)                                                               |
| TDD-0422 | TC-0012-0402 | done   | prototyping-cli  | flat-iter info-skip (single-spec): traceability stitch for the existing flat-iter test (annotated with `// QFAI:SPEC-0012:TC-0012-0402`; frozen set narrowed to single spec)   |
| TDD-0423 | TC-0012-0403 | done   | prototyping-cli  | P1 fix: multi-spec flat-iter hard error — closes the TDD-0387 vulnerability re-opened by the unconditional flat-iter skip                                                      |
| TDD-0424 | TC-0012-0404 | done   | prototyping-cli  | P2 fix: cycle-0 frozen set is the UNION of strict + title-marker + primarySpecId, independent of which sub-scan returned first (was strict-only when strict was non-empty)     |
| TDD-0425 | TC-0012-0405 | done   | prototyping-cli  | 7th late-review wave (codex r3264968439, LOW). POSITIVE precedence regression at the certify call-site: with both `specsCovered: ["0007"]` and `frozenSpecsCovered: ["0007","0012"]` populated, sealed `completion-certificate.json#specsCovered === ["0007","0012"]` (frozen wins) |
| TDD-0426 | TC-0012-0406 | done   | prototyping-cli  | 7th late-review wave (codex r3264968439, LOW). POSITIVE fallback regression at the certify call-site: with only legacy `specsCovered: ["0007"]` (no `frozenSpecsCovered`), sealed `completion-certificate.json#specsCovered === ["0007"]` so pre-Wave-3 evidence round-trips cleanly |
| TDD-0427 | TC-0012-0407 | done   | prototyping-cli  | 9th late-review wave (codex r3265157640, P1). Per-spec UI contracts scope the per-(spec × screen) presence gate: new helper `readPerSpecScreens(root, contractsDir, specDirName)` probes `<contractsDir>/ui/<spec-NNNN>.yaml` (with bare-numeric / `ui-NNNN` / `ui-NNNN-*` alternates) and the gate uses the per-spec result when non-null, else falls back to the project-wide list (single-spec backward compat). Closes the multi-spec cross-product false-positive |

## Notes (v2.1 ledger)

- TDD rows here use a 5-column form (`TDD-ID | TC-Ref | Status | Owner |
  Notes`) per the spec-0012 redefinition charter; the legacy
  `tdd/test-list.md` 8-column form (`TDD-ID | TC-Refs | Layer | Test
  file | Selector | Status | DR-ID | Evidence`) MUST be updated in a
  follow-up commit to register TDD-0371..0412 there as well, sharing
  the same TDD-IDs.
- AC-Refs in the corresponding TC block (`TC-0012-0354..0395`) and
  BR-Refs in `05_Examples.md` (`EX-0012-0122..0144`) are stitched:
  `AC-0012-0037..0051` and `BR-0012-0028..0040` are published with this
  PR. The predicted-vs-actual stitch follow-up tracked here is closed.
