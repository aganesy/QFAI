# 06 Test Cases

## TC-0017-0001: shouldStop returns null when no iters

- EX-Ref: EX-0017-0003
- AC-Refs: AC-0017-0007, AC-0017-0008
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([])` returns `null`.

## TC-0017-0002: shouldStop returns axes-exceptional on convergence

- EX-Ref: EX-0017-0001
- AC-Refs: AC-0017-0007
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([iter])` returns `"axes-exceptional"` when iter has all 4 axes `exceptional` and `slopPatternsDetected.length === 0`.

## TC-0017-0003: shouldStop NOT exceptional if slop detected

- EX-Ref: EX-0017-0004
- AC-Refs: AC-0017-0005
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([iter])` returns `null` when all 4 axes `exceptional` but `slopPatternsDetected: ["slop-001-shadcn-zinc"]`.

## TC-0017-0004: shouldStop returns max-iterations at index 14

- EX-Ref: EX-0017-0003
- AC-Refs: AC-0017-0008
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `shouldStop([iter])` returns `"max-iterations"` when iter has `index === 14` regardless of scores.

## TC-0017-0005: iterationDir zero-pads index

- EX-Ref: EX-0017-0001
- AC-Refs: AC-0017-0010
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Verify `iterationDir(0) === ".qfai/evidence/prototyping/iter-00"`, `iterationDir(14) === ".qfai/evidence/prototyping/iter-14"`.

## TC-0017-0006: buildEvaluatorReview rejects out-of-range word count

- EX-Ref: EX-0017-0002
- AC-Refs: AC-0017-0004
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `buildEvaluatorReview` throws when `proseCritique` word count is < 200 or > 500.

## TC-0017-0007: buildEvaluatorReview rejects originality > acceptable while slop present

- EX-Ref: EX-0017-0004
- AC-Refs: AC-0017-0005
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `buildEvaluatorReview` throws `QFAI-PROT2-021`-equivalent error when `slopPatternsDetected: ["x"]` and `scores.originality: "strong" | "exceptional"`.

## TC-0017-0008: certificate v2.0 round-trip

- EX-Ref: EX-0017-0001
- AC-Refs: AC-0017-0012
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify `buildCompletionCertificate` produces v2.0 schema with `iterationCount` field, and `checkCompletionCertificate` returns ok=true on round-trip.

## TC-0017-0009: certificate v2.0 rejects legacy fields

- EX-Ref: EX-0017-0005
- AC-Refs: AC-0017-0009
- Test file: `packages/qfai/tests/core/prototyping/certificate.test.ts`
- Verify cert with `polishCycleCount` or `allReviewerAxesPerfect100` is not loaded (returns null from `loadCompletionCertificate`).

## TC-0017-0010: prototypingIterate exits 0 at cycle 0 with target-url

- EX-Ref: EX-0017-0009
- AC-Refs: AC-0017-0001, AC-0017-0007
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate({cycle: 0, targetUrl: "http://localhost:5000"})` returns 0 and creates `iter-00/` dir with `iterate-plan.json`.

## TC-0017-0011: prototypingIterate exits 2 at cycle 0 without target-url

- EX-Ref: EX-0017-0009
- AC-Refs: AC-0017-0007
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `runPrototypingIterate({cycle: 0, targetUrl: undefined})` returns 2.

## TC-0017-0012: prototypingIterate exits 64 on convergence

- EX-Ref: EX-0017-0001
- AC-Refs: AC-0017-0007
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify with seeded `prototyping.json` containing iter-00 with all 4 axes exceptional, calling `iterate --cycle 1` returns 64.

## TC-0017-0013: prototypingIterate exits 65 on max-iterations

- EX-Ref: EX-0017-0003
- AC-Refs: AC-0017-0008
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify with seeded `prototyping.json` containing iters 00..14, calling `iterate --cycle 15` returns 65.

## TC-0017-0014: prototypingIterate rejects --cycle out of range

- EX-Ref: EX-0017-0009
- AC-Refs: AC-0017-0002
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Verify `--cycle -1` and `--cycle 15` (when prior iters absent) return 2.

## TC-0017-0015: validate v3 raises QFAI-PROT2-001 on missing prototyping.json

