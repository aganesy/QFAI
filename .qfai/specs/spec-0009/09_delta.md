# 09 Delta

## Change Summary

- Change ID: DELTA-0009-0001
- Date: 2026-03-09
- Primary: spec-0009 初回作成
- Tags: traceability, spec-architecture, framework-spec, layered-spec
- Summary: CAP-0009（Traceability & Spec Architecture）のレイヤードスペック形式での初回作成

## Rationale

- discussion-20260309025837892 で承認された C-3 案に基づき、トレーサビリティ連鎖構造と Layered Spec Architecture の設計思想をフレームワーク設計仕様として仕様化
- 既存の .qfai/specs/README.md および .qfai/assistant/instructions/drift-protocol.md の設計原則を spec レベルで体系化

## Candidates Considered

1. README.md と drift-protocol.md の内容をそのまま spec にコピー
2. spec は設計原則と検証ルールを記録し、README.md/drift-protocol.md を SSOT として維持（採用）
3. README.md を廃止し spec に一元化

## Adopted

- Adopted: spec は設計原則と検証ルールを記録し、README.md/drift-protocol.md を SSOT として維持
- Why: README.md はリポジトリ構造の即座の参照ガイドとして必要。drift-protocol.md は instructions の一部として AI エージェントが直接参照する
- Evidence: discussion-20260309025837892/99_delta.md

## Rejected

- Candidate: README.md/drift-protocol.md の内容をそのまま spec にコピー
- Reason: 二重管理コストが高く、不整合リスクが増大
- DO NOT: SSOT ドキュメントの内容を spec にフルコピーしない
- Temptation: 「spec だけで完結させたい」と感じた時

- Candidate: README.md を廃止し spec に一元化
- Reason: README.md はリポジトリ構造の即座の参照ガイドとして開発者が直接参照する
- DO NOT: README.md を廃止しない
- Temptation: 「二重管理を根本解消したい」と感じた時

## Impact

- Affects: `.qfai/specs/spec-0009/` 配下の全ファイル、`_policies/03_Capabilities.md`、`_policies/04_Business-Flow.md`、`_policies/06_Glossary.md`
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行・証跡記録
- Owner: /qfai-sdd（本スキル）
- Due: 本バッチ完了時
