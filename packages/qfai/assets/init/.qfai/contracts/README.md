# contracts

## 1. 目的

`contracts` は spec/scenario/test/implementation が参照する契約を置くディレクトリです。spec が架空の API/DB/UI を参照する事故を防ぐため、contracts を先に確定します。

## 2. 背景

仕様から先に書くと、存在しない DB や API を前提にした spec が出来上がり、後工程で矛盾が発覚します。契約を先に固定することで、参照の整合性を担保します。

## 3. ここに配置するもの

- API contract（YAML）
- DB contract（SQL）
- UI contract（YAML）

カテゴリは次の 3 つのみです。

- api
- db
- ui

## 4. ここに配置してはならないもの

- 上記以外のカテゴリ追加
- YAML に Markdown（コードフェンスや見出し）の混入
- 実装コードやテストコード

## 5. ディレクトリ構造

```text
.
├─ README.md
├─ api
│  ├─ README.md
│  └─ <api contracts>
├─ db
│  ├─ README.md
│  └─ <db contracts>
└─ ui
   ├─ README.md
   └─ <ui contracts>
```

## 6. テンプレート

各カテゴリ README のテンプレに従います。

## 7. 完成例

完成例はカテゴリ README に従います。

## 8. チェックリスト

- [ ] contracts を作成してから specs を作っている
- [ ] YAML/SQL の構文が壊れていない
- [ ] contract ID をファイル内に宣言している
