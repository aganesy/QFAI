# 02 User Stories

3 items.

## US-0020-0001: 全画面遷移の Mermaid 定義

- As a: AI エージェント開発者
- I want: 全画面遷移を Mermaid 図（flowchart / sequenceDiagram）として定義したい
- So that: 遷移パスの網羅性を保証し、孤立画面や到達不能状態を排除できる
- Parent: CAP-0020

## US-0020-0002: エラーリカバリーフロー定義

- As a: AI エージェント開発者
- I want: エラー発生時のリカバリーフロー（戻り先・再試行・フォールバック）を定義したい
- So that: ユーザーがエラー状態で行き詰まることなく、常に復帰パスが存在する
- Parent: CAP-0020

## US-0020-0003: 遷移図と UI 実装の整合性検証

- As a: QA エンジニア
- I want: 画面遷移図（Mermaid SSOT）と実際の UI 実装の整合性を検証したい
- So that: 遷移の漏れや不整合を早期に検出し、ナビゲーション品質を維持できる
- Parent: CAP-0020
