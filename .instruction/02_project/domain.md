---
category: project
update-frequency: occasional
dependencies: none
version: 1.0.0
---

# ドメイン概要（QFAI Toolkit）

QFAI supports discussion, story-tree authoring, contracts, tests, validation
and reporting.

## 主な構成要素

- `.qfai/spec/01_policy/`: project objective, initiative, principle, glossary
  and constraints.
- `.qfai/spec/02_business-flow/`: business-flow index, BF directories, and
  their US, AC and EX files. This repository has four flows: development,
  pull request CI, workspace diagnosis, and spec-pack migration.
- `.qfai/spec/03_contract/`: contract index, technology and structure rules,
  and contracts grouped by kind. API, DB, UI and design contracts retain their
  `QFAI-CONTRACT-ID: CON-<TYPE>-<NUMBER>` declarations. CLI contracts use
  `CLI-*` short IDs in `contracts.md`.
- `.qfai/spec/decisions.md` and `open-questions.md`: project-wide decision and
  question tables. Explicit `DG-NNNN` entries in policy and contract Markdown
  supply decision guardrails.
- `.qfai/discussion/`: discussion packs, the optional upstream input to a spec.
- `.qfai/assistant/`: the assistant tree — `rule/`, `skill/`, `agent/`,
  `prompt/`, plus project-local `skill.local/` where needed.
- `.qfai/evidence/`: the per-run evidence a skill is required to write.
- `.qfai/steering/`, `.qfai/review/`: work-log entries and review packs.
- `.qfai/report/`: where `validate` and `report` write.
- `qfai.config.yaml`: パス/検証ルール/出力設定

## ID とトレーサビリティ

The chain is `BF → US → AC → EX ← BR`. A BF contains stories; each EX names
one AC; each BR lives in a contract and cites one or more EX IDs.

| ID             | Declared in                                                |
| -------------- | ---------------------------------------------------------- |
| `BF-NNNN`      | `business-flow-NNNN/business-flow.md`                      |
| `US-NNNN-NNNN` | `business-flow-NNNN/user-story-NNNN-NNNN/01_User-story.md` |
| `AC-…-NN`      | `user-story-NNNN-NNNN/02_Acceptance-Criteria.md`           |
| `EX-…-NN`      | `user-story-NNNN-NNNN/03_Example.md`                       |
| `BR-NNNN`      | a contract under `.qfai/spec/03_contract/`                 |

Tests annotate BF in E2E, AC in integration or API, and EX in a selected
non-E2E test. `validate` checks IDs, links, layers and uncovered obligations.

Full grammar: `02_project/naming.md`.

詳細な命名規約は `02_project/naming.md` を参照してください。
