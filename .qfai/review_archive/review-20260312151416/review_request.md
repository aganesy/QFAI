# Review Request — spec-0007 DELTA-0007-0003

- Target: spec-0007 AskUserQuestion Protocol 拡張
- Source: discussion-20260312140531704
- Branch: feature/v1.5.4
- Requested: 2026-03-12

## 変更概要

spec-0007 (CAP-0007: Skill Orchestration) に AskUserQuestion Protocol の設計契約を追加:

- REQ-0005 新設
- US-0007-0005 追加
- AC-0007-0006〜0008 追加（Gherkin）
- BR-0007-0017〜0022 追加
- EX-0007-0017〜0022 追加
- TC-0007-0017〜0022 追加（L-struct）
- DELTA-0007-0003 記録
- 10_Plan.md 更新
- \_policies/06_Glossary.md 用語更新
- \_policies/10_delta.md 更新

## Validate 結果

error=29 (全て既存), warning=21, info=3。spec-0007 固有の新規エラーなし。

## トレーサビリティ

REQ-0005 → US-0007-0005 → AC-0007-0006〜0008 → BR-0007-0017〜0022 → EX-0007-0017〜0022 → TC-0007-0017〜0022

チェーン完結。孤立アーティファクトなし。
