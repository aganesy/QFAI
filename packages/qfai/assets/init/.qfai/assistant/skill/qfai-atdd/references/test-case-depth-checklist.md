# Coverage Depth Matrix checklist

Produce one matrix per BF at `.qfai/evidence/coverage-depth-BF-NNNN.md`.
The test-design analyst authors it and qa-gatekeeper verifies it. Include one
row per US, AC and EX in the flow, keyed by ID. A BF-level E2E obligation
is recorded in the matrix header with a Markdown link to an existing E2E test
under configured `paths.testsDir/e2e`. Resolve the link relative to the matrix
file; the target must carry the matching `QFAI:BF-NNNN` annotation. The rows show
normal, error, boundary, special, state-transition and combinatorial
coverage, the relevant layer, oracle and test selector.

| ID  | Layer | Normal | Error | Boundary | Special | State transition | Combinatorial | Oracle and test |
| --- | ----- | ------ | ----- | -------- | ------- | ---------------- | ------------- | --------------- |

In `.qfai/evidence/atdd-BF-NNNN.md`, add a `## Coverage Depth Matrix` section
that links this matrix and reports `✅ N / ⚠️ N / ❌ N`. Count the six coverage
cells (Normal through Combinatorial) in every US, AC and EX row. The reported
totals must match those cells.

Use `✅` for a checked assertion, `⚠️` for a justified partial case and
`❌` for missing coverage. A row with only a normal-path assertion is
incomplete. Explain every `❌` in the matrix with the missing behavior and
its owner. Give every `⚠️` a nonempty reason. The reviewer judges whether
those reasons are sound; neither an annotation nor a planned assertion is a
check.

## What must be scored

Score each declared valid boundary and every kept failure. A kept failure is
one declared by an active AC, EX, BR or contract, one actually observed, or
one required by the repository's input-safety floor. A retired or superseded
statement alone is not an active obligation. A type or schema may determine
where failure handling occurs; it does not silently erase a failure an active
contract declares. If the declarations contradict, record drift and ask
the owning SDD phase to resolve it.

Follow the BF → US → AC → EX and BR → EX links to decide which row owns
the behavior. Do not demand an unrelated failure case from every row.
Contract failures are scored where their current binding reaches the flow.
A missing assertion stays `❌` until the selected test executes; it does
not become `✅` when a file or skeleton appears.

EX rows remain in this flow's matrix even though `/qfai-implement` writes
their tests. ATDD names the gap and hands it over. A DONE decision exception
may explain why an obligation has no test, but the matrix still records
the ID and the decision that resolved it.
