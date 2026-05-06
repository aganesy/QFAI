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
| REQ-0012-0033 | `packages/qfai/src/core/prototyping/iteration.ts` (`acceptedIterationIndex = iterations.length - 1` invariant)                                         | `packages/qfai/tests/core/prototyping/iteration.test.ts`                                                                            |
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
