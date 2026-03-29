# 08 Glossary

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329175059391 |
| Date          | 2026-03-29                   |

## Terms

| Term                      | Definition                                                                                                          | Source Refs       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Critique Adapter          | Abstraction layer that mediates between the evaluator and external critique providers, enforcing schema and fail-open semantics | SRC-0001 |
| Critique Provider         | A pluggable external service or command that supplies structured feedback on generated output                        | SRC-0001          |
| Calibration Pack          | A collection of example inputs, expected scores, and alignment assets used to ensure evaluator consistency           | SRC-0001,SRC-0005 |
| Full-Harness              | The premium multi-iteration prototyping mode that decomposes generation into planner/generator/evaluator phases      | SRC-0001          |
| Premium Path              | The explicit opt-in prototyping mode (`/qfai-prototyping-full-harness`) with iterative critique loops               | SRC-0001          |
| Standard Path             | The default single-pass prototyping mode (`/qfai-prototyping`) with static-first obligations                        | SRC-0001,SRC-0002 |
| Generator                 | The harness phase responsible for producing output artifacts from a plan                                            | SRC-0001          |
| Evaluator                 | The harness phase responsible for scoring generated output against calibration criteria and critique feedback         | SRC-0001          |
| Planner                   | The harness phase responsible for creating or revising the generation strategy based on spec inputs or pivot signals | SRC-0001          |
| Plateau Detection         | Logic that identifies when scoring improvement across consecutive iterations falls below a threshold, triggering early exit | SRC-0001 |
| Loop Exit Policy          | The set of rules governing when the harness loop terminates: accept, max iterations reached, or plateau detected    | SRC-0001          |
| Handoff Artifact          | A serialized snapshot of loop state, iteration history, and resume metadata written when a long-running session is interrupted | SRC-0001 |
| Display-Only Detection    | Analysis that identifies output which renders visually but lacks functional implementation behind the display layer  | SRC-0001          |
| Stub-Only Detection       | Analysis that identifies output containing only placeholder/stub implementations without real business logic         | SRC-0001          |
| Interaction Depth         | A measure of how deeply generated output supports user interaction beyond surface-level display                      | SRC-0001          |
| Capability Profile        | A record of performance characteristics (quality, cost, time) indexed by task type, model, and mode                 | SRC-0001          |
| Reviewer Drift            | Gradual divergence in evaluator/reviewer scoring behavior over time or across iterations                            | SRC-0001          |
| Scoring Alignment         | The process of ensuring evaluator scoring matches expected outcomes defined in calibration assets                    | SRC-0001,SRC-0005 |
| Accept/Refine/Pivot       | The three possible loop outcomes: accept output as final, refine via generator iteration, or pivot by re-planning   | SRC-0001          |
| Fail-Open Semantics       | Behavior where an optional component's failure causes a skip/warning rather than a blocking error                   | SRC-0001          |
