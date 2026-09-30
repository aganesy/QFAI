# Test Layers Policy

This document defines where a business-flow, acceptance-criterion, or example
obligation is tested. `npx qfai validate` checks the annotations against the
story tree and the selected test files. The project's Standard commands in
`.qfai/spec/03_contract/tech.md` are the only command source.

## Layer vocabulary crosswalk

| Code | Layer       | Tag                 | Typical location            | Story-tree obligation       |
| ---- | ----------- | ------------------- | --------------------------- | --------------------------- |
| L1   | Unit        | `layer-unit`        | project convention          | EX                          |
| L2   | Component   | `layer-component`   | project convention          | EX                          |
| L3   | Integration | `layer-integration` | `<testsDir>/integration/**` | AC, and EX when appropriate |
| L4   | API         | `layer-api`         | `<testsDir>/api/**`         | AC, and EX when appropriate |
| L5   | E2E         | `layer-e2e`         | `<testsDir>/e2e/**`         | BF                          |

`<testsDir>` is `paths.testsDir` in `qfai.config.yaml`. The default is
`tests`. Unit and component locations follow the project's conventions.
`validation.traceability.testFileGlobs` selects test files across these
locations; a file outside the selection does not establish coverage.

## Layer definitions

### L1 Unit

Exercise one unit's observable decisions without real infrastructure. A
`QFAI:EX-NNNN-NNNN-NN` annotation links a behavioral unit test to its example.

### L2 Component

Exercise collaboration through a fixture or in-memory adapter. Use an EX
annotation for the example the component test proves.

### L3 Integration

Exercise actual collaboration with infrastructure or components within a
service. An AC annotation counts here when the test observes the criterion.
An EX annotation may also count when the test proves a concrete example.

### L4 API

Exercise a service boundary, including success, error, and authorization
behavior. An AC annotation counts here. Use EX annotations for concrete
examples proved by an API test.

### L5 E2E

Exercise a user-visible journey across its relevant boundaries. A BF
annotation counts here. AC and EX annotations do not belong in E2E tests. A
flow may need more than one journey test to prove its branches; one annotation
is not a substitute for the required assertions.

## Annotation routing

| Obligation           | Annotation             | Required test layer        |
| -------------------- | ---------------------- | -------------------------- |
| Business flow        | `QFAI:BF-NNNN`         | E2E                        |
| Acceptance criterion | `QFAI:AC-NNNN-NNNN-NN` | Integration or API         |
| Example              | `QFAI:EX-NNNN-NNNN-NN` | Selected non-E2E test file |

These are the only coverage annotation kinds. `/qfai-atdd` authors the BF
and AC acceptance tests. `/qfai-implement` selects an uncovered EX and
writes the smallest behavioral test that proves it, usually in a unit or
component layer. A test may carry more than one annotation only when its
assertions independently prove every named obligation.

A misplaced annotation is not coverage. A missing or invalid story-tree ID
is not coverage. An annotation-only file, skipped placeholder, or assertion
that cannot fail for the intended behavior is not behavioral proof. Check
`.qfai/report/validate.json#issues` by finding code and inspect the test
it names. An unreadable or truncated test scan cannot certify absence of
remaining obligations.

## Selecting a test layer

Choose the smallest boundary that can observe the behavior. A pure decision
usually belongs in Unit; a port collaboration in Component; real
infrastructure in Integration; a service contract in API; and a user journey
in E2E. Use AC and BF tests for their named acceptance boundaries. A concrete
EX may need an additional focused test even when its parent AC or BF is
covered. Keep independently observable cases in separate tests so a failure
points to the behavior that changed.

## Test stub detection

A test is incomplete if its body contains a placeholder, skips the
assertion, or cannot observe the intended behavior. Validation inspects
selected test files and reports stub findings. Repair the test and rerun the
relevant Standard command and validation before claiming coverage.

## CI lane mapping

This section adds no layer token or layer heading and does not activate
per-level routing. Place test annotations only in paths scanned by
`validation.traceability.testFileGlobs`.

The project chooses its CI job names. Route Unit and Component tests to a
fast test job, Integration and API tests to jobs with their required services,
and E2E tests to a journey job. The full verification gate runs every
applicable lane and `npx qfai validate --profile verify --fail-on error`.
A missing lane or an unrun command is UNRUN, not PASS. Record exact commands,
results, and revisions in the stage evidence.

## Anti-patterns

- Do not convert all obligations into E2E or one integration module merely to
  raise a coverage count.
- Do not use an annotation without a behavioral assertion.
- Do not change a test's layer label to hide a missing BF or AC test.
- Do not claim completion from a partial or failed scan.
- Do not duplicate the Standard commands outside `03_contract/tech.md`.
