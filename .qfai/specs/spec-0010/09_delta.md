# 09 Delta

## Change Summary

- Change ID: DELTA-0010-0001
- Date: 2026-03-09
- Primary: spec-0010 初回作成
- Tags: steering, governance, framework-spec, layered-spec
- Summary: CAP-0010（Steering & Governance）のレイヤードスペック形式での初回作成

## Rationale

- discussion-20260309025837892 で承認された C-3 案に基づき、Steering/Instructions/Review Roster/Constitution/Canonical Workflow Stages の設計契約をフレームワーク設計仕様として仕様化
- steering/*.md および instructions/*.md が運用 SSOT、spec は設計契約と位置づけ定義を記録

## Candidates Considered

1. Steering/Instructions ファイルの内容を spec にフルコピー
2. spec は設計契約と位置づけを記録し、Steering/Instructions ファイルを SSOT として維持（採用）
3. Steering/Instructions ファイルを廃止し spec に一元化

## Adopted

- Adopted: spec は設計契約と位置づけを記録し、Steering/Instructions ファイルを SSOT として維持
- Why: Steering/Instructions ファイルは AI エージェントが各ステージ開始時に直接参照する運用 SSOT であり、spec フォーマットでは運用不可
- Evidence: discussion-20260309025837892/99_delta.md

## Rejected

- Candidate: Steering/Instructions ファイルの内容を spec にフルコピー
- Reason: 二重管理コストが高く、不整合リスクが増大
- DO NOT: Steering/Instructions ファイルの運用詳細を spec にフルコピーしない
- Temptation: 「spec だけで完結させたい」と感じた時

- Candidate: Steering/Instructions ファイルを廃止し spec に一元化
- Reason: これらのファイルは AI エージェントが直接参照する SSOT であり、spec フォーマットでは運用不可
- DO NOT: Steering/Instructions ファイルを廃止しない
- Temptation: 「二重管理を根本解消したい」と感じた時

## Impact

- Affects: `.qfai/specs/spec-0010/` 配下の全ファイル、`_policies/03_Capabilities.md`、`_policies/04_Business-Flow.md`、`_policies/06_Glossary.md`
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行・証跡記録
- Owner: /qfai-sdd（本スキル）
- Due: 本バッチ完了時
