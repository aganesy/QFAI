# RED Admissibility

## Criterion

A RED observation belongs to one example and one test selector. The test must load, reach an assertion or an expected-exception check, and fail on the behavior that the example states. Record the command, failure output, and revision under that example in .qfai/evidence/implement-BF-NNNN.md.

A collection error, import error, syntax error, missing fixture, timeout before the assertion, or unconditional throw is a missing seam. Repair the seam and repeat RED before production behavior is added.

## Assertion control

Temporarily neutralize only the example assertion while keeping the test compilable and runnable. The same command must pass. Capture the changed lines and result, then restore the assertion before asking the gatekeeper to judge RED. This control shows that the reported failure came from the assertion.

If a seam is needed to reach the assertion, add only that seam and record its limit. A seam cannot implement the behavior that the example is intended to test. Where production already satisfies the example, use red-not-observable.md and its falsifiability proof.
