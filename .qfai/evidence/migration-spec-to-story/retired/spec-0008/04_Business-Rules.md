# 04 Business Rules

## BR-0008-0001: Layer-Annotation Mapping

- AC-Refs: AC-0008-0001

- E2E tests (`tests/e2e/**`) MUST use `QFAI:SPEC-XXXX:US-YYYY` annotations.
- Integration tests (`tests/integration/**`) MUST use `QFAI:SPEC-XXXX:TC-YYYY` annotations.
- API tests (`tests/api/**`) MUST use `QFAI:CON-API-XXXX` annotations.
- On the story tree, the directory decides the layer. E2E tests (`<testsDir>/e2e/**`) MUST annotate a BF (`QFAI:BF-NNNN`), and integration and API tests (`<testsDir>/integration/**`, `<testsDir>/api/**`) MUST annotate an AC (`QFAI:AC-NNNN-NNNN-NN`), as `.qfai/contracts/cli/qfai-validate.md#what-counts-as-a-test` states.

## BR-0008-0002: Forbidden Cross-Layer References

- AC-Refs: AC-0008-0002

- `tests/api/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.
- `tests/e2e/**` MUST NOT contain `QFAI:SPEC-XXXX:TC-YYYY`.

## BR-0008-0003: Volume Signals Are Not Gates

- AC-Refs: AC-0008-0003

- Volume floors and ratios are planning signals only, not completion gates.
- Coverage obligations (all required US/TC/CON-API covered) are the gate.
- On the story tree, the gate is every BF and AC in scope covered.

## BR-0008-0004: Completion Separation

- AC-Refs: AC-0008-0004

- Implementation and completion approval MUST be separate roles.
- The Reviewer MUST be non-edit (returns only PASS or REVISE).

## BR-0008-0005: Unknown Reference Treatment

- AC-Refs: AC-0008-0005

- Unknown references (US/TC/CON-API not declared in spec) MUST be treated as errors.
- On the story tree, a `QFAI:BF-…`, `QFAI:AC-…` or `QFAI:EX-…` annotation naming an ID the tree does not define MUST be treated as an error (the undeclared-annotation family in `.qfai/contracts/cli/qfai-validate.md#finding-families`).

## BR-0008-0006: Evidence File Requirement

- AC-Refs: AC-0008-0006

- Evidence file MUST exist under `.qfai/evidence/` and MUST NOT be committed to git.

## BR-0008-0007: Normal-Path-Only Test Cases Are Incomplete

- AC-Refs: AC-0008-0009

- A US/TC that has only normal-path (happy-path) test cases is considered incomplete.
- Each US/TC MUST have at minimum one normal-path AND one error/boundary/edge test case.
- The Coverage Depth Matrix MUST be produced by `test-design-analyst` and verified by `qa-gatekeeper`.
- On the story tree, the same holds per BF and AC: a BF or AC that has only normal-path test cases is incomplete, and each MUST have at minimum one normal-path and one error, boundary or edge test case.
- On the story tree, the Coverage Depth Matrix is written per business flow, to `.qfai/evidence/coverage-depth-<BF-ID>.md` in place of `coverage-depth-<spec-id>.md`, with its rows keyed by the flow's US, AC and EX IDs, and the ATDD evidence file is `.qfai/evidence/atdd-<BF-ID>.md` in place of `atdd-<spec-id>.md`.

## BR-0008-0008: ATDD Scaffold Skeleton Shape and Placeholder Lifecycle

- AC-Refs: AC-0008-0010

- `qfai atdd scaffold --spec spec-NNNN` MUST read the spec test_cases and emit one `tests/atdd/spec-NNNN/<TC-ID>.test.*` file per TC (framework path appropriate to the project).
- Each emitted skeleton MUST import the test-framework primitives, contain `// TODO: implement assertion for <TC-ID>`, and reference the related `US-*` / `CON-API-*` via comments.
- `qfai validate` MUST emit `D-SCAFFOLD-PLACEHOLDER` (severity warning) for any skeleton whose `// TODO: implement assertion for <TC-ID>` is still present.
- On the story tree, `qfai atdd scaffold` MUST take exactly one of `--story US-NNNN-NNNN` and `--flow BF-NNNN`. Neither, both, a malformed ID, or an ID the tree does not define MUST exit 2 and write nothing. `--spec` is not accepted: it MUST exit 2 with a message naming `--story` and `--flow`. Exit 1 is kept for a runtime failure reading or writing a file (`.qfai/contracts/cli/qfai-atdd-scaffold.md#story-tree-layout`).
- On the story tree, `--story US-NNNN-NNNN` MUST write one skeleton per AC of the story at `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>`, named in the project's test dialect and carrying `QFAI:AC-NNNN-NNNN-NN`.
- On the story tree, `D-SCAFFOLD-PLACEHOLDER` MUST be keyed by the AC ID for a story skeleton, and `D-SCAFFOLD-FOREIGN-HOME` is not raised (`.qfai/contracts/cli/qfai-validate.md#atdd-scaffold-findings`).

## BR-0008-0009: ATDD Scaffold Idempotency and Warning→Error Escalation

- AC-Refs: AC-0008-0011

- Re-running `--story` or `--flow` MUST NOT overwrite any existing skeleton, whether filled or still carrying a placeholder, and writes nothing new for an existing target.
- `D-SCAFFOLD-PLACEHOLDER` escalates from warning to error after 3 `qfai validate` cycles with the placeholder unremoved (DR-0272), configurable via `qfai.config.yaml#atdd.scaffoldEscalateCycles`. The default of 3 gives an operator a normal red→green TDD turnaround before the placeholder hard-blocks completion-claim.
- The escalation counts consecutive validate cycles per AC ID or BF ID while the placeholder remains; scaffold-run attempts use a separate counter.

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

## BR-0008-0013: ATDD Scaffold Business-Flow Skeleton

- AC-Refs: AC-0008-0015

- On the story tree, `qfai atdd scaffold --flow BF-NNNN` MUST write one skeleton for the flow at `<testsDir>/e2e/<BF-ID>.test.<ext>`, named in the project's test dialect and carrying `QFAI:BF-NNNN` (`.qfai/contracts/cli/qfai-atdd-scaffold.md#story-tree-layout`).
- `D-SCAFFOLD-PLACEHOLDER` MUST be keyed by the BF ID for a flow skeleton (`.qfai/contracts/cli/qfai-validate.md#atdd-scaffold-findings`).
- An existing file MUST NOT be overwritten, and a second run writes nothing.

## BR-0008-0014: Scoped Completion Gate Per Business Flow

- AC-Refs: AC-0008-0016

- On the story tree, the `/qfai-atdd` completion gate MUST be `qfai validate --profile atdd --fail-on error --flow BF-NNNN`, scoped to the flow the invocation owns (`.qfai/contracts/cli/qfai-validate.md#flow-scope`).
- `--spec` exits 2 on the story tree, so the skill MUST NOT use it there.
