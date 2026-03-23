# 06 REQ (Functional Requirements)

## Requirements Table

| REQ-ID   | Title                                      | Description                                                                                                           | Source            | Priority | Status |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------- | -------- | ------ |
| REQ-0001 | Create 39 Codex agent TOML files           | Create `.codex/agents/<name>.toml` for each of the 39 agents matching Claude Code / GitHub Copilot agent set          | SRC-0001,SRC-0005 | must     | draft  |
| REQ-0002 | TOML mandatory fields                      | Each TOML file must include `name`, `description`, and `developer_instructions` fields                                | SRC-0001,SRC-0002 | must     | draft  |
| REQ-0003 | developer_instructions content parity      | `developer_instructions` must faithfully represent Mission, Inputs, Deliverables, Stop conditions, Checklist, Output format from canonical MD | SRC-0005 | must | draft |
| REQ-0004 | sandbox_mode for review/analysis agents    | 25 review/analysis agents must have `sandbox_mode = "read-only"`                                                      | SRC-0001          | must     | draft  |
| REQ-0005 | No sandbox_mode for implementation agents  | 14 implementation agents must NOT specify `sandbox_mode` (inherit from parent)                                        | SRC-0001          | must     | draft  |
| REQ-0006 | Model inheritance                          | No agent specifies `model` field; all inherit from parent session                                                     | SRC-0001,SRC-0003 | must     | draft  |
| REQ-0007 | No nickname_candidates                     | `nickname_candidates` field must be omitted from all agent files                                                      | interview         | must     | draft  |
| REQ-0008 | Create config.toml                         | Create `.codex/config.toml` with `[agents]` section defining `max_threads` and `max_depth`                            | SRC-0001,SRC-0003 | must     | draft  |
| REQ-0009 | File naming convention                     | TOML filenames must use kebab-case matching canonical agent names (e.g., `code-reviewer.toml`)                        | SRC-0005          | must     | draft  |
| REQ-0010 | description field content                  | `description` field must be a concise one-line summary of the agent's mission                                         | SRC-0002          | should   | draft  |
| REQ-0011 | Agent name field matches canonical         | `name` field in TOML must match the canonical agent identifier (kebab-case, e.g., "code-reviewer")                    | SRC-0002,SRC-0005 | must     | draft  |

## Priority Legend

- `must`: Required for MVP / first release.
- `should`: Important but deferrable.
- `could`: Nice-to-have.
- `wont`: Explicitly excluded from current scope.

## Rules

- Each REQ must have at least one Source (SRC-ID) reference.
- Status: `draft` → `reviewed` → `approved`.
