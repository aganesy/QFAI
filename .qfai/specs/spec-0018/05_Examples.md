# 05 Examples

8 items.

## EX-0018-0001: レビュー系エージェント TOML 生成例

**BR Ref:** BR-0018-0001, BR-0018-0002

| Field                 | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| Input                 | カノニカルソース `.qfai/assistant/agents/code-reviewer.md` |
| Agent role            | review/analysis                                            |
| Expected TOML fields  | name, description, developer_instructions, sandbox_mode    |
| Expected sandbox_mode | "read-only"                                                |
| Expected model        | (absent)                                                   |
| Expected nickname     | (absent)                                                   |

## EX-0018-0002: 実装系エージェント TOML 生成例

**BR Ref:** BR-0018-0001, BR-0018-0002

| Field                 | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| Input                 | カノニカルソース `.qfai/assistant/agents/backend-engineer.md` |
| Agent role            | implementation                                                |
| Expected TOML fields  | name, description, developer_instructions                     |
| Expected sandbox_mode | (absent — inherits from parent)                               |
| Expected model        | (absent)                                                      |
| Expected nickname     | (absent)                                                      |

## EX-0018-0003: developer_instructions 変換例

**BR Ref:** BR-0018-0003

| Field                | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| Input MD section     | "## Mission\n- Review changes for correctness..."                 |
| Expected TOML output | developer_instructions に Mission セクション全文が含まれる        |
| Included sections    | Mission, Inputs, Deliverables, Stop conditions, Checklist, Output |
| Excluded sections    | (none — all sections preserved)                                   |

## EX-0018-0004: 命名規則の一致例

**BR Ref:** BR-0018-0005

| Field                  | Value                                                          |
| ---------------------- | -------------------------------------------------------------- |
| Canonical file         | `.qfai/assistant/agents/atdd-api-implementer.md`               |
| Expected TOML filename | `atdd-api-implementer.toml`                                    |
| Expected name field    | `"atdd-api-implementer"`                                       |
| Expected description   | 1行の要約（例: "Implement API tests for CON-API-\* coverage"） |

## EX-0018-0005: config.toml 生成例

**BR Ref:** BR-0018-0006

| Field                  | Value                     |
| ---------------------- | ------------------------- |
| Expected file          | `.codex/config.toml`      |
| Expected [agents] keys | max_threads, max_depth    |
| Expected max_depth     | 1                         |
| Parse validation       | TOML パーサーでエラーなし |

## EX-0018-0006: sandbox_mode 分類の境界例

**BR Ref:** BR-0018-0002

| Field                 | Value                                                 |
| --------------------- | ----------------------------------------------------- |
| Agent                 | orchestrator                                          |
| Role                  | implementation（計画・委譲・統合の責務）              |
| Expected sandbox_mode | (absent — 実装系として分類)                           |
| Rationale             | オーケストレータは Work Orders 作成等の書き込みが必要 |

## EX-0018-0007: 存在しないエージェント参照（負例）

**BR Ref:** BR-0018-0005

| Field                 | Value                                         |
| --------------------- | --------------------------------------------- |
| Agent                 | design-expert                                 |
| Canonical exists      | Yes (.qfai/assistant/agents/design-expert.md) |
| Claude/Copilot exists | No (symlink not created)                      |
| Expected Codex TOML   | (absent — スコープ外、DR-0028)                |

## EX-0018-0008: TOML 構文エラーの検出（負例）

**BR Ref:** BR-0018-0001

| Field             | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| Scenario          | developer_instructions 内にエスケープされていない引用符がある |
| Expected behavior | TOML パーサーがエラーを報告する                               |
| Validation gate   | NFR-0001 で検出される                                         |
