# test-list.md -- spec-0004

Consolidated from old spec-0002 tests.

| TDD-ID   | TC-Refs      | Layer       | Test file                                             | Selector                                 | Status |
| -------- | ------------ | ----------- | ----------------------------------------------------- | ---------------------------------------- | ------ |
| TDD-0001 | TC-0004-0001 | integration | packages/qfai/tests/core/validate.test.ts             | Full validator execution                 | done   |
| TDD-0002 | TC-0004-0002 | integration | packages/qfai/tests/core/validate.test.ts             | Default full phase                       | done   |
| TDD-0003 | TC-0004-0003 | unit        | packages/qfai/tests/cli/args.test.ts                  | --fail-on error with warnings only       | done   |
| TDD-0004 | TC-0004-0004 | unit        | packages/qfai/tests/cli/args.test.ts                  | --fail-on warning with warnings          | done   |
| TDD-0005 | TC-0004-0005 | integration | packages/qfai/tests/cli/validate.test.ts              | --format github annotations              | done   |
| TDD-0006 | TC-0004-0006 | integration | packages/qfai/tests/core/validate.test.ts             | validate.json output                     | done   |
| TDD-0007 | TC-0004-0007 | integration | packages/qfai/tests/core/validate.test.ts             | Run log generation                       | done   |
| TDD-0008 | TC-0004-0008 | integration | packages/qfai/tests/core/validate.test.ts             | Waiver suppress                          | done   |
| TDD-0009 | TC-0004-0009 | integration | packages/qfai/tests/core/validate.test.ts             | Missing spec fileset detection           | done   |
| TDD-0010 | TC-0004-0010 | integration | packages/qfai/tests/core/validate.test.ts             | ID format validation                     | done   |
| TDD-0011 | TC-0004-0011 | integration | packages/qfai/tests/core/validate.test.ts             | Traceability edge missing                | done   |
| TDD-0012 | TC-0004-0014 | integration | packages/qfai/tests/core/validate.test.ts             | Idempotency check                        | done   |
| TDD-0013 | TC-0004-0015 | integration | packages/qfai/tests/core/validate.test.ts             | Phase guard refinement block             | done   |
