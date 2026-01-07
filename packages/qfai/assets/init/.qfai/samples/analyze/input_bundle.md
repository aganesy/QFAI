# analyze 入力バンドル（サンプル）

> 目的: `analyze` 用の入力をブレなく用意するための完成例です。
> 本ファイルは架空の小規模機能を題材にしています。自プロジェクトではコピーして編集してください。

## Project Context

- 対象機能: パスワードリセット（メールでワンタイムリンクを送る）
- 前提/制約:
  - リンクは 15 分で失効
  - 送信頻度制限（IP + アカウント単位）
  - 失効後は再送が必要
- 対象外（Non-goals）:
  - 多要素認証
  - 端末認証

## Spec Excerpts

- ユーザーがメールアドレスを入力すると、登録済みならリセットリンクを送る
- 未登録メールでも挙動は同じに見せる（ユーザー列挙防止）
- リンクは 15 分で失効し、失効後はエラーを表示する

## Scenario Excerpts

- Given 登録済みユーザーがいる
  When パスワードリセットを要求する
  Then リセットメールが送信される
- Given 未登録のメールアドレス
  When パスワードリセットを要求する
  Then 同じメッセージが表示される（送信の有無は漏らさない）
- Given 期限切れのリセットリンク
  When リセットリンクを開く
  Then 期限切れとして扱われ、再送導線が提示される

## Test Excerpts

- unit: `requestPasswordReset` は常に成功レスポンスを返す（登録有無を分岐しない）
- unit: `verifyResetToken` は失効時に `TokenExpired` を返す
- integration: 送信頻度制限が発動した場合でも同じメッセージを返す

## Contract / Trace Links

- Spec: SPEC-RESET-001 → Scenario: SC-RESET-001, SC-RESET-002, SC-RESET-003
- Scenario: SC-RESET-003 → Test: tests/auth/reset.test.ts#expired

## Open Concerns

- 送信頻度制限のしきい値（運用で調整するか、固定か）
- 期限切れ時のUX（単に失敗か、再送導線を必須にするか）

## Non-goals

- メール配信基盤の冗長化
- 監査ログの永続化
