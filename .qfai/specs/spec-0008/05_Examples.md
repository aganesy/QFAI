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
