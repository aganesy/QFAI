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

## TC-0017-0003: shouldStop NOT exceptional if layout-anti-pattern detected

- EX-Ref: EX-0017-0004
- AC-Refs: AC-0017-0005, AC-0017-0007
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Type: edge
- Verify `shouldStop([iter])` returns `null` when all 4 axes `exceptional` but `layoutAntiPatternsDetected: ["lap-001-orphan-page"]`. (UX-loop redesign: replaces the prior `slopPatternsDetected: ["slop-001-shadcn-zinc"]` fixture — see 09_delta.md OP-0008.)

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

## TC-0017-0007: buildEvaluatorReview rejects informationArchitecture > acceptable while lap-* present

- EX-Ref: EX-0017-0004
- AC-Refs: AC-0017-0005
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Type: edge
- Verify `buildEvaluatorReview` throws `QFAI-PROT2-021`-equivalent error when `layoutAntiPatternsDetected: ["lap-001-orphan-page"]` and `scores.informationArchitecture: "strong" | "exceptional"`. (UX-loop redesign: replaces the prior originality-cap test — see 09_delta.md OP-0008.)

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

## TC-0017-0021: review schema enforces 4 ordinal axes (UX-loop)

- EX-Ref: EX-0017-0011
- AC-Refs: AC-0017-0003
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Type: normal
- Verify `buildEvaluatorReview` rejects scores objects missing any of the 4 axes (`informationArchitecture`, `navigationFlow`, `usability`, `functionality`), and rejects values outside `{weak, acceptable, strong, exceptional}`. (UX-loop redesign: axes set replaces the deprecated `{designQuality, originality, craft, functionality}` — see 09_delta.md OP-0001.)

## TC-0017-0022: review schema enforces pivotDirective enum

- EX-Ref: EX-0017-0002
- AC-Refs: AC-0017-0006
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Verify `buildEvaluatorReview` rejects `pivotDirective` values not in `{continue, refine, pivot}`.

## TC-0017-0023: design-system mirrors DESIGN.md post-loop (UX-loop)

- EX-Ref: EX-0017-0013
- AC-Refs: AC-0017-0011
- Test file: `packages/qfai/tests/cli/commands/prototypingCertify.test.ts`
- Type: normal
- Verify pre-loop `.qfai/contracts/design/design-system.yaml` is absent (or untouched), and post-handoff it is generated as a deterministic byte-equivalent mirror of `DESIGN.md` token tables (color / font / radius / shadow). Asserting `design-system.yaml#colors == DESIGN.md.parsed.colors`, etc. (UX-loop redesign: replaces "extract from final iter HTML" — see 09_delta.md OP-0004.)

## TC-0017-0024: reviewer treats DESIGN.md as brand compliance source (UX-loop)

