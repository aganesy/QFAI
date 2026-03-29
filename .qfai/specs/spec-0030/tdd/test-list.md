# TDD Execution Ledger — spec-0030 (Calibration Pack)

| TDD-ID   | TC-Refs      | Layer | Test file                                   | Selector                                       | Status | DR-ID | Evidence                                               |
| -------- | ------------ | ----- | ------------------------------------------- | ---------------------------------------------- | ------ | ----- | ------------------------------------------------------ |
| TDD-0001 | TC-0030-0001 | L3    | tests/core/calibration/loader.test.ts       | CalibrationLoader > pack loading               | done   |       | RED: module not found; GREEN: 3 examples loaded        |
| TDD-0002 | TC-0030-0002 | L3    | tests/core/calibration/loader.test.ts       | CalibrationLoader > missing pack fallback      | done   |       | RED: no module; GREEN: defaults + warning              |
| TDD-0003 | TC-0030-0003 | L3    | tests/core/calibration/scoring.test.ts      | ScoringEngine > threshold configuration        | done   |       | RED: no module; GREEN: custom thresholds applied       |
| TDD-0004 | TC-0030-0004 | L3    | tests/core/calibration/scoring.test.ts      | ScoringEngine > accept decision                | done   |       | RED: no module; GREEN: accept at 0.85                  |
| TDD-0005 | TC-0030-0005 | L3    | tests/core/calibration/scoring.test.ts      | ScoringEngine > refine decision                | done   |       | RED: no module; GREEN: refine at 0.65                  |
| TDD-0006 | TC-0030-0006 | L3    | tests/core/calibration/scoring.test.ts      | ScoringEngine > pivot decision                 | done   |       | RED: no module; GREEN: pivot at 0.35                   |
| TDD-0007 | TC-0030-0007 | L3    | tests/core/calibration/disagreement.test.ts | DisagreementHandler > majority rule            | done   |       | RED: no module; GREEN: 2 accept vs 1 pivot → accept    |
| TDD-0008 | TC-0030-0008 | L3    | tests/core/calibration/disagreement.test.ts | DisagreementHandler > tie-breaking             | done   |       | RED: no module; GREEN: highest confidence wins         |
| TDD-0009 | TC-0030-0009 | L3    | tests/core/calibration/plateau.test.ts      | PlateauDetection > plateau detection           | done   |       | RED: no module; GREEN: delta 0.01 < 0.02 detected      |
| TDD-0010 | TC-0030-0010 | L3    | tests/core/calibration/plateau.test.ts      | PlateauDetection > plateau exit behavior       | done   |       | RED: no module; GREEN: exit with plateau status        |
| TDD-0011 | TC-0030-0011 | L3    | tests/core/calibration/plateau.test.ts      | PlateauDetection > max iteration cap           | done   |       | RED: no module; GREEN: hard-exit at 15, best=0.75      |
| TDD-0012 | TC-0030-0012 | L3    | tests/core/calibration/loader.test.ts       | CalibrationLoader > mid-session reload         | done   |       | RED: no module; GREEN: reload detected, 2 entries      |
| TDD-0013 | TC-0030-0013 | L3    | tests/core/calibration/loader.test.ts       | CalibrationLoader > schema validation          | done   |       | RED: no module; GREEN: throws on missing expectedScore |
| TDD-0014 | TC-0030-0014 | L3    | tests/core/calibration/scoring.test.ts      | ScoringEngine > threshold range validation     | done   |       | RED: no module; GREEN: throws on out-of-range          |
| TDD-0015 | TC-0030-0015 | L3    | tests/core/calibration/loader.test.ts       | CalibrationLoader > alignment distribution     | done   |       | RED: no module; GREEN: 3 examples distributable        |
| TDD-0016 | TC-0030-0016 | L3    | tests/core/calibration/loader.test.ts       | CalibrationLoader > version control compliance | done   |       | RED: no module; GREEN: path convention matches         |
