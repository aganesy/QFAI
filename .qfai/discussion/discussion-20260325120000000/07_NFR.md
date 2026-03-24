# 07_NFR

## Categories

| Category        | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| performance     | Execution speed and resource usage of validators             |
| compatibility   | Behavior with existing packs and configurations              |
| usability       | Quality and actionability of error messages                  |
| maintainability | Test coverage, code structure, and documentation hygiene     |
| operability     | Documentation kept current with implementation in same PR    |

## Requirements

| NFR-ID   | Category        | Title                              | Target                                                                                                                               | Measurement                                                                                                             | Source              | Priority |
| -------- | --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- |
| NFR-0001 | performance     | Validator performance budget       | All new v1.7.0 validators combined must not add more than 500ms to the total `qfai validate` execution time on a representative 15-file discussion pack | Benchmark: run `qfai validate --timing` on a 15-file pack with and without v1.7.0 validators; delta must be ≤ 500ms    | SRC-0001, SRC-0004 | must     |
| NFR-0002 | compatibility   | Backward compatibility — non-UI packs | Packs that do not contain UI-bearing keywords or a DDP section must produce exactly zero new issues after v1.7.0 is deployed. No existing waiver files may need modification to suppress new v1.7.0 issues on non-UI packs. | All existing non-UI pack fixtures in the test suite pass with zero new `error` or `warning` issues produced by v1.7.0 validators | SRC-0004, SRC-0005 | must     |
| NFR-0003 | usability       | Error messages are actionable       | Every `error` emitted by a v1.7.0 validator must include: (1) what field or section failed, (2) why it is required (one-sentence rationale), and (3) what the author must do to fix it. Generic messages such as "field missing" without context are not acceptable. | Peer review of error message text for all new `issue()` calls; each message reviewed against the three-part checklist  | SRC-0004, SRC-0005 | must     |
| NFR-0004 | maintainability | Test coverage for new validators   | Every new validator function introduced in v1.7.0 must have at least one unit test that exercises the passing path and at least one unit test that exercises each distinct failing path. Branch coverage for new validator code must be 100%. | `pnpm test` passes; vitest coverage report shows 100% branch coverage on all new validator source files                | SRC-0001, SRC-0004 | must     |
| NFR-0005 | operability     | Documentation updated in same PR   | `SKILL.md` and all affected template assets (`03_Story-Workshop.md`, `04_Sources.md`, `14_Review-Request.md`, `99_delta.md`) must be updated in the same pull request that introduces the new validators. No separate documentation PR is acceptable. | PR checklist: diff includes both validator code changes and documentation changes; reviewer confirms both are present    | SRC-0001, SRC-0004, SRC-0007 | must     |
