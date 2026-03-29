# 04 Business Rules

## Purpose

- Decompose AC into explicit business rules.
- Every BR must reference one or more AC IDs.

## Rule Table (required)

| BR-ID   | Title                              | AC-Refs           | Rule                                                                                                                    | Notes                                                    | NFR-Refs |
| ------- | ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| BR-0033-0001 | Handoff artifact schema            | AC-0033-0001, AC-0033-0006  | Handoff artifact must be a self-contained JSON file containing planner, generator, and evaluator serialized state        | Schema versioned for forward compatibility               |          |
| BR-0033-0002 | Interruption trigger               | AC-0033-0001, AC-0033-0004  | Handoff artifact must be generated on any interruption: SIGINT, SIGTERM, timeout, explicit stop, and at checkpoints      | Checkpoint frequency configurable                        |          |
| BR-0033-0003 | Resume state restoration           | AC-0033-0002           | On resume, planner/generator/evaluator state must be deserialized and restored to the exact iteration of interruption    | Iteration counter restored, not reset                    | NFR-0007 |
| BR-0033-0004 | Corruption detection               | AC-0033-0003           | Handoff artifacts must be validated (JSON parse + schema check) before resume; invalid artifacts trigger fresh start     | Log warning with corruption details                      |          |
| BR-0033-0005 | Portability constraint             | AC-0033-0005, AC-0033-0011  | Handoff artifacts must not contain user-specific paths, credentials, or environment-bound references                     | Paths stored as relative; credentials stripped (POL-003) |          |
| BR-0033-0006 | Credential stripping               | AC-0033-0011           | Before writing handoff artifact, all values matching credential patterns (API keys, tokens, passwords) must be redacted  | Pattern list: env vars matching KEY/TOKEN/SECRET/PASSWORD |          |
| BR-0033-0007 | Display-only heuristic             | AC-0033-0007           | Display-only detection uses heuristic pattern matching: presence of only render/template/view code with no logic paths   | Heuristic-based per DR-0076; no AST required             |          |
| BR-0033-0008 | Stub-only heuristic                | AC-0033-0008           | Stub detection matches patterns: `throw.*not implemented`, `TODO`, empty function bodies, `pass`, `...` placeholders    | Pattern list extensible via config                       |          |
| BR-0033-0009 | Partial stub granularity           | AC-0033-0009           | Partial implementation detection must report at method/function level, not file level                                    | Location includes function name and line range           |          |
| BR-0033-0010 | Refine loop trigger                | AC-0033-0008           | Stub-only detection finding must automatically trigger the refine loop with the stub locations as context                | Refine request includes stub evidence                    |          |
| BR-0033-0011 | Detection idempotency              | AC-0033-0010           | Detection heuristics must be pure functions of the input; no mutation of the analyzed output                             | Stateless analysis                                       |          |
| BR-0033-0012 | Minimal state handoff              | AC-0033-0004           | Handoff at iteration 1 must produce a valid artifact even when generator and evaluator state are empty or default        | Empty state serialized as empty objects/arrays            |          |
