# 99_delta

## 変更ログ

| Date       | Change Type     | Description                                                              | Affected Files                                            |
| ---------- | --------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| 2026-03-22 | Initial         | ディスカッションパック初版作成                                           | 全15ファイル                                              |
| 2026-03-22 | Review Feedback | Devils-Advocate advisory 反映: REQ-0007/0008 追加、OQ-0006 deferred 追加 | 06_REQ, 11_OQ-Register, 12_OQ-Resolution-Log, 13_Deferred |

## Drift Events

（なし）

## Rejected Options — Recurrence Prevention

| OQ-ID   | Rejected Option                    | Reason                           | Recurrence Note                                        |
| ------- | ---------------------------------- | -------------------------------- | ------------------------------------------------------ |
| OQ-0001 | (B) 独立関数 syncInstructionsFiles | 配置ロジック分散による一貫性低下 | .github/ 生成は syncIntegrationWrappers に集約する方針 |
| OQ-0002 | (B) init.ts 内ハードコード         | 長文テンプレートの可読性低下     | 70行超のテンプレートはアセットファイル管理が原則       |
| OQ-0003 | (A) 配置と SDD 追記の同時実装      | スコープ肥大                     | 独立した機能は別スペックで管理                         |
| OQ-0003 | (B) SDD 追記を v1.6.4 送り         | 不要な先送り                     | 別スペックで v1.6.3 内着手可能                         |
