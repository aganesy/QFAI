# 14 Review Request

## レビューリクエスト

- **Discussion Pack**: `discussion-20260314053646704`
- **トピック**: 全 QFAI スキルにおける AskUserQuestion ツール使用の MUST 化
- **作成日**: 2026-03-14
- **ステータス**: レビュー依頼中
- **OQ オープン件数**: 0
- **REQ 件数**: 6
- **NFR 件数**: 6

## レビュー対象ファイル

| ファイル | 変更種別 | 重要度 |
| -------- | -------- | ------ |
| `01_Context.md` | 新規作成 | 高 |
| `02_Inception-Deck.md` | 新規作成 | 高 |
| `03_Story-Workshop.md` | 新規作成 | 高 |
| `04_Sources.md` | 新規作成 | 中 |
| `05_Scope.md` | 新規作成 | 高 |
| `06_REQ.md` | 新規作成 | 高 |
| `07_NFR.md` | 新規作成 | 高 |
| `08_Glossary.md` | 新規作成 | 中 |
| `09_Constraints.md` | 新規作成 | 高 |
| `10_Policy.md` | 新規作成 | 高 |
| `11_OQ-Register.md` | 新規作成 | 高 |
| `12_OQ-Resolution-Log.md` | 新規作成 | 中 |
| `13_Deferred.md` | 新規作成 | 低 |
| `14_Review-Request.md` | 新規作成 | 中 |
| `99_delta.md` | 新規作成 | 高 |

## レビューロスター（review-roster.yml より）

| レビュアー ID | 名前 | 必須チェック項目 | N/A 可否 |
| ------------- | ---- | ---------------- | -------- |
| qa-lead | Quality Lead | スコープ・目的・要件の完全性確認、リスク・品質・受入準備の確認 | 不可 |
| qa-gatekeeper | QA Gatekeeper | ゲート基準とブロッカー対処ルールの確認、レビューサイクル再起動挙動の確認 | 不可 |
| reviewer | Independent Reviewer | 一貫性と独立した合否判断の確認、エビデンスと根拠のレビュー可能性確認 | 不可 |
| code-reviewer | Code Reviewer | 保守性と実装リスクシグナルの確認、下流コーディングへのデザイン意図の実行可能性確認 | 可（実装影響がない場合） |
| architect-reviewer | Architect Reviewer | アーキテクチャ制約と技術整合性の確認、決定トレードオフと却下オプション根拠の確認 | 可（アーキテクチャ影響がない場合） |
| qa-reviewer | QA Reviewer | テスト可能性・エッジケース・失敗パスカバレッジの確認、未解決・延期項目の明示性確認 | 可（品質影響がない場合） |
| frontend-reviewer | Frontend Reviewer | UI/UX・アクセシビリティ・インタラクション影響の確認 | 可（フロントエンド影響なし） |
| backend-reviewer | Backend Reviewer | バックエンド/API/データ整合性影響の確認 | 可（バックエンド影響なし） |
| design-review-lead | Design Review Lead | 要件/設計整合性と構造品質の確認 | 可（製品/設計変更がない場合） |
| runtime-gatekeeper | Runtime Gatekeeper | 運用準備とランタイムリスクコントロールの確認 | 可（ランタイム/運用影響なし） |

## 完了条件

- [ ] qa-lead: PASS
- [ ] qa-gatekeeper: PASS
- [ ] reviewer: PASS
- [ ] code-reviewer: PASS または N/A（根拠あり）
- [ ] architect-reviewer: PASS または N/A（根拠あり）
- [ ] qa-reviewer: PASS または N/A（根拠あり）
- [ ] frontend-reviewer: PASS または N/A（根拠あり）
- [ ] backend-reviewer: PASS または N/A（根拠あり）
- [ ] design-review-lead: PASS または N/A（根拠あり）
- [ ] runtime-gatekeeper: PASS または N/A（根拠あり）

## レビュアーへの注意事項

- 本変更は TypeScript コード変更を含まない（マークダウンファイルのみ）
- AskUserQuestion の MUST 化は constitution.md に追加する「非交渉条項」として位置付けられる
- --auto フラグとの整合性は OQ-0002 で解決済み（POL-002 参照）
- フロントエンド/バックエンド/ランタイム影響は最小（マークダウン改訂のみのため）
