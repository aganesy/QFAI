# prompts.local

## 1. 目的

`prompts.local` はプロジェクト固有の事情により、SSOT の `prompts` を最小限だけ上書きしたい場合に利用します。

## 2. 背景

プロジェクト固有要件は `steering` に集約するのが原則ですが、例外的にプロンプト本文の追加制約が必要な場合があります。その場合にのみ `prompts.local` を使います。

## 3. ここに配置するもの

- 上書きが必要な場合のプロンプトファイル（Markdown）

## 4. ここに配置してはならないもの

- SSOT の丸ごと複製
- 生成物（require/specs/contracts/report）

## 5. ディレクトリ構造

```text
.
└─ README.md
```

## 6. テンプレート

上書きファイルには次を必ず含めます（ファイル名は上書き対象と同一にする）。

```md
# Override target

## Purpose

- <why override is needed>

## Changes

- <list>

## Checklist

- [ ] 差分が最小
- [ ] steering では表現できない理由がある
```

## 7. 完成例

```md
# qfai-spec override

## Purpose

- このプロジェクトでは UI contract の必須項目を追加で定義したい

## Changes

- UI contract の screens に必須項目を追加
- spec pack の分割基準を厳格化

## Checklist

- [ ] 差分が最小
- [ ] 追加制約が validate/verify と矛盾しない
```

## 8. チェックリスト

- [ ] 上書きが本当に必要である
- [ ] 差分が最小である
