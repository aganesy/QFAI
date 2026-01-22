# prompts

## 1. 目的

`prompts` はコマンド別の SSOT プロンプト本文です。AI が成果物を作るときの作業手順、出力、チェックリスト、完了条件をここに定義します。

## 2. 背景

ツール固有の設定は薄いラッパーであり、実体を SSOT に統一しないと指示が分岐して品質が崩れます。

## 3. ここに配置するもの

- コマンド別プロンプト（Markdown）
- 各プロンプトは次を必ず含む
  - Inputs（読むもの）
  - Outputs（書くもの）
  - Steps（手順、順序）
  - Checklist（定量条件）
  - Quality gates（チェックコマンドを実行し全通過）

## 4. ここに配置してはならないもの

- requirements/specs/contracts の成果物
- ツール固有のショートカット文のみ（実体のないラッパー）

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ qfai-configure.md
├─ qfai-discuss.md
├─ qfai-require.md
├─ qfai-spec.md
├─ qfai-scenario-test.md
├─ qfai-unit-test.md
├─ qfai-implement.md
└─ qfai-verify.md
```

## 6. テンプレート

```md
# Command name

## Inputs

- <what to read>

## Outputs

- <what to write>

## Steps

1. <step>

## Checklist

- [ ] <check>

## Quality gates

- 実行して全て通過すること:
  - pnpm format:check
  - pnpm lint
  - pnpm check-types
  - pnpm -C packages/qfai test
  - pnpm test:assets
  - pnpm verify:pack
```

## 7. 完成例

```md
# qfai-spec

## Inputs

- steering
- contracts README
- specs README

## Outputs

- contracts（API/DB/UI）
- spec pack（spec.md, delta.md, scenario.feature）

## Steps

1. contracts を作成する
2. contracts の構文を修正し参照可能にする
3. spec pack を作成する
4. contract 参照が実在することを確認する
5. チェックコマンドを実行する

## Checklist

- [ ] contracts が先に確定している
- [ ] spec が架空参照していない
- [ ] シナリオが 1 ファイル 1 シナリオ
- [ ] チェックコマンドを全て通過した
```

## 8. チェックリスト

- [ ] 手順が順序付きで書かれている
- [ ] 出力が検証可能な粒度になっている
