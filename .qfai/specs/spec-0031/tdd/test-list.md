# TDD Execution Ledger — spec-0031 (Full-Harness Premium Mode)

| TDD-ID   | TC-Refs      | Layer | Test file                            | Selector                                       | Status | DR-ID | Evidence                                                        |
| -------- | ------------ | ----- | ------------------------------------ | ---------------------------------------------- | ------ | ----- | --------------------------------------------------------------- |
| TDD-0001 | TC-0031-0001 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > premium invocation happy path    | done   |       | RED: module not found; GREEN: iteration starts at 1             |
| TDD-0002 | TC-0031-0002 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > missing inputs validation        | done   |       | RED: no module; GREEN: throws on empty specId/reqs              |
| TDD-0003 | TC-0031-0003 | L3    | tests/core/harness/planner.test.ts   | Planner > strategy production                  | done   |       | RED: no module; GREEN: strategy has approach/constraints/budget |
| TDD-0004 | TC-0031-0004 | L3    | tests/core/harness/generator.test.ts | Generator > output from plan                   | done   |       | RED: no module; GREEN: output conforms to plan                  |
| TDD-0005 | TC-0031-0005 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > scoring with critique              | done   |       | RED: no module; GREEN: critique incorporated                    |
| TDD-0006 | TC-0031-0006 | L5    | tests/core/harness/evaluator.test.ts | Evaluator > critique fail-open                 | done   |       | RED: no module; GREEN: scoring continues without critique       |
| TDD-0007 | TC-0031-0007 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > accept termination               | done   |       | RED: no module; GREEN: status=accepted                          |
| TDD-0008 | TC-0031-0008 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > refine feedback loop             | done   |       | RED: no module; GREEN: multiple iterations on refine            |
| TDD-0009 | TC-0031-0009 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > pivot replanning                 | done   |       | RED: no module; GREEN: pivot strategies created                 |
| TDD-0010 | TC-0031-0010 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > max cap default 15               | done   |       | RED: no module; GREEN: exactly 15 iterations                    |
| TDD-0011 | TC-0031-0011 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > max cap custom 8                 | done   |       | RED: no module; GREEN: exactly 8 iterations                     |
| TDD-0012 | TC-0031-0012 | L5    | tests/core/harness/loop.test.ts      | HarnessLoop > cap range below                  | done   |       | RED: no module; GREEN: throws on maxIterations 3                |
| TDD-0013 | TC-0031-0013 | L5    | tests/core/harness/loop.test.ts      | HarnessLoop > cap range above                  | done   |       | RED: no module; GREEN: throws on maxIterations 20               |
| TDD-0014 | TC-0031-0014 | L3    | tests/core/harness/evidence.test.ts  | HarnessEvidence > evidence accept              | done   |       | RED: no module; GREEN: evidence with accepted termination       |
| TDD-0015 | TC-0031-0015 | L3    | tests/core/harness/evidence.test.ts  | HarnessEvidence > evidence cap-reached         | done   |       | RED: no module; GREEN: evidence with cap-reached                |
| TDD-0016 | TC-0031-0016 | L3    | tests/core/harness/evidence.test.ts  | HarnessEvidence > review generation            | done   |       | RED: no module; GREEN: review summary generated                 |
| TDD-0017 | TC-0031-0017 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > dimension floor enforcement        | done   |       | RED: no module; GREEN: accept blocked by floor                  |
| TDD-0018 | TC-0031-0018 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > dimension floor all clear          | done   |       | RED: no module; GREEN: accept permitted                         |
| TDD-0019 | TC-0031-0019 | L5    | tests/core/harness/evaluator.test.ts | Evaluator > weighted scoring calculation       | done   |       | RED: no module; GREEN: weighted total ≈ 0.77                    |
| TDD-0020 | TC-0031-0020 | L3    | tests/core/harness/isolation.test.ts | StandardPathIsolation > no premium activation  | done   |       | RED: no module; GREEN: no harness exports in prototyping        |
| TDD-0021 | TC-0031-0021 | L5    | tests/core/harness/isolation.test.ts | StandardPathIsolation > module isolation       | done   |       | RED: no module; GREEN: harness imports independently            |
| TDD-0022 | TC-0031-0022 | L5    | tests/core/harness/loop.test.ts      | HarnessLoop > best-so-far selection            | done   |       | RED: no module; GREEN: best iteration selected                  |
| TDD-0023 | TC-0031-0023 | L5    | tests/core/harness/loop.test.ts      | HarnessLoop > no artifacts on pre-loop fail    | done   |       | RED: no module; GREEN: throws before iterations                 |
| TDD-0024 | TC-0031-0024 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > calibration baseline normalization | done   |       | RED: no module; GREEN: normalized scores differ                 |
| TDD-0025 | TC-0031-0025 | L5    | tests/core/harness/loop.test.ts      | HarnessLoop > missing calibration pre-loop     | done   |       | RED: no module; GREEN: proceeds with defaults                   |
| TDD-0026 | TC-0031-0026 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > pre-loop validation success      | done   |       | RED: no module; GREEN: 0 validation errors                      |
| TDD-0027 | TC-0031-0027 | L3    | tests/core/harness/loop.test.ts      | HarnessLoop > phase decomposition full cycle   | done   |       | RED: no module; GREEN: planner→generator→evaluator              |
| TDD-0028 | TC-0031-0028 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > tristate decision refine           | done   |       | RED: no module; GREEN: refine with feedback                     |
| TDD-0029 | TC-0031-0029 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > tristate decision pivot            | done   |       | RED: no module; GREEN: pivot with context                       |
| TDD-0030 | TC-0031-0030 | L3    | tests/core/harness/evaluator.test.ts | Evaluator > critique incorporated              | done   |       | RED: no module; GREEN: scores shift with critique               |
