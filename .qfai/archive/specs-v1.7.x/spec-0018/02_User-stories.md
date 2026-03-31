# 02 User Stories

3 items.

## US-0018-0001: Codex サブエージェント利用

- As a: QFAI 開発者（Codex ユーザー）
- I want: Codex 環境でロール特化サブエージェントを利用できる
- So that: Claude Code / GitHub Copilot と同等のエージェント委譲ワークフローを Codex でも実行できる
- Parent: CAP-0018

## US-0018-0002: レビュー系エージェントの読み取り専用制約

- As a: QFAI 開発者（Codex ユーザー）
- I want: レビュー/分析系エージェントが read-only サンドボックスで動作する
- So that: レビュー系エージェントが誤ってコードベースを変更するリスクを防止できる
- Parent: CAP-0018

## US-0018-0003: Codex 全体設定

- As a: QFAI 開発者（Codex ユーザー）
- I want: config.toml でエージェントの並列度と委譲深度のデフォルトが設定されている
- So that: エージェントの挙動が予測可能で、追加設定なしに利用開始できる
- Parent: CAP-0018
