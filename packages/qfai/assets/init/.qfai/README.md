# .qfai

## 1. 目的

`.qfai` は QFAI が要件・仕様・契約・レポートを管理するためのワークスペースです。AI と人間が同じ前提で作業できるよう、成果物を決まった構造に揃えます。

## 2. 背景

成果物の置き場や粒度が曖昧だと、AI がアドリブで不要な成果物を生成しやすく、検証（validate/verify）で弾けない曖昧さが残ります。`.qfai` はそのブレを抑えるための「成果物の骨格」です。

## 3. ここに配置するもの

- AI の指示資産（assistant）
- 要求定義（require）
- 契約（contracts）
- 仕様（specs）
- レポート（report）

## 4. ここに配置してはならないもの

- アプリのソースコード
- 生成されたテストコード
- 運用上の雑多なメモ（成果物の責務に属さないもの）
- README に定義されていない構造や成果物

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ assistant
│  ├─ README.md
│  ├─ agents
│  │  ├─ README.md
│  │  └─ <role files>
│  ├─ instructions
│  │  ├─ README.md
│  │  └─ <instruction files>
│  ├─ prompts
│  │  ├─ README.md
│  │  └─ <prompt files>
│  ├─ prompts.local
│  │  └─ README.md
│  └─ steering
│     ├─ README.md
│     └─ <steering files>
├─ require
│  ├─ README.md
│  └─ require.md
├─ contracts
│  ├─ README.md
│  ├─ api
│  │  ├─ README.md
│  │  └─ <api contracts>
│  ├─ db
│  │  ├─ README.md
│  │  └─ <db contracts>
│  └─ ui
│     ├─ README.md
│     └─ <ui contracts>
├─ specs
│  ├─ README.md
│  └─ <spec packs>
└─ report
   ├─ README.md
   └─ <generated reports>
```

## 6. 運用ルール

- README は参照用ガイドです。通常は編集しません。
- README の不足や矛盾を見つけた場合は README を編集せず、Open Question として起票します。
- 作業は各ディレクトリの README のチェックリストに従います。

## 7. チェックリスト

- [ ] 作業対象ディレクトリの README を読んだ
- [ ] 成果物を所定のディレクトリに配置した
- [ ] validate/verify のチェックコマンドを実行し、全て通過した
