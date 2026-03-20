# 14 Review Request

## レビューリクエスト

- **Target**: `discussion-20260320000941109`
- **Scope**: discussion
- **作成日**: 2026-03-20
- **ステータス**: pending
- **OQ オープン件数**: 0
- **Roster SSOT**: `.qfai/assistant/steering/review-roster.yml`

## レビュー対象ファイル

| ファイル                  | 変更種別 | 重要度 |
| ------------------------- | -------- | ------ |
| `01_Context.md`           | 新規作成 | 高     |
| `11_OQ-Register.md`       | 新規作成 | 高     |
| `12_OQ-Resolution-Log.md` | 新規作成 | 中     |
| `13_Deferred.md`          | 新規作成 | 低     |
| `14_Review-Request.md`    | 新規作成 | 中     |
| `99_delta.md`             | 新規作成 | 高     |

## レビューロスター（review-roster.yml より）

| レビュアー ID            | 名前                      | 必須チェック項目                                                                                          | N/A 可否                           |
| ------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| qa-lead                  | Quality Lead              | スコープ・目的・要件の完全性確認、リスク・品質・受入準備の確認                                             | 不可                               |
| qa-gatekeeper            | QA Gatekeeper             | ゲート基準とブロッカー対処ルールの確認、レビューサイクル再起動挙動の確認                                   | 不可                               |
| reviewer                 | Independent Reviewer      | 一貫性と独立した合否判断の確認、エビデンスと根拠のレビュー可能性確認                                       | 不可                               |
| code-reviewer            | Code Reviewer             | 保守性と実装リスクシグナルの確認、下流コーディングへのデザイン意図の実行可能性確認                         | 可（実装影響がない場合）           |
| architect-reviewer       | Architect Reviewer        | アーキテクチャ制約と技術整合性の確認、決定トレードオフと却下オプション根拠の確認                           | 可（アーキテクチャ影響がない場合） |
| qa-reviewer              | QA Reviewer               | テスト可能性・エッジケース・失敗パスカバレッジの確認、未解決・延期項目の明示性確認                         | 可（品質影響がない場合）           |
| frontend-reviewer        | Frontend Reviewer         | UI/UX・アクセシビリティ・インタラクション影響の確認                                                        | 可（フロントエンド影響なし）       |
| backend-reviewer         | Backend Reviewer          | バックエンド/API/データ整合性影響の確認                                                                    | 可（バックエンド影響なし）         |
| design-review-lead       | Design Review Lead        | 要件/設計整合性と構造品質の確認                                                                            | 可（製品/設計変更がない場合）      |
| runtime-gatekeeper       | Runtime Gatekeeper        | 運用準備とランタイムリスクコントロールの確認                                                                | 可（ランタイム/運用影響なし）      |
| devils-advocate          | Devil's Advocate          | 全仮定・結論・設計判断への挑戦、具体的代替案の提示                                                         | 不可                               |
| pattern-doubler          | Pattern Doubler           | ID付き項目の2倍化要求、不足観点の特定と具体的追加提案                                                      | 可（ID付きスペック項目なし）       |
| integrated-uiux-reviewer | Integrated UI/UX Reviewer | UI/UX・デザイン・画面遷移・ナビゲーション横断一貫性の確認、Design Token/HTML Mock/Mermaid Flow 整合性確認   | 可（UI/UX 変更なし）               |

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
- [ ] devils-advocate: PASS
- [ ] pattern-doubler: PASS または N/A（根拠あり）
- [ ] integrated-uiux-reviewer: PASS または N/A（根拠あり）

## レビュアーへの注意事項

- 本変更は v1.6.2 CLI 開発ツールキットの堅牢化リリースに関する discussion である
- 対象: サブエージェントロスター形式化、完了コントラクト堅牢化、エビデンスコントラクト堅牢化、並列ディスパッチルール、docs/wrappers/assets テスト同期
- フロントエンド/バックエンド/ランタイム影響は最小（設計・ルール文書の改訂のみのため）
