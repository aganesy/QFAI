# contracts/ui

## 1. 目的

`contracts/ui` は UI の最小契約を置くディレクトリです。UI 実装の自由度を残しつつ、scenario が参照できる粒度を確保します。

## 2. 背景

UI が曖昧だと scenario が抽象化し過ぎ、実装に余計な解釈が入ります。画面、入力、アクションの最小単位を固定します。

## 3. ここに配置するもの

- UI contract YAML（ファイル名規約: ui-XXXX-<slug>.yaml）

## 4. ここに配置してはならないもの

- 架空の API 呼び出し（API contract が先）
- YAML に Markdown の混入

## 5. ディレクトリ構造

```text
.
├─ README.md
└─ <ui contracts>
```

## 6. テンプレート

```yaml
# QFAI-CONTRACT-ID: ui-0001-user-registration
kind: qfai-contract
type: ui
id: ui-0001-user-registration
title: User Registration UI
screens:
  - id: register
    title: Register
    fields:
      - id: email
        type: text
        required: true
      - id: password
        type: password
        required: true
    actions:
      - id: submit
        type: submit
        callsApi: api-0001-user-registration
        success:
          navigateTo: home
        failure:
          showMessage: error
```

## 7. 完成例

```yaml
# QFAI-CONTRACT-ID: ui-0001-user-registration
kind: qfai-contract
type: ui
id: ui-0001-user-registration
title: User Registration UI
screens:
  - id: register
    title: Register
    fields:
      - id: email
        type: text
        required: true
      - id: password
        type: password
        required: true
    actions:
      - id: submit
        type: submit
        callsApi: api-0001-user-registration
        success:
          navigateTo: home
        failure:
          showMessage: error
```

## 8. チェックリスト

- [ ] callsApi が実在する API contract を参照している
- [ ] spec が参照する UI 要素のみ定義している
