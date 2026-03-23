# 11 OQ Register

## OQ Table

| OQ-ID   | Title                    | Gate       | Disposition | Owner | Rationale                                                    | Options                                                                                       | Recommendation                      | Next-Decision-Point | Due        | Evidence           |
| ------- | ------------------------ | ---------- | ----------- | ----- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------- | ---------- | ------------------ |
| OQ-0001 | Agent scope              | discussion | resolved    | user  | Match existing platform parity                               | A: 39 agents (Claude/Copilot match) / B: 44 agents (all canonical) (recommended: A)           | A: 39 agents                        | N/A                 | 2026-03-23 | Interview response |
| OQ-0002 | Deployment method        | discussion | resolved    | user  | Simplicity and maintainability                               | A: Static repo placement (recommended: A) / B: qfai init auto-generation                     | A: Static repo placement            | N/A                 | 2026-03-23 | Interview response |
| OQ-0003 | Model specification      | discussion | resolved    | user  | Flexibility for users to control via config.toml             | A: Inherit from parent (recommended: A) / B: Fixed model per agent                           | A: Inherit from parent              | N/A                 | 2026-03-23 | Interview response |
| OQ-0004 | sandbox_mode strategy    | discussion | resolved    | user  | Role-based security aligns with agent responsibilities       | A: Role-based (recommended: A) / B: All read-only / C: All inherit                           | A: Role-based                       | N/A                 | 2026-03-23 | Interview response |
| OQ-0005 | nickname_candidates      | discussion | resolved    | user  | Keep configuration simple                                    | A: Omit (recommended: A) / B: Set per agent                                                  | A: Omit                             | N/A                 | 2026-03-23 | Interview response |
| OQ-0006 | config.toml inclusion    | discussion | resolved    | user  | Provides sensible defaults for agent behavior                | A: Include (recommended: A) / B: Exclude                                                     | A: Include                          | N/A                 | 2026-03-23 | Interview response |
| OQ-0007 | init.ts changes          | discussion | resolved    | user  | Static placement makes init logic unnecessary for this scope | A: Out of scope (recommended: A) / B: Add init.ts Codex TOML generation                      | A: Out of scope                     | N/A                 | 2026-03-23 | Interview response |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- `Options` must include at least two alternatives and one recommended option.
- `Recommendation` must explicitly state the recommended option.
- All 11 columns are mandatory for every row.
