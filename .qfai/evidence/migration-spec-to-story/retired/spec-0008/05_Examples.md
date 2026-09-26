# 05 Examples

## EX-0008-0001: Volume Estimate Table Output

- BR-Ref: BR-0008-0003
- Given a spec with 5 US, 3 CON-API, and 10 TC
- When TestVolumeEstimator runs
- Then the table shows: E2E Raw=5 Signal=E2E_s, API Raw=3 Signal=API_s, Integration Raw=10 Signal=INT_s
- On the story tree: given a scope of 2 BFs whose stories hold 7 ACs, when TestVolumeEstimator runs, then the table shows E2E Raw=2 and Integration/API Raw=7

## EX-0008-0002: E2E Annotation Presence

- BR-Ref: BR-0008-0001
- Given 対象 spec with US-0001-0001
- When E2E test is generated at `tests/e2e/spec0001.test.ts`
- Then the file contains `QFAI:SPEC-0001:US-0001-0001`
- On the story tree: given a flow `BF-NNNN` in scope, when its E2E test is generated under `<testsDir>/e2e/`, then the file carries `QFAI:BF-NNNN`

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
- On the story tree: given ATDD output in which the flow `BF-NNNN` has no E2E test, when the independent Reviewer evaluates coverage, then the Reviewer returns REVISE with a finding naming `BF-NNNN` as missing E2E coverage

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
- On the story tree: given an AC `AC-NNNN-NNNN-NN` with only a normal-path test case and a flow `BF-NNNN` with normal and error test cases, when the test-design-analyst produces the matrix, then the AC's row shows ❌ for Error path and is incomplete, and the BF's row shows ✅ for Normal and Error paths

## EX-0008-0009: Scaffold Emits Skeleton with TODO and Refs

- BR-Ref: BR-0008-0008
- Given a target spec `<spec-id>` whose test-case file defines a case realizing US-0008-0002, and an empty `tests/atdd/<spec-id>/` directory
- When `qfai atdd scaffold --spec <spec-id>` runs
- Then a `tests/atdd/<spec-id>/<TC-ID>.test.ts` file is created importing the test framework, containing a `// TODO: implement assertion for <TC-ID>` marker and a comment referencing US-0008-0002
- And `qfai validate` reports `D-SCAFFOLD-PLACEHOLDER` (warning) for that file
- On the story tree: given a story `US-NNNN-NNNN` with two ACs and no existing skeletons, when `qfai atdd scaffold --story US-NNNN-NNNN` runs, then one file `<testsDir>/integration/<US-ID>/<AC-ID>.test.ts` is written per AC, each carrying `QFAI:AC-NNNN-NNNN-NN` for its own AC, and `qfai validate` reports `D-SCAFFOLD-PLACEHOLDER` (warning) keyed by each AC ID

## EX-0008-0010: Scaffold Idempotency and 3-Cycle Escalation

- BR-Ref: BR-0008-0009
- Given two AC skeletons of story `US-NNNN-NNNN`, one filled with a real assertion and one still carrying its placeholder
- When `qfai atdd scaffold --story US-NNNN-NNNN` is re-run and `qfai validate` runs three times while the placeholder remains
- Then neither existing file is overwritten, no new file is written, and `D-SCAFFOLD-PLACEHOLDER` is a warning for the unfilled AC ID on validation cycles 1 and 2 and an error on cycle 3 (the default `atdd.scaffoldEscalateCycles: 3`)
- And a flow skeleton written by `--flow BF-NNNN` uses its BF ID for the same escalation rule

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

## EX-0008-0014: Scaffold Rejects a Missing, Doubled or Unresolvable Option

- BR-Ref: BR-0008-0008
- Given a project on the story tree that defines the flow `BF-NNNN` and the story `US-NNNN-NNNN`, and an empty `<testsDir>`
- When `qfai atdd scaffold` runs five times: with no option, with `--spec spec-NNNN` alone, with both `--story US-NNNN-NNNN` and `--flow BF-NNNN`, with the malformed `--story US-12`, and with a well-formed `--flow` ID whose flow number the tree does not define
- Then each run exits 2, the `--spec` run with a message naming `--story` and `--flow`, and `<testsDir>` is still empty afterwards

## EX-0008-0015: Scaffold Emits One Business-Flow Skeleton

- BR-Ref: BR-0008-0013
- Given a project on the story tree that defines the flow `BF-NNNN`, and no file under `<testsDir>/e2e/`
- When `qfai atdd scaffold --flow BF-NNNN` runs
- Then exactly one file `<testsDir>/e2e/<BF-ID>.test.ts` is written, carrying `QFAI:BF-NNNN`, and `qfai validate` reports `D-SCAFFOLD-PLACEHOLDER` (warning) keyed by the BF ID
- And when the same command runs again, it writes nothing and the file is unchanged

## EX-0008-0016: The Completion Gate Runs Per Business Flow

- BR-Ref: BR-0008-0014
- Given a project on the story tree and a `/qfai-atdd` invocation that owns the flow `BF-NNNN`
- When the invocation reaches its completion gate
- Then it runs `qfai validate --profile atdd --fail-on error --flow BF-NNNN`, and it does not pass `--spec <spec-id>`, which exits 2 on that tree

## EX-0008-0017: An Annotation Naming an Undefined ID Is an Error

- BR-Ref: BR-0008-0005
- Given a project on the story tree with one flow that holds one story with its ACs and EXs, and three test files: an E2E test carrying `QFAI:BF-NNNN` with a flow number the tree does not define, an integration test carrying `QFAI:AC-NNNN-NNNN-NN` with a tail no AC of that story has, and a test carrying `QFAI:EX-NNNN-NNNN-NN` for an example the story does not define
- When `qfai validate` reads the test trees
- Then each of the three annotations is reported as an error naming the file and the ID, and an annotation naming a defined ID raises no such finding

## EX-0008-0018: The Coverage Depth Matrix and ATDD Evidence Are Keyed by Business Flow

- BR-Ref: BR-0008-0007
- Given a project on the story tree with the flow `BF-NNNN`, whose story `US-NNNN-NNNN` holds the criterion `AC-NNNN-NNNN-NN` and the example `EX-NNNN-NNNN-NN`
- When `/qfai-atdd` runs for that flow and the test-design-analyst produces the Coverage Depth Matrix
- Then the matrix is written to `.qfai/evidence/coverage-depth-<BF-ID>.md` and the ATDD evidence to `.qfai/evidence/atdd-<BF-ID>.md`, with `<BF-ID>` naming that flow
- And the matrix holds one row for each of the story, the criterion and the example, keyed by its ID, and no `coverage-depth-<spec-id>.md` or `atdd-<spec-id>.md` file is written
