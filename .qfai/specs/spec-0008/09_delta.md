# 09 Delta

## Change Summary

- Change ID: DELTA-0008-0001
- Date: 2026-03-09
- Primary: spec-0008 初回作成
- Tags: agent-delegation, framework-spec, layered-spec
- Summary: CAP-0008（Agent Delegation）のレイヤードスペック形式での初回作成

## Rationale

- discussion-20260309025837892 で承認された C-3 案に基づき、39 エージェントの設計契約と Orchestrator Protocol をフレームワーク設計仕様として仕様化
- エージェント定義ファイル（agent/*.md）が運用 SSOT、spec はサマリーカタログと設計意図を記録

## Candidates Considered

1. 各エージェントの全契約を spec にフル展開（39 × 6 セクション）
2. spec にサマリーカタログのみ記載し、SSOT は agent 定義ファイルを維持（採用）
3. agent 定義ファイルを廃止し spec に一元化

## Adopted

- Adopted: spec にサマリーカタログのみ記載し、SSOT は agent 定義ファイルを維持
- Why: 39 × 6 セクションのフル展開は大量の重複を生み、agent 定義ファイルが SSOT としての役割を持つ
- Evidence: discussion-20260309025837892/99_delta.md (OQ-0003 解決)

## Rejected

- Candidate: 各エージェントの全契約を spec にフル展開
- Reason: 39 × 6 セクション = 大量の重複。agent 定義ファイルが SSOT
- DO NOT: agent 定義の全量を spec に展開しない
- Temptation: 「specs で全情報を網羅したい」と感じた時

- Candidate: agent 定義ファイルを廃止し spec に一元化
- Reason: agent 定義ファイルは AI エージェントが直接参照する SSOT であり、spec フォーマットでは運用不可
- DO NOT: agent 定義ファイルを廃止しない
- Temptation: 「二重管理を根本解消したい」と感じた時

## Impact

- Affects: `.qfai/specs/spec-0008/` 配下の全ファイル、`_policies/03_Capabilities.md`、`_policies/06_Glossary.md`
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行・証跡記録
- Owner: /qfai-sdd（本スキル）
- Due: 本バッチ完了時

---

### DELTA-0008-0002 (2026-03-10)

- **Primary**: 10_Plan.md に関連スペックセクション追加（spec-0007 双方向参照）
- **Tags**: cross-reference, agent-skill, GAP-06

#### Adopted

- 10_Plan.md の関連スペックセクションに1行追加
- **Rationale**: spec-0007 と対称的に双方向参照を完成（OQ-0006 解決）

#### Impact

- spec-0008/10_Plan.md
