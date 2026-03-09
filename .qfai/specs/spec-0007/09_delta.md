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
