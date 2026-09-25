# 02 User Stories

## US Catalog

- US-0001-0004: トレーサビリティ連鎖定義
- US-0001-0007: Drift Protocol 体系化
- US-0001-0008: Skill オーケストレーション設計契約
- US-0001-0009: Steering & Governance フレームワーク定義
- US-0001-0010: Story tree layout
- US-0001-0011: Policy and contract layers
- US-0001-0012: Decision and open-question tables
- US-0001-0013: ID grammar
- US-0001-0014: Traceability chain BF → US → AC → EX ← BR
- US-0001-0015: Test annotation layers
- US-0001-0016: Story-tree layout described by mdschema
- US-0001-0017: Assistant tree

## US-0001-0004: トレーサビリティ連鎖定義

- Parent: CAP-0001
- Goal: discussion → specs → tests → code → verification の 5 段連鎖を定義し、各段の成果物と段間のトレーサビリティエッジを明確にする
- Non-goals: 各段の成果物フォーマット仕様（個別 spec で定義）
- Notes: REQ-0004 準拠。統合元由来

## US-0001-0007: Drift Protocol 体系化

- Parent: CAP-0001
- Goal: Systematise the principle that protects the upstream SSOT, and the Change Request procedure on drift detection (STOP → CR → approval → owner skill rerun → resume). On the story tree, a change request is a row opening `Change request:` that is appended to `decisions.md` at TODO; approval moves it to WIP, the owner skill reruns, and the row ends DONE
- Non-goals: ドリフト検出の自動化実装
- Notes: Per REQ-0007; carried over from the consolidated specs. SSOT: `.qfai/assistant/instructions/drift-protocol.md`; with the `rule/ skill/ agent/ prompt/` assistant tree, `.qfai/assistant/rule/drift-protocol.md`. Story-tree clause: discussion-20260923063306456#REQ-0012

## US-0001-0008: Skill オーケストレーション設計契約

- Parent: CAP-0001
- Goal: Define skill orchestration against the installed package's skill inventory and resolved routing, including execution order and completion obligations. The inventory has no fixed count (`.qfai/contracts/cli/assistant-routing.md#ownership-boundary`).
- Non-goals: SKILL.md の逐語的複製（SSOT は SKILL.md 自体）
- Notes: REQ-0008 準拠。統合元由来

## US-0001-0009: Steering & Governance フレームワーク定義

- Parent: CAP-0001
- Goal: Steering 文書（5 ファイル）、Instructions 文書（5 ファイル）、Review Roster（10 reviewers）、Constitution（Article I~~X）、Canonical Workflow Stages（Stage 0~~6）の設計仕様を定義する
- Non-goals: A verbatim copy of each document (the SSOT is `steering/*.md` and `instructions/*.md`; with the `rule/ skill/ agent/ prompt/` assistant tree, `.qfai/assistant/rule/*.md`)
- Notes: REQ-0009 準拠。統合元由来

## US-0001-0010: Story tree layout

- Parent: CAP-0001
- Goal: On the story tree, define the layout of `paths.specsDir`: the two tables at its root, the layers `01_policy/`, `02_business-flow/` and `03_contract/`, one directory per business flow and per user story, and a story directory that holds exactly three files
- Non-goals: The sections inside each file, which its mdschema entry and template define; what `qfai init` seeds
- Notes: discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0003, discussion-20260923063306456#DUS-001

## US-0001-0011: Policy and contract layers

- Parent: CAP-0001
- Goal: On the story tree, define the files of the policy layer and of the contract layer, the contract index that lists every contract file, and the one home of the quality-gate commands
- Non-goals: The API, DB, UI, CLI and design contract formats, which keep their shapes and IDs
- Notes: discussion-20260923063306456#REQ-0002, discussion-20260923063306456#REQ-0005

## US-0001-0012: Decision and open-question tables

- Parent: CAP-0001
- Goal: On the story tree, record every decision and every open question of the project in two append-only tables, `decisions.md` and `open-questions.md`, including triage records, change requests and retired stories
- Non-goals: The keyword grammar of the rows a validator reads, which the validate contract defines
- Notes: discussion-20260923063306456#REQ-0011, discussion-20260923063306456#REQ-0012, discussion-20260923063306456#DUS-005

## US-0001-0013: ID grammar

- Parent: CAP-0001
- Goal: On the story tree, define the seven ID shapes, where each ID is declared, how a child ID carries its parent's number, and how the next ID is chosen
- Non-goals: An ID allocation tool; renumbering during migration
- Notes: discussion-20260923063306456#REQ-0004, discussion-20260923063306456#DUS-001

## US-0001-0014: Traceability chain BF → US → AC → EX ← BR

- Parent: CAP-0001
- Goal: On the story tree, define the chain BF → US → AC → EX ← BR: each EX cites one AC of its story, and each BR, written in the contract that enforces it, cites the EXs it abstracts
- Non-goals: The finding codes validate raises, which the validate contract defines
- Notes: discussion-20260923063306456#REQ-0006, discussion-20260923063306456#REQ-0007, discussion-20260923063306456#REQ-0008, discussion-20260923063306456#DUS-002

## US-0001-0015: Test annotation layers

- Parent: CAP-0001
- Goal: On the story tree, define which ID a test annotates by its layer: an E2E test a BF, an integration or API test an AC, and every other test an EX
- Non-goals: Which skill writes which test
- Notes: discussion-20260923063306456#REQ-0009, discussion-20260923063306456#DUS-003, discussion-20260923063306456#DUS-004

## US-0001-0016: Story-tree layout described by mdschema

- Parent: CAP-0001
- Goal: Describe every Markdown file of the story tree by one mdschema manifest entry and one paired template, so the layout has one description
- Non-goals: The spec-pack entries of the manifest, which retire with the spec-pack layout
- Notes: discussion-20260923063306456#REQ-0022, discussion-20260923063306456#NFR-0006

## US-0001-0017: Assistant tree

- Parent: CAP-0001
- Goal: With the `rule/ skill/ agent/ prompt/` assistant tree, define the top-level directories of `.qfai/assistant/` and where a file shared by several readers goes
- Non-goals: The content of each rule file; the list of moved files, which the init contract gives
- Notes: discussion-20260923063306456#REQ-0017, discussion-20260923063306456#REQ-0018; OQ-0177
