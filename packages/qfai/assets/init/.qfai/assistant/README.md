# assistant

## 1. 目的

`assistant` は AI が成果物を作成するときに参照する指示資産の置き場です。プロジェクト固有の前提と作業手順をここに揃えます。

## 2. 背景

同じ指示でも、散在すると参照漏れや解釈ブレが発生します。`assistant` を SSOT として整理し、プロンプトやサブエージェントの行動を安定化させます。

## 3. ここに配置するもの

- prompts: コマンド別の作業指示（SSOT）
- prompts.local: 必要に応じた上書き（最小限）
- agents: サブエージェントの役割定義
- instructions: 行動規範・品質基準・ワークフロー
- steering: プロジェクト文脈（前提・制約・方針）

## 4. ここに配置してはならないもの

- requirements/specs/contracts の成果物
- 実装コード
- 手順のない雑多なメモ

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ prompts
│  └─ README.md
├─ prompts.local
│  └─ README.md
├─ agents
│  └─ README.md
├─ instructions
│  └─ README.md
└─ steering
   └─ README.md
```

## 6. テンプレート

指示ファイルは原則「ルール」「手順」「チェックリスト」を含めます。

```md
# Title

## Rules

- <must>

## Steps

1. <do>

## Checklist

- [ ] <check>
```

## 7. 完成例

```md
# Example

## Rules

- 出力ファイルのパスを必ず明記する
- 作業完了条件としてチェックコマンドを実行する

## Steps

1. 入力を読む
2. 成果物を生成する
3. チェックコマンドを実行する

## Checklist

- [ ] 出力パスが明記されている
- [ ] チェックコマンドを全て通過した
```

## 8. チェックリスト

- [ ] 成果物を `assistant` に置いていない（責務分離）
- [ ] 指示は検証可能な形（チェックリスト）になっている
