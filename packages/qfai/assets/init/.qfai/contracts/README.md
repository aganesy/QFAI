# Contracts (UI / API / DB)

契約は「システム外部との約束」を明文化する場所です。Scenario または Spec から参照される前提で作成します。

## 置くべきファイル

- UI: `ui/ui-0001-<slug>.yaml` または `.yml`
- API: `api/api-0001-<slug>.yaml` / `.yml` / `.json`（OpenAPI）
- DB: `db/db-0001-<slug>.sql`（ID は `DB-xxxx`）

## 契約ID宣言（必須）

- 1ファイル = 1ID
- ファイル内に `QFAI-CONTRACT-ID: <ID>` をコメント行で宣言する
- 例: `# QFAI-CONTRACT-ID: API-0001` / `// QFAI-CONTRACT-ID: UI-0001` / `-- QFAI-CONTRACT-ID: DB-0001`

## 最小例（UI）

```yaml
# QFAI-CONTRACT-ID: UI-0001
id: UI-0001
name: 受注登録画面
refs:
  - BR-0001
```

## 最小例（API）

```yaml
# QFAI-CONTRACT-ID: API-0001
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
-- QFAI-CONTRACT-ID: DB-0001
CREATE TABLE sample_table (
  id INTEGER PRIMARY KEY
);
```

## CI でチェックされること（抜粋）

- 契約宣言: `QFAI-CONTRACT-ID` の未記載/複数宣言/重複IDは error
- 契約ID: 配置ディレクトリ（ui/api/db）と prefix（UI/API/DB）の不整合は error
- UI/API: パース失敗は error
- API: OpenAPI 定義があること（`openapi`）
- DB: 危険 SQL（DROP/TRUNCATE 等）の警告
- 共通: ID 形式（`PREFIX-0001`）、ID の重複検知

## 依存関係

- Spec → Contracts（`QFAI-CONTRACT-REF` で宣言、`none` 可）
- Scenario → Contracts（UI/API/DB の参照は任意）

## 良い例 / 悪い例

- 良い例: `@SC-xxxx` から `UI-xxxx` が参照されている
- 悪い例: 契約が Scenario から一切参照されない
