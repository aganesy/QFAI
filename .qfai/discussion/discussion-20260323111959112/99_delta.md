# 99 Delta

## Change History

| Date       | Change Type | Section       | Summary                                                       | Rationale                                             |
| ---------- | ----------- | ------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| 2026-03-23 | adopted     | 01_Context    | Initial discussion pack created for Codex sub-agent feature   | v1.6.4 feature request for Codex platform parity      |
| 2026-03-23 | adopted     | 05_Scope      | Scope fixed to 39 agents, static placement, config.toml      | Interview decisions confirmed by user                  |
| 2026-03-23 | adopted     | 06_REQ        | 11 functional requirements defined                            | Derived from interview decisions and source analysis   |
| 2026-03-23 | adopted     | 07_NFR        | 6 non-functional requirements defined                         | Derived from quality and maintainability concerns      |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option                              | Reason                                                    | Recurrence Prevention                                          |
| ---------- | ------- | -------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 2026-03-23 | OQ-0001 | 44 canonical agents (all)                    | 5 agents not yet symlinked in Claude/Copilot              | Revisit when Claude/Copilot add the remaining 5 agents         |
| 2026-03-23 | OQ-0002 | init.ts auto-generation                      | Adds complexity; static placement is simpler              | Revisit if maintenance burden of manual sync becomes too high  |
| 2026-03-23 | OQ-0003 | Fixed model per agent                        | Reduces user flexibility                                  | Revisit if Codex requires model pinning for stability          |
| 2026-03-23 | OQ-0004 | All agents read-only                         | Implementation agents need write access                   | N/A — role-based classification is stable                      |
| 2026-03-23 | OQ-0004 | All agents inherit (no sandbox)              | Review agents should be restricted for safety             | N/A — role-based classification is stable                      |
| 2026-03-23 | OQ-0005 | Set nickname_candidates per agent            | Adds maintenance burden with limited benefit              | Revisit if Codex UI makes nicknames more useful                |
| 2026-03-23 | OQ-0006 | Exclude config.toml                          | Users need sensible defaults                              | N/A — config.toml is lightweight and valuable                  |
| 2026-03-23 | OQ-0007 | Add init.ts Codex TOML generation            | Static placement is sufficient for this release           | Revisit in v1.7.x if sync automation is needed                 |

## Drift Events

| Date | Trigger | Impact Assessment | Files Updated |
| ---- | ------- | ----------------- | ------------- |
| (none) | - | - | - |
