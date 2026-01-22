# instructions

## 1. 目的

`instructions` は AI の行動規範、品質基準、標準ワークフローを定義します。成果物の粒度と検証手順を揃えます。

## 2. 背景

品質基準が曖昧だと、spec pack の粒度が粗くなり、verify で保証できない曖昧さが残ります。`instructions` はそれを防ぎます。

## 3. ここに配置するもの

- constitution: 絶対に守るルール
- workflow: 標準ワークフロー
- quality: 品質ゲートと受入基準
- thinking: 曖昧さ解消と根拠の書き方
- communication: 報告フォーマット
- agent-selection: ロール分担方針

## 4. ここに配置してはならないもの

- プロジェクト固有の事実（steering へ）
- コマンド別の細かな手順（prompts へ）

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ constitution.md
├─ workflow.md
├─ quality.md
├─ thinking.md
├─ communication.md
└─ agent-selection.md
```

## 6. テンプレート

```md
# Title

## Rules

- <must>

## Rationale

- <why>

## Checklist

- [ ] <check>
```

## 7. 完成例

```md
# Quality

## Rules

- spec pack は 1 主要スライスのみ
- scenario.feature は 1 ファイル 1 シナリオ

## Rationale

- 粒度が粗いと実装がアドリブ化し、トレーサビリティが崩れる

## Checklist

- [ ] scenario.feature に Scenario が 1 つだけ
- [ ] spec.md の BR が 1 つだけ
```

## 8. チェックリスト

- [ ] ルールが定量的、または明確な判断基準として書かれている
- [ ] 出力の作業完了条件にチェックコマンドが含まれている
