# 05 Examples

## EX-0008-0001: Volume Estimate Table Output

- BR-Ref: BR-0008-0003
- Given a spec with 5 US, 3 CON-API, and 10 TC
- When TestVolumeEstimator runs
- Then the table shows: E2E Raw=5 Signal=E2E_s, API Raw=3 Signal=API_s, Integration Raw=10 Signal=INT_s

## EX-0008-0002: E2E Annotation Presence

- BR-Ref: BR-0008-0001
- Given 対象 spec with US-0001-0001
- When E2E test is generated at `tests/e2e/spec0001.test.ts`
- Then the file contains `QFAI:SPEC-0001:US-0001-0001`

## EX-0008-0003: Forbidden TC in E2E

- BR-Ref: BR-0008-0002
- Given an E2E test file `tests/e2e/spec0001.test.ts`
- When it contains `QFAI:SPEC-0001:a TC annotation`
- Then validation reports an error (forbidden reference)

## EX-0008-0004: API Annotation Without TC

- BR-Ref: BR-0008-0001, BR-0008-0002
- Given 対象 spec with CON-API-0001
- When API test is generated at `tests/api/spec0001.test.ts`
- Then the file contains `QFAI:CON-API-0001` and does NOT contain any `TC-` annotation

## EX-0008-0005: Reviewer Returning REVISE

- BR-Ref: BR-0008-0004
- Given ATDD output with US-0001-0002 uncovered
- When the independent Reviewer evaluates coverage
- Then the Reviewer returns REVISE with finding "US-0001-0002 missing E2E coverage"

## EX-0008-0006: Coverage Placeholder for BR-0008-0005

- BR-Ref: BR-0008-0005
- Given the consolidated rule BR-0008-0005
- When layer coverage is evaluated
- Then at least one example exists for BR-0008-0005

## EX-0008-0007: Coverage Placeholder for BR-0008-0006

- BR-Ref: BR-0008-0006
- Given the consolidated rule BR-0008-0006
- When layer coverage is evaluated
- Then at least one example exists for BR-0008-0006

## EX-0008-0008: Coverage Depth Matrix Output

- BR-Ref: BR-0008-0007
- Given a spec with US-0001-0001 (normal-path test only) and US-0001-0002 (normal + error tests)
- When the test-design-analyst produces the Coverage Depth Matrix
- Then US-0001-0001 shows ❌ for Error path and the overall Status is incomplete
- And US-0001-0002 shows ✅ for Normal and Error paths

## EX-0008-0009: Scaffold Emits Skeleton with TODO and Refs

- BR-Ref: BR-0008-0008
- Given a target spec `<spec-id>` whose test-case file defines a case realizing US-0008-0002, and an empty `tests/atdd/<spec-id>/` directory
- When `qfai atdd scaffold --spec <spec-id>` runs
- Then a `tests/atdd/<spec-id>/<TC-ID>.test.ts` file is created importing the test framework, containing a `// TODO: implement assertion for <TC-ID>` marker and a comment referencing US-0008-0002
- And `qfai validate` reports `D-SCAFFOLD-PLACEHOLDER` (warning) for that file

## EX-0008-0010: Scaffold Idempotency and 3-Cycle Escalation

- BR-Ref: BR-0008-0009
- Given a generated `<TC-ID-A>.test.ts` whose TODO has been replaced with a real `expect(...)` assertion, and a sibling `<TC-ID-B>.test.ts` whose `// TODO: implement assertion` marker remains
- When `qfai atdd scaffold --spec <spec-id>` is re-run, then the filled `<TC-ID-A>` file is left untouched (non-TODO content preserved)
- And when `qfai validate` is run 3 times with the default `atdd.scaffoldEscalateCycles: 3` and the `<TC-ID-B>` TODO still present, then `D-SCAFFOLD-PLACEHOLDER` is warning on cycles 1–2 and error on cycle 3 (DR-0272)

## EX-0008-0011: Seven Rules Plus Companion Rule Present and Linked

- BR-Ref: BR-0008-0010
- Given the credential-reuse guidance artifact under the `/qfai-atdd` skill's `references/` directory
- When a reader scans it for the rule set
- Then all seven session-reuse rules appear as distinct statements, and the companion rule ("a caller-injected environment identifier forbids the harness from provisioning or tearing that environment down") appears in the same artifact
- And the skill entry point contains a link to the artifact

## EX-0008-0012: Backend Deny-List Scan Returns Zero and Vocabulary Is Unchanged

- BR-Ref: BR-0008-0011
- Given the credential-reuse guidance artifact
- When it is scanned for browser-backend names, install commands and version pins
- Then the match count is zero, and any worked example carries the "one illustration among possible backends" framing
- And the layer token set, the allowed annotation forms and the ATDD finding-code set are unchanged from baseline — no new layer, no new annotation token, no new finding code, no validator

## EX-0008-0013: Script-Naming Rule Recorded Without Adoption

- BR-Ref: BR-0008-0012
- Given the credential-reuse guidance artifact's scope statement
- When it is read
- Then the credential-class script-naming rule appears as adopter guidance, and the artifact states that QFAI keeps its own script names and that QFAI's own suite has zero credentials so the rules are not dogfooded here
- And the scope statement obliges E2E / API / Integration only, with no unit or component obligation

## EX-0008-0014: A Worker Does Only Its Work Order, and an Unaddressed Request Is Passed On

