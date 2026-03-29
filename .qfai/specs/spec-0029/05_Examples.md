# 05 Examples

## Purpose

- Concretize BR into executable examples.
- Every EX must reference one BR via `BR-Ref`.

## Example Table (required)

| EX-ID   | BR-Ref  | Input                                                                                        | Expected                                                                                                    | Notes                |
| ------- | ------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| EX-0029-0001 | BR-0029-0001 | Evaluator calls `provider.request({ output: "generated code", context: "spec" })`            | `{ scores: { quality: 7 }, dimensions: ["correctness"], suggestions: ["add error handling"] }`               | Happy path response  |
| EX-0029-0002 | BR-0029-0002 | Provider returns `{ invalid: "no scores" }`                                                  | Schema validation fails, fail-open triggered, warning logged                                                | Malformed response   |
| EX-0029-0003 | BR-0029-0003 | Critique request contains `"; rm -rf /"` in context field                                    | Arguments escaped to `\"; rm -rf /\"`, no shell execution of injected command                               | Injection prevention |
| EX-0029-0004 | BR-0029-0004 | Provider HTTP endpoint returns 503 Service Unavailable                                       | Fail-open: `{ failOpen: true, reason: "provider_unavailable" }`, loop continues                             | Network failure      |
| EX-0029-0005 | BR-0029-0005 | Provider call takes 45s (timeout configured at 30s)                                          | AbortController cancels at 30s, fail-open triggered                                                         | Timeout scenario     |
| EX-0029-0006 | BR-0029-0006 | User lists available example providers                                                       | At least 2 providers listed: "echo-provider", "file-provider"                                               | Provider catalog     |
| EX-0029-0007 | BR-0029-0007 | Provider available for iterations 1-3, fails at iteration 4                                  | Iterations 1-3 have critique data, iteration 4 is fail-open, iteration 5 may recover                        | State transition     |
| EX-0029-0008 | BR-0029-0008 | Provider "my-provider" times out at iteration 3                                              | Log entry: `[WARN] Critique fail-open: provider=my-provider, reason=timeout, iteration=3`                   | Fail-open logging    |
