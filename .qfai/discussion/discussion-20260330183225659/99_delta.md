# 99 Delta

## Change History

| Date       | Change Type | Section | Summary | Rationale |
| ---------- | ----------- | ------- | ------- | --------- |
| 2026-03-30 | adopted | 01_Context | ディスカッション初期コンテキスト作成 | ユーザー要求に基づく |
| 2026-03-30 | adopted | 02_Inception-Deck | 4ソース統合差分検出 + トレーサビリティチェックのソリューション設計 | spec-0011既存仕様との整合性確保 |
| 2026-03-30 | adopted | 03_Story-Workshop | US-001〜US-004のストーリーとExample Seeds定義 | 全エージェント共通問題の解消 |
| 2026-03-30 | adopted | 06_REQ | REQ-0001〜REQ-0014の機能要件定義 | spec-0011準拠 + ユーザー追加要求 |
| 2026-03-30 | adopted | 11_OQ-Register | OQ-0001〜OQ-0005 全件resolved | ユーザー確認 + spec-0011決定事項 |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option | Reason | Recurrence Prevention |
| ---------- | ------- | --------------- | ------ | --------------------- |
| 2026-03-30 | OQ-0001 | Option A: origin/main固定 | カスタマイズ不可はプロジェクト多様性に対応できない | config設定を必ず用意するポリシーを維持 |
| 2026-03-30 | OQ-0002 | Option C: 完全セマンティック解析 | 実装コスト高、段階的改善で対応 | Phase 1はファイルレベル、Phase 2で拡張する設計を維持 |
| 2026-03-30 | OQ-0003 | Option B: エラー停止 | 「specの指定が無いから作業できない」問題の再発 | フォールバック動作を必ず用意するポリシーを維持 |
| 2026-03-30 | OQ-0005 | Option B: 全件自動実行 | implementは1spec単位の設計原則に反する | implementの1spec設計を守るガードレールを維持 |

## Drift Events

| Date       | Trigger | Impact Assessment | Files Updated |
| ---------- | ------- | ----------------- | ------------- |
| 2026-03-30 | ユーザーがスコープを拡張（差分検出 + トレーサビリティ完全性チェック + validate拡張） | 当初の「spec引数省略時の自動検出」から「spec-実装整合性チェック」まで拡張。REQ-0009追加 | 01_Context, 03_Story-Workshop, 05_Scope, 06_REQ, 07_NFR |
