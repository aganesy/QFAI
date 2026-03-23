# 10 Plan

> **How-only.** What and Why live in 01_Spec.md. This file is the single source of truth for implementation order, test strategy, and risk mitigation.

---

## 1. Implementation Steps

### Step 1: Create `.codex/` directory structure

```text
.codex/
├── config.toml
└── agents/
    └── (39 .toml files)
```

### Step 2: Create `config.toml`

File: `.codex/config.toml`

```toml
[agents]
max_threads = 1
max_depth   = 1
```

- `max_depth = 1` suppresses recursive delegation (BR-0018-0006).
- `max_threads` defaults to 1 for predictable execution.

### Step 3: Create 39 TOML agent files

For each canonical agent in `.qfai/assistant/agents/<name>.md` (excluding the 5 out-of-scope agents):

#### 3a. Extract content from canonical MD

Extract the following sections and concatenate them into `developer_instructions`:

1. Mission
2. Inputs you must read
3. Deliverables (MANDATORY)
4. Stop conditions (Blockers)
5. Sign-off checklist
6. Output format

#### 3b. Map to TOML fields

| TOML Field               | Source                                                                       |
| ------------------------ | ---------------------------------------------------------------------------- |
| `name`                   | Filename without extension (e.g., `"architect-reviewer"`)                    |
| `description`            | One-line summary derived from the first line / Mission heading               |
| `developer_instructions` | Full concatenated content from step 3a (triple-quoted string)                |
| `sandbox_mode`           | `"read-only"` for 25 review agents; **omitted** for 14 implementation agents |

#### 3c. TOML file template

**Review agent (with sandbox_mode):**

```toml
name = "architect-reviewer"
description = "Reviews architecture decisions and structural patterns."
sandbox_mode = "read-only"
developer_instructions = """
# Mission
...
"""
```

**Implementation agent (without sandbox_mode):**

```toml
name = "architect"
description = "Designs and implements system architecture."
developer_instructions = """
# Mission
...
"""
```

#### 3d. Classification reference

**14 Implementation Agents** (no `sandbox_mode`):

| #   | Agent Name                   |
| --- | ---------------------------- |
| 1   | architect                    |
| 2   | atdd-api-implementer         |
| 3   | atdd-e2e-implementer         |
| 4   | atdd-integration-implementer |
| 5   | backend-engineer             |
| 6   | contract-designer            |
| 7   | coverage-planner             |
| 8   | devops-ci-engineer           |
| 9   | doc-steward                  |
| 10  | frontend-engineer            |
| 11  | orchestrator                 |
| 12  | planner                      |
| 13  | test-case-owner              |
| 14  | test-engineer                |

**25 Review/Analysis Agents** (`sandbox_mode = "read-only"`):

| #   | Agent Name                   |
| --- | ---------------------------- |
| 1   | architect-reviewer           |
| 2   | backend-reviewer             |
| 3   | code-reviewer                |
| 4   | design-owner                 |
| 5   | design-review-lead           |
| 6   | facilitator                  |
| 7   | frontend-reviewer            |
| 8   | interviewer                  |
| 9   | option-explorer              |
| 10  | option-reviewer              |
| 11  | oq-harvester                 |
| 12  | oq-reviewer                  |
| 13  | project-lead                 |
| 14  | prototyping-coverage-auditor |
| 15  | qa-engineer                  |
| 16  | qa-gatekeeper                |
| 17  | qa-lead                      |
| 18  | qa-reviewer                  |
| 19  | requirements-analyst         |
| 20  | researcher                   |
| 21  | reviewer                     |
| 22  | runtime-gatekeeper           |
| 23  | test-volume-estimator        |
| 24  | ui-ux-reviewer               |
| 25  | unit-test-scope-enforcer     |

### Step 4: Validate all TOML files with a TOML parser

Run a TOML parser (e.g., `toml-eslint-parser`, Node.js `smol-toml`, or Python `tomllib`) against all 40 files (39 agents + 1 config.toml). All files must parse with zero errors.

