# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-03-07
- Primary: spec-0003 初回作成
- Tags: report, layered-spec, v1.5.3
- Summary: spec-0003（qfai report）のレイヤードスペック形式での初回作成

## Rationale

- QFAI v1.5.3 でレガシーな spec-pack 形式（単一18ファイルバンドル）からレイヤードスペック形式（`_policies/` + `spec-XXXX/`）へ移行した
- report コマンドのスペックを新形式で定義し、Markdown/JSON レポート生成の実装・テストの基盤とする

## Candidates Considered

1. レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
2. レガシー spec-pack 形式（単一18ファイルバンドル）

## Adopted

- Adopted: レイヤードスペック形式（`_policies/` + `spec-XXXX/`）
- Why: report は validate（spec-0002）に依存するため、CAP 単位でスペックを分離することで依存関係が明確になり、独立したレビュー・実装が可能になる
- Evidence: `_policies/08_Decisions.md`, v1.5.3 マイグレーションガイド

## Rejected

- Candidate: レガシー spec-pack 形式（単一18ファイルバンドル）
- Reason: report と validate を同一バンドルに格納すると、依存関係が暗黙的になり、スペック間のトレーサビリティが損なわれる
- DO NOT: spec-pack 形式（単一18ファイルバンドルに全スペックを格納する方式）に戻さないこと
- Temptation: 単一ファイルの方がシンプルに見えるが、複数 CAP のスケーラビリティが損なわれる。report は validate に依存する独立した CAP であり、スペックを分離することで変更影響範囲が限定され、並行開発が容易になる

## Impact

- Affects: `.qfai/specs/spec-0003/` 配下の全ファイル（01_Spec ~ 10_Plan）、`packages/qfai/src/core/report.ts`、`packages/qfai/src/cli/commands/report.ts`
- Validation: `qfai validate` でレイヤードスペック形式の必須ファイル検証（E_SPEC_MISSING_FILESET）が通過すること

## Follow-ups

- spec-0003 の実装着手（10_Plan.md に基づく）
- validate.json スキーマの contract 定義確認（spec-0002 との整合性）
- Owner: 実装担当者
- Due: TBD
