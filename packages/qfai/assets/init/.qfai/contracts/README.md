# Contracts (UI / API / DB)

契約は「システム外部との約束」を明文化する場所です。Scenario から参照される前提で作成します。

## 置くべきファイル

- UI: `ui/ui-0001-<slug>.yaml` または `.yml`
- API: `api/api-0001-<slug>.yaml` / `.yml` / `.json`（OpenAPI）
- DB: `db/db-0001-<slug>.sql`（ID は `DATA-xxxx`）

## 最小例（UI）

```yaml
id: UI-0001
name: 受注登録画面
refs:
  - BR-0001
```

## 最小例（API）

```yaml
openapi: 3.0.0
info:
  title: Sample API
  version: 0.1.0
paths:
  /health:
    get:
      operationId: API-0001
      responses:
        "200":
          description: OK
```

## 最小例（DB）

```sql
-- DATA-0001
CREATE TABLE sample_table (
  id INTEGER PRIMARY KEY
);
```

## CI でチェックされること（抜粋）

- UI: YAML 解析、`id` が `UI-` で始まる
- API: OpenAPI 定義があること
- DB: 危険 SQL（DROP/TRUNCATE 等）の警告
- 共通: ID 形式の検証

## 依存関係

- Scenario → Contracts（UI/API/DATA のいずれかへ接続）

## 良い例 / 悪い例

- 良い例: `@SC-xxxx` から `UI-xxxx` が参照されている
- 悪い例: 契約が Scenario から一切参照されない
