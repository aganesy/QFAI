# 02 User Stories

## US Catalog

- US-0008-0001: ATDD Test Volume Estimation
- US-0008-0002: E2E Acceptance Test Implementation
- US-0008-0003: API Acceptance Test Implementation
- US-0008-0004: Integration Acceptance Test Implementation
- US-0008-0005: ATDD Reviewer Gate
- US-0008-0006: Test Case Quality Depth Verification
- US-0008-0007: ATDD Scaffold Bulk Skeleton Generation
- US-0008-0008: Worker-Scoped Credential-Reuse Guidance

## US-0008-0001: ATDD Test Volume Estimation

As a QA Engineer, I want to compute a test volume estimate from spec obligations (US/TC/CON-API counts), so that I can plan ATDD coverage systematically. On the story tree, I want the estimate computed from the business flows (BF) and acceptance criteria (AC) in scope instead.

## US-0008-0002: E2E Acceptance Test Implementation

As a QA Engineer, I want E2E tests generated for all required US with `QFAI:SPEC-XXXX:US-YYYY` annotations, so that user story coverage is traceable and verifiable. On the story tree, I want one E2E test for each business flow in scope, carrying `QFAI:BF-NNNN`, so that business-flow coverage is traceable and verifiable.

## US-0008-0003: API Acceptance Test Implementation

As a QA Engineer, I want API tests generated for all required CON-API with `QFAI:CON-API-XXXX` annotations, so that contract obligations are verifiable without TC annotations.

## US-0008-0004: Integration Acceptance Test Implementation

As a QA Engineer, I want Integration tests generated for all required TC with `QFAI:SPEC-XXXX:TC-YYYY` annotations, so that test case coverage is traceable. On the story tree, I want an integration or API test for every AC in scope, carrying `QFAI:AC-NNNN-NNNN-NN`, so that acceptance-criterion coverage is traceable.

## US-0008-0005: ATDD Reviewer Gate

As a project lead, I want an independent Reviewer to validate coverage obligations, forbidden references, and evidence completeness before ATDD completion, so that no acceptance test gaps survive undetected. On the story tree, I want the scoped completion gate to run per business flow (`--flow BF-NNNN`), so that a run is judged on the flow it owns.

## US-0008-0006: Test Case Quality Depth Verification

As a QA Engineer, I want test cases evaluated for quality depth (boundary values, error paths, edge cases, equivalence partitioning) in addition to traceability coverage, so that normal-path-only test suites are identified as incomplete. On the story tree, I want that depth evaluated for each BF and AC.

## US-0008-0007: ATDD Scaffold Bulk Skeleton Generation

As a QA Engineer, I want `qfai atdd scaffold --spec spec-NNNN` to read the spec test*cases and emit one `tests/atdd/spec-NNNN/<TC-ID>.test.*`skeleton per TC (with framework primitives, a`// TODO: implement assertion for <TC-ID>`marker, and comment references to related US-* / CON-API-\_), so that I can bootstrap acceptance-test files in bulk without hand-creating each file — while`qfai validate`flags any unfilled placeholder via`D-SCAFFOLD-PLACEHOLDER` (warning, escalating to error after 3 validate cycles per DR-0272) and re-running the scaffold never overwrites my filled-in (non-TODO) content. On the story tree, I want `qfai atdd scaffold (--story US-NNNN-NNNN | --flow BF-NNNN)` to write one skeleton per AC of the story, or one E2E skeleton for the flow, never overwriting an existing file, with `D-SCAFFOLD-PLACEHOLDER` keyed by the AC or BF ID.

## US-0008-0008: Worker-Scoped Credential-Reuse Guidance

As a QA Engineer running acceptance tests in parallel, I want `/qfai-atdd` to carry backend-agnostic guidance on reusing one authenticated session per parallel worker — the seven session-reuse rules, the companion rule that a caller-injected environment identifier forbids the harness from provisioning or tearing that environment down, and the credential-class script-naming rule as adopter guidance — so that I can stop authenticating once per test without the guidance picking a browser backend for me, and without QFAI adding a validator, a finding code, a test layer or an annotation token to police it.
