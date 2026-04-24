# 06 Test Cases

## Purpose

Test cases for spec-0017 (Prototyping Playwright CLI Agent Harness). Every TC references one or more REQ/AC.

## Test Case Table

| TC-ID         | Title                                                     | REQ-Refs | AC-Refs                    | Phase | Location                                                               |
| ------------- | --------------------------------------------------------- | -------- | -------------------------- | ----- | ---------------------------------------------------------------------- |
| TC-0017-0001  | derivePrototypingObligations returns same obligations (except maxCycles) | REQ-0001 | AC-0017-0001               | 2     | `packages/qfai/tests/core/prototypingMode.test.ts`                      |
| TC-0017-0002  | Config load rejects browserProvider key                   | REQ-0008 | AC-0017-0006               | 2     | `packages/qfai/tests/core/config.test.ts`                               |
| TC-0017-0003  | Config load rejects renderProvider key                    | REQ-0008 | AC-0017-0006               | 2     | `packages/qfai/tests/core/config.test.ts`                               |
| TC-0017-0004  | Config accepts browserTool: playwright-cli                | REQ-0002 | AC-0017-0001               | 2     | `packages/qfai/tests/core/config.test.ts`                               |
| TC-0017-0005  | buildPlaywrightCliCommandPlan is deterministic            | REQ-0006 | AC-0017-0002               | 3     | `packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts`        |
| TC-0017-0006  | Command plan has 4 canonical commands + interactions      | REQ-0006 | AC-0017-0002               | 3     | `packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts`        |
| TC-0017-0007  | Output paths are under iterations/<cycle>/<screen-id>.*   | REQ-0005, REQ-0006 | AC-0017-0002     | 3     | `packages/qfai/tests/core/prototyping/playwrightCliPlan.test.ts`        |
| TC-0017-0008  | Review bundle has all 5 required fields                   | REQ-0006 | AC-0017-0014               | 3     | `packages/qfai/tests/core/prototyping/reviewBundle.test.ts`             |
| TC-0017-0009  | Review bundle references command plan file                | REQ-0006 | AC-0017-0014               | 3     | `packages/qfai/tests/core/prototyping/reviewBundle.test.ts`             |
| TC-0017-0010  | PrototypingCycleEvidence schema round-trips               | REQ-0005 | AC-0017-0004               | 4     | `packages/qfai/tests/core/harness/types.test.ts`                        |
| TC-0017-0011  | Canonical latest paths mirror latest cycle                | REQ-0005 | AC-0017-0004               | 4     | `packages/qfai/tests/unit/bundleWriter.test.ts`                         |
| TC-0017-0012  | FullHarnessIteration type is not exported                 | REQ-0005, REQ-0008 | AC-0017-0004     | 4     | `packages/qfai/tests/core/harness/types.test.ts`                        |
| TC-0017-0013  | Mode invariant validator emits QFAI-PROT-MODE-001         | REQ-0001 | AC-0017-0009               | 5     | `packages/qfai/tests/validators/prototyping/modeInvariant.test.ts`      |
| TC-0017-0014  | uiEvidenceArtifacts emits error in all modes on missing screenshot | REQ-0004 | AC-0017-0007       | 5     | `packages/qfai/tests/validators/uiEvidenceArtifacts.test.ts`            |
| TC-0017-0015  | reviewerGate emits error in all modes on non-PASS         | REQ-0004 | AC-0017-0008               | 5     | `packages/qfai/tests/validators/prototyping/reviewerGate.test.ts`       |
| TC-0017-0016  | executionPlan validator applies to all modes              | REQ-0004 | AC-0017-0010               | 5     | `packages/qfai/tests/validators/prototyping/executionPlan.test.ts`      |
| TC-0017-0017  | bestOfHistory missing emits error in all modes            | REQ-0004 | AC-0017-0015               | 5     | `packages/qfai/tests/validators/prototypingEvidence.test.ts`            |
| TC-0017-0018  | breakthrough missing emits error in all modes             | REQ-0004 | AC-0017-0015               | 5     | `packages/qfai/tests/validators/breakthroughEvidence.test.ts`           |
| TC-0017-0019  | evidenceRefs placeholder rejected                         | REQ-0003 | AC-0017-0003               | 5     | `packages/qfai/tests/validators/prototypingEvidence.test.ts`            |
| TC-0017-0020  | qfai prototyping prepare writes review bundle + plan      | REQ-0007 | AC-0017-0005               | 6     | `packages/qfai/tests/cli/prototyping.test.ts`                           |
| TC-0017-0021  | qfai prototyping prepare exits 0 on success               | REQ-0007 | AC-0017-0005               | 6     | `packages/qfai/tests/cli/prototyping.test.ts`                           |
| TC-0017-0022  | qfai prototyping prepare does not capture screenshots     | REQ-0007 | AC-0017-0005               | 6     | `packages/qfai/tests/cli/prototyping.test.ts`                           |
| TC-0017-0023  | No playwright-mcp references in repo                      | REQ-0002, REQ-0008 | AC-0017-0011     | 7     | `packages/qfai/tests/assets/noLegacyReferences.test.ts`                 |
| TC-0017-0024  | No Node Playwright imports in production src              | REQ-0002, REQ-0008 | AC-0017-0012     | 7     | `packages/qfai/tests/assets/noLegacyReferences.test.ts`                 |
| TC-0017-0025  | Skill directories are byte-identical                      | REQ-0002 | AC-0017-0013               | 1/7   | `packages/qfai/tests/assets/assets.test.ts`                             |
| TC-0017-0026  | capture-screenshots.js file does not exist                | REQ-0008 | AC-0017-0011               | 7     | `packages/qfai/tests/assets/noLegacyReferences.test.ts`                 |
| TC-0017-0027  | E2E: all three modes pass validate with same fixture except maxCycles | REQ-0001, REQ-0004 | AC-0017-0001, AC-0017-0007 | 5/7 | `packages/qfai/tests/integration/prototypingCliHarness.test.ts`         |
