# Test List -- spec-0002

## Execution Ledger

| TDD-ID   | TC-Refs      | Layer       | Test file                                                  | Selector                                    | Status | DR-ID | Evidence                                      |
| -------- | ------------ | ----------- | ---------------------------------------------------------- | ------------------------------------------- | ------ | ----- | --------------------------------------------- |
| TDD-0001 | TC-0002-0008 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | detects HTML style tag as UI-bearing        | done   |       | Migrated from spec-0023 TDD-0001. GREEN: pass |
| TDD-0002 | TC-0002-0009 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | classifies plain text pack as non-UI        | done   |       | Migrated from spec-0023 TDD-0003. GREEN: pass |
| TDD-0003 | TC-0002-0011 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-019 pass - DDS present             | done   |       | Migrated from spec-0023 TDD-0005. GREEN: pass |
| TDD-0004 | TC-0002-0012 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-019 fail - DDS absent              | done   |       | Migrated from spec-0023 TDD-0006. GREEN: pass |
| TDD-0005 | TC-0002-0013 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-020 pass - 2 options               | done   |       | Migrated from spec-0023 TDD-0008. GREEN: pass |
| TDD-0006 | TC-0002-0014 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-021 pass - anchor selected         | done   |       | Migrated from spec-0023 TDD-0010. GREEN: pass |
| TDD-0007 | TC-0002-0015 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-022 pass - 3 fields populated      | done   |       | Migrated from spec-0023 TDD-0012. GREEN: pass |
| TDD-0008 | TC-0002-0016 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-022 fail - rejected_points missing | done   |       | Migrated from spec-0023 TDD-0013. GREEN: pass |
| TDD-0009 | TC-0002-0028 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-023 pass - primary CTA             | done   |       | Migrated from spec-0023 TDD-0017. GREEN: pass |
| TDD-0010 | TC-0002-0029 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-024 pass - 4 states                | done   |       | Migrated from spec-0023 TDD-0019. GREEN: pass |
| TDD-0011 | TC-0002-0030 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | QFAI-DDP-025 pass - anti-goal               | done   |       | Migrated from spec-0023 TDD-0021. GREEN: pass |
| TDD-0012 | TC-0002-0031 | Unit        | packages/qfai/tests/core/discussionDesignHardening.test.ts | all DDS validators emit severity=error      | done   |       | Migrated from spec-0023 TDD-0023. GREEN: pass |
| TDD-0013 | TC-0002-0010 | Integration | packages/qfai/tests/integration/uixDetection.test.ts       | explicit non-ui overrides content signals   | done   |       | Migrated from spec-0023 TDD-0036. GREEN: pass |
