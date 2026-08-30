# 04 Business Rules

## BR-0008-0001: Layer-Annotation Mapping

- AC-Refs: AC-0008-0001

- E2E tests (`tests/e2e/**`) MUST use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration tests (`tests/integration/**`) MUST use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API tests (`tests/api/**`) MUST use `QFAI:CON-API-XXXX` annotations.

## BR-0008-0002: Forbidden Cross-Layer References

- AC-Refs: AC-0008-0002

- `tests/api/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.
- `tests/e2e/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.

## BR-0008-0003: Volume Signals Are Not Gates

- AC-Refs: AC-0008-0003

- Volume floors and ratios are planning signals only, not completion gates.
- Coverage obligations (all required US/TC/CON-API covered) are the gate.

## BR-0008-0004: Completion Separation

- AC-Refs: AC-0008-0004

- Implementation and completion approval MUST be separate roles.
- The Reviewer MUST be non-edit (returns only PASS or REVISE).

## BR-0008-0005: Unknown Reference Treatment

- AC-Refs: AC-0008-0005

- Unknown references (US/TC/CON-API not declared in spec) MUST be treated as errors.

## BR-0008-0006: Evidence File Requirement

- AC-Refs: AC-0008-0006

- Evidence file MUST exist under `.qfai/evidence/` and MUST NOT be committed to git.

## BR-0008-0007: Normal-Path-Only Test Cases Are Incomplete

- AC-Refs: AC-0008-0009

- A US/TC that has only normal-path (happy-path) test cases is considered incomplete.
- Each US/TC MUST have at minimum one normal-path AND one error/boundary/edge test case.
- The Coverage Depth Matrix MUST be produced by `test-design-analyst` and verified by `qa-gatekeeper`.

## BR-0008-0008: ATDD Scaffold Skeleton Shape and Placeholder Lifecycle

- AC-Refs: AC-0008-0010

- `qfai atdd scaffold --spec spec-NNNN` MUST read the spec test_cases and emit one `tests/atdd/spec-NNNN/<TC-ID>.test.*` file per TC (framework path appropriate to the project).
- Each emitted skeleton MUST import the test-framework primitives, contain `// TODO: implement assertion for <TC-ID>`, and reference the related `US-*` / `CON-API-*` via comments.
- `qfai validate` MUST emit `D-SCAFFOLD-PLACEHOLDER` (severity warning) for any skeleton whose `// TODO: implement assertion for <TC-ID>` is still present.

## BR-0008-0009: ATDD Scaffold Idempotency and Warning→Error Escalation

- AC-Refs: AC-0008-0011

- Re-running scaffold MUST NOT overwrite existing non-TODO content (idempotent); only files still carrying the TODO marker (or absent files) may be (re)written.
- `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error after 3 `qfai validate` cycles with the placeholder unremoved (DR-0272), configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`. The default of 3 gives an operator a normal red→green TDD turnaround before the placeholder hard-blocks completion-claim.

## BR-0008-0010: Worker-Scoped Session-Reuse Rule Set

- AC-Refs: AC-0008-0012

- The guidance MUST state all seven rules as distinct statements: (1) never sign in per test; (2) never share one account across parallel workers; (3) key the cached session by the pair of worker index and actor; (4) tear the cache down at worker exit; (5) re-authenticate and rewrite the cache when a restored session is rejected; (6) a test that mutates its own account creates a dedicated one; (7) test-level parallelism costs more workers, not more sign-ins.
- The guidance MUST state the companion rule in the same artifact: when an environment identifier is injected by the caller, the harness MUST NOT provision or tear down that environment.
- The transferable asset is the rule set, not a fixture. The guidance is authored as a `/qfai-atdd` reference artifact under the skill's `references/` directory and MUST be cross-linked from the skill entry point, so the rules are reachable without reading the whole skill.

## BR-0008-0011: Backend-Agnostic, Vocabulary-Frozen Prose

- AC-Refs: AC-0008-0013

- The guidance MUST NOT name a browser backend, MUST NOT contain an install command, and MUST NOT pin a version. A worked example is permitted only when presented as one illustration among possible backends, with nothing named, installed or pinned.
- The guidance is prose only: it MUST NOT introduce a validator, a finding code, a test layer or an annotation token. The layer token set, the allowed annotation forms and the ATDD finding-code set stay unchanged from baseline — the layer vocabulary does not grow.
- The guidance artifact ships under the distributed asset tree, so it MUST carry no internal spec / capability / decision / open-question identifier and no version marker beyond the canonical package version.

## BR-0008-0012: Script-Naming Rule Is Adopter-Only and Layer-Scoped

- AC-Refs: AC-0008-0014

- A credential-free lane and a credentialed lane MUST be reachable by different script names, so a lane that structurally cannot touch the network stays distinguishable from one that must. This is recorded as adopter guidance; QFAI keeps its own script names and adopts no renaming.
- The guidance MUST state that QFAI's own suite has zero credentials and that none of this is dogfooded here, rather than implying the rules were verified by execution in this repository.
- The guidance obliges the E2E / API / Integration layers only. It MUST NOT introduce a unit or component obligation — unit and component tests belong to `/qfai-implement` (RJ-0008-0001).