### Step 5: Verify naming consistency

- All filenames match `/^[a-z][a-z0-9-]*\.toml$/` (kebab-case).
- Each file's `name` field equals the filename without `.toml` extension.

### Step 6: Verify scope — exactly 39 agents

Confirm that `.codex/agents/` contains exactly 39 `.toml` files. The following 5 agents must NOT have TOML files:

1. `design-expert`
2. `integrated-uiux-reviewer`
3. `navigation-expert`
4. `screen-transition-expert`
5. `uiux-expert`

---

## 2. Test Strategy

### Test location

Create a new test file: `packages/qfai/tests/codex/agents.test.ts`

All tests use the TOML parser to load and validate files from `.codex/agents/` and `.codex/config.toml`.

### Test cases

| TC ID        | Title                                  | Level       | AC-Refs      | Key Assertions                                                                                                               |
| ------------ | -------------------------------------- | ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| TC-0018-0001 | 39 TOML ファイル存在確認               | integration | AC-0018-0001 | `.codex/agents/` contains exactly 39 `.toml` files                                                                           |
| TC-0018-0002 | TOML 必須フィールド検証                | unit        | AC-0018-0002 | Every file has non-empty `name`, `description`, `developer_instructions`                                                     |
| TC-0018-0003 | developer_instructions コンテンツ一致  | integration | AC-0018-0003 | `developer_instructions` contains Mission, Inputs, Deliverables, Stop conditions, Checklist, Output format                   |
| TC-0018-0004 | レビュー系 sandbox_mode = read-only    | unit        | AC-0018-0004 | All 25 review agents have `sandbox_mode = "read-only"`                                                                       |
| TC-0018-0005 | 実装系 sandbox_mode 省略               | unit        | AC-0018-0005 | All 14 implementation agents do NOT have `sandbox_mode` key                                                                  |
| TC-0018-0006 | config.toml 存在・妥当性               | integration | AC-0018-0006 | `.codex/config.toml` parses without error; `[agents]` has `max_threads` and `max_depth`                                      |
| TC-0018-0007 | model フィールド不在確認               | unit        | AC-0018-0007 | No agent file contains a `model` key                                                                                         |
| TC-0018-0008 | nickname_candidates フィールド不在確認 | unit        | AC-0018-0008 | No agent file contains a `nickname_candidates` key                                                                           |
| TC-0018-0009 | name フィールドとファイル名の一致      | unit        | AC-0018-0009 | Each file's `name` equals `path.basename(file, ".toml")`                                                                     |
| TC-0018-0010 | TOML 構文妥当性                        | unit        | AC-0018-0002 | All 40 files (39 agents + config.toml) parse with zero TOML errors                                                           |
| TC-0018-0011 | スコープ外エージェントの不在確認       | integration | AC-0018-0001 | No `.toml` file exists for design-expert, integrated-uiux-reviewer, navigation-expert, screen-transition-expert, uiux-expert |
| TC-0018-0012 | ファイル名 kebab-case 検証             | unit        | AC-0018-0001 | All filenames match `/^[a-z][a-z0-9-]*\.toml$/`                                                                              |

### ATDD annotations

Each test includes a comment annotation for traceability:

- Format: `// QFAI:SPEC-0018:TC-XXXX`

### Test helpers

- Use a TOML parser library (e.g., `smol-toml`) to parse files.
- Use `fs.readdirSync` / `globSync` to enumerate `.codex/agents/*.toml`.
- No mocks, databases, or APIs — all tests are filesystem-only.

---

## 3. Risk & Mitigation