- EX-Ref: EX-0017-0009
- AC-Refs: AC-0017-0001
- Test file: `packages/qfai/tests/validators/prototypingEvidenceV3.test.ts`
- Verify validator returns `QFAI-PROT2-001` issue when `prototyping.json` does not exist.

## TC-0017-0016: validate v3 raises QFAI-PROT2-002 on schemaVersion mismatch

- EX-Ref: EX-0017-0010
- AC-Refs: AC-0017-0001
- Test file: `packages/qfai/tests/validators/prototypingEvidenceV3.test.ts`
- Verify validator returns `QFAI-PROT2-002` when `schemaVersion !== "3.0"`.

## TC-0017-0017: validate v3 raises QFAI-PROT2-004 on non-contiguous index

- EX-Ref: EX-0017-0010
- AC-Refs: AC-0017-0002
- Test file: `packages/qfai/tests/validators/prototypingEvidenceV3.test.ts`
- Verify validator returns `QFAI-PROT2-004` when `iterations[1].index === 5`.

## TC-0017-0018: skill validator enforces SKILL.md size

- EX-Ref: EX-0017-0008
- AC-Refs: AC-0017-0014
- Test file: `packages/qfai/tests/skill/prototypingSkill.test.ts`
- Verify reading `SKILL.md` and asserting line count ≤ 130.

## TC-0017-0017: sanity grep detects legacy concept introduction

- EX-Ref: EX-0017-0007
- AC-Refs: AC-0017-0013
- Test file: shell-based CI integration; spec-test stub at `packages/qfai/tests/scripts/checkNoLegacyConcepts.test.ts`
- Verify `bash packages/qfai/scripts/check-no-legacy-concepts.sh` exits 0 on clean tree, exits 1 when a temp file containing `low-cost` is added under `packages/qfai/src/`.

## TC-0017-0020: cross-skill no legacy contract templates

- EX-Ref: EX-0017-0006
- AC-Refs: AC-0017-0013
- Test file: `packages/qfai/tests/skill/sddSkill.test.ts`
- Verify `qfai-sdd/templates/contracts/{evaluation-rubric,evaluator-calibration,absorption-policy,selected-direction}.sample.yaml` do not exist after redesign.

## TC-0017-0021: review schema enforces 4 ordinal axes

- EX-Ref: EX-0017-0011
- AC-Refs: AC-0017-0003
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `buildEvaluatorReview` rejects scores objects missing any of the 4 axes, and rejects values outside `{weak, acceptable, strong, exceptional}`.

## TC-0017-0022: review schema enforces pivotDirective enum

- EX-Ref: EX-0017-0002
- AC-Refs: AC-0017-0006
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `buildEvaluatorReview` rejects `pivotDirective` values not in `{continue, refine, pivot}`.

## TC-0017-0023: design-system extracted post-loop only

- EX-Ref: EX-0017-0013
- AC-Refs: AC-0017-0011
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Verify pre-loop `.qfai/contracts/design/design-system.yaml` is absent (or untouched), and post-handoff it is generated containing extracted tokens.

## TC-0017-0024: reviewer treats reference-pool as deviate-from

- EX-Ref: EX-0017-0012
- AC-Refs: AC-0017-0005
- Test file: `packages/qfai/tests/skill/prototypingReviewerPrompt.test.ts`
- Verify `qfai-prototyping/references/reviewer-prompt.md` contains explicit "deviate from" framing for `reference-pool.yaml` and does NOT positively reward similarity. The skill validator reads the reference file and asserts the framing string is present.

## TC-0017-E2E-0001: end-to-end iter-00..iter-03 cycle

- EX-Ref: EX-0017-0001
- AC-Refs: AC-0017-0001, AC-0017-0007, AC-0017-0008, AC-0017-0012
- Test file: `packages/qfai/tests/e2e/prototypingV2E2E.test.ts`
- Seed: tmp dir with 1 spec + 1 UI contract.
- Run: `iterate --cycle 0 --target-url http://...` → seed iter-00 fixture + review.json (all axes acceptable) → `iterate --cycle 1` → seed iter-01 fixture (4 axes exceptional, slop=0) → `iterate --cycle 2`
- Assert: cycle 2 returns 64; `qfai prototyping certify` succeeds; `certify --check` returns 0.
