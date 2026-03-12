# 14_Review-Request

## レビュー依頼

- **Discussion Pack**: `.qfai/discussion/discussion-20260312140531704/`
- **対象ファイル**: 01〜13, 99（全 15 ファイル）
- **フェーズ**: discussion
- **OQ open count**: 0
- **REQ 数**: 6（REQ-0001〜REQ-0006）
- **NFR 数**: 4（NFR-0001〜NFR-0004）
- **Deferred 数**: 0

## レビュー依頼先（review-roster.yml 準拠）

| Reviewer ID | 名称 | can_be_na | 判定 |
| --- | --- | --- | --- |
| qa-lead | Quality Lead | false | PASS |
| qa-gatekeeper | QA Gatekeeper | false | PASS |
| reviewer | Independent Reviewer | false | PASS |
| code-reviewer | Code Reviewer | true | PASS |
| architect-reviewer | Architect Reviewer | true | PASS |
| qa-reviewer | QA Reviewer | true | PASS |
| frontend-reviewer | Frontend Reviewer | true | N/A — フロントエンド UI 影響なし |
| backend-reviewer | Backend Reviewer | true | N/A — バックエンド/API/データ影響なし |
| design-review-lead | Design Review Lead | true | PASS |
| runtime-gatekeeper | Runtime Gatekeeper | true | N/A — ランタイム/運用影響なし |

## 依頼事項

各レビュアーは `must_check` に基づき、`PASS` / `FAIL` / `N/A` を判定してください。
`FAIL` が1つでも出た場合、即修正→ roster 先頭から再レビューとなります。
