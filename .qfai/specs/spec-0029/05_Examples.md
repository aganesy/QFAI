# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID        | BR-Ref       | Input                                                                             | Expected                                                                                       | Notes                |
| ------------ | ------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------- |
| EX-0029-0001 | BR-0029-0001 | Evaluator calls `provider.request({ output: "generated code", context: "spec" })` | `{ scores: { quality: 7 }, dimensions: ["correctness"], suggestions: ["add error handling"] }` | Happy path response  |
| EX-0029-0002 | BR-0029-0002 | Provider returns `{ invalid: "no scores" }`                                       | Schema validation fails, fail-open triggered, warning logged                                   | Malformed response   |
| EX-0029-0003 | BR-0029-0003 | Critique request contains `"; rm -rf /"` in context field                         | Arguments escaped to `\"; rm -rf /\"`, no shell execution of injected command                  | Injection prevention |
| EX-0029-0004 | BR-0029-0004 | Provider HTTP endpoint returns 503 Service Unavailable                            | Fail-open: `{ failOpen: true, reason: "provider_unavailable" }`, loop continues                | Network failure      |
| EX-0029-0005 | BR-0029-0005 | Provider call takes 45s (timeout configured at 30s)                               | AbortController cancels at 30s, fail-open triggered                                            | Timeout scenario     |
| EX-0029-0006 | BR-0029-0006 | User lists available example providers                                            | At least 2 providers listed: "echo-provider", "file-provider"                                  | Provider catalog     |
| EX-0029-0007 | BR-0029-0007 | Provider available for iterations 1-3, fails at iteration 4                       | Iterations 1-3 have critique data, iteration 4 is fail-open, iteration 5 may recover           | State transition     |
| EX-0029-0008 | BR-0029-0008 | Provider "my-provider" times out at iteration 3                                   | Log entry: `[WARN] Critique fail-open: provider=my-provider, reason=timeout, iteration=3`      | Fail-open logging    |
| EX-0029-0009 | BR-0029-0009 | Evaluator calls critique adapter with standard input | Response: {layers: {invariant: 0.8, trendDerived: 0.7, productSpecific: 0.6}}; no usability/consistency/accessibility/delight keys | 3-layer happy path |
| EX-0029-0010 | BR-0029-0010 | Calibration pack contains {axis: "delight", threshold: 0.5} | Validation error: "axis 'delight' is not defined in the 3-layer architecture"; evaluation blocked | Undeclared axis rejection |
| EX-0029-0011 | BR-0029-0011 | Score = 0.70 on invariant/trend-derived boundary (threshold = 0.70) | Assignment is deterministic: boundary rule applied consistently (e.g., lower layer wins); same result on every call | Boundary determinism |
| EX-0029-0012 | BR-0029-0012 | Legacy scores: {usability: 0.7, consistency: 0.8} to be migrated | Migrated output: {invariant: 0.75, trendDerived: 0.0, productSpecific: 0.0} (or appropriate mapping); no score data lost | Migration without loss |
| EX-0029-0013 | BR-0029-0013 | Same input evaluated twice: {text: "sample code", context: "spec"} | Both responses identical: same layer assignments and score values | Idempotent 3-layer scoring |
| EX-0029-0014 | BR-0029-0014 | Maintainer updates invariant layer threshold from 0.75 to 0.80 | Change recorded in spec delta; DEC/DR reference added; approval noted before deployment | Scoring rubric traceability |
