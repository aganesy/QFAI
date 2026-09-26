# Oracle Strength

## Proof per example

A passing example test must depend on the behavior it claims to verify. After GREEN, make the smallest valid change to the owned predicate that should break the example. Run the same selector and record its failing assertion output. Restore the predicate immediately and rerun to confirm GREEN. Place command, result, mutation, and both revisions in the example evidence.

A missing import, syntax error, fixture failure, or deliberate unimplemented throw does not prove the oracle. The failure must name the example's observable behavior. A mutation in an unrelated helper only proves that helper is used.

The falsifiability run in red-not-observable.md already supplies this proof when it tests the same predicate and selector. Reuse that run instead of mutating twice.

## Weak oracles

Check for truthiness when an exact value is available, an empty loop of assertions, expected values computed by the same helper as actual values, assertions on a mock's own input, and fields discarded before observation. Strengthen the assertion within the approved acceptance criterion.

If every implementation allowed by the contract passes the test, record an equivalent-mutant result and name the limiting contract clause. Raise the gap through the drift protocol. Do not strengthen the requirement in a test without an upstream decision.
