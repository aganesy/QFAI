# RED Admissibility

## Criterion

A RED observation belongs to one example and one test selector. The test must load, reach an assertion or an expected-exception check, and fail on the behavior that the example states. Report the command, failure output, and revision under that example in the stage report.

A collection error, import error, syntax error, missing fixture, timeout before the assertion, or unconditional throw is a missing seam. Repair the seam and repeat RED before production behavior is added.

### Selected-case execution

For each focused Red, Green and Refactor invocation, keep this human receipt
under the target example in the existing stage report:

- The exact command with argument boundaries, cwd, file selection and case
  selector. Preserve the Standard Test command's quoted arguments; a name
  pattern does not select files.
- The actual runtime version, reporter, input revision and raw output/log
  reference. Explain intentional input changes between invocations.
- The target EX, test source declaration and full file/parent/case identity.
  Resolve duplicate short names through their full hierarchy; account for the
  runner's actual parent selection rather than assuming a leaf-only pattern
  runs every nesting shape.
- Evidence that this selected case's body executed, linked to its actual
  terminal result. Retain skip, TODO, cancellation, interruption and any
  expected-failure inversion explicitly.
- Process exit, aggregate counts and file/container results, apart from that
  case evidence. An annotation and static scanner linkage prove a declaration,
  not runtime execution or a behavioral result.

Compare actual TAP start and terminal records, spec named results or JUnit
nodes with the declared target and its full hierarchy. A TAP label, spec glyph
or JUnit testcase can belong to a container; none alone proves the selected
leaf body ran. Dots, coverage and summaries alone are also insufficient. If
output is unfamiliar, incomplete or cannot identify the selected case, retain
it, name the missing observation and obtain supported case-level evidence.
Do not guess a parser or invent a receipt format.

Zero selected executions, skip, TODO, cancellation, interruption or missing
identifiable body evidence cannot close a phase, even with exit zero or a
passing file/container. Correct selection or observation and repeat the
focused invocation. Failure of a parent, another case, an import or an
unconditional throw is not the selected assertion's ordinary RED. An
expected-failure inversion is recorded separately; its reported pass is not
ordinary behavior success. Existing approved alternative RED routes remain
available.

Ordinary RED reaches and fails the selected intended assertion or expected
exception on its stated behavior. GREEN and Refactor must observe that same
selected behavior succeeding on the intended input. Do not reuse another
case's result or a prior input revision's result as proof for this invocation.
The normal verify run establishes full collection coverage; no extra full suite is
required for each focused cycle. This receipt adds no ledger, JSON field,
gate status, runtime parser or runner.

## Assertion control

Temporarily neutralize only the example assertion while keeping the test compilable and runnable. The same command must pass. Capture the changed lines and result, then restore the assertion before recording RED. This control shows that the reported failure came from the assertion.

If a seam is needed to reach the assertion, add only that seam and record its limit. A seam cannot implement the behavior that the example is intended to test. Where production already satisfies the example, use the falsifiability route for existing behavior and its falsifiability proof.
