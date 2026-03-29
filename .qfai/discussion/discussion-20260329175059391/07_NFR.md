# 07 NFR

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329175059391 |
| Date          | 2026-03-29                   |

## Non-Functional Requirements

| NFR-ID   | Category        | Requirement                                                                                              | Measurable Target                                                                                         | Source Refs       |
| -------- | --------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------- |
| NFR-0001 | Performance     | Full-harness loop must complete within the max iteration cap                                             | Loop terminates at or before 15 iterations (configurable); no unbounded execution                         | SRC-0001          |
| NFR-0002 | Reliability     | Critique adapter must fail open; provider failure must not block standard or premium path                | Provider timeout/error results in skip (not hard fail); zero blocking errors from provider unavailability | SRC-0001          |
| NFR-0003 | Observability   | Cost/time metrics must be emitted for every premium run                                                  | 100% of full-harness runs produce cost and wall-clock time entries in observability output                | SRC-0001          |
| NFR-0004 | Maintainability | Calibration assets must be independently updatable without code changes                                  | Calibration pack update requires zero source code modifications; file-based hot reload supported          | SRC-0001,SRC-0005 |
| NFR-0005 | Compatibility   | Standard path must have zero performance regression from premium path addition                           | Standard path execution time delta < 1% compared to v1.7.5 baseline                                     | SRC-0001          |
| NFR-0006 | Security        | External command/provider surface must be reviewed for injection risks                                   | Generic command provider input is sanitized; no shell expansion of user-supplied arguments                | SRC-0001          |
| NFR-0007 | Operability     | Long-running handoff artifacts must be resumable after session interruption                              | Handoff artifact loads successfully and resumes from correct iteration in > 99% of interruption scenarios | SRC-0001          |
