# contracts/api

## 1. 目的

`contracts/api` は API の最小契約を置くディレクトリです。scenario/test が参照する範囲だけ定義し、過剰に詳細化しません。

## 2. 背景

API が曖昧だと scenario と実装がアドリブになり、verify が成立しません。最小契約を固定し、参照のズレを防ぎます。

## 3. ここに配置するもの

- API contract YAML（ファイル名規約: api-XXXX-<slug>.yaml）

## 4. ここに配置してはならないもの

- 架空のエンドポイント
- YAML に Markdown の混入

## 5. ディレクトリ構造

```text
.
├─ README.md
└─ <api contracts>
```

## 6. テンプレート

```yaml
# QFAI-CONTRACT-ID: API-0001-user-registration
kind: qfai-contract
type: api
id: API-0001-user-registration
title: User Registration API
endpoints:
  - method: POST
    path: /api/register
    summary: Create a new user account
    request:
      contentType: application/json
      body:
        email: string
        password: string
    responses:
      "201":
        description: Created
        body:
          userId: string
      "409":
        description: Email already exists
        body:
          error: string
```

## 7. 完成例

```yaml
# QFAI-CONTRACT-ID: API-0001-user-registration
kind: qfai-contract
type: api
id: API-0001-user-registration
title: User Registration API
endpoints:
  - method: POST
    path: /api/register
    summary: Create a new user account
    request:
      contentType: application/json
      body:
        email: string
        password: string
    responses:
      "201":
        description: Created
        body:
          userId: string
      "409":
        description: Email already exists
        body:
          error: string
```

## 8. チェックリスト

- [ ] QFAI-CONTRACT-ID が先頭にある
- [ ] YAML のインデントが正しい
- [ ] spec が参照する項目だけを定義している
