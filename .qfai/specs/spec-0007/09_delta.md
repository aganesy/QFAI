# 09 Delta

## Change Summary

- Change ID: DELTA-0007-0001
- Date: 2026-03-09
- Primary: spec-0007 初回作成
- Tags: skill-orchestration, framework-spec, layered-spec
- Summary: CAP-0007（Skill Orchestration）のレイヤードスペック形式での初回作成

## Rationale

- discussion-20260309025837892 で承認された C-3 案（4 CAP 分割）に基づき、9 つの Skill の設計契約をフレームワーク設計仕様として仕様化
- SKILL.md（運用 SSOT）と specs（設計意図）の二層管理方針を採用

## Candidates Considered

1. SKILL.md の内容を spec にフルコピー
2. SKILL.md を廃止し spec に一元化
3. spec は設計意図を記録し、SKILL.md を運用 SSOT として維持（採用）

## Adopted

- Adopted: spec は設計意図を記録し、SKILL.md を運用 SSOT として維持
- Why: SKILL.md は AI エージェントが直接参照する運用 SSOT であり、spec のフォーマットでは運用不可。二重管理コストより SSOT 分離の整合性を優先
- Evidence: discussion-20260309025837892/99_delta.md (OQ-0002 解決)

## Rejected

- Candidate: SKILL.md の内容を spec にフルコピー
- Reason: 二重管理コストが高く、不整合リスクが増大
- DO NOT: SKILL.md の実装詳細を spec にフルコピーしない
- Temptation: 「spec だけで完結させたい」と感じた時

- Candidate: SKILL.md を廃止し spec に一元化
- Reason: SKILL.md は AI エージェントが直接参照する SSOT であり、spec フォーマットでは運用不可
- DO NOT: SKILL.md を廃止しない
- Temptation: 「二重管理を根本解消したい」と感じた時

## Impact

- Affects: `.qfai/specs/spec-0007/` 配下の全ファイル、`_policies/03_Capabilities.md`、`_policies/04_Business-Flow.md`、`_policies/06_Glossary.md`
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行・証跡記録
- Owner: /qfai-sdd（本スキル）
- Due: 本バッチ完了時

---

### DELTA-0007-0002 (2026-03-10)

- **Primary**: 10_Plan.md に関連スペックセクション追加（spec-0008 双方向参照）
- **Tags**: cross-reference, skill-agent, GAP-06

#### Adopted

- 10_Plan.md の関連スペックセクションに1行追加
- **Rationale**: 01_Spec.md Consumer View は安定を維持し、10_Plan.md で参照追加が自然（OQ-0006 解決）

#### Impact

- spec-0007/10_Plan.md

---

### DELTA-0007-0003 (2026-03-12)

- **Primary**: AskUserQuestion Protocol 拡張（REQ-0005 追加、US/AC/BR/EX/TC 拡張）
- **Tags**: ask-user-question, protocol, skill-extension
- **Source**: discussion-20260312140531704

#### Adopted

- spec-0007 に AskUserQuestion Protocol の設計契約を追加
- REQ-0005 新設、US-0007-0005、AC-0007-0006〜0008、BR-0007-0017〜0022、EX-0007-0017〜0022、TC-0007-0017〜0022 を追加
- \_policies/06_Glossary.md に AskUserQuestion 関連用語 2 件追加
- **Rationale**: discussion pack レビュー PASS（全 reviewer 承認）。全 9 SSOT スキルに統一的な質問プロトコルを定義し、エージェント体験の一貫性を向上

#### Rejected

- DO NOT: AskUserQuestion Protocol セクションを一部スキルにのみ適用しない
- Temptation: 「deprecated スキルには不要」と感じた時。全 9 スキルへの一貫適用が承認済み

#### Impact

- spec-0007/01_Spec.md: REQ-0005 追加、US range 更新
- spec-0007/02_User-stories.md: US-0007-0005 追加
- spec-0007/03_Acceptance-Criteria.md: AC-0007-0006〜0008 追加
- spec-0007/04_Business-Rules.md: BR-0007-0017〜0022 追加
- spec-0007/05_Examples.md: EX-0007-0017〜0022 追加
- spec-0007/06_Test-Cases.md: TC-0007-0017〜0022 追加
- spec-0007/10_Plan.md: 成果物・検証テーブル・リスク更新
- \_policies/06_Glossary.md: AskUserQuestion 用語追加
- \_policies/10_delta.md: 本 DELTA エントリ追加