- BR-Ref: BR-0008-0013
- Given workflow mode `active` and a work order for run `run-20260924045712999`, stage instance `acceptance-1` and operation `author-acceptance-tests`, bound to two ledger rows of one spec
- When `/qfai-atdd` receives it and the run, stage instance and work-order IDs all match the issued order
- Then it writes acceptance tests for those two rows only, and says nothing to the operator
- And when it is selected in the same mode with no work order and not by name, it edits nothing and passes the request to `qfai-run`
- And `qfai-atdd/SKILL.md` holds exactly one line citing `references/orchestrated-mode.md`

## EX-0008-0015: The ATDD Operations Table

- BR-Ref: BR-0008-0014
- Given `qfai-atdd/references/orchestrated-mode.md`
- When the first table under its `## Operations` heading is read
- Then the `Operation` column holds exactly `author-acceptance-tests` and `test-fix`, one backticked ID per cell, and no other operation

## EX-0008-0016: An Assertion Failure Is RED, a Timeout Is Not

- BR-Ref: BR-0008-0015
- Given two acceptance tests written for the work order: test A fails at `expect(response.status).toBe(201)` because the route answers 404, and test B never reaches its assertion because the test server does not answer within the harness timeout
- When the stage returns its result
- Then test A is reported with `testObservation` `expected_red` and `red` `{ testId: A, failureKind: assertion }`
- And test B is reported `unrun`, or `blocked` where the environment is at fault, with failure kind `timeout`, and never as `expected_red`
- And a `collection`, `import` or `startup` failure is reported the same way as test B

## EX-0008-0017: Cross-Spec Obligations Become One Debt Each

- BR-Ref: BR-0008-0016
- Given the ATDD gate reaches `PASS with cross-spec obligations`, with two API obligations whose owning spec is a sibling spec
- When the stage returns its result
- Then the outcome is `accepted_with_debt` and `debts` holds two entries, each naming its `owningSpec` and its `resolvingOwner`
- And a residual finding for which no owner can be named is not listed in `debts`

## EX-0008-0018: A Missing Route Takes the Seam Round Trip Before RED

- BR-Ref: BR-0008-0017
- Given acceptance test `orders::creates an order` fails with `Cannot find module "../src/routes/orders"` before it reaches `expect(response.status).toBe(201)`
- When the ATDD stage returns
- Then the outcome is `needs_repair` with `seamRequest` `{ targetTestId: orders::creates an order }`
- And after the seam-only result is accepted, the same stage instance `acceptance-1` runs again as attempt 2, the test fails at `expect(response.status).toBe(201)`, and the result reports `expected_red` with failure kind `assertion`
- And only that accepted result hands the full implementation on; no second run starts, and the RED is recorded through the skill's existing red-provenance branch

## EX-0008-0019: The Snapshot Is Reused, the Layer Decision Is Not

- BR-Ref: BR-0008-0018
- Given an active run whose shared preflight snapshot is `valid` for the inputs it covers, and a spec whose `06_Test-Cases.md` and `tdd/test-list.md` name one `US-*`, one `CON-API-*` and one `L3` test case
- When the ATDD stage starts
- Then it takes the inputs the snapshot covers from the snapshot
- And it decides from the current `06_Test-Cases.md` and `tdd/test-list.md`, not from the snapshot, that the story needs an E2E test, the contract an API test and the `L3` case an Integration test

## EX-0008-0020: A Flaky Wait Is Fixed and the Row Keeps Its Status

- BR-Ref: BR-0008-0019
- Given a ledger row with `Layer` `Integration`, `TC-Refs` naming one `L3` test case, `Status` `done` and an empty `Boundary`, and a diagnosis verdict `defective-test`: the test waits a fixed 500 ms instead of waiting for the response
- When `/qfai-atdd` serves the `test-fix` work order and replaces the fixed wait with a wait on the response
- Then the result's `testFix` names the same AC in `citedBefore` and `citedAfter`, a `reviewRef` from an independent reviewer and a `rerunRef` for the re-run
- And the row still reads `Status` `done`, with the same `TC-Refs`, `Layer` and `Boundary`; its `Selector` may change where the test was renamed
- And the row's own `### TDD-NNNN` evidence section gains a new `#### Round N` block carrying `Round N: Revision` for the fixed tree, and the earlier rounds stay as they were

## EX-0008-0021: A Fix That Would Cite Another AC Goes to SDD

- BR-Ref: BR-0008-0020
- Given a test fix that would change `expect(response.status).toBe(201)` to `toBe(200)`, after which the expectation would cite a different AC than before
- When the ATDD stage returns
- Then the outcome is `needs_repair`, and `debts` lists that finding with `resolvingOwner` `qfai-sdd`
- And no result with an accepted `testFix` is returned

## EX-0008-0022: Which Rows ATDD Takes a Test Fix For

- BR-Ref: BR-0008-0021
- Given five defective rows: an `E2E` row; an `API` row; an `Integration` row whose `TC-Refs` name one `L3` and one `L2` test case; an `Integration` row whose `TC-Refs` name one `L1` and one `L2` test case; and a `Unit` row
- When the `test_fix` stage is assigned
- Then `/qfai-atdd` serves the work order for the first three rows
- And it serves none for the `Integration` row with only `L1` and `L2` test cases, or for the `Unit` row
