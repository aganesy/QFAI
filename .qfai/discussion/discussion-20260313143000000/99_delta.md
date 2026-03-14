# 99_delta

## Change History

| Date       | Change Type | Section        | Summary                                                                 | Rationale                                                                       |
| ---------- | ----------- | -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 2026-03-13 | adopted     | 01_Context     | Spec Diff Protocol (SDP) の背景・目標・制約を記録                       | ユーザー要望に基づくスキルパイプライン改善                                      |
| 2026-03-13 | adopted     | 02_Inception   | 3層アーキテクチャ（差分検出 → 状態分析 → インクリメンタル実行）を採用   | 複合判定で漏れ防止、verify フルスキャンで品質ゲート維持                         |
| 2026-03-13 | adopted     | 06_REQ         | REQ-0001〜REQ-0013 を定義。共通 Protocol + 各スキル改修 + Evidence 拡張 | ユーザー確認の4つの決定（複合判定、verify フル、SKILL.md のみ、共通先行）を反映 |
| 2026-03-13 | adopted     | 11_OQ-Register | OQ-0001〜OQ-0006 を全て resolved                                        | AskUserQuestion による明示的なユーザー確認と agent 判断                         |

## Change Types

- `adopted`: Decision accepted and applied to artifacts.
- `rejected`: Option considered but not adopted (include Recurrence Prevention).
- `drift`: Scope or direction change during discussion.
- `correction`: Error fix in existing content.

## Rejected Decisions

| Date       | OQ-ID   | Rejected Option          | Reason                                                       | Recurrence Prevention                                                       |
| ---------- | ------- | ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 2026-03-13 | OQ-0001 | A) git diff のみ         | 単一ソースでは git 不可環境での検出漏れリスク                | 差分検出は必ず複数ソースの union で行うこと                                 |
| 2026-03-13 | OQ-0001 | B) timestamp のみ        | ファイルシステムの mtime 精度に依存し信頼性が低い            | timestamp は補助ソースとしてのみ使用し、単独判定に使わない                  |
| 2026-03-13 | OQ-0001 | C) delta.md パースのみ   | delta.md の記載漏れリスクがあり、自動検出としては不完全      | delta.md は変更意図の補強情報としてのみ使用する                             |
| 2026-03-13 | OQ-0002 | B) インクリメンタル対応  | 品質ゲートの見落としリスクが許容できない                     | /qfai-verify は常にフルスキャンであることを明示的に制約として記録           |
| 2026-03-13 | OQ-0003 | B) SKILL.md + TypeScript | ビルド・テスト影響が大きく v1.5.5 のタイムラインに収まらない | TypeScript 変更が必要になった場合は別バージョンの discussion を起票すること |

## Drift Events

| Date | Trigger | Impact Assessment | Files Updated |
| ---- | ------- | ----------------- | ------------- |
| -    | -       | -                 | -             |