| Risk                                                  | Impact                                                | Likelihood | Mitigation                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| TOML escaping for multi-line `developer_instructions` | Parse errors or content corruption                    | Medium     | Use TOML triple-quoted strings (`"""`). Escape any literal `"""` sequences in MD content with `\"""`      |
| Excluded agents accidentally created                  | Scope violation; 44 instead of 39 files               | Low        | TC-0018-0011 explicitly checks 5 excluded agents are absent. Step 6 verifies count = 39                   |
| Content drift from canonical MD                       | Agent behavior diverges across platforms              | Medium     | TC-0018-0003 validates section presence. Future spec may automate generation from canonical source        |
| Triple-quote sequences in MD content                  | TOML parse failure if `"""` appears in agent content  | Low        | Pre-scan canonical MD for `"""` occurrences; escape or restructure if found                               |
| Backslash escaping in TOML multi-line strings         | Unintended escape sequences in developer_instructions | Low        | Use TOML literal multi-line strings (`'''`) if backslash content is problematic; prefer `"""` with review |

---

## 4. Dependencies

### Upstream

- **discussion-20260323111959112** — Approved. Provides requirements, agent scope (39/5 split), sandbox classification (DR-0029), and static placement decision (DR-0030).

### Downstream

- None. This is static file creation with no code changes.

### Internal (no action required)

- Canonical agent MDs in `.qfai/assistant/agents/` — read-only source for content extraction.
- No changes to `init.ts`, `AGENTS.md`, or any package code.

---

## 5. Deliverables Checklist

### config.toml (1 file)

- [ ] `.codex/config.toml`

### Implementation Agents (14 files, no sandbox_mode)

- [ ] `.codex/agents/architect.toml`
- [ ] `.codex/agents/atdd-api-implementer.toml`
- [ ] `.codex/agents/atdd-e2e-implementer.toml`
- [ ] `.codex/agents/atdd-integration-implementer.toml`
- [ ] `.codex/agents/backend-engineer.toml`
- [ ] `.codex/agents/contract-designer.toml`
- [ ] `.codex/agents/coverage-planner.toml`
- [ ] `.codex/agents/devops-ci-engineer.toml`
- [ ] `.codex/agents/doc-steward.toml`
- [ ] `.codex/agents/frontend-engineer.toml`
- [ ] `.codex/agents/orchestrator.toml`
- [ ] `.codex/agents/planner.toml`
- [ ] `.codex/agents/test-case-owner.toml`
- [ ] `.codex/agents/test-engineer.toml`

### Review/Analysis Agents (25 files, sandbox_mode = "read-only")

- [ ] `.codex/agents/architect-reviewer.toml`
- [ ] `.codex/agents/backend-reviewer.toml`
- [ ] `.codex/agents/code-reviewer.toml`
- [ ] `.codex/agents/design-owner.toml`
- [ ] `.codex/agents/design-review-lead.toml`
- [ ] `.codex/agents/facilitator.toml`
- [ ] `.codex/agents/frontend-reviewer.toml`
- [ ] `.codex/agents/interviewer.toml`
- [ ] `.codex/agents/option-explorer.toml`
- [ ] `.codex/agents/option-reviewer.toml`
- [ ] `.codex/agents/oq-harvester.toml`
- [ ] `.codex/agents/oq-reviewer.toml`
- [ ] `.codex/agents/project-lead.toml`
- [ ] `.codex/agents/prototyping-coverage-auditor.toml`
- [ ] `.codex/agents/qa-engineer.toml`
- [ ] `.codex/agents/qa-gatekeeper.toml`
- [ ] `.codex/agents/qa-lead.toml`
- [ ] `.codex/agents/qa-reviewer.toml`
- [ ] `.codex/agents/requirements-analyst.toml`
- [ ] `.codex/agents/researcher.toml`
- [ ] `.codex/agents/reviewer.toml`
- [ ] `.codex/agents/runtime-gatekeeper.toml`
- [ ] `.codex/agents/test-volume-estimator.toml`
- [ ] `.codex/agents/ui-ux-reviewer.toml`
- [ ] `.codex/agents/unit-test-scope-enforcer.toml`

**Total: 40 files** (1 config + 14 implementation + 25 review)
