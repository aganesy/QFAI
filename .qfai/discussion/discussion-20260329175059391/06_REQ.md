# 06 REQ

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329175059391 |
| Date          | 2026-03-29                   |

## Functional Requirements

### Slice 1: External Critique Adapter

| REQ-ID   | Title                       | Description                                                                                                                   | Source   | Priority |
| -------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| REQ-0001 | Critique Provider Interface | A critique provider interface must be defined that allows pluggable provider implementations to supply structured feedback    | SRC-0001 | Must     |
| REQ-0002 | Generic Command Provider    | A generic command provider must be implemented that executes an external command and parses its output as structured critique | SRC-0001 | Must     |
| REQ-0003 | Optional Example Providers  | Example provider implementations (e.g., static mock, LLM-based) must be available as optional references                      | SRC-0001 | Could    |
| REQ-0004 | Structured Critique Schema  | Critique output must conform to a defined schema with severity, category, location, and suggestion fields                     | SRC-0001 | Must     |
| REQ-0005 | Fail-Open Semantics         | When a critique provider is unavailable or returns an error, the adapter must continue without blocking the loop              | SRC-0001 | Must     |

### Slice 2: Harness Contracts + Calibration Pack

| REQ-ID   | Title                        | Description                                                                                                                    | Source            | Priority |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------- | -------- |
| REQ-0006 | Calibration Examples         | A calibration pack must include example inputs and expected scoring outcomes for evaluator alignment                           | SRC-0001,SRC-0005 | Must     |
| REQ-0007 | Scoring Alignment Assets     | Scoring alignment assets must define weighted axes, floor thresholds, and aggregate rules consistent with v1.7 scoring         | SRC-0005          | Must     |
| REQ-0008 | Accept/Refine/Pivot Policy   | The harness must define clear policies for when to accept output, refine via generator, or pivot via planner                   | SRC-0001          | Must     |
| REQ-0009 | Disagreement Handling        | When evaluator and critique provider disagree, a defined resolution policy must be applied                                     | SRC-0001          | Should   |
| REQ-0010 | Plateau and Loop Exit Policy | Plateau detection must trigger early loop exit when scoring improvement falls below a configured threshold across N iterations | SRC-0001          | Must     |

### Slice 3: `/qfai-prototyping-full-harness`

| REQ-ID   | Title                             | Description                                                                                                   | Source            | Priority |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------- | -------- |
| REQ-0011 | Premium Explicit Non-Default      | The full-harness skill must be invoked explicitly; it must never activate as a default or implicit mode       | SRC-0001          | Must     |
| REQ-0012 | Planner/Generator/Evaluator Split | The harness must decompose each iteration into planner, generator, and evaluator phases with clear interfaces | SRC-0001          | Must     |
| REQ-0013 | Iteration Range and Cap           | The loop must support 5-15 iteration class runs, hard-capped at a configurable maximum (default 15)           | SRC-0001          | Must     |
| REQ-0014 | Evidence and Review Mandatory     | Every full-harness run must produce evidence artifacts and trigger review upon completion                     | SRC-0001          | Must     |
| REQ-0015 | Weighted Score and Floors         | Each iteration must produce a weighted composite score; output below floor thresholds must not be accepted    | SRC-0001,SRC-0005 | Must     |

### Slice 4: Observability + Capability Profile

| REQ-ID   | Title                   | Description                                                                                                     | Source   | Priority |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| REQ-0016 | Cost/Time Observability | Every premium run must emit cost and wall-clock time metrics at per-iteration and aggregate granularity         | SRC-0001 | Must     |
| REQ-0017 | Mode Guidance           | Observability output must include guidance on whether premium mode was cost-effective compared to standard mode | SRC-0001 | Should   |
| REQ-0018 | Reviewer Drift Tracking | Scoring variance across iterations must be tracked to detect evaluator/reviewer drift over time                 | SRC-0001 | Should   |
| REQ-0019 | Capability Profile      | A capability profile must be maintained per task type, model, and mode to inform future mode selection          | SRC-0001 | Could    |

### Slice 5: Handoff + Display/Stub Detection

| REQ-ID   | Title                       | Description                                                                                                                        | Source   | Priority |
| -------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| REQ-0020 | Handoff Artifact Generation | When a long-running session is interrupted, a handoff artifact must be written containing loop state, history, and resume metadata | SRC-0001 | Must     |
| REQ-0021 | Session Resumption          | A resumed session must load handoff artifacts and continue from the last completed iteration                                       | SRC-0001 | Must     |
| REQ-0022 | Display-Only Detection      | The evaluator must detect and flag output that renders visually but lacks functional implementation                                | SRC-0001 | Must     |
| REQ-0023 | Stub-Only Detection         | The evaluator must detect and flag output that contains only stub/placeholder implementations without real logic                   | SRC-0001 | Must     |
