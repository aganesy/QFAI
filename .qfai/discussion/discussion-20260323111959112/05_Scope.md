# 05 Scope

## In Scope

| ID    | Item                                          | Description                                                                                   |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| IS-01 | 39 Codex agent TOML files                     | `.codex/agents/*.toml` — one file per agent matching the Claude Code / Copilot agent set      |
| IS-02 | config.toml                                   | `.codex/config.toml` — global agent settings (concurrency, depth defaults)                    |
| IS-03 | sandbox_mode role-based classification        | 25 review/analysis agents → `"read-only"`, 14 implementer agents → omitted                   |
| IS-04 | developer_instructions content conversion     | Convert canonical MD agent content (mission, inputs, deliverables, stop conditions, checklist) to TOML `developer_instructions` multi-line string |

## Out of Scope

| ID    | Item                                          | Reason                                                                                        |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| OS-01 | 5 extra canonical agents                      | design-expert, integrated-uiux-reviewer, navigation-expert, screen-transition-expert, uiux-expert — not included in Claude/Copilot set |
| OS-02 | init.ts auto-generation logic                 | Codex TOML generation from canonical source is a separate future initiative                    |
| OS-03 | MCP server configuration                      | MCP setup is independent of agent TOML definitions                                            |
| OS-04 | Model-specific agent tuning                   | Agents inherit the model from parent session; no per-agent model override                     |
| OS-05 | AGENTS.md changes                             | Repository-level AGENTS.md is not affected by this feature                                    |

## Constraints

| ID    | Constraint                                    | Source                                                                                        |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| CO-01 | TOML format required                          | Codex platform specification — agents must be defined in TOML, not Markdown (SRC-0002)        |
| CO-02 | Real files, not symlinks                       | TOML format incompatible with symlinks to Markdown canonical source                           |
| CO-03 | model field omitted                           | Interview decision — agents inherit model from parent Codex session                           |
| CO-04 | nickname_candidates omitted                   | Interview decision — not needed for QFAI agent workflow                                       |

## Assumptions

| ID    | Assumption                                    | Risk if Wrong                                                                                 |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| AS-01 | Codex TOML agent format is stable             | If format changes, all 39 files need updating                                                 |
| AS-02 | sandbox_mode "read-only" is sufficient        | If finer-grained permissions are needed, TOML structure may need extension                    |
| AS-03 | developer_instructions supports multi-line    | If TOML multi-line strings have length limits, long agents may need truncation                |
| AS-04 | 39 agents match the Claude/Copilot set        | If agent set diverges across platforms, reconciliation effort required                        |

## Success Criteria

| ID     | Criterion                                              | Priority | Verification Method                                    |
| ------ | ------------------------------------------------------ | -------- | ------------------------------------------------------ |
| SC-001 | All 39 TOML files parse without errors                 | Must     | Run TOML parser/validator on all files                  |
| SC-002 | developer_instructions parity with canonical source    | Must     | Spot-check comparison of key sections across agents     |
| SC-003 | sandbox_mode correctly classified for all 39 agents    | Must     | Cross-reference with role list (14 impl + 25 review)   |
| SC-004 | config.toml valid and functional                       | Must     | TOML parse validation + Codex runtime test              |

## Agent Classification Reference

### 14 Implementer Agents (no sandbox_mode)

| # | Agent Name                  |
|---|----------------------------|
| 1 | architect                  |
| 2 | atdd-api-implementer       |
| 3 | atdd-e2e-implementer       |
| 4 | atdd-integration-implementer |
| 5 | backend-engineer           |
| 6 | contract-designer          |
| 7 | coverage-planner           |
| 8 | devops-ci-engineer         |
| 9 | doc-steward                |
| 10 | frontend-engineer         |
| 11 | orchestrator              |
| 12 | planner                   |
| 13 | test-case-owner           |
| 14 | test-engineer             |

### 25 Review/Analysis Agents (sandbox_mode = "read-only")

| # | Agent Name                     |
|---|-------------------------------|
| 1 | architect-reviewer            |
| 2 | backend-reviewer              |
| 3 | code-reviewer                 |
| 4 | design-owner                  |
| 5 | design-review-lead            |
| 6 | facilitator                   |
| 7 | frontend-reviewer             |
| 8 | interviewer                   |
| 9 | option-explorer               |
| 10 | option-reviewer              |
| 11 | oq-harvester                 |
| 12 | oq-reviewer                  |
| 13 | project-lead                 |
| 14 | prototyping-coverage-auditor |
| 15 | qa-engineer                  |
| 16 | qa-gatekeeper                |
| 17 | qa-lead                      |
| 18 | qa-reviewer                  |
| 19 | requirements-analyst         |
| 20 | researcher                   |
| 21 | reviewer                     |
| 22 | runtime-gatekeeper           |
| 23 | test-volume-estimator        |
| 24 | ui-ux-reviewer               |
| 25 | unit-test-scope-enforcer     |
