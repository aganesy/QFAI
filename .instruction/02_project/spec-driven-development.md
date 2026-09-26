---
category: project
update-frequency: occasional
dependencies:
  - 00_universal/thinking.md
  - 00_universal/quality.md
  - 00_universal/communication.md
  - 01_specialties/planning.md
  - 01_specialties/testing.md
  - 02_project/development.md
  - 02_project/tech-stack.md
  - 02_project/patterns.md
version: 1.0.0
---

# 仕様書駆動開発（QFAI Toolkit）運用ガイド

QFAI treats the story tree under `.qfai/spec/` as the specification source.
The discussion pack supplies upstream context. Contract rules derive from
examples in the business flows.

## 全体フロー（成果物ベース）

```text
.qfai/discussion (upstream input when available)
        ↓
.qfai/spec/01_policy
        ↓
.qfai/spec/02_business-flow (BF → US → AC → EX)
        ↓
.qfai/spec/03_contract (BR → EX)
        ↓
qfai validate → .qfai/report/validate.json
        ↓
qfai report → .qfai/report/report.md
```

## フェーズ別の要点

### Phase 0: 要件の取り込み

- A discussion pack under `.qfai/discussion/` is the usual input, and it is
  optional. A spec set taken in without one is recorded as import-lite evidence
  instead.

### Phase 1: Policy and business flows

- Write policy first, then each concrete business flow and its stories,
  acceptance criteria and examples. This repository groups its stories into
  four flows: development, pull request CI, workspace diagnosis, and migration.
- Each story has `01_User-story.md`, `02_Acceptance-Criteria.md` and
  `03_Example.md`. Each EX cites one AC. See `02_project/naming.md`.
- Record decisions and unresolved questions in `decisions.md` and
  `open-questions.md`. Explicit `DG-NNNN` entries in policy or contract Markdown
  supply decision guardrails.

### Phase 2: Contracts の作成

- Write contract rules from the agreed examples. A BR belongs to one contract
  and cites the EX IDs it explains.
- Place contracts under `.qfai/spec/03_contract/` and keep
  `03_contract/contracts.md` current. API, DB, UI and design contracts retain
  their `QFAI-CONTRACT-ID` declarations; CLI contracts use indexed `CLI-*` IDs.

### Phase 3: 検証とレポート

- `npx qfai validate --fail-on error` でエラー 0 を確認
- `npx qfai report` でレポートを生成する

## 品質ゲート（最低限）

- Each business flow and story has its required files and valid IDs.
- The `BF → US → AC → EX ← BR` links resolve, with no undeclared ID.
- Every BF has an E2E test, every AC an integration or API test, and every EX
  a selected non-E2E test, unless a `DONE` decision row exempts its own item.
- Contract index entries resolve to their files.
- `validate` の error が 0

## 実装に進む前の確認

- 既存の実装パターンは `.instruction/02_project/patterns.md` を参照
- 不明点が残る場合は実装せず質問する