- EX-Ref: EX-0017-0012
- AC-Refs: AC-0017-0019, AC-0017-0023
- Test file: `packages/qfai/tests/skill/prototypingReviewerPrompt.test.ts`
- Type: normal
- Verify `qfai-prototyping/references/reviewer-prompt.md` contains explicit "DESIGN.md is brand SSOT, evaluate token compliance via findDesignMdViolations" framing and does NOT contain the legacy `reference-pool.yaml` "deviate from" wording. The skill validator reads the reference file and asserts the framing string is present and the legacy wording is absent. (UX-loop redesign: replaces TC-0017-0024's prior reference-pool framing assertion — see 09_delta.md OP-0007.)

## TC-0017-E2E-0001: end-to-end iter-00..iter-03 cycle (UX-loop)

- EX-Ref: EX-0017-0001
- AC-Refs: AC-0017-0001, AC-0017-0007, AC-0017-0008, AC-0017-0012
- Test file: `packages/qfai/tests/e2e/prototypingV2E2E.test.ts`
- Type: normal
- Seed: tmp dir with 1 spec + 1 UI contract + root `DESIGN.md` + `.qfai/contracts/design/DESIGN.md.lock.yaml`.
- Run: `iterate --cycle 0 --target-url http://...` → seed iter-00 fixture + review.json (all 4 UX axes acceptable, layoutAntiPatternsDetected=[], designMdViolations=[]) → `iterate --cycle 1` → seed iter-01 fixture (4 UX axes exceptional, lap=0, designMdViolations=0) → `iterate --cycle 2`
- Assert: cycle 2 returns 64; `qfai prototyping certify` succeeds; `certify --check` returns 0.

## TC-0017-0030: SDD Phase 0 freezes DESIGN.md sha256 into lock

- EX-Ref: EX-0017-0014
- AC-Refs: AC-0017-0015
- Test file: `packages/qfai/tests/cli/commands/sddPhase0DesignMdLock.test.ts`
- Type: normal
- Seed: tmp dir with `DESIGN.md` containing color/font/radius/shadow token tables.
- Run: `qfai sdd run` (or the Phase 0 entry point) such that Phase 0 completes.
- Assert: `.qfai/contracts/design/DESIGN.md.lock.yaml` exists, `lock.sha256` equals `sha256(DESIGN.md bytes)`, `lock.lockedAt` is a valid ISO timestamp.

## TC-0017-0031: SDD Phase 0 halts when DESIGN.md missing

- EX-Ref: EX-0017-0014
- AC-Refs: AC-0017-0015
- Test file: `packages/qfai/tests/cli/commands/sddPhase0DesignMdLock.test.ts`
- Type: error
- Seed: tmp dir with no root `DESIGN.md`.
- Run: Phase 0.
- Assert: validator emits `QFAI-PROT2-030`, Phase 0 halts (non-zero exit / fail-on error).

## TC-0017-0032: cycle 0 records designMdSha256 in prototyping.json

- EX-Ref: EX-0017-0014
- AC-Refs: AC-0017-0016
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Type: normal
- Seed: tmp dir with `DESIGN.md` + frozen `DESIGN.md.lock.yaml`.
- Run: `prototypingIterate --cycle 0 --target-url http://...`.
- Assert: exit 0, `prototyping.json#designMdSha256 === sha256(DESIGN.md)` and equals `lock.sha256`.

## TC-0017-0033: cycle ≥1 exits 2 on DESIGN.md hash mismatch

- EX-Ref: EX-0017-0015
- AC-Refs: AC-0017-0017
- Test file: `packages/qfai/tests/cli/commands/prototypingIterate.test.ts`
- Type: error
- Seed: tmp dir where `prototyping.json#designMdSha256` is stale (recorded at cycle 0, but `DESIGN.md` mutated since).
- Run: `prototypingIterate --cycle 1`.
- Assert: exit 2, stderr contains "DESIGN.md hash mismatch", `QFAI-PROT2-031` in run-log.

## TC-0017-0034: findDesignMdViolations is pure and deterministic

- EX-Ref: EX-0017-0016
- AC-Refs: AC-0017-0019, AC-0017-0020
- Test file: `packages/qfai/tests/core/prototyping/findDesignMdViolations.test.ts`
- Type: normal
- Verify: (a) calling `findDesignMdViolations(html, designMd)` twice with identical inputs yields deep-equal outputs; (b) violations cover all 4 categories (color/font/radius/shadow); (c) the function performs no I/O (no fs, no clock); (d) each violation entry has shape `{category, expected, found, location}`.

## TC-0017-0035: convergence requires designMdViolations empty

- EX-Ref: EX-0017-0017
- AC-Refs: AC-0017-0007, AC-0017-0019
- Test file: `packages/qfai/tests/core/prototyping/iteration.test.ts`
- Type: edge
- Verify `shouldStop([iter])` returns `null` when all 4 UX axes `exceptional` and `layoutAntiPatternsDetected: []` but `designMdViolations: [{category: "color", expected: "#0F172A", found: "#000000", location: "header"}]`. Convergence is blocked.

## TC-0017-0037: layoutAntiPatternsDetected schema enforcement

- EX-Ref: EX-0017-0019
- AC-Refs: AC-0017-0018
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Type: edge
- Verify `buildEvaluatorReview` rejects `review.json` whose `layoutAntiPatternsDetected` contains an unknown token (e.g. `["lap-999-fake"]`) with `QFAI-PROT2-032`. Accepts valid tokens drawn from `lap-001..008`.

## TC-0017-0038: legacy slop tokens absent from active reviewer prompt

- EX-Ref: EX-0017-0020
- AC-Refs: AC-0017-0022
- Test file: `packages/qfai/tests/skill/prototypingReviewerPrompt.test.ts`
- Type: edge
- Verify `qfai-prototyping/references/reviewer-prompt.md` does not contain any of `slop-001-shadcn-zinc`, `slop-003-linear-stripe`, `slop-008-glass-card`, `slop-009-mono-emoji`, `slop-010-rounded-2xl-shadow-lg` as active anti-pattern tokens. (History references in 09_delta.md are scoped out.)

## TC-0017-0039: DCON-030/031/032 validators registered

- EX-Ref: EX-0017-0021
- AC-Refs: AC-0017-0024
- Test file: `packages/qfai/tests/core/validators/designMdValidators.test.ts`
- Type: normal
- Verify the validator registry exposes `DCON-030` (DESIGN.md presence/structure), `DCON-031` (DESIGN.md.lock.yaml hash integrity), `DCON-032` (design-system.yaml mirrors DESIGN.md). Verify legacy IDs `DCON-005..016` are not in the active registry.

## TC-0017-0036: pivotDirective rule — 3 low IA + latest lap-* → pivot

- EX-Ref: EX-0017-0018
- AC-Refs: AC-0017-0006, AC-0017-0021
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Type: normal
- Seed: 3 consecutive iter reviews with `informationArchitecture ∈ {weak, acceptable}`, latest with `layoutAntiPatternsDetected: ["lap-002-deadend-flow"]`.
- Verify `computePivotDirective(history)` returns `"pivot"`. With latest `layoutAntiPatternsDetected: []`, returns `"refine"`.

## TC-0017-0040: pivotDirective rule — ≥2 axes improved → continue (UX-loop)

- EX-Ref: EX-0017-0018
- AC-Refs: AC-0017-0006, AC-0017-0021
- Test file: `packages/qfai/tests/core/prototyping/evaluatorReview.test.ts`
- Type: normal
- Seed: 2 consecutive iter reviews where prior has `{informationArchitecture: "acceptable", navigationFlow: "acceptable", usability: "acceptable", functionality: "acceptable"}` and latest has `{informationArchitecture: "strong", navigationFlow: "strong", usability: "acceptable", functionality: "acceptable"}` (2 axes strictly increased by `ordinalIndex`).
- Verify `computePivotDirective(history)` returns `"continue"`.
- Verify edge cases: (a) with latest `{strong, acceptable, acceptable, acceptable}` (only 1 axis improved), returns `"refine"`; (b) with latest equal-to-prior on all axes, returns `"refine"` (no improvement); (c) with latest `{exceptional, exceptional, weak, weak}` from prior `{strong, strong, weak, weak}` (2 improved, 0 regressed), returns `"continue"`. Asserts the `ordinalIndex` ordering (`weak=0, acceptable=1, strong=2, exceptional=3`) is applied. (UX-loop redesign: anchors the well-defined "improved" predicate added to BR-0017-0006 — see 09_delta.md OP-0020.)
