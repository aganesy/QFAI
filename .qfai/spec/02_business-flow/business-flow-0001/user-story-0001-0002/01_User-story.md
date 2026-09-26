# US-0001-0002: Drift Protocol 体系化

## User Story

- Parent: CAP-0001
- Goal: Systematise the principle that protects the upstream SSOT, and the Change Request procedure on drift detection (STOP → CR → approval → owner skill rerun → resume). On the story tree, a change request is a row opening `Change request:` that is appended to `decisions.md` at TODO; approval moves it to WIP, the owner skill reruns, and the row ends DONE
- Non-goals: ドリフト検出の自動化実装
- Notes: Per REQ-0007; carried over from the consolidated specs. SSOT: `.qfai/assistant/instructions/drift-protocol.md`; with the `rule/ skill/ agent/ prompt/` assistant tree, `.qfai/assistant/rule/drift-protocol.md`. Story-tree clause: discussion-20260923063306456#REQ-0012

## Legacy Source Scope

- In: v1421 layered spec-pack 構造（9 spec files + 10 \_policies files）、レイアウト検出ロジック、必須ファイルセット、
  ID フォーマットルール（US-XXXX-YYYY, AC-XXXX-YYYY, BR-XXXX-YYYY, EX-XXXX-YYYY, TC-XXXX-YYYY）、
  トレーサビリティ連鎖（discussion → specs → tests → code → verification）、参照方向ルール（upper-to-lower 禁止）、
  Escalation Hook メカニズム、Drift Protocol、Skill オーケストレーション設計契約、Steering & Governance フレームワーク
- In (story tree): the `.qfai/spec/` layout (the two tables, the policy, business-flow and contract layers, flow and
  story directories), the ID grammar, the chain BF → US → AC → EX ← BR, the test annotation layers, the mdschema
  entries for the tree, and the `rule/ skill/ agent/ prompt/` assistant tree
- Out: 個別 spec-XXXX の実装詳細、discussion-pack 構造（spec-0002）、CLI コマンド仕様、テストランナー実装

## Source Provenance

- Spec scope: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/01_Spec.md#scope`
- Story block: `.qfai/evidence/migration-spec-to-story/retired/spec-0001/02_User-stories.md#us-0001-0007`
